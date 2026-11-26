import express from "express";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { TRPCError } from "@trpc/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../mcp/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../mcp/auth")>()),
  verifyMcpToken: vi.fn(),
}));
vi.mock("../security/abuse", () => ({ audit: vi.fn(), consumeLimit: vi.fn() }));
vi.mock("../services/publicQuoteRequests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/publicQuoteRequests")>()),
  getOwnQuoteRequest: vi.fn(),
  submitIntegrationQuoteRequest: vi.fn(),
}));

import { verifyMcpToken } from "../mcp/auth";
import {
  getOwnQuoteRequest,
  submitIntegrationQuoteRequest,
} from "../services/publicQuoteRequests";
import { apiDiscoveryRouter, integrationRouter } from "./integrationRoute";

let server: Server;
let origin: string;
let host: string;
const user = { id: 7, role: "public", approvalStatus: "approved" } as const;
const resource = () => `https://${host}/api/v1`;

beforeAll(async () => {
  const app = express();
  app.use(apiDiscoveryRouter);
  app.use("/api/v1", integrationRouter);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  host = `127.0.0.1:${(server.address() as AddressInfo).port}`;
  origin = `http://${host}`;
});
afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => (error ? reject(error) : resolve()));
    }),
);
beforeEach(() => {
  vi.stubEnv("INTEGRATION_API_ENABLED", "true");
  vi.stubEnv("MCP_AUTHORIZATION_REVIEWED", "true");
  vi.stubEnv("INTEGRATION_API_RESOURCE_URL", resource());
  vi.stubEnv("MCP_RESOURCE_URL", `https://${host}/mcp`);
  vi.stubEnv("MCP_OAUTH_ISSUER", "https://issuer.example");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

const credentials = { Authorization: "Bearer token" };
function grant(...scopes: string[]) {
  vi.mocked(verifyMcpToken).mockResolvedValue({
    user: user as Awaited<ReturnType<typeof verifyMcpToken>>["user"],
    scopes: new Set(scopes),
  });
}

describe("Excambia integration API", () => {
  it("publishes resource discovery only when enabled", async () => {
    const path = "/.well-known/oauth-protected-resource/api/v1";
    const metadata = await fetch(origin + path);
    expect(await metadata.json()).toMatchObject({
      resource: resource(),
      authorization_servers: ["https://issuer.example"],
    });
    vi.stubEnv("INTEGRATION_API_ENABLED", "false");
    expect((await fetch(origin + path)).status).toBe(404);
    expect((await fetch(origin + "/api/v1/cotacoes")).status).toBe(404);
  });

  it("enforces bearer credentials, API audience and write scope", async () => {
    const url = origin + "/api/v1/cotacoes";
    const unauthed = await fetch(url);
    expect(unauthed.status).toBe(401);
    expect(unauthed.headers.get("www-authenticate")).toContain(
      "/.well-known/oauth-protected-resource/api/v1",
    );
    grant("quotes:read");
    const denied = await fetch(url, { method: "POST", headers: credentials });
    expect(denied.status).toBe(403);
    expect(verifyMcpToken).toHaveBeenLastCalledWith(
      "token",
      undefined,
      resource(),
    );
    expect(submitIntegrationQuoteRequest).not.toHaveBeenCalled();
  });

  it("requires an idempotency key and forwards submission under the verified account", async () => {
    grant("quotes:write");
    vi.mocked(submitIntegrationQuoteRequest).mockRejectedValueOnce(
      new TRPCError({ code: "CONFLICT" }),
    );
    const submit = (key?: string) =>
      fetch(origin + "/api/v1/cotacoes", {
        method: "POST",
        headers: {
          ...credentials,
          "Content-Type": "application/json",
          ...(key && { "Idempotency-Key": key }),
        },
        body: JSON.stringify({ produto: "Frascos" }),
      });
    expect((await submit()).status).toBe(400);
    expect(submitIntegrationQuoteRequest).not.toHaveBeenCalled();
    expect((await submit("pedido-7")).status).toBe(409);
    expect(submitIntegrationQuoteRequest).toHaveBeenCalledWith(
      user,
      { produto: "Frascos" },
      "pedido-7",
    );
  });

  it("uses the verified owner to resolve a protocol and hides unavailable records", async () => {
    grant("quotes:read");
    vi.mocked(getOwnQuoteRequest).mockRejectedValueOnce(
      new TRPCError({ code: "NOT_FOUND" }),
    );
    const response = await fetch(origin + "/api/v1/cotacoes/42", {
      headers: credentials,
    });
    expect(response.status).toBe(404);
    expect(getOwnQuoteRequest).toHaveBeenCalledWith(user, 42);
  });
});
