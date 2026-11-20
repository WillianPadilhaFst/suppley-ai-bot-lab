import { describe, it, expect, beforeAll } from "vitest";
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
// Dedicated integration suite, never points at the application/production database.
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("MySQL migration and owner isolation", () => {
  beforeAll(() => {
    const target = new URL(url!);
    if (!target.pathname.endsWith("_test") || process.env.DATABASE_URL !== url)
      throw Error(
        "Use the same disposable *_test database for DATABASE_URL and TEST_DATABASE_URL",
      );
  });
  it("preserves legacy users/passwords during migration", async () => {
    const target = new URL(url!);
    if (!target.pathname.endsWith("_test"))
      throw Error("Use a disposable *_test database");
    const conn = await mysql.createConnection(url!);
    try {
      await conn.query("CREATE DATABASE IF NOT EXISTS suppley_migration_test");
      await conn.query("USE suppley_migration_test");
      // This fixture database is exclusively owned by this integration test.
      for (const table of [
        "mcp_identities",
        "security_audit",
        "security_limits",
        "users",
      ])
        await conn.query(`DROP TABLE IF EXISTS ${table}`);
      await conn.query(
        "CREATE TABLE users(id INT PRIMARY KEY,role ENUM('user','admin') NOT NULL DEFAULT 'user',passwordHash VARCHAR(255),name VARCHAR(255))",
      );
      await conn.query(
        "INSERT INTO users VALUES (1,'admin','hash-admin','Legacy admin'),(2,'user','hash-user','Legacy user')",
      );
      const migration = await readFile(
        "drizzle/0050_public_access_mcp.sql",
        "utf8",
      );
      for (const statement of migration
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await conn.query(statement);
      const [users] = await conn.query("SELECT * FROM users ORDER BY id");
      expect(users).toEqual([
        expect.objectContaining({
          id: 1,
          role: "admin",
          passwordHash: "hash-admin",
          approvalStatus: "approved",
          sessionVersion: 0,
        }),
        expect.objectContaining({
          id: 2,
          role: "user",
          passwordHash: "hash-user",
          approvalStatus: "approved",
          sessionVersion: 0,
        }),
      ]);
    } finally {
      await conn.end();
    }
  }, 20000);
  it("does not return another user operation or confidential fields", async () => {
    const conn = await mysql.createConnection(url!);
    const a = { id: 900001, role: "public", approvalStatus: "approved" },
      b = { ...a, id: 900002 };
    try {
      await conn.query(
        "INSERT INTO operacoes(id,userId,codigo,titulo,fornecedorNome,valorEstimadoBrlCents) VALUES (900001,900001,'TEST-A','Own','SECRET SUPPLIER',12345),(900002,900002,'TEST-B','Foreign','FOREIGN SECRET',67890)",
      );
      const { getOwnOperation, listOwnOperations } =
        await import("../services/publicOperations");
      const own = await getOwnOperation(a, 900001);
      expect(own.titulo).toBe("Own");
      expect(own).not.toHaveProperty("fornecedorNome");
      expect(own).not.toHaveProperty("valorEstimadoBrlCents");
      await expect(getOwnOperation(a, 900002)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      expect((await listOwnOperations(a)).map((o) => o.id)).toEqual([900001]);
      expect((await listOwnOperations(b)).map((o) => o.id)).toEqual([900002]);
    } finally {
      await conn.query("DELETE FROM operacoes WHERE id IN (900001,900002)");
      await conn.end();
    }
  }, 20000);
});
