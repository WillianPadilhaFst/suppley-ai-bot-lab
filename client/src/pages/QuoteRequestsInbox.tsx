import { CalendarDays, MapPin, Package, UserRound } from "lucide-react";
import { Link } from "wouter";
import "@/public-workspace.css";
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
  const start = trpc.quoteRequests.start.useMutation({
    onSuccess: success,
    onError: (e) => toast.error(e.message),
  });
  const link = trpc.quoteRequests.link.useMutation({
    onSuccess: success,
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="pw-page pw-theme p-0">
      <header className="pw-page-banner">
        <div>
          <h1>Solicitações de cotação</h1>
          <p>
            Analise as solicitações recebidas pela Excambia e vincule uma
            operação para atendimento.
          </p>
        </div>
      </header>
      {query.isLoading && <p>Carregando…</p>}
      {query.error && <p role="alert">Não foi possível abrir a fila.</p>}
      {query.data?.length === 0 && <p>Nenhuma solicitação recebida.</p>}
      {query.data?.map((r) => (
        <Card className="pw-panel gap-4" key={r.id}>
          <CardHeader>
            <div className="pw-card-heading">
              <CardTitle>
                Solicitação #{r.id} — {r.produto}
              </CardTitle>
              <span className="pw-status">
                <i aria-hidden="true" />
                Status: {r.status.replaceAll("_", " ")}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pw-card-content">
            <div className="pw-facts">
              <span>
                <UserRound size={17} aria-hidden="true" />{" "}
                {r.clienteNome || r.clienteEmail || `Cliente #${r.userId}`}
              </span>
              {r.clienteNome && r.clienteEmail && <span>{r.clienteEmail}</span>}
            </div>
            <div className="pw-facts">
              <span>
                <Package size={16} aria-hidden="true" /> {r.quantidade}{" "}
                {r.unidade}
              </span>
              <span>
                <MapPin size={16} aria-hidden="true" /> {r.destinoCidade}/
                {r.destinoUf}
              </span>
              <span>
                <CalendarDays size={16} aria-hidden="true" /> {r.prazoDesejado}
              </span>
            </div>
            <p className="whitespace-pre-wrap rounded-xl bg-muted p-3">
              {r.especificacoes}
            </p>
            <div className="pw-facts">
              {r.conversaId != null && <span>Conversa #{r.conversaId}</span>}
              {r.operacaoId != null ? (
                <Link
                  className="pw-text-link"
                  href={`/operacao/${r.operacaoId}`}
                >
                  Abrir operação #{r.operacaoId}
                </Link>
              ) : (
                <span>Operação ainda não vinculada</span>
              )}
            </div>
            <div className="pw-inbox-actions">
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
            {!r.operacaoId && (
              <Button
                disabled={start.isPending || r.status === "encerrada"}
                onClick={() => start.mutate({ id: r.id })}
              >
                Criar operação para atendimento
              </Button>
            )}
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
