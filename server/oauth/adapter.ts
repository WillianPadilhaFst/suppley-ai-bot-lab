import { createHash } from "node:crypto";
import { and, eq, gt, isNull, or, type SQL } from "drizzle-orm";
import { errors, type Adapter, type AdapterPayload } from "oidc-provider";
import { excambiaOauthRecords as records } from "../../drizzle/schema";
import { getDb } from "../db/connection";

const now = () => Math.floor(Date.now() / 1000);
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

function database() {
  const db = getDb();
  if (!db) throw new Error("OAuth database unavailable");
  return db;
}

export class MysqlOAuthAdapter implements Adapter {
  constructor(private readonly model: string) {}

  private key(id: string) {
    return hash(JSON.stringify([this.model, id]));
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn: number) {
    const values = {
      model: this.model,
      payload,
      uid: payload.uid ? hash(payload.uid) : null,
      userCode: payload.userCode ? hash(payload.userCode) : null,
      grantId: payload.grantId ? hash(payload.grantId) : null,
      expiresAt: expiresIn != null ? now() + expiresIn : null,
    };
    await database()
      .insert(records)
      .values({ id: this.key(id), ...values })
      .onDuplicateKeyUpdate({ set: values });
  }

  private async lookup(condition: SQL) {
    const [row] = await database()
      .select({
        payload: records.payload,
        consumedAt: records.consumedAt,
      })
      .from(records)
      .where(
        and(
          eq(records.model, this.model),
          condition,
          or(isNull(records.expiresAt), gt(records.expiresAt, now())),
        ),
      )
      .limit(1);
    if (!row) return undefined;
    return {
      ...(row.payload as AdapterPayload),
      ...(row.consumedAt && { consumed: row.consumedAt }),
    };
  }

  find(id: string) {
    return this.lookup(eq(records.id, this.key(id)));
  }

  findByUid(uid: string) {
    return this.lookup(eq(records.uid, hash(uid)));
  }

  findByUserCode(userCode: string) {
    return this.lookup(eq(records.userCode, hash(userCode)));
  }

  async consume(id: string) {
    const [result] = await database()
      .update(records)
      .set({ consumedAt: now() })
      .where(
        and(
          eq(records.id, this.key(id)),
          isNull(records.consumedAt),
          or(isNull(records.expiresAt), gt(records.expiresAt, now())),
        ),
      );
    if (!result.affectedRows) throw new errors.InvalidGrant("Already consumed");
  }

  async destroy(id: string) {
    await database()
      .delete(records)
      .where(eq(records.id, this.key(id)));
  }

  async revokeByGrantId(grantId: string) {
    await database()
      .delete(records)
      .where(
        and(eq(records.model, this.model), eq(records.grantId, hash(grantId))),
      );
  }
}
