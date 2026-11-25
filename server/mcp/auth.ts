import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { sql } from "drizzle-orm";
import { getDb } from "../db/connection";
import { getUserById } from "../services/authService";
import { requireApproved } from "../security/policy";
export type McpIdentity = {
  user: NonNullable<Awaited<ReturnType<typeof getUserById>>>;
  scopes: Set<string>;
};
export const integrationScopes = [
  "operations:read",
  "operations:write",
  "excambia:analyze",
  "quotes:read",
  "quotes:write",
] as const;

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
export async function verifyMcpToken(
  token: string,
  key?: JWTVerifyGetKey,
  audience = process.env.MCP_RESOURCE_URL,
): Promise<McpIdentity> {
  const issuer = process.env.MCP_OAUTH_ISSUER,
    jwksUrl = process.env.MCP_JWKS_URL;
  if (
    !issuer ||
    !audience ||
    !jwksUrl ||
    ![issuer, audience, jwksUrl].every((v) => v.startsWith("https://"))
  )
    throw new Error("MCP OAuth not configured");
  jwks ??= createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jwtVerify(token, key ?? jwks, {
    issuer,
    audience,
    algorithms: ["RS256", "ES256"],
    requiredClaims: ["sub", "exp", "iat", "aud", "iss"],
    maxTokenAge: "1h",
  });
  const client = payload.client_id ?? payload.azp;
  if (
    typeof client !== "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.scope !== "string"
  )
    throw new Error("Invalid identity");
  const db = await getDb();
  if (!db) throw new Error("Unavailable");
  const [rows] = await db.execute(
    sql`SELECT userId, scopes, notBefore FROM mcp_identities WHERE issuer=${issuer} AND BINARY subject=${payload.sub} AND BINARY clientId=${client} AND enabled=1 LIMIT 1`,
  );
  const binding = (
    rows as unknown as Array<{
      userId: number;
      scopes: string;
      notBefore: Date;
    }>
  )[0];
  if (
    !binding ||
    payload.iat! < Math.floor(new Date(binding.notBefore).getTime() / 1000)
  )
    throw new Error("Revoked identity");
  const user = await getUserById(binding.userId);
  requireApproved(user);
  const granted = new Set(binding.scopes.split(" "));
  return {
    user: user!,
    scopes: new Set(payload.scope.split(" ").filter((s) => granted.has(s))),
  };
}
export function requireMcpScope(identity: McpIdentity, scope: string) {
  requireApproved(identity.user);
  if (!identity.scopes.has(scope)) throw new Error("Insufficient scope");
}
