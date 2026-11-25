import {
  Router,
  json,
  type ErrorRequestHandler,
  type Request,
  type RequestHandler,
} from "express";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { importEstimateInput } from "../agent/tools/estimarCustoPublico";
import {
  integrationScopes,
  verifyMcpToken,
  type McpIdentity,
} from "../mcp/auth";
import { audit, consumeLimit } from "../security/abuse";
import { calcularCubagem } from "../services/cubagemService";
import {
  cubagemInput,
  estimateImportForIntegration,
} from "../services/integrationAnalysis";
import {
  createOwnOperation,
  getOwnOperation,
  listOwnOperations,
  publicOperationInput,
} from "../services/publicOperations";
import {
  getOwnQuoteRequest,
  integrationRequestKey,
  listOwnQuoteRequests,
  publicRecordId,
  submitIntegrationQuoteRequest,
} from "../services/publicQuoteRequests";

export const integrationRouter = Router();
const metadataPath = "/.well-known/oauth-protected-resource/api/v1";

function apiResource() {
  try {
    const resource = new URL(process.env.INTEGRATION_API_RESOURCE_URL ?? "");
    if (
      resource.protocol === "https:" &&
      resource.pathname === "/api/v1" &&
      !resource.username &&
      !resource.password &&
      !resource.search &&
      !resource.hash &&
      resource.href !== process.env.MCP_RESOURCE_URL
    )
      return resource;
  } catch {
    return undefined;
  }
}

const enabled = () =>
  process.env.INTEGRATION_API_ENABLED === "true" &&
  process.env.MCP_AUTHORIZATION_REVIEWED === "true";

integrationRouter.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!enabled()) return res.status(404).json({ error: "not_found" });
  const resource = apiResource();
  res.locals.integrationResource = resource;
  if (!resource) return res.status(503).json({ error: "unavailable" });
  if (req.get("host") !== resource.host)
    return res.status(403).json({ error: "forbidden" });
  next();
});

export const apiDiscoveryRouter = Router();
apiDiscoveryRouter.get(metadataPath, (_req, res) => {
  const resource = apiResource();
  if (!enabled() || !resource) return res.sendStatus(404);
  return res.json({
    resource: resource.href,
    authorization_servers: [process.env.MCP_OAUTH_ISSUER],
    bearer_methods_supported: ["header"],
    scopes_supported: integrationScopes,
  });
});

const parseId = (value: string) =>
  publicRecordId.parse(/^\d+$/.test(value) ? Number(value) : NaN);
const parseJson = json({ limit: "64kb" });
const errorStatuses = {
  BAD_REQUEST: 400,
  CONFLICT: 409,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  SERVICE_UNAVAILABLE: 503,
} as const;

function endpoint(
  scope: string,
  action: string,
  run: (identity: McpIdentity, req: Request) => Promise<unknown> | unknown,
): RequestHandler {
  return async (req, res, next) => {
    try {
      await consumeLimit(
        `integration-api-ip:${req.ip ?? "unknown"}`,
        120,
        60000,
      );
      const resource: URL = res.locals.integrationResource;
      let identity: McpIdentity;
      try {
        const token = req.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
        if (!token) throw new Error("Missing bearer token");
        identity = await verifyMcpToken(token, undefined, resource.href);
      } catch {
        res.setHeader(
          "WWW-Authenticate",
          `Bearer resource_metadata="${resource.origin}${metadataPath}", scope="${scope}"`,
        );
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      if (!identity.scopes.has(scope)) {
        res.setHeader(
          "WWW-Authenticate",
          `Bearer error="insufficient_scope", scope="${scope}"`,
        );
        res.status(403).json({ error: "insufficient_scope" });
        return;
      }
      await consumeLimit(`integration-api:${identity.user.id}`, 60, 60000);
      if (req.method === "POST" && !req.is("application/json")) {
        res.status(415).json({ error: "unsupported_media_type" });
        return;
      }
      const perform = async () => {
        await audit(identity.user.id, `integration-api:${action}`, "requested");
        res.json(await run(identity, req));
      };
      if (req.method === "POST") {
        parseJson(req, res, (error?: unknown) => {
          if (error) next(error);
          else void perform().catch(next);
        });
      } else await perform();
    } catch (error) {
      next(error);
    }
  };
}

integrationRouter.get(
  "/cotacoes",
  endpoint("quotes:read", "quote-list", ({ user }) =>
    listOwnQuoteRequests(user),
  ),
);
integrationRouter.get(
  "/cotacoes/:id",
  endpoint("quotes:read", "quote-get", ({ user }, req) =>
    getOwnQuoteRequest(user, parseId(req.params.id)),
  ),
);
integrationRouter.post(
  "/cotacoes",
  endpoint("quotes:write", "quote-submit", ({ user }, req) =>
    submitIntegrationQuoteRequest(
      user,
      req.body,
      integrationRequestKey.parse(req.get("Idempotency-Key")),
    ),
  ),
);
integrationRouter.get(
  "/operacoes",
  endpoint("operations:read", "operation-list", ({ user }) =>
    listOwnOperations(user),
  ),
);
integrationRouter.post(
  "/operacoes",
  endpoint("operations:write", "operation-create", ({ user }, req) =>
    createOwnOperation(
      user,
      publicOperationInput.strict().parse(req.body).titulo,
    ),
  ),
);
integrationRouter.get(
  "/operacoes/:id",
  endpoint("operations:read", "operation-get", ({ user }, req) =>
    getOwnOperation(user, parseId(req.params.id)),
  ),
);
integrationRouter.post(
  "/cubagem",
  endpoint("excambia:analyze", "cubagem", (_identity, req) =>
    calcularCubagem(cubagemInput.parse(req.body)),
  ),
);
integrationRouter.post(
  "/estimativas/importacao",
  endpoint("excambia:analyze", "import-estimate", ({ user }, req) =>
    estimateImportForIntegration(user, importEstimateInput.parse(req.body)),
  ),
);

integrationRouter.use((_req, res) =>
  res.status(404).json({ error: "not_found" }),
);

const handleError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError)
    return res
      .status(400)
      .json({
        error: "invalid_input",
        fields: error.issues.map((issue) => issue.path.join(".")),
      });
  if (error instanceof TRPCError && Object.hasOwn(errorStatuses, error.code)) {
    const code = error.code as keyof typeof errorStatuses;
    return res.status(errorStatuses[code]).json({ error: code.toLowerCase() });
  }
  if (error instanceof Error && "type" in error) {
    if (error.type === "entity.parse.failed")
      return res.status(400).json({ error: "invalid_json" });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "payload_too_large" });
    if (
      error.type === "encoding.unsupported" ||
      error.type === "charset.unsupported"
    )
      return res.status(415).json({ error: "unsupported_media_type" });
  }
  return res.status(500).json({ error: "internal_error" });
};
integrationRouter.use(handleError);
