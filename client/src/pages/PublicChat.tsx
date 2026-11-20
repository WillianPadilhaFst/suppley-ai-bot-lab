import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
export default function PublicChat() {
  const [id, setId] = useState<number>();
  const [draft, setDraft] = useState("");
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
    },
    onError: (e) => toast.error(e.message),
  });
  useEffect(() => {
    const op = Number(new URLSearchParams(location.search).get("operacao"));
    if (op > 0)
      link
        .mutateAsync({ operacaoId: op })
        .then((r) => setId(r.id))
        .catch(() => toast.error("Operação não encontrada."));
  }, []);
  async function submit() {
    if (!draft.trim() || send.isPending || create.isPending) return;
    try {
      const target =
        id ??
        (await create.mutateAsync({ titulo: draft.trim().slice(0, 100) })).id;
      setId(target);
      const text = draft;
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
    <div className="flex flex-col md:flex-row h-full min-h-0">
      <aside className="md:w-64 border-b md:border-r p-4 overflow-auto shrink-0 max-h-48 md:max-h-none">
        <Button
          variant="outline"
          className="w-full mb-3"
          onClick={() => setId(undefined)}
        >
          Nova conversa
        </Button>
        <nav aria-label="Histórico de conversas" className="space-y-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setId(c.id)}
              className={`block w-full text-left rounded-lg p-2 truncate ${id === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            >
              {c.titulo}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex flex-col min-h-0 flex-1">
        <header className="border-b p-5 flex items-center gap-3">
          <img src="/suppley-icon.png" className="h-8 w-8" alt="" />
          <h1 className="font-semibold text-xl text-primary">Excambia</h1>
        </header>
        <div className="flex-1 overflow-auto p-5 space-y-5" aria-live="polite">
          {!id && (
            <div className="max-w-2xl mx-auto py-12">
              <h2 className="text-2xl font-semibold">
                O que você quer importar?
              </h2>
              <p className="text-muted-foreground mt-3">
                Conte o produto, a quantidade e o destino para preparar seu
                pedido de cotação com a Suppley. Você também pode acompanhar
                suas operações e analisar a cubagem da carga.
              </p>
            </div>
          )}
          {conversation.error && (
            <p role="alert">Não foi possível abrir a conversa.</p>
          )}
          {conversation.data?.mensagens
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => (
              <article
                key={m.id}
                className={`max-w-3xl mx-auto rounded-2xl p-4 whitespace-pre-wrap ${m.role === "user" ? "bg-primary/10" : "bg-muted"}`}
              >
                <strong className="block text-sm mb-2">
                  {m.role === "user" ? "Você" : "Excambia"}
                </strong>
                {m.content}
              </article>
            ))}
          {send.isPending && (
            <p className="text-center text-muted-foreground">
              Preparando resposta…
            </p>
          )}
        </div>
        <form
          className="border-t p-4 flex gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Textarea
            aria-label="Mensagem para Excambia"
            placeholder="Descreva o produto que deseja cotar…"
            value={draft}
            maxLength={12000}
            onChange={(e) => setDraft(e.target.value)}
            className="resize-none"
          />
          <Button
            disabled={send.isPending || create.isPending || !draft.trim()}
          >
            Enviar
          </Button>
        </form>
      </main>
    </div>
  );
}
