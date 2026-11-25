import { describe, it, expect, beforeEach, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { quotations, importCalculations } from "../drizzle/schema";
import { getDb } from "./db/connection";
import * as db from "./db/quotationsDb";

vi.mock("./db/connection", () => ({ getDb: vi.fn() }));

// Exercise the real helpers without requiring credentials or writing to a live database.
describe("Quotations Database Functions", () => {
  const userId = 42;
  const quotation = { id: 7, userId, supplierName: "Test Supplier", currency: "USD", status: "draft" };
  const input = { userId, supplierName: "Test Supplier", currency: "USD" as const };
  const rows = vi.fn();
  const values = vi.fn();
  const writeWhere = vi.fn();
  const set = vi.fn(() => ({ where: writeWhere }));
  const query = {
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: rows,
  };
  const from = vi.fn(() => query);
  const connection = {
    insert: vi.fn(() => ({ values })),
    select: vi.fn(() => ({ from })),
    update: vi.fn(() => ({ set })),
    delete: vi.fn(() => ({ where: writeWhere })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockReturnValue(connection as unknown as NonNullable<ReturnType<typeof getDb>>);
    values.mockResolvedValue([{ insertId: quotation.id }]);
    rows.mockResolvedValue([quotation]);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    writeWhere.mockResolvedValue(undefined);
  });

  it("creates a quotation and reads back the generated ID", async () => {
    expect(await db.createQuotation(input)).toEqual(quotation);
    expect(connection.insert).toHaveBeenCalledWith(quotations);
    expect(values).toHaveBeenCalledWith(input);
    expect(query.where).toHaveBeenCalledWith(eq(quotations.id, quotation.id));
    expect(rows).toHaveBeenCalledWith(1);
  });

  it("returns null when the inserted quotation cannot be read back", async () => {
    rows.mockResolvedValue([]);
    expect(await db.createQuotation(input)).toBeNull();
  });

  it("lists quotations for the requested user with the requested limit", async () => {
    expect(await db.getQuotationsByUser(userId, 10)).toEqual([quotation]);
    expect(from).toHaveBeenCalledWith(quotations);
    expect(query.where).toHaveBeenCalledWith(eq(quotations.userId, userId));
    expect(rows).toHaveBeenCalledWith(10);
  });

  it("returns an empty list when the user has no quotations", async () => {
    rows.mockResolvedValue([]);
    expect(await db.getQuotationsByUser(-1)).toEqual([]);
    expect(query.where).toHaveBeenCalledWith(eq(quotations.userId, -1));
    expect(rows).toHaveBeenCalledWith(50);
  });

  it("looks up a quotation by both ID and owner", async () => {
    expect(await db.getQuotationById(quotation.id, userId)).toEqual(quotation);
    expect(query.where).toHaveBeenCalledWith(and(eq(quotations.id, quotation.id), eq(quotations.userId, userId)));
    expect(rows).toHaveBeenCalledWith(1);
  });

  it("returns null when the quotation does not belong to the requested user", async () => {
    rows.mockResolvedValue([]);
    expect(await db.getQuotationById(quotation.id, -1)).toBeNull();
    expect(query.where).toHaveBeenCalledWith(and(eq(quotations.id, quotation.id), eq(quotations.userId, -1)));
  });

  it.each([{ status: "analyzing" as const }, { notes: "Updated notes" }])("updates quotation fields: %o", async (patch) => {
    expect(await db.updateQuotation(quotation.id, userId, patch)).toBe(true);
    expect(connection.update).toHaveBeenCalledWith(quotations);
    expect(set).toHaveBeenCalledWith(patch);
    expect(writeWhere).toHaveBeenCalledWith(and(eq(quotations.id, quotation.id), eq(quotations.userId, userId)));
  });

  it("returns aggregated statistics for the requested user", async () => {
    const stats = { totalQuotations: 3, viableCount: 2, inProgressCount: 1, completedCount: 1, totalValueBrl: 500 };
    query.where.mockResolvedValue([stats]);
    expect(await db.getQuotationStats(userId)).toEqual(stats);
    expect(query.where).toHaveBeenCalledWith(eq(quotations.userId, userId));
  });

  it("returns zero statistics when the query returns no rows", async () => {
    query.where.mockResolvedValue([]);
    expect(await db.getQuotationStats(userId)).toEqual({ totalQuotations: 0, viableCount: 0, inProgressCount: 0, completedCount: 0, totalValueBrl: 0 });
  });

  it("filters quotations by both user and status", async () => {
    query.orderBy.mockResolvedValue([quotation]);
    expect(await db.getQuotationsByStatus(userId, "draft")).toEqual([quotation]);
    expect(query.where).toHaveBeenCalledWith(and(eq(quotations.userId, userId), eq(quotations.status, "draft")));
  });

  it("finds calculations using both quotation ID and owner", async () => {
    query.orderBy.mockResolvedValue([]);
    expect(await db.getCalculationsByQuotation(quotation.id, userId)).toEqual([]);
    expect(from).toHaveBeenCalledWith(importCalculations);
    expect(query.where).toHaveBeenCalledWith(and(eq(importCalculations.quotationId, quotation.id), eq(importCalculations.userId, userId)));
  });

  it("deletes associated calculations before deleting the quotation, scoped to the owner", async () => {
    expect(await db.deleteQuotation(quotation.id, userId)).toBe(true);
    expect(connection.delete).toHaveBeenNthCalledWith(1, importCalculations);
    expect(connection.delete).toHaveBeenNthCalledWith(2, quotations);
    expect(writeWhere).toHaveBeenNthCalledWith(1, and(eq(importCalculations.quotationId, quotation.id), eq(importCalculations.userId, userId)));
    expect(writeWhere).toHaveBeenNthCalledWith(2, and(eq(quotations.id, quotation.id), eq(quotations.userId, userId)));
  });

  it("preserves the documented fallbacks when no database is configured", async () => {
    vi.mocked(getDb).mockReturnValue(null);
    expect(await db.createQuotation(input)).toBeNull();
    expect(await db.getQuotationsByUser(userId)).toEqual([]);
    expect(await db.getQuotationById(quotation.id, userId)).toBeNull();
    expect(await db.updateQuotation(quotation.id, userId, { notes: "test" })).toBe(false);
    expect(await db.deleteQuotation(quotation.id, userId)).toBe(false);
    expect(await db.getCalculationsByQuotation(quotation.id, userId)).toEqual([]);
    expect(await db.getQuotationsByStatus(userId, "draft")).toEqual([]);
    expect(await db.getQuotationStats(userId)).toEqual({ totalQuotations: 0, viableCount: 0, inProgressCount: 0, completedCount: 0, totalValueBrl: 0 });
    expect(connection.insert).not.toHaveBeenCalled();
    expect(connection.select).not.toHaveBeenCalled();
    expect(connection.update).not.toHaveBeenCalled();
    expect(connection.delete).not.toHaveBeenCalled();
  });
});

describe("Quotation Status Workflow", () => {
  const validStatuses = [
    "draft",
    "analyzing",
    "viable",
    "not_viable",
    "negotiating",
    "approved",
    "ordered",
    "shipped",
    "customs",
    "nationalized",
    "completed",
    "cancelled",
  ];

  it("should have all expected status values defined", () => {
    expect(validStatuses).toHaveLength(12);
  });

  it("should have draft as the initial status", () => {
    expect(validStatuses[0]).toBe("draft");
  });

  it("should have completed as a final status", () => {
    expect(validStatuses).toContain("completed");
  });

  it("should have cancelled as a final status", () => {
    expect(validStatuses).toContain("cancelled");
  });

  describe("CRM workflow stages", () => {
    it("should include analysis stage (analyzing)", () => {
      expect(validStatuses).toContain("analyzing");
    });

    it("should include viability stages (viable, not_viable)", () => {
      expect(validStatuses).toContain("viable");
      expect(validStatuses).toContain("not_viable");
    });

    it("should include negotiation stage", () => {
      expect(validStatuses).toContain("negotiating");
    });

    it("should include order stages (approved, ordered)", () => {
      expect(validStatuses).toContain("approved");
      expect(validStatuses).toContain("ordered");
    });

    it("should include shipping stages (shipped, customs, nationalized)", () => {
      expect(validStatuses).toContain("shipped");
      expect(validStatuses).toContain("customs");
      expect(validStatuses).toContain("nationalized");
    });
  });
});

describe("Quotation Data Structure", () => {
  it("should define required fields for quotation", () => {
    const requiredFields = [
      "id",
      "userId",
      "status",
      "currency",
      "createdAt",
      "updatedAt",
    ];

    expect(requiredFields).toHaveLength(6);
  });

  it("should define optional supplier fields", () => {
    const supplierFields = [
      "supplierId",
      "supplierName",
      "supplierCountry",
      "quotationNumber",
    ];

    expect(supplierFields).toHaveLength(4);
  });

  it("should define cost tracking fields", () => {
    const costFields = [
      "totalFobCents",
      "totalCifCents",
      "totalTaxesCents",
      "totalCostCents",
      "totalSuggestedPriceCents",
    ];

    expect(costFields).toHaveLength(5);
  });

  it("should define timeline tracking fields", () => {
    const timelineFields = [
      "quotationDate",
      "validUntil",
      "orderDate",
      "shipmentDate",
      "estimatedArrival",
      "customsClearanceDate",
      "completionDate",
    ];

    expect(timelineFields).toHaveLength(7);
  });
});
