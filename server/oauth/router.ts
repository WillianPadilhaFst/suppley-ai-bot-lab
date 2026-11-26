import { createHmac } from "node:crypto";
import { Router, urlencoded, type Request, type Response } from "express";
import Provider, {
  errors,
  interactionPolicy,
  type AdapterConstructor,
} from "oidc-provider";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { integrationScopes } from "../mcp/auth";
import { audit, consumeLimit } from "../security/abuse";
import { requireApproved } from "../security/policy";
import { resolveSession, sessionSecret } from "../security/session";
import { findOAuthAccount, oauthAccountId } from "./account";
import { MysqlOAuthAdapter } from "./adapter";
import {
  installLocalKeyResolver,
  interactionPath,
  oauthPath,
  type LocalOAuthConfig,
} from "./config";

const chatgptClientId = "https://chatgpt.com/oauth/client.json";
const chatgptCallback = "https://chatgpt.com/connector_platform_oauth_redirect";
const chatgptJwks = "https://chatgpt.com/oauth/jwks.json";
const oauthScopes = ["openid", "offline_access"];

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

function html(res: Response, body: string) {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  );
  res.setHeader("Referrer-Policy", "no-referrer");
  return res
    .type("html")
    .send(
      `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Excambia | Autorizar aplicação</title><main><h1>Excambia</h1>${body}</main></html>`,
    );
}

const consentDetails = z.object({
  missingOIDCScope: z.array(z.string()).optional(),
  missingResourceScopes: z.record(z.string(), z.array(z.string())).optional(),
});

const readPortalSession = (req: Request) =>
  req.headers.authorization ? Promise.resolve(null) : resolveSession(req);

export function createOAuthRouter(
  config: LocalOAuthConfig,
  adapter: AdapterConstructor = MysqlOAuthAdapter,
) {
  const resources = {
    mcp: `${config.origin}/mcp`,
    rest: `${config.origin}/api/v1`,
  };
  const clients = new Map(
    config.clients.map((client) => [client.client_id, client]),
  );
  if (config.chatgpt)
    clients.set(chatgptClientId, {
      client_id: chatgptClientId,
      client_name: "ChatGPT",
      redirect_uris: [chatgptCallback],
      resource: "mcp",
    });
  const policy = interactionPolicy.base();
  policy.get("login")!.checks.add(
    new interactionPolicy.Check(
      "excambia_portal_session",
      "An active Excambia session is required",
      async (ctx) => {
        const viewer = await readPortalSession(ctx.req as Request);
        return (
          !viewer || oauthAccountId(viewer) !== ctx.oidc.session?.accountId
        );
      },
    ),
    0,
  );

  const provider = new Provider(config.issuer, {
    adapter,
    jwks: config.jwks,
    clients: config.clients.map(({ resource: _resource, ...client }) => ({
      ...client,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "web",
    })),
    cookies: {
      keys: [
        createHmac("sha256", sessionSecret())
          .update("excambia-oidc-cookies")
          .digest("hex"),
      ],
    },
    responseTypes: ["code"],
    scopes: oauthScopes,
    clientAuthMethods: ["none", "private_key_jwt"],
    ttl: {
      AccessToken: 3600,
      AuthorizationCode: 120,
      RefreshToken: 86400,
      Interaction: 600,
      Session: 86400,
      Grant: 604800,
    },
    rotateRefreshToken: true,
    fetch: (input, options) => {
      if (
        !config.chatgpt ||
        ![chatgptClientId, chatgptJwks].includes(input.toString())
      )
        throw new Error("Unapproved OAuth metadata URL");
      return fetch(input, {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
    },
    pkce: { required: () => true },
    features: {
      devInteractions: { enabled: false },
      clientIdMetadataDocument: {
        enabled: config.chatgpt,
        ack: "draft-03",
        allowFetch: (_ctx, id) => config.chatgpt && id === chatgptClientId,
        allowClient: (_ctx, client) =>
          config.chatgpt &&
          client.clientId === chatgptClientId &&
          client.redirectUris?.length === 1 &&
          client.redirectUris[0] === chatgptCallback &&
          (!client.jwksUri || client.jwksUri === chatgptJwks),
      },
      resourceIndicators: {
        enabled: true,
        defaultResource: (_ctx, client, candidates) =>
          candidates?.length === 1
            ? candidates[0]
            : resources[clients.get(client.clientId)!.resource],
        getResourceServerInfo: (_ctx, resource, client) => {
          const registered = clients.get(client.clientId);
          if (!registered || resources[registered.resource] !== resource)
            throw new errors.InvalidTarget();
          return {
            scope: integrationScopes.join(" "),
            audience: resource,
            accessTokenTTL: 3600,
            accessTokenFormat: "jwt",
            jwt: { sign: { alg: "RS256" } },
          };
        },
        useGrantedResource: () => true,
      },
    },
    extraTokenClaims: (_ctx, token) =>
      "grantId" in token ? { excambia_grant: token.grantId } : undefined,
    async findAccount(_ctx, id) {
      const user = await findOAuthAccount(id);
      if (!user) return undefined;
      requireApproved(user);
      return { accountId: id, claims: () => ({ sub: id }) };
    },
    interactions: {
      policy,
      url: (_ctx, interaction) => `${interactionPath}/${interaction.uid}`,
    },
  });
  provider.proxy = true;
  installLocalKeyResolver(config);

  const router = Router();
  const callback = provider.callback();
  router.use(oauthPath, (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.get("host") !== new URL(config.origin).host) {
      res.sendStatus(403);
      return;
    }
    consumeLimit(`excambia-oauth:${req.ip ?? "unknown"}`, 100, 60000).then(
      () => next(),
      (error) => {
        res.sendStatus(
          error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS"
            ? 429
            : 503,
        );
      },
    );
  });

  const handleInteraction = async (req: Request, res: Response) => {
    try {
      const details = await provider.interactionDetails(req, res);
      if (details.uid !== req.params.uid) return res.sendStatus(404);
      const client = clients.get(String(details.params.client_id));
      if (!client) return res.sendStatus(400);
      const user = await readPortalSession(req);
      const accountId = user ? oauthAccountId(user) : null;
      if (req.method === "GET") {
        if (!user) {
          const login = `/login?oauth=${encodeURIComponent(details.uid)}`;
          return html(
            res,
            `<p>Entre na Excambia para continuar.</p><a href="${login}">Entrar</a>`,
          );
        }
        if (
          details.prompt.name === "consent" &&
          accountId !== details.session?.accountId
        )
          return res.sendStatus(403);
        const rawScope = details.params.scope;
        const scopes = typeof rawScope === "string" ? rawScope.split(" ") : [];
        const permissions = scopes.filter((scope) =>
          integrationScopes.some((allowed) => allowed === scope),
        );
        if (scopes.includes("offline_access"))
          permissions.push("Renovar acesso por até 24 horas");
        const list = permissions
          .map((scope) => `<li>${escapeHtml(scope)}</li>`)
          .join("");
        const form = `<form method="post"><button name="decision" value="allow">${details.prompt.name === "login" ? "Continuar" : "Autorizar"}</button> <button name="decision" value="deny">Cancelar</button></form>`;
        const prompt =
          details.prompt.name === "login"
            ? `<p>Continue como ${escapeHtml(user.email ?? user.name ?? "usuário da Excambia")}.</p>`
            : `<p>Autorizar ${escapeHtml(client.client_name)} a acessar sua conta da Excambia?</p><ul>${list}</ul>`;
        return html(res, prompt + form);
      }
      if (req.get("origin") !== config.origin) return res.sendStatus(403);
      if (req.body?.decision === "deny")
        return await provider.interactionFinished(
          req,
          res,
          { error: "access_denied" },
          { mergeWithLastSubmission: false },
        );
      if (!user || !accountId || req.body?.decision !== "allow")
        return res.sendStatus(403);

      if (details.prompt.name === "login")
        return await provider.interactionFinished(
          req,
          res,
          { login: { accountId } },
          { mergeWithLastSubmission: false },
        );

      if (
        details.prompt.name !== "consent" ||
        accountId !== details.session?.accountId
      )
        return res.sendStatus(403);
      const grant = details.grantId
        ? await provider.Grant.find(details.grantId)
        : new provider.Grant({ accountId, clientId: client.client_id });
      if (
        !grant ||
        grant.accountId !== accountId ||
        grant.clientId !== client.client_id
      )
        return res.sendStatus(403);
      const consent = consentDetails.parse(details.prompt.details);
      const missingScopes = consent.missingOIDCScope?.filter((scope) =>
        oauthScopes.includes(scope),
      );
      if (missingScopes?.length) grant.addOIDCScope(missingScopes.join(" "));
      const resource = resources[client.resource];
      const scopes = consent.missingResourceScopes?.[resource];
      if (scopes?.length) grant.addResourceScope(resource, scopes.join(" "));
      await audit(user.id, "excambia-oauth.consent", "approved");
      const grantId = await grant.save();
      return await provider.interactionFinished(
        req,
        res,
        { consent: { grantId } },
        { mergeWithLastSubmission: true },
      );
    } catch {
      if (!res.headersSent) res.sendStatus(400);
    }
  };

  router.get(`${interactionPath}/:uid`, handleInteraction);
  router.post(
    `${interactionPath}/:uid`,
    urlencoded({ extended: false, limit: "2kb" }),
    handleInteraction,
  );
  router.get("/.well-known/oauth-authorization-server/oauth", (_req, res) =>
    res.redirect(307, `${oauthPath}/.well-known/oauth-authorization-server`),
  );
  router.get("/.well-known/openid-configuration/oauth", (_req, res) =>
    res.redirect(307, `${oauthPath}/.well-known/openid-configuration`),
  );
  router.use(oauthPath, (req, res) => {
    void callback(req, res);
  });
  return router;
}
