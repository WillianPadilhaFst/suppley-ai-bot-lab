import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
export default function QuoteRequestsInbox() {
  const query = trpc.quoteRequests.inbox.useQuery();
  const utils = trpc.useUtils();
  const [operations, setOperations] = useState<Record<number, string>>({});
  const success = () => {
    void utils.quoteRequests.invalidate();
    toast.success("Solicitação atualizada");
  };
  const review = trpc.quoteRequests.review.useMutation({
    onSuccess: success,
    onError: (e) => toast.error(e.message),
  });
  const link = trpc.quoteRequests.link.useMutation({
    onSuccess: success,
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Solicitações de cotação</h1>
      <p className="text-muted-foreground">
        Demandas recebidas pela Excambia. Analise o produto e o fornecimento
        antes de preparar a proposta comercial.
      </p>
      {query.isLoading && <p>Carregando…</p>}
      {query.error && <p role="alert">Não foi possível abrir a fila.</p>}
      {query.data?.length === 0 && <p>Nenhuma solicitação recebida.</p>}
      {query.data?.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle>
              Solicitação #{r.id} — {r.produto}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              {r.clienteNome} · {r.clienteEmail} · Cliente #{r.userId}
            </p>
            <p className="whitespace-pre-wrap">{r.especificacoes}</p>
            <p>
              {r.quantidade} {r.unidade} · {r.destinoCidade}/{r.destinoUf}
            </p>
            <p>
              Prazo desejado: {r.prazoDesejado} · Status:{" "}
              {r.status.replaceAll("_", " ")}
            </p>
            <p>
              Conversa #{r.conversaId} · Operação:{" "}
              {r.operacaoId ?? "Ainda não vinculada"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={review.isPending}
                onClick={() =>
                  review.mutate({ id: r.id, status: "em_analise" })
                }
              >
                Iniciar análise
              </Button>
              <Button
                variant="outline"
                disabled={review.isPending}
                onClick={() => review.mutate({ id: r.id, status: "encerrada" })}
              >
                Encerrar solicitação
              </Button>
            </div>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const id = Number(operations[r.id]);
                if (!Number.isSafeInteger(id) || id < 1) {
                  toast.error("Informe um ID de operação válido");
                  return;
                }
                link.mutate({ id: r.id, operacaoId: id });
              }}
            >
              <Input
                aria-label={`ID da operação para solicitação ${r.id}`}
                type="number"
                min="1"
                step="1"
                placeholder="ID da operação do cliente"
                className="max-w-xs"
                value={operations[r.id] ?? ""}
                onChange={(e) =>
                  setOperations((v) => ({ ...v, [r.id]: e.target.value }))
                }
              />
              <Button disabled={link.isPending}>Vincular operação</Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
