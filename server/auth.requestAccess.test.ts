import { describe, expect, it, vi } from "vitest";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/authRouter";
import { sendEmail } from "./services/emailService";
import { consumeLimit } from "./security/abuse";
vi.mock("./services/emailService", () => ({ sendEmail: vi.fn(async () => ({ success: true })) }));
vi.mock("./security/abuse", () => ({ audit: vi.fn(), consumeLimit: vi.fn() }));
const appRouter = router({ auth: authRouter });
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.requestAccess", () => {
  it("accepts a valid corporate access request from an unauthenticated visitor", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.auth.requestAccess({
      name: "Willian Padilha",
      company: "SUPPLEY Industrial Ltda",
      email: "compras@empresa.com.br",
      phone: "(47) 99999-0000",
      demanda: "Simulação: Aço & Metalurgia (NCM 7308.40.00) · FOB US$ 85.000",
    });

    expect(result.success).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: "compras@empresa.com.br" }));
    expect(consumeLimit).toHaveBeenCalledWith("auth:unknown", 20, 60000);
    expect(typeof result.emailSent).toBe("boolean");
  });

  it("rejects invalid email addresses", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.auth.requestAccess({
        name: "Willian",
        company: "SUPPLEY",
        email: "email-invalido",
      })
    ).rejects.toThrow();
  });
});
