import { Router } from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { verifyMcpToken, requireMcpScope, type McpIdentity } from "./auth";
import {
  listOwnOperations,
  getOwnOperation,
} from "../services/publicOperations";
import { audit, consumeLimit } from "../security/abuse";
import { calcularCubagem } from "../services/cubagemService";
export function createMcpServer(identity: McpIdentity) {
  const server = new McpServer({ name: "suppley-excambia", version: "1.0.0" });
  const wrap =
    (scope: string, name: string, fn: () => Promise<unknown>) => async () => {
      try {
        requireMcpScope(identity, scope);
        await audit(identity.user.id, `mcp:${name}`, "requested");
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(await fn()) },
          ],
        };
      } catch {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Recurso não autorizado ou indisponível.",
            },
          ],
        };
      }
    };
  if (identity.scopes.has("operations:read")) {
    server.registerTool(
      "minhas_operacoes",
      {
        description: "Lista até 100 operações próprias.",
        annotations: { readOnlyHint: true },
      },
      wrap("operations:read", "list", () => listOwnOperations(identity.user)),
    );
    server.registerTool(
      "status_operacao",
      {
        description:
          "Status, marcos, prazos e histórico público de uma operação própria.",
        inputSchema: { id: z.number().int().positive() },
        annotations: { readOnlyHint: true },
      },
      ({ id }) =>
        wrap("operations:read", "get", () =>
          getOwnOperation(identity.user, id),
        )(),
    );
  }
  if (identity.scopes.has("excambia:analyze"))
    server.registerTool(
      "cubagem",
      {
        description:
          "Análise de cubagem com dados fornecidos pelo usuário. Não consulta bases internas.",
        inputSchema: {
          comprimentoCm: z.number().positive().max(100000),
          larguraCm: z.number().positive().max(100000),
          alturaCm: z.number().positive().max(100000),
          pesoKg: z.number().positive().max(1000000),
          quantidade: z.number().int().positive().max(100000000).optional(),
        },
        annotations: { readOnlyHint: true },
      },
      (input) =>
        wrap("excambia:analyze", "cubagem", async () =>
          calcularCubagem(input),
        )(),
    );
  return server;
}
export const mcpRouter = Router();
const enabled = () =>
  process.env.MCP_ENABLED === "true" &&
  process.env.MCP_AUTHORIZATION_REVIEWED === "true";
mcpRouter.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => {
  if (!enabled()) return res.sendStatus(404);
  return res.json({
    resource: process.env.MCP_RESOURCE_URL,
    authorization_servers: [process.env.MCP_OAUTH_ISSUER],
    scopes_supported: ["operations:read", "excambia:analyze"],
    bearer_methods_supported: ["header"],
  });
});
mcpRouter.all("/mcp", async (req, res) => {
  if (!enabled()) {
    res.sendStatus(404);
    return;
  }
  const resource = process.env.MCP_RESOURCE_URL;
  if (!resource) {
    res.sendStatus(503);
    return;
  }
  let expected: URL;
  try {
    expected = new URL(resource);
    if (expected.protocol !== "https:") throw Error("HTTPS required");
  } catch {
    res.sendStatus(503);
    return;
  }
  if (
    req.headers.host !== expected.host ||
    (req.headers.origin && req.headers.origin !== expected.origin)
  ) {
    res.sendStatus(403);
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.sendStatus(405);
    return;
  }
  try {
    await consumeLimit(`mcp-ip:${req.ip ?? "unknown"}`, 120, 60000);
  } catch {
    res.sendStatus(429);
    return;
  }
  let identity: McpIdentity;
  try {
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw new Error("Missing");
    identity = await verifyMcpToken(token);
  } catch {
    res.setHeader(
      "WWW-Authenticate",
      `Bearer resource_metadata="${expected.origin}/.well-known/oauth-protected-resource/mcp"`,
    );
    res.sendStatus(401);
    return;
  }
  try {
    await consumeLimit(`mcp:${identity.user.id}`, 60, 60000);
    // A fresh server and stateless transport per request prevents cross-client state.
    const server = createMcpServer(identity);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    if (!res.headersSent) res.sendStatus(429);
  }
});
