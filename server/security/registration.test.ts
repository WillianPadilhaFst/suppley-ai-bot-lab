import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  rows: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));
vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.rows }) }) }),
    insert: () => ({ values: mocks.insert }),
    update: () => ({ set: () => ({ where: mocks.update }) }),
  }),
}));
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
    compare: vi.fn(async () => true),
  },
}));
vi.mock("./abuse", () => ({
  audit: vi.fn(async () => {}),
  consumeLimit: vi.fn(async () => {}),
}));
import { router } from "../_core/trpc";
import { consumeLimit } from "./abuse";
import { authRouter } from "../routers/authRouter";
import { loginUser } from "../services/authService";
// Preserve the real auth.* middleware paths without loading unrelated application routes.
const registrationRouter = router({ auth: authRouter });
const pending = {
  id: 1,
  name: "External",
  email: "jean@suppley.com.br",
  passwordHash: "hash",
  role: "public",
  approvalStatus: "pending",
};
beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = "mysql://test:test@localhost/test_only";
  mocks.insert.mockResolvedValue([{ insertId: 1 }]);
});
describe("controlled registration", () => {
  it("never grants role by owner email or client role and never creates a session", async () => {
    mocks.rows.mockResolvedValueOnce([]).mockResolvedValueOnce([pending]);
    const cookie = vi.fn();
    const api = registrationRouter.createCaller({
      user: null,
      req: { ip: "test", headers: {} },
      res: { cookie },
    } as any);
    const result = await api.auth.register({
      name: "External",
      email: "jean@suppley.com.br",
      password: "long-password",
      role: "admin",
    } as any);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "public",
        approvalStatus: "pending",
        passwordHash: "hashed-password",
      }),
    );
    expect(result).toEqual({ success: true, pendingApproval: true });
    expect(cookie).not.toHaveBeenCalled();
    expect(consumeLimit).toHaveBeenCalledWith("auth:test", 20, 60000);
  });
  it("does not allow pending accounts to log in even with a valid password", async () => {
    mocks.rows.mockResolvedValue([pending]);
    expect(
      (await loginUser({ email: pending.email, password: "correct" })).success,
    ).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
