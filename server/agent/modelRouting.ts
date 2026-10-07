import { MODELS, type Message } from "../_core/llm";

/**
 * Turnos curtos de confirmação/continuidade não precisam pagar a latência do
 * modelo mais pesado. Mantemos o contexto e as mesmas tools; apenas usamos o
 * modelo balanceado quando a mensagem atual é inequivocamente conversacional.
 */
const QUICK_TURN =
  /^(?:oi|ol[aá]|bom dia|boa tarde|boa noite|ok|okay|sim|n[aã]o|beleza|blz|perfeito|entendi|obrigad[oa]|valeu|show|isso|exato|pode seguir|pode continuar|continue|continua|opa deu boa|deu boa)[\s!.?]*$/i;

export function isQuickConversationalTurn(messages: Message[]): boolean {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last || typeof last.content !== "string") return false;
  const text = last.content.trim().replace(/\s+/g, " ");
  return text.length <= 120 && QUICK_TURN.test(text);
}

export function modelForTurn(messages: Message[], deepReasoning: boolean): string {
  if (!deepReasoning && isQuickConversationalTurn(messages)) {
    return MODELS.balanced;
  }
  return MODELS.smart;
}
