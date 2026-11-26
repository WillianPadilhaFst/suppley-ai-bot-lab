import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
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
