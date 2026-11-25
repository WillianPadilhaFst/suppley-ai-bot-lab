import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { createServer, request as httpRequest, type Server } from "node:http";
import type { AddressInfo } from "node:net";
const state = vi.hoisted(() => ({ limited: false }));
vi.mock("./auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./auth")>()),
  verifyMcpToken: vi.fn(async (token: string) => {
    if (!["user-a", "user-b", "no-scope"].includes(token))
      throw Error("Invalid");
    return {
      user: {
        id: token === "user-b" ? 2 : 1,
        role: "public",
        approvalStatus: "approved",
      },
      scopes: new Set(token === "no-scope" ? [] : ["operations:read"]),
    };
  }),
  requireMcpScope: (identity: any, scope: string) => {
    if (!identity.scopes.has(scope)) throw Error("Forbidden");
  },
}));
vi.mock("../services/publicOperations", () => ({
  listOwnOperations: async (user: any) => [{ id: user.id, status: "ativa" }],
  getOwnOperation: async (user: any, id: number) => {
    if (id !== user.id) throw Error("Not found");
    return { id, status: "ativa" };
  },
}));
vi.mock("../security/abuse", () => ({
  audit: async () => {},
  consumeLimit: async () => {
    if (state.limited) throw Error("Limit");
  },
}));
import { mcpRouter } from "./router";
let server: Server;
let origin: string;
async function request(
  token?: string,
  body: any = { jsonrpc: "2.0", id: 1, method: "tools/list" },
  extra: Record<string, string> = {},
) {
  return new Promise<Response>((resolve, reject) => {
    const req = httpRequest(
      `${origin}/mcp`,
      {
        method: "POST",
        headers: {
          host: "mcp.example.test",
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...extra,
        },
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () =>
          resolve(
            new Response(text, {
              status: res.statusCode,
              headers: res.headers as Record<string, string>,
            }),
          ),
        );
      },
    );
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
}
beforeEach(async () => {
  vi.stubEnv("MCP_ENABLED", "true");
  vi.stubEnv("MCP_AUTHORIZATION_REVIEWED", "true");
  vi.stubEnv("MCP_RESOURCE_URL", "https://mcp.example.test/mcp");
  state.limited = false;
  const app = express();
  app.use(express.json({ limit: "64kb" }));
  app.use(mcpRouter);
  server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  vi.unstubAllEnvs();
  server?.closeAllConnections();
  if (server?.listening)
    await new Promise<void>((resolve) => server.close(() => resolve()));
});
describe("MCP HTTP authorization boundary", () => {
  it("fails closed while authorization review is pending", async () => {
    vi.stubEnv("MCP_AUTHORIZATION_REVIEWED", "false");
    expect((await request("user-a")).status).toBe(404);
  });
  it("rejects absent or invalid bearer credentials with discovery challenge", async () => {
    for (const token of [undefined, "invalid"]) {
      const r = await request(token);
      expect(r.status).toBe(401);
      expect(r.headers.get("www-authenticate")).toContain(
        "/.well-known/oauth-protected-resource/mcp",
      );
    }
  });
  it("rejects unexpected hosts and origins", async () => {
    expect(
      (await request("user-a", undefined, { host: "attacker.test" })).status,
    ).toBe(403);
    expect(
      (await request("user-a", undefined, { origin: "https://attacker.test" }))
        .status,
    ).toBe(403);
  });
  it("rejects unsafe resource configuration", async () => {
    vi.stubEnv("MCP_RESOURCE_URL", "invalid");
    expect((await request("user-a")).status).toBe(503);
  });
  it("enforces the request limit", async () => {
    state.limited = true;
    expect((await request("user-a")).status).toBe(429);
  });
  it("lists scoped tools and isolates calls between authenticated identities", async () => {
    const list = await request("user-a");
    expect(list.status).toBe(200);
    expect(
      ((await list.json()) as any).result.tools.map((t: any) => t.name),
    ).toEqual(["minhas_operacoes", "status_operacao"]);
    for (const token of ["user-a", "user-b"]) {
      const r = await request(token, {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "status_operacao", arguments: { id: 2 } },
      });
      const body = (await r.json()) as any;
      expect(body.result.isError === true).toBe(token === "user-a");
    }
  });
  it("does not allow direct calls to tools outside granted scopes", async () => {
    const r = await request("no-scope", {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "status_operacao", arguments: { id: 1 } },
    });
    const body = (await r.json()) as any;
    expect(body.error).toBeDefined();
  });
});
