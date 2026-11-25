import { findOAuthAccount } from "../oauth/account";
import { MysqlOAuthAdapter } from "../oauth/adapter";
import {
  getLocalKeyResolver,
  getOAuthIssuer,
  localOAuthIssuer,
} from "../oauth/config";
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
  const issuer = getOAuthIssuer(),
    localIssuer = localOAuthIssuer(),
    jwksUrl = process.env.MCP_JWKS_URL;
  if (
    !issuer ||
    !audience ||
    !audience.startsWith("https://") ||
    !issuer.startsWith("https://") ||
    (!localIssuer && !jwksUrl?.startsWith("https://"))
  )
    throw new Error("MCP OAuth not configured");
  const resolver =
    key ??
    (localIssuer
      ? getLocalKeyResolver()
      : (jwks ??= createRemoteJWKSet(new URL(jwksUrl!))));
  const { payload } = await jwtVerify(token, resolver, {
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
  if (localIssuer) {
    if (typeof payload.excambia_grant !== "string")
      throw new Error("Missing consent");
    const grant = await new MysqlOAuthAdapter("Grant").find(
      payload.excambia_grant,
    );
    if (grant?.accountId !== payload.sub || grant.clientId !== client)
      throw new Error("Revoked consent");
    const user = await findOAuthAccount(payload.sub);
    requireApproved(user);
    return {
      user,
      scopes: new Set(
        payload.scope
          .split(" ")
          .filter((scope) =>
            integrationScopes.some((allowed) => allowed === scope),
          ),
      ),
    };
  }
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
