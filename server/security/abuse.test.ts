import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), db: vi.fn() }));
vi.mock("../db/connection", () => ({ getDb: mocks.db }));
import { consumeLimit, positiveLimit, reserveAi } from "./abuse";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.mockResolvedValue({ execute: mocks.execute });
});
describe("durable usage limits", () => {
  it("rejects exhausted allowance and unavailable storage", async () => {
    mocks.execute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ used: 6 }]]);
    await expect(consumeLimit("user:1", 5, 60000)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    mocks.db.mockResolvedValue(null);
    await expect(reserveAi(1)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });
  it("rejects unsafe configuration instead of silently disabling limits", () => {
    process.env.TEST_LIMIT = "-1";
    expect(() => positiveLimit("TEST_LIMIT", 5)).toThrow();
    process.env.TEST_LIMIT = "NaN";
    expect(() => positiveLimit("TEST_LIMIT", 5)).toThrow();
    process.env.TEST_LIMIT = "3";
    expect(positiveLimit("TEST_LIMIT", 5)).toBe(3);
  });
  it("allows requests below the limit", async () => {
    mocks.execute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ used: 1 }]]);
    await expect(consumeLimit("user:1", 5, 60000)).resolves.toBeUndefined();
  });
});
