import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKeyPair, SignJWT } from "jose";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), user: vi.fn() }));
vi.mock("../db/connection", () => ({
  getDb: vi.fn(async () => ({ execute: mocks.execute })),
}));
vi.mock("../services/authService", () => ({ getUserById: mocks.user }));
import { verifyMcpToken, requireMcpScope } from "./auth";
const user = { id: 7, role: "public", approvalStatus: "approved" };
const keys = await generateKeyPair("RS256");
const binding = {
  userId: 7,
  scopes: "operations:read",
  notBefore: new Date(0),
};
async function token(overrides: Record<string, unknown> = {}) {
  return new SignJWT({
    sub: "person-123",
    scope: "operations:read admin:write",
    client_id: "client-1",
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer("https://issuer.example")
    .setAudience("https://suppley.example/mcp")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(keys.privateKey);
}
beforeEach(() => {
  process.env.MCP_OAUTH_ISSUER = "https://issuer.example";
  process.env.MCP_RESOURCE_URL = "https://suppley.example/mcp";
  process.env.MCP_JWKS_URL = "https://issuer.example/jwks";
  mocks.execute.mockResolvedValue([[binding]]);
  mocks.user.mockResolvedValue(user);
});
describe("MCP external identities", () => {
  it("binds an individual and intersects token scopes with administrator grants", async () => {
    const identity = await verifyMcpToken(
      await token(),
      async () => keys.publicKey,
    );
    expect(identity.user.id).toBe(7);
    expect([...identity.scopes]).toEqual(["operations:read"]);
    expect(() => requireMcpScope(identity, "admin:write")).toThrow();
  });
  it("rejects wrong audience, issuer and signature", async () => {
    for (const [issuer, audience] of [
      ["https://other.example", "https://suppley.example/mcp"],
      ["https://issuer.example", "https://other.example"],
    ]) {
      const bad = await new SignJWT({
        sub: "person",
        scope: "operations:read",
        client_id: "client",
      })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(keys.privateKey);
      await expect(
        verifyMcpToken(bad, async () => keys.publicKey),
      ).rejects.toThrow();
    }
    const other = await generateKeyPair("RS256");
    await expect(
      verifyMcpToken(await token(), async () => other.publicKey),
    ).rejects.toThrow();
  });
  it("rejects unmapped/revoked bindings and unapproved accounts", async () => {
    mocks.execute.mockResolvedValue([[]]);
    await expect(
      verifyMcpToken(await token(), async () => keys.publicKey),
    ).rejects.toThrow();
    mocks.execute.mockResolvedValue([
      [{ ...binding, notBefore: new Date(Date.now() + 60000) }],
    ]);
    await expect(
      verifyMcpToken(await token(), async () => keys.publicKey),
    ).rejects.toThrow();
    mocks.execute.mockResolvedValue([[binding]]);
    mocks.user.mockResolvedValue({ ...user, approvalStatus: "pending" });
    await expect(
      verifyMcpToken(await token(), async () => keys.publicKey),
    ).rejects.toThrow();
  });
  it("rejects expired tokens and cookie-style session tokens", async () => {
    const expired = await new SignJWT({
      sub: "person",
      scope: "operations:read",
      client_id: "client",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("https://issuer.example")
      .setAudience("https://suppley.example/mcp")
      .setIssuedAt()
      .setExpirationTime("0s")
      .sign(keys.privateKey);
    await expect(
      verifyMcpToken(expired, async () => keys.publicKey),
    ).rejects.toThrow();
    await expect(
      verifyMcpToken("session.token.invalid", async () => keys.publicKey),
    ).rejects.toThrow();
  });
});
