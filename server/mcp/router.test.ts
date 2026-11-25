import { describe, it, expect, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
const mocks = vi.hoisted(() => ({
  get: vi.fn(async (user: any, id: number) => {
    if (id !== user.id) throw Error("foreign");
    return { id, status: "ativa", history: [] };
  }),
  list: vi.fn(async (user: any) => [{ id: user.id }]),
  submit: vi.fn(async () => ({ id: 46, status: "recebida" })),
}));
vi.mock("../services/publicOperations", () => ({
  getOwnOperation: mocks.get,
  listOwnOperations: mocks.list,
}));
vi.mock("../security/abuse", () => ({
  audit: vi.fn(async () => {}),
  consumeLimit: vi.fn(async () => {}),
}));
vi.mock("../services/publicQuoteRequests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/publicQuoteRequests")>()),
  submitIntegrationQuoteRequest: mocks.submit,
}));
import { createMcpServer, mcpRouter } from "./router";
async function connect(scopes: string[], id = 1) {
  const server = createMcpServer({
    user: { id, role: "public", approvalStatus: "approved" } as any,
    scopes: new Set(scopes),
  });
  const client = new Client({ name: "test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  return { server, client };
}
describe("MCP protocol tools", () => {
  it("exposes only scoped own-data tools and isolates two clients", async () => {
    const a = await connect(["operations:read"], 1),
      b = await connect(["operations:read"], 2);
    try {
      expect((await a.client.listTools()).tools.map((t) => t.name)).toEqual([
        "minhas_operacoes",
        "status_operacao",
      ]);
      expect(
        (
          await a.client.callTool({
            name: "status_operacao",
            arguments: { id: 2 },
          })
        ).isError,
      ).toBe(true);
      expect(
        (
          await b.client.callTool({
            name: "status_operacao",
            arguments: { id: 2 },
          })
        ).isError,
      ).not.toBe(true);
      expect(
        (await a.client.callTool({ name: "minhas_operacoes", arguments: {} }))
          .content,
      ).toEqual([{ type: "text", text: '[{"id":1}]' }]);
    } finally {
      await a.client.close();
      await b.client.close();
    }
  });
  it("registers quote requests for the verified account when granted write scope", async () => {
    const { client } = await connect(["quotes:write"], 17);
    const input = {
      produto: "Frasco PET",
      especificacoes: "500 ml com tampa",
      quantidade: "1500",
      unidade: "UN",
      destinoCidade: "Itajaí",
      destinoUf: "SC",
      prazoDesejado: "Em até 90 dias",
    };
    try {
      expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(
        ["solicitar_cotacao"],
      );
      const result = await client.callTool({
        name: "solicitar_cotacao",
        arguments: { ...input, chaveIdempotencia: "pedido-381" },
      });
      expect(result.isError).not.toBe(true);
      expect(mocks.submit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 17 }),
        input,
        "pedido-381",
      );
    } finally {
      await client.close();
    }
  });
  it("does not expose tools without scopes", async () => {
    const { client } = await connect([]);
    try {
      expect(client.getServerCapabilities()?.tools).toBeUndefined();
      await expect(
        client.callTool({ name: "status_operacao", arguments: { id: 1 } }),
      ).rejects.toThrow();
    } finally {
      await client.close();
    }
  });
  it("keeps the remote endpoint disabled before authorization review", async () => {
    delete process.env.MCP_ENABLED;
    delete process.env.MCP_AUTHORIZATION_REVIEWED;
    const route = (mcpRouter as any).stack.find(
      (s: any) => s.route?.path === "/mcp",
    );
    const res = { sendStatus: vi.fn() };
    await route.route.stack[0].handle({}, res);
    expect(res.sendStatus).toHaveBeenCalledWith(404);
  });
});
