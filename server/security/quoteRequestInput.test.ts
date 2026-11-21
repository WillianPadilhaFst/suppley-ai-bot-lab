import { describe, it, expect } from "vitest";
import {
  quoteRequestInput,
  listQuoteInbox,
  reviewQuoteRequest,
  linkQuoteOperation,
  startQuoteOperation,
} from "../services/publicQuoteRequests";
const input = {
  produto: "Embalagens",
  especificacoes: "500 ml, reciclável",
  quantidade: "1500,5",
  unidade: "UN",
  destinoCidade: "Navegantes",
  destinoUf: "SC",
  prazoDesejado: "A definir",
};
describe("Quotation request boundary", () => {
  it("requires a complete request and rejects identity/admin fields", () => {
    expect(quoteRequestInput.parse(input)).toEqual(input);
    for (const patch of [
      { quantidade: "0" },
      { quantidade: "-1" },
      { quantidade: "NaN" },
      { destinoUf: "XX" },
      { especificacoes: "" },
      { userId: 2 },
      { status: "encerrada" },
      { operacaoId: 2 },
      { supplierId: 3 },
    ])
      expect(quoteRequestInput.safeParse({ ...input, ...patch }).success).toBe(
        false,
      );
  });
  it("does not allow public or internal operational users to administer the intake queue", async () => {
    for (const role of ["public", "user"]) {
      const user = { id: 1, role, approvalStatus: "approved" };
      await expect(listQuoteInbox(user)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        reviewQuoteRequest(user, 1, "em_analise"),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(startQuoteOperation(user, 1)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(linkQuoteOperation(user, 1, 1)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
  });
});
