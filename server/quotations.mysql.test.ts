// Full history: RUN_MIGRATIONS_MYSQL=1 npm test -- server/quotations.mysql.test.ts
// Run explicitly: RUN_QUOTATIONS_MYSQL=1 npm test -- server/quotations.mysql.test.ts
// Requires Docker. Always creates its own disposable MySQL; never uses DATABASE_URL.
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDbConnection } from "./db/connection";
import * as helpers from "./db/quotationsDb";
import { quotations, importCalculations } from "../drizzle/schema";

const migrationMode = process.env.RUN_MIGRATIONS_MYSQL === "1";
const enabled = migrationMode || process.env.RUN_QUOTATIONS_MYSQL === "1";

it("registers every historical migration exactly once in dependency order", () => {
  const journal = JSON.parse(readFileSync("./drizzle/meta/_journal.json", "utf8"));
  const files = readdirSync("./drizzle").filter(name => /^\d{4}[a-z]?_.*\.sql$/.test(name) || /^migrations-.*\.sql$/.test(name));
  const tags = journal.entries.map((entry: { tag: string }) => entry.tag);
  expect([...tags].sort()).toEqual(files.map(file => file.slice(0, -4)).sort());
  expect(new Set(tags).size).toBe(tags.length);
  journal.entries.forEach((entry: { idx: number; when: number }, index: number) => {
    expect(entry.idx).toBe(index);
    if (index) expect(entry.when).toBeGreaterThan(journal.entries[index - 1].when);
  });
  expect(tags.indexOf("0024a_industries_baseline")).toBeLessThan(tags.indexOf("migrations-fase5"));
  expect(tags.indexOf("migrations-fase5")).toBeLessThan(tags.indexOf("0025_sprint1_proformas"));
});

describe.skipIf(!enabled)("Quotations with isolated MySQL 8.4", () => {
  const name = `quotations-test-${randomUUID()}`;
  const password = randomUUID();
  const originalUrl = process.env.DATABASE_URL;
  let database: NonNullable<ReturnType<typeof getDb>>;
  let containerCreated = false;
  const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8", timeout: 30000 }).trim();
  const userId = 101;
  const otherUserId = 202;
  const create = (overrides: Partial<typeof quotations.$inferInsert> = {}) => helpers.createQuotation({
    userId, supplierName: "Integration supplier", supplierCountry: "Paraguai", currency: "USD", ...overrides,
  });

  beforeAll(async () => {
    docker("run", "--detach", "--rm", "--name", name,
      "--tmpfs", "/var/lib/mysql", "--publish", "127.0.0.1::3306",
      "--env", `MYSQL_ROOT_PASSWORD=${password}`, "--env", "MYSQL_DATABASE=quotations_test",
      "mysql:8.4");
    containerCreated = true;
    const binding = docker("port", name, "3306/tcp");
    const match = /^127\.0\.0\.1:(\d+)$/.exec(binding);
    if (!match) throw new Error("Expected a loopback-only MySQL port");
    // Replace any inherited URL before initializing the application's real connection.
    process.env.DATABASE_URL = `mysql://root:${password}@127.0.0.1:${match[1]}/quotations_test`;
    resetDbConnection();
    database = getDb()!;
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      try {
        await database.execute("SELECT 1");
        ready = true;
        break;
      } catch {
        await setTimeout(1000);
      }
    }
    if (!ready) throw new Error("Disposable MySQL did not become ready");
    if (migrationMode) {
      const { migrate } = await import("drizzle-orm/mysql2/migrator");
      await migrate(database, { migrationsFolder: "./drizzle" });
      await database.execute("INSERT INTO users (email, name) VALUES ('migration-sentinel@example.invalid', 'Preserved')");
      const [before] = await database.$client.promise().query("SELECT COUNT(*) AS n FROM __drizzle_migrations");
      await migrate(database, { migrationsFolder: "./drizzle" });
      const [after] = await database.$client.promise().query("SELECT COUNT(*) AS n FROM __drizzle_migrations");
      expect(after).toEqual(before);
      const [sentinel] = await database.$client.promise().query("SELECT name FROM users WHERE email = 'migration-sentinel@example.invalid'");
      expect(sentinel).toEqual([{ name: "Preserved" }]);
      return;
    }
    // Generate DDL from the application's current schema, without using its DB config.
    const ddl = execFileSync(process.execPath, [
      fileURLToPath(new URL("../node_modules/drizzle-kit/bin.cjs", import.meta.url)),
      "export", "--dialect", "mysql", "--schema", "./drizzle/schema.ts", "--sql",
    ], { encoding: "utf8", timeout: 30000 });
    const tables = ddl.match(/CREATE TABLE `(?:quotations|import_calculations)` \([\s\S]*?\);/g);
    if (tables?.length !== 2) throw new Error("Expected both quotation tables in generated schema");
    for (const statement of tables) await database.execute(statement);
  }, 120000);

  afterAll(async () => {
    try {
      if (database) await database.$client.promise().end();
    } finally {
      resetDbConnection();
      if (originalUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalUrl;
      if (containerCreated) docker("rm", "--force", name);
    }
  });

  beforeEach(async () => {
    await database.execute("TRUNCATE TABLE import_calculations");
    await database.execute("TRUNCATE TABLE quotations");
  });

  it.skipIf(!migrationMode)("matches all current application tables and columns after migration", async () => {
    const { is } = await import("drizzle-orm");
    const { MySqlTable, getTableConfig } = await import("drizzle-orm/mysql-core");
    const appSchema = await import("../drizzle/schema");
    const rfqSchema = await import("../drizzle/rfqSchema");
    const [columns] = await database.$client.promise().query("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()");
    const present = new Set((columns as unknown as { TABLE_NAME: string; COLUMN_NAME: string }[]).map(c => `${c.TABLE_NAME}.${c.COLUMN_NAME}`));
    const missing: string[] = [];
    for (const table of Object.values({ ...appSchema, ...rfqSchema })) {
      if (!is(table, MySqlTable)) continue;
      const config = getTableConfig(table);
      for (const column of config.columns) if (!present.has(`${config.name}.${column.name}`)) missing.push(`${config.name}.${column.name}`);
    }

    expect(missing).toEqual([]);
  });

  it("creates, reads, lists, updates and filters persisted quotations", async () => {
    const created = await create();
    expect(created).toMatchObject({ userId, supplierName: "Integration supplier", status: "draft", currency: "USD" });
    expect(created!.id).toBeGreaterThan(0);
    expect(created!.createdAt).toBeInstanceOf(Date);
    expect(await helpers.getQuotationById(created!.id, userId)).toEqual(created);
    expect(await helpers.getQuotationsByUser(userId, 1)).toEqual([created]);
    expect(await helpers.updateQuotation(created!.id, userId, { status: "viable", notes: "Persisted notes" })).toBe(true);
    expect(await helpers.getQuotationById(created!.id, userId)).toMatchObject({ status: "viable", notes: "Persisted notes" });
    expect(await helpers.getQuotationsByStatus(userId, "viable")).toHaveLength(1);
    expect(await helpers.getQuotationsByStatus(userId, "draft")).toEqual([]);
  });

  it("isolates reads, updates and deletes by owner", async () => {
    const created = (await create())!;
    await create({ userId: otherUserId });
    expect(await helpers.getQuotationById(created.id, otherUserId)).toBeNull();
    expect(await helpers.getQuotationsByUser(otherUserId)).toHaveLength(1);
    await helpers.updateQuotation(created.id, otherUserId, { notes: "Forbidden change" });
    await helpers.deleteQuotation(created.id, otherUserId);
    expect(await helpers.getQuotationById(created.id, userId)).toMatchObject({ notes: null });
  });

  it("returns numeric statistics for populated and empty users", async () => {
    expect(await helpers.getQuotationStats(userId)).toEqual({ totalQuotations: 0, viableCount: 0, inProgressCount: 0, completedCount: 0, totalValueBrl: 0 });
    await create({ status: "ordered", totalCostCents: 12345 });
    await create({ status: "completed", totalCostCents: 20000 });
    await create({ userId: otherUserId, status: "viable", totalCostCents: 99999 });
    expect(await helpers.getQuotationStats(userId)).toEqual({ totalQuotations: 2, viableCount: 2, inProgressCount: 1, completedCount: 1, totalValueBrl: 32345 });
  });

  it("deletes linked calculations while preserving another user's records", async () => {
    const created = (await create())!;
    const calculation = { userId, quotationId: created.id, productName: "Test product", ncmCode: "12345678", quantity: 1,
      originCountry: "Paraguai", fobValueCents: 100, exchangeRate: 5000000, cifBrlCents: 500,
      iiValueCents: 0, ipiValueCents: 0, pisValueCents: 0, cofinsValueCents: 0, icmsValueCents: 0,
      totalCostCents: 500, unitCostCents: 500, suggestedPriceCents: 650 };
    await database.insert(importCalculations).values([calculation, { ...calculation, userId: otherUserId }]);
    expect(await helpers.getCalculationsByQuotation(created.id, userId)).toHaveLength(1);
    await helpers.deleteQuotation(created.id, userId);
    expect(await helpers.getQuotationById(created.id, userId)).toBeNull();
    expect(await helpers.getCalculationsByQuotation(created.id, userId)).toEqual([]);
    expect(await helpers.getCalculationsByQuotation(created.id, otherUserId)).toHaveLength(1);
  });
});
