import { createPrivateKey } from "node:crypto";
import { z } from "zod";
import { createLocalJWKSet } from "jose";

export const oauthPath = "/oauth";
export const interactionPath = `${oauthPath}/interacao`;

const clientSchema = z
  .object({
    client_id: z.string().regex(/^[A-Za-z0-9._~-]{1,128}$/),
    client_name: z.string().trim().min(1).max(80),
    redirect_uris: z
      .array(
        z.url().refine((value) => {
          const url = new URL(value);
          return (
            url.protocol === "https:" &&
            !url.username &&
            !url.password &&
            !url.hash
          );
        }),
      )
      .min(1),
    resource: z.enum(["mcp", "rest"]),
  })
  .strict();

const keysSchema = z.object({
  keys: z
    .array(
      z
        .object({
          kty: z.literal("RSA"),
          kid: z.string().min(1),
          n: z.string().min(1),
          e: z.string().min(1),
          d: z.string().min(1),
          p: z.string().min(1),
          q: z.string().min(1),
          dp: z.string().min(1),
          dq: z.string().min(1),
          qi: z.string().min(1),
        })
        .strict(),
    )
    .min(1),
});

function httpsOrigin(input: string | undefined) {
  const url = new URL(input ?? "");
  if (url.protocol !== "https:" || url.href !== `${url.origin}/`)
    throw new Error("Set APP_URL to the HTTPS origin of Excambia");
  return url.origin;
}

export function localOAuthIssuer() {
  return process.env.EXCAMBIA_OAUTH_ENABLED === "true"
    ? `${httpsOrigin(process.env.APP_URL)}${oauthPath}`
    : undefined;
}

export function getOAuthIssuer() {
  return localOAuthIssuer() ?? process.env.MCP_OAUTH_ISSUER;
}

function jsonSetting(name: string, fallback: string) {
  try {
    return JSON.parse(process.env[name] || fallback) as unknown;
  } catch {
    throw new Error(`Invalid JSON in ${name}`);
  }
}

export function readLocalOAuthConfig() {
  const issuer = localOAuthIssuer();
  if (!issuer) return undefined;
  const origin = new URL(issuer).origin;
  const chatgpt = process.env.EXCAMBIA_OAUTH_CHATGPT === "true";
  const clients = z
    .array(clientSchema)
    .parse(jsonSetting("EXCAMBIA_OAUTH_CLIENTS", "[]"));
  if (!chatgpt && !clients.length)
    throw new Error("Configure at least one OAuth client");
  if (
    new Set(clients.map((client) => client.client_id)).size !== clients.length
  )
    throw new Error("Duplicate OAuth client identifiers");
  const jwks = keysSchema.parse(jsonSetting("EXCAMBIA_OAUTH_JWKS", "{}"));
  if (new Set(jwks.keys.map((key) => key.kid)).size !== jwks.keys.length)
    throw new Error("Duplicate OAuth key identifiers");
  for (const key of jwks.keys) {
    try {
      const privateKey = createPrivateKey({ key, format: "jwk" });
      if ((privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048)
        throw new Error();
    } catch {
      throw new Error(
        "EXCAMBIA_OAUTH_JWKS requires valid RSA keys of at least 2048 bits",
      );
    }
  }
  for (const [variable, resource] of [
    ["MCP_RESOURCE_URL", `${origin}/mcp`],
    ["INTEGRATION_API_RESOURCE_URL", `${origin}/api/v1`],
  ]) {
    if (process.env[variable] !== resource)
      throw new Error(`Configure ${variable} as ${resource}`);
  }
  return { issuer, origin, jwks, clients, chatgpt };
}

export type LocalOAuthConfig = NonNullable<
  ReturnType<typeof readLocalOAuthConfig>
>;
type LocalKeyResolver = ReturnType<typeof createLocalJWKSet>;

let localKeys: LocalKeyResolver | undefined;

export function installLocalKeyResolver(config: LocalOAuthConfig) {
  localKeys = createLocalJWKSet({
    keys: config.jwks.keys.map(({ kty, kid, n, e }) => ({ kty, kid, n, e })),
  });
}

export function getLocalKeyResolver() {
  if (!localKeys) throw new Error("Excambia OAuth signing keys unavailable");
  return localKeys;
}
