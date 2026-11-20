import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Box,
  ClipboardList,
  History,
  MessageCircle,
  Plus,
  Ruler,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const prompts = [
  {
    title: "Pedir cotação",
    description: "Produto, quantidade e destino",
    text: "Quero pedir uma cotação para importar ",
    icon: Box,
  },
  {
    title: "Calcular cubagem",
    description: "Volume da carga",
    text: "Quero calcular a cubagem da minha carga. As dimensões são ",
    icon: Ruler,
  },
  {
    title: "Consultar meu pedido",
    description: "Protocolos e status",
    text: "Qual é o status das minhas solicitações de cotação?",
    icon: ClipboardList,
  },
];

export default function PublicChat() {
  const [id, setId] = useState<number>();
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const list = trpc.conversas.list.useQuery();
  const conversation = trpc.conversas.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );
  const create = trpc.conversas.create.useMutation();
  const link = trpc.conversas.getOrCreateForOperacao.useMutation();
  const send = trpc.conversas.send.useMutation({
    onSuccess: () => {
      void utils.conversas.invalidate();
      void utils.quoteRequests.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const sending = send.isPending || create.isPending;
  const messages = conversation.data?.mensagens ?? [];

  useEffect(() => {
    const operationId = Number(
      new URLSearchParams(location.search).get("operacao"),
    );
    if (operationId > 0)
      link
        .mutateAsync({ operacaoId: operationId })
        .then((result) => setId(result.id))
        .catch(() => toast.error("Operação não encontrada."));
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [id, messages.length, sending]);

  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    try {
      const target =
        id ?? (await create.mutateAsync({ titulo: text.slice(0, 100) })).id;
      setId(target);
      setDraft("");
      await send.mutateAsync({
        conversaId: target,
        messages: [{ role: "user", content: text }],
      });
    } catch {
      toast.error("Não foi possível enviar a mensagem.");
    }
  }

  const conversations = [
    ...(list.data?.operacoes ?? []),
    ...(list.data?.avulsas ?? []),
  ];
  return (
    <section className="pw-chat" aria-label="Excambia">
      <header className="pw-chat-toolbar">
        <div className="pw-chat-title">
          <MessageCircle size={19} aria-hidden="true" />
          <h1>Excambia</h1>
        </div>
        <div className="pw-chat-actions">
          <button
            type="button"
            className="pw-button pw-button-quiet"
            aria-expanded={historyOpen}
            aria-controls="pw-chat-history"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <History size={18} aria-hidden="true" /> Histórico
          </button>
          <button
            type="button"
            className="pw-button pw-button-quiet"
            disabled={sending}
            onClick={() => {
              setId(undefined);
              setDraft("");
              setHistoryOpen(false);
              composer.current?.focus();
            }}
          >
            <Plus size={18} aria-hidden="true" /> Nova conversa
          </button>
        </div>
      </header>
      {historyOpen && (
        <nav
          className="pw-chat-history pw-panel"
          id="pw-chat-history"
          aria-label="Histórico de conversas"
        >
          <h2>Conversas</h2>
          {list.isLoading && <p>Carregando conversas…</p>}
          {list.isError && (
            <p role="alert">Não foi possível carregar suas conversas.</p>
          )}
          {list.isSuccess && !conversations.length && (
            <p>Você ainda não tem conversas.</p>
          )}
          {conversations.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-current={id === item.id ? "true" : undefined}
              disabled={sending}
              onClick={() => {
                setId(item.id);
                setHistoryOpen(false);
              }}
            >
              <MessageCircle size={16} aria-hidden="true" />
              <span>{item.titulo}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="pw-chat-feed" aria-live="polite">
        {!id ? (
          <div className="pw-welcome">
            <div className="pw-welcome-mark">
              <img src="/suppley-icon.png" alt="" />
            </div>
            <h2>O que você quer importar?</h2>
            <p>
              Conte o que você precisa. A Excambia ajuda a preparar o pedido de
              cotação para a equipe Suppley.
            </p>
            <div className="pw-prompts">
              {prompts.map(({ title, description, text, icon: Icon }) => (
                <button
                  type="button"
                  key={title}
                  onClick={() => {
                    setDraft(text);
                    composer.current?.focus();
                  }}
                >
                  <span className="pw-tile-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pw-messages">
            {conversation.error && (
              <p role="alert">Não foi possível abrir a conversa.</p>
            )}
            {conversation.isLoading && (
              <p className="pw-muted">Abrindo conversa…</p>
            )}
            {messages
              .filter(
                (message) =>
                  message.role === "user" || message.role === "assistant",
              )
              .map((message) => (
                <article
                  className={
                    message.role === "user"
                      ? "pw-bubble pw-bubble-user"
                      : "pw-bubble"
                  }
                  key={message.id}
                >
                  <strong>
                    {message.role === "user" ? "Você" : "Excambia"}
                  </strong>
                  <p>{message.content}</p>
                </article>
              ))}
            {sending && <p className="pw-muted">Preparando resposta…</p>}
            <div ref={end} />
          </div>
        )}
      </div>
      <form
        className="pw-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <textarea
          ref={composer}
          aria-label="Mensagem para Excambia"
          placeholder="Descreva o produto que deseja cotar…"
          rows={2}
          value={draft}
          maxLength={12000}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          className="pw-button pw-button-primary"
          type="submit"
          disabled={sending || !draft.trim()}
        >
          <ArrowUp size={19} aria-hidden="true" /> Enviar
        </button>
      </form>
    </section>
  );
}
