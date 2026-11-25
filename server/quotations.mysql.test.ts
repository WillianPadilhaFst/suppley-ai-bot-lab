// Run explicitly: RUN_QUOTATIONS_MYSQL=1 npm test -- server/quotations.mysql.test.ts
// Requires Docker. Always creates its own disposable MySQL; never uses DATABASE_URL.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDbConnection } from "./db/connection";
import * as helpers from "./db/quotationsDb";
import { quotations, importCalculations } from "../drizzle/schema";

const enabled = process.env.RUN_QUOTATIONS_MYSQL === "1";

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
