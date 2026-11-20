import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "../db/connection";
export function positiveLimit(name: string, fallback: number, maximum = 10000) {
  const n = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(n) || n < 1 || n > maximum)
    throw new Error(`Invalid limit: ${name}`);
  return n;
}
export async function audit(
  actorId: number | null,
  action: string,
  outcome: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Audit database unavailable");
  await db.execute(
    sql`INSERT INTO security_audit (actorId, action, outcome) VALUES (${actorId}, ${action.slice(0, 100)}, ${outcome.slice(0, 30)})`,
  );
}
// Atomic durable counters work across workers/restarts. No prompt, token or email is logged.
export async function consumeLimit(key: string, max: number, windowMs: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
  const bucket = Math.floor(Date.now() / windowMs);
  const digest = createHash("sha256").update(key).digest("hex");
  await db.execute(sql`INSERT INTO security_limits (bucketKey, bucket, used) VALUES (${digest}, ${bucket}, 1)
    ON DUPLICATE KEY UPDATE used = IF(used < ${max + 1}, used + 1, used)`);
  const [rows] = await db.execute(
    sql`SELECT used FROM security_limits WHERE bucketKey=${digest} AND bucket=${bucket}`,
  );
  const used = (rows as unknown as Array<{ used: number }>)[0]?.used;
  if (!used || used > max)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Limite atingido. Tente novamente mais tarde.",
    });
}
export async function reserveAi(userId: number) {
  await consumeLimit(
    `ai-minute:${userId}`,
    positiveLimit("PUBLIC_AI_PER_MINUTE", 5),
    60000,
  );
  await consumeLimit(
    `ai-day:${userId}`,
    positiveLimit("PUBLIC_AI_PER_DAY", 40),
    86400000,
  );
}
