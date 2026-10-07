import { MODELS, type Message } from "../_core/llm";

/**
 * Turnos curtos e tarefas operacionais rotineiras não precisam pagar a
 * latência do modelo mais pesado. Opus fica reservado para raciocínio
 * realmente profundo e confirmações de ações críticas.
 */
const QUICK_TURN =
  /^(?:oi|ol[aá]|bom dia|boa tarde|boa noite|ok|okay|sim|n[aã]o|beleza|blz|perfeito|entendi|obrigad[oa]|valeu|show|isso|exato|pode seguir|pode continuar|continue|continua|opa deu boa|deu boa)[\s!.?]*$/i;

const ACTION_CRITICAL_CONTEXT =
  /aprovar|aprova[çc][aã]o|confirmar|confirma[çc][aã]o|autorizar|autoriza[çc][aã]o|enviar|envio|executar|execu[çc][aã]o|prosseguir com|fechar|cancelar|excluir|pagamento|cotação|fornecedor|pedido|rfq|disparar/i;

const NATIVE_WEB_SEARCH =
  /pesquis(?:e|ar)|na web|internet|not[ií]cia|fonte atual|atualizad|legisla[çc][aã]o atual|mudou recentemente|hoje no mercado|[uú]ltim[oa]s? (?:dias|semanas|meses)|site oficial/i;

function lastUserIndex(messages: Message[]): number {
  return [...messages].map((m) => m.role).lastIndexOf("user");
}

function previousAssistantMessage(messages: Message[], userIndex: number): Message | undefined {
  return [...messages.slice(0, userIndex)].reverse().find((m) => m.role === "assistant");
}

export function hasActionCriticalContext(messages: Message[]): boolean {
  const index = lastUserIndex(messages);
  if (index < 0) return false;
  const previousAssistant = previousAssistantMessage(messages, index);
  return Boolean(
    previousAssistant &&
      typeof previousAssistant.content === "string" &&
      ACTION_CRITICAL_CONTEXT.test(previousAssistant.content),
  );
}

export function isQuickConversationalTurn(messages: Message[]): boolean {
  const index = lastUserIndex(messages);
  if (index < 0) return false;

  const last = messages[index];
  if (typeof last.content !== "string") return false;

  const text = last.content.trim().replace(/\s+/g, " ");
  if (text.length > 120 || !QUICK_TURN.test(text)) return false;
  if (hasActionCriticalContext(messages)) return false;

  return true;
}

export function needsNativeWebSearch(messages: Message[]): boolean {
  const index = lastUserIndex(messages);
  if (index < 0) return false;
  const last = messages[index];
  if (typeof last.content !== "string") return false;
  return NATIVE_WEB_SEARCH.test(last.content);
}

export function modelForTurn(messages: Message[], deepReasoning: boolean): string {
  if (deepReasoning || hasActionCriticalContext(messages)) {
    return MODELS.smart;
  }

  // Sonnet é suficiente para conversa comum e síntese de resultados das tools;
  // cálculos/fatos determinísticos continuam vindo das ferramentas certificadas.
  return MODELS.balanced;
}
