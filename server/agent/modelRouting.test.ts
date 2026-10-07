import { describe, expect, it } from "vitest";
import { MODELS, type Message } from "../_core/llm";
import {
  hasActionCriticalContext,
  isQuickConversationalTurn,
  modelForTurn,
  needsNativeWebSearch,
} from "./modelRouting";

const user = (content: string): Message => ({ role: "user", content });
const assistant = (content: string): Message => ({ role: "assistant", content });

describe("modelRouting", () => {
  it.each([
    "sim",
    "não",
    "ok",
    "pode seguir",
    "continua",
    "opa deu boa",
    "valeu!",
  ])("usa rota rápida para confirmação curta sem contexto crítico: %s", (text) => {
    expect(isQuickConversationalTurn([user(text)])).toBe(true);
    expect(modelForTurn([user(text)], false)).toBe(MODELS.balanced);
  });

  it("usa modelo balanceado para tarefa operacional substantiva sem deep reasoning", () => {
    const messages = [user("Calcule o custo de importação de 5.000 luminárias com FOB e frete informados")];
    expect(isQuickConversationalTurn(messages)).toBe(false);
    expect(modelForTurn(messages, false)).toBe(MODELS.balanced);
  });

  it("mantém modelo smart quando o turno exige raciocínio profundo", () => {
    const messages = [user("Compare três cenários estratégicos de sourcing e risco cambial")];
    expect(modelForTurn(messages, true)).toBe(MODELS.smart);
  });

  it.each([
    "Posso enviar a cotação para o fornecedor?",
    "Confirma o pagamento e posso prosseguir?",
    "Quer que eu cancele este pedido?",
    "Posso disparar a RFQ agora?",
  ])("mantém modelo smart para confirmação operacional: %s", (previous) => {
    const messages = [assistant(previous), user("sim")];
    expect(hasActionCriticalContext(messages)).toBe(true);
    expect(isQuickConversationalTurn(messages)).toBe(false);
    expect(modelForTurn(messages, false)).toBe(MODELS.smart);
  });

  it("mantém rota balanceada para confirmação puramente conversacional", () => {
    const messages = [assistant("Entendi. Posso continuar explicando esse ponto?"), user("pode continuar")];
    expect(isQuickConversationalTurn(messages)).toBe(true);
    expect(modelForTurn(messages, false)).toBe(MODELS.balanced);
  });

  it.each([
    "Pesquise na web a legislação atual sobre drawback",
    "Quero notícias atualizadas do mercado hoje",
    "Busque no site oficial se essa regra mudou recentemente",
  ])("habilita busca web nativa só quando explicitamente necessária: %s", (text) => {
    expect(needsNativeWebSearch([user(text)])).toBe(true);
  });

  it("não habilita busca web nativa para cálculo operacional comum", () => {
    expect(
      needsNativeWebSearch([
        user("Analise o custo de importação de 5.000 luminárias da China com FOB e frete"),
      ]),
    ).toBe(false);
  });
});
