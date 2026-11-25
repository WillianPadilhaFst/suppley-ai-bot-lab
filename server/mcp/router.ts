import { Router } from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  integrationScopes,
  verifyMcpToken,
  requireMcpScope,
  type McpIdentity,
} from "./auth";
import {
  listOwnOperations,
  getOwnOperation,
  createOwnOperation,
  publicOperationInput,
} from "../services/publicOperations";
import { audit, consumeLimit } from "../security/abuse";
import { TRPCError } from "@trpc/server";
import {
  getOwnQuoteRequest,
  integrationRequestKey,
  listOwnQuoteRequests,
  publicRecordId,
  quoteRequestInput,
  submitIntegrationQuoteRequest,
} from "../services/publicQuoteRequests";
import { importEstimateInput } from "../agent/tools/estimarCustoPublico";
import {
  cubagemInput,
  estimateImportForIntegration,
} from "../services/integrationAnalysis";
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
      } catch (error) {
        const message =
          error instanceof TRPCError && error.code === "CONFLICT"
            ? "Chave de idempotência já utilizada com dados diferentes."
            : "Recurso não autorizado ou indisponível.";
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: message,
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
  if (identity.scopes.has("operations:write")) {
    server.registerTool(
      "criar_minha_operacao",
      {
        description:
          "Cria uma operação na conta conectada. Peça autorização antes de criar. Para uma cotação, use solicitar_cotacao.",
        inputSchema: publicOperationInput.strict(),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
        },
      },
      ({ titulo }) =>
        wrap("operations:write", "operation-create", () =>
          createOwnOperation(identity.user, titulo),
        )(),
    );
  }
  if (identity.scopes.has("quotes:read")) {
    server.registerTool(
      "consultar_minhas_solicitacoes",
      {
        description:
          "Lista as 100 solicitações de cotação mais recentes da própria conta.",
        annotations: { readOnlyHint: true },
      },
      wrap("quotes:read", "quote-list", () =>
        listOwnQuoteRequests(identity.user),
      ),
    );
    server.registerTool(
      "status_solicitacao_cotacao",
      {
        description:
          "Consulta pelo protocolo numérico uma solicitação de cotação da própria conta.",
        inputSchema: z.object({ id: publicRecordId }).strict(),
        annotations: { readOnlyHint: true },
      },
      ({ id }) =>
        wrap("quotes:read", "quote-get", () =>
          getOwnQuoteRequest(identity.user, id),
        )(),
    );
  }
  if (identity.scopes.has("quotes:write")) {
    server.registerTool(
      "solicitar_cotacao",
      {
        description:
          "Registra a solicitação na fila da equipe comercial. Peça autorização antes de enviar e reutilize a mesma chave nas tentativas do mesmo pedido. Retorna o protocolo sem emitir proposta comercial.",
        inputSchema: quoteRequestInput.extend({
          chaveIdempotencia: integrationRequestKey,
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
        },
      },
      ({ chaveIdempotencia, ...input }) =>
        wrap("quotes:write", "quote-submit", () =>
          submitIntegrationQuoteRequest(
            identity.user,
            input,
            chaveIdempotencia,
          ),
        )(),
    );
  }
  if (identity.scopes.has("excambia:analyze")) {
    server.registerTool(
      "cubagem",
      {
        description: "Análise de cubagem com dados fornecidos pelo usuário.",
        inputSchema: cubagemInput,
        annotations: { readOnlyHint: true },
      },
      (input) =>
        wrap("excambia:analyze", "cubagem", async () =>
          calcularCubagem(input),
        )(),
    );
    server.registerTool(
      "estimar_custo_importacao",
      {
        description:
          "Estimativa de custo com referência histórica do Comex Stat. Informe somente parâmetros fornecidos ou confirmados pelo cliente. Registre uma solicitação de cotação para análise comercial.",
        inputSchema: importEstimateInput,
        annotations: { readOnlyHint: true },
      },
      (input) =>
        wrap("excambia:analyze", "import-estimate", () =>
          estimateImportForIntegration(identity.user, input),
        )(),
    );
  }
  return server;
}
export const mcpRouter = Router();
const enabled = () =>
  process.env.MCP_ENABLED === "true" &&
  process.env.MCP_AUTHORIZATION_REVIEWED === "true";
mcpRouter.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => {
  if (!enabled()) return res.sendStatus(404);
  res.setHeader("Cache-Control", "no-store");
  return res.json({
    resource: process.env.MCP_RESOURCE_URL,
    authorization_servers: [process.env.MCP_OAUTH_ISSUER],
    scopes_supported: integrationScopes,
    bearer_methods_supported: ["header"],
  });
});
mcpRouter.all("/mcp", async (req, res) => {
  if (!enabled()) {
    res.sendStatus(404);
    return;
  }
  res.setHeader("Cache-Control", "no-store");
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
