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
        "public_quote_requests",
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
      const intakeMigration = await readFile(
        "drizzle/0051_public_quote_requests.sql",
        "utf8",
      );
      for (const statement of intakeMigration
        .split(";")
        .map((v) => v.trim())
        .filter(Boolean))
        await conn.query(statement);
      const [intakeTables] = await conn.query(
        "SHOW TABLES LIKE 'public_quote_requests'",
      );
      expect(intakeTables).toHaveLength(1);
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
  it("isolates quotation intake, deduplicates retries and enforces client ownership on links", async () => {
    const conn = await mysql.createConnection(url!);
    const a = { id: 900003, role: "public", approvalStatus: "approved" },
      b = { ...a, id: 900004 },
      admin = { id: 1, role: "admin", approvalStatus: "approved" };
    try {
      const migration = await readFile(
        "drizzle/0050_public_access_mcp.sql",
        "utf8",
      );
      for (const statement of migration
        .split(";")
        .map((v) => v.trim())
        .filter((v) => /^CREATE TABLE security_(audit|limits)/.test(v)))
        await conn.query(
          statement.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS"),
        );
      await conn.query(
        "INSERT INTO conversas(id,userId,titulo) VALUES (900003,900003,'Client A'),(900004,900004,'Client B')",
      );
      await conn.query(
        "INSERT INTO operacoes(id,userId,codigo,titulo) VALUES (900003,900003,'REQ-A','Client A'),(900004,900004,'REQ-B','Client B')",
      );
      const svc = await import("../services/publicQuoteRequests");
      const input = {
        produto: "Embalagens",
        especificacoes: "Material reciclável, 500 ml",
        quantidade: "1500",
        unidade: "UN",
        destinoCidade: "Navegantes",
        destinoUf: "SC",
        prazoDesejado: "A definir com a equipe",
      };
      await expect(
        svc.submitQuoteRequest(a, input, 900004),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      const first = await svc.submitQuoteRequest(a, input, 900003);
      expect((await svc.submitQuoteRequest(a, input, 900003)).id).toBe(
        first.id,
      );
      const second = await svc.submitQuoteRequest(
        b,
        { ...input, produto: "Produto do cliente B" },
        900004,
      );
      expect((await svc.listOwnQuoteRequests(a)).map((v) => v.produto)).toEqual(
        ["Embalagens"],
      );
      expect((await svc.listOwnQuoteRequests(b)).map((v) => v.produto)).toEqual(
        ["Produto do cliente B"],
      );
      expect(first).not.toHaveProperty("requestKey");
      expect(first).not.toHaveProperty("userId");
      await expect(svc.listQuoteInbox(a)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        svc.reviewQuoteRequest(a, first.id, "encerrada"),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        svc.linkQuoteOperation(admin, first.id, 900004),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await svc.linkQuoteOperation(admin, first.id, 900003);
      expect((await svc.listOwnQuoteRequests(a))[0]).toMatchObject({
        operacaoId: 900003,
        status: "vinculada",
      });
      await svc.reviewQuoteRequest(admin, second.id, "encerrada");
      await expect(
        svc.startQuoteOperation(admin, second.id),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await svc.reviewQuoteRequest(admin, second.id, "em_analise");
      const [started, retried] = await Promise.all([
        svc.startQuoteOperation(admin, second.id),
        svc.startQuoteOperation(admin, second.id),
      ]);
      expect(started.operacaoId).toBe(retried.operacaoId);
      const { getOwnOperation } = await import("../services/publicOperations");
      expect(await getOwnOperation(b, started.operacaoId)).toMatchObject({
        titulo: "Produto do cliente B",
        estagioAtual: "demand",
      });
      await expect(
        getOwnOperation(a, started.operacaoId),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await svc.reviewQuoteRequest(admin, first.id, "em_analise");
      expect((await svc.listOwnQuoteRequests(a))[0].status).toBe("em_analise");
    } finally {
      await conn.query(
        "DELETE FROM public_quote_requests WHERE userId IN (900003,900004)",
      );
      await conn.query("DELETE FROM conversas WHERE id IN (900003,900004)");
      await conn.query(
        "DELETE FROM operacao_eventos WHERE operacaoId IN (SELECT id FROM operacoes WHERE userId IN (900003,900004))",
      );
      await conn.query(
        "DELETE FROM operacao_estagios WHERE operacaoId IN (SELECT id FROM operacoes WHERE userId IN (900003,900004))",
      );
      await conn.query("DELETE FROM operacoes WHERE userId IN (900003,900004)");
      await conn.end();
    }
  }, 20000);
});
