import { createHash, generateKeyPairSync } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";
import { decodeJwt } from "jose";
import type { AdapterPayload } from "oidc-provider";
import { afterEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  user: {
    id: 42,
    role: "public",
    approvalStatus: "approved",
    sessionVersion: 1,
    email: "pilot@example.test",
  },
  records: new Map<string, AdapterPayload>(),
}));

vi.mock("./adapter", () => ({
  MysqlOAuthAdapter: class {
    constructor(private readonly model: string) {}
    async find(id: string) {
      return fixtures.records.get(`${this.model}:${id}`);
    }
    async findByUid(uid: string) {
      return [...fixtures.records].find(
        ([key, row]) => key.startsWith(`${this.model}:`) && row.uid === uid,
      )?.[1];
    }
    async findByUserCode() {
      return undefined;
    }
    async upsert(id: string, payload: AdapterPayload) {
      fixtures.records.set(`${this.model}:${id}`, payload);
    }
    async destroy(id: string) {
      fixtures.records.delete(`${this.model}:${id}`);
    }
    async consume(id: string) {
      (await this.find(id))!.consumed = Math.floor(Date.now() / 1000);
    }
    async revokeByGrantId() {}
  },
}));
vi.mock("../security/abuse", () => ({
  audit: vi.fn(),
  consumeLimit: vi.fn(async () => {}),
}));
vi.mock("../security/session", () => ({
  sessionSecret: () => Buffer.from("test-only-excambia-portal-signing-key"),
  resolveSession: async (req: express.Request) =>
    req.headers.cookie?.includes("portal=approved") ? fixtures.user : null,
}));
vi.mock("../services/authService", () => ({
  getUserById: async (id: number) =>
    id === fixtures.user.id ? fixtures.user : undefined,
}));

import { verifyMcpToken } from "../mcp/auth";
import { readLocalOAuthConfig } from "./config";
import { createOAuthRouter } from "./router";

afterEach(() => {
  fixtures.records.clear();
  fixtures.user.sessionVersion = 1;
  vi.unstubAllEnvs();
});

describe("OAuth da Excambia", () => {
  it("requires portal login and consent with PKCE, issues resource-bound tokens and revokes stale sessions", async () => {
    const app = express();
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = `127.0.0.1:${(server.address() as AddressInfo).port}`;
    const local = `http://${address}`;
    const origin = `https://${address}`;
    const resource = `${origin}/mcp`;
    const redirect = "https://cliente.example.test/callback";
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    vi.stubEnv("APP_URL", origin);
    vi.stubEnv("MCP_RESOURCE_URL", resource);
    vi.stubEnv("INTEGRATION_API_RESOURCE_URL", `${origin}/api/v1`);
    vi.stubEnv("EXCAMBIA_OAUTH_ENABLED", "true");
    vi.stubEnv("EXCAMBIA_OAUTH_CHATGPT", "true");
    const chatgptId = "https://chatgpt.com/oauth/client.json";
    const chatgptCallback =
      "https://chatgpt.com/connector_platform_oauth_redirect";
    const fetchHttp = globalThis.fetch;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, options) => {
        if (String(input) === chatgptId)
          return Promise.resolve(
            Response.json({
              client_id: chatgptId,
              client_name: "ChatGPT",
              redirect_uris: [chatgptCallback],
              grant_types: [
                "authorization_code",
                "refresh_token",
                "urn:ietf:params:oauth:grant-type:jwt-bearer",
              ],
              response_types: ["code"],
              token_endpoint_auth_method: "private_key_jwt",
              token_endpoint_auth_methods_supported: [
                "private_key_jwt",
                "none",
              ],
              jwks_uri: "https://chatgpt.com/oauth/jwks.json",
            }),
          );
        return fetchHttp(input, options);
      });
    vi.stubEnv(
      "EXCAMBIA_OAUTH_CLIENTS",
      JSON.stringify([
        {
          client_id: "pilot",
          client_name: "App piloto",
          redirect_uris: [redirect],
          resource: "mcp",
        },
        {
          client_id: "pilot-rest",
          client_name: "App REST",
          redirect_uris: [redirect],
          resource: "rest",
        },
      ]),
    );
    vi.stubEnv(
      "EXCAMBIA_OAUTH_JWKS",
      JSON.stringify({
        keys: [{ ...privateKey.export({ format: "jwk" }), kid: "test" }],
      }),
    );
    app.use(createOAuthRouter(readLocalOAuthConfig()!));
    const cookies = new Map<string, string>();
    let loggedIn = false;

    async function request(path: string, options: RequestInit = {}) {
      const url = new URL(path, origin);
      expect(url.origin).toBe(origin);
      const headers = {
        host: new URL(origin).host,
        "x-forwarded-proto": "https",
        cookie: [
          ...cookies.entries(),
          ...(loggedIn ? [["portal", "approved"]] : []),
        ]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
        ...options.headers,
      };
      const res = await fetch(`${local}${url.pathname}${url.search}`, {
        ...options,
        headers,
        redirect: "manual",
      });
      for (const cookie of res.headers.getSetCookie()) {
        const [name, value] = cookie.split(";")[0].split("=");
        if (value) cookies.set(name, value);
        else cookies.delete(name);
      }
      return res;
    }

    try {
      const discovery = await request(
        "/.well-known/oauth-authorization-server/oauth",
      );
      expect(discovery.status).toBe(307);
      const metadataResponse = await request(
        discovery.headers.get("location")!,
      );
      expect(metadataResponse.status).toBe(200);
      const metadata = await metadataResponse.json();
      expect(metadata.issuer).toBe(`${origin}/oauth`);
      expect(metadata.authorization_response_iss_parameter_supported).toBe(
        true,
      );
      expect(metadata.code_challenge_methods_supported).toContain("S256");
      expect(metadata.client_id_metadata_document_supported).toBe(true);
      const publicKeys = await (await request(metadata.jwks_uri)).json();
      expect(publicKeys.keys[0]).not.toHaveProperty("d");

      const verifier =
        "test-pkce-verifier-with-at-least-forty-three-characters";
      const auth = new URL(metadata.authorization_endpoint);
      auth.search = new URLSearchParams({
        client_id: "pilot",
        redirect_uri: redirect,
        response_type: "code",
        resource,
        scope: "quotes:read offline_access",
        prompt: "consent",
        state: "test-state",
        code_challenge_method: "S256",
        code_challenge: createHash("sha256")
          .update(verifier)
          .digest("base64url"),
      }).toString();
      const chatgpt = new URL(auth);
      chatgpt.searchParams.set("client_id", chatgptId);
      chatgpt.searchParams.set("redirect_uri", chatgptCallback);
      const chatgptStart = await request(chatgpt.href);
      expect(chatgptStart.headers.get("location")).toMatch(
        /^\/oauth\/interacao\//,
      );
      expect(
        fetchSpy.mock.calls.some(([url]) => String(url) === chatgptId),
      ).toBe(true);
      cookies.clear();

      const broken = new URL(auth);
      broken.searchParams.delete("code_challenge");
      const missingPkce = await request(broken.href);
      expect(
        new URL(missingPkce.headers.get("location")!).searchParams.get("error"),
      ).toBe("invalid_request");

      const authorized = await request(auth.href);
      const interaction = authorized.headers.get("location")!;
      expect(interaction).toMatch(/^\/oauth\/interacao\//);
      expect(await (await request(interaction)).text()).toContain(
        "/login?oauth=",
      );
      loggedIn = true;
      expect(await (await request(interaction)).text()).toContain(
        fixtures.user.email,
      );

      const confirm = (path: string, from = origin) =>
        request(path, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            origin: from,
          },
          body: "decision=allow",
        });
      expect(
        (await confirm(interaction, "https://other.example.test")).status,
      ).toBe(403);
      const finishLogin = await confirm(interaction);
      const afterLogin = await request(finishLogin.headers.get("location")!);
      const consent = afterLogin.headers.get("location")!;
      expect(consent).toMatch(/^\/oauth\/interacao\//);
      expect(await (await request(consent)).text()).toContain("quotes:read");
      const finishConsent = await confirm(consent);
      const grant = await request(finishConsent.headers.get("location")!);
      const callback = new URL(grant.headers.get("location")!);
      expect(callback.origin + callback.pathname).toBe(redirect);
      expect(callback.searchParams.get("state")).toBe("test-state");
      expect(callback.searchParams.get("iss")).toBe(metadata.issuer);
      const code = callback.searchParams.get("code");
      expect(code).toBeTruthy();

      const exchange = (codeVerifier: string) =>
        request(metadata.token_endpoint, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: "pilot",
            redirect_uri: redirect,
            resource,
            grant_type: "authorization_code",
            code: code!,
            code_verifier: codeVerifier,
          }),
        });
      expect((await exchange(verifier + "invalid")).status).toBe(400);
      const tokenResponse = await exchange(verifier);
      expect(tokenResponse.status).toBe(200);
      const { access_token: token, refresh_token: refresh } =
        await tokenResponse.json();
      expect(decodeJwt(token)).toMatchObject({
        aud: resource,
        client_id: "pilot",
        scope: "quotes:read",
      });
      expect((await verifyMcpToken(token)).user.id).toBe(fixtures.user.id);
      await expect(
        verifyMcpToken(token, undefined, `${origin}/api/v1`),
      ).rejects.toThrow();
      expect(refresh).toBeTruthy();
      const refreshRequest = (refreshToken: string) =>
        request(metadata.token_endpoint, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: "pilot",
            resource,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        });
      const refreshedResponse = await refreshRequest(refresh);
      expect(refreshedResponse.status).toBe(200);
      const refreshed = await refreshedResponse.json();
      expect(refreshed.refresh_token).not.toBe(refresh);
      expect((await verifyMcpToken(refreshed.access_token)).user.id).toBe(
        fixtures.user.id,
      );
      fixtures.user.sessionVersion++;
      expect((await refreshRequest(refreshed.refresh_token)).status).toBe(400);
      expect((await exchange(verifier)).status).toBe(400);
      await expect(verifyMcpToken(token)).rejects.toThrow();
    } finally {
      fetchSpy.mockRestore();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
