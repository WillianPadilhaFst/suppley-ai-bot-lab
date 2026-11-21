import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Route,
  UserRound,
} from "lucide-react";
import { getStageLabel } from "@/lib/stageLabels";
import { useState } from "react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
const date = (value: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "Não informado";
const labels: Record<string, string> = {
  recebida: "Recebida",
  em_analise: "Em análise",
  vinculada: "Vinculada",
  encerrada: "Encerrada",
  ativa: "Ativa",
  concluida: "Concluída",
  operacao_criada: "Operação criada",
};
const label = (value: string) => labels[value] ?? value.replaceAll("_", " ");

function Status({ value }: { value: string }) {
  return (
    <span className="pw-status">
      <i aria-hidden="true" />
      {label(value)}
    </span>
  );
}
export function PublicOperations() {
  const { data, error, isLoading } = trpc.portal.list.useQuery();
  const requests = trpc.quoteRequests.mine.useQuery();
  return (
    <section className="pw-page">
      <header className="pw-page-banner">
        <div>
          <h1>Acompanhamento</h1>
          <p>
            Consulte seus pedidos de cotação e acompanhe as etapas da
            importação.
          </p>
        </div>
        <Link href="/excambia" className="pw-button pw-button-light">
          <MessageCircle size={17} aria-hidden="true" /> Nova cotação
        </Link>
      </header>
      <div className="pw-section">
        <h2 className="pw-section-title">
          <ClipboardList size={20} aria-hidden="true" /> Solicitações de cotação
        </h2>
        {requests.isLoading && (
          <p className="pw-empty">Carregando solicitações…</p>
        )}
        {requests.error && (
          <p className="pw-empty" role="alert">
            Não foi possível carregar suas solicitações.
          </p>
        )}
        {requests.data?.length === 0 && (
          <p className="pw-empty">
            Peça uma cotação pela Excambia para receber seu protocolo.
          </p>
        )}
        <div className="pw-card-grid">
          {requests.data?.map((item) => (
            <Card className="pw-panel pw-quote-card" key={item.id}>
              <CardHeader>
                <div className="pw-card-heading">
                  <CardTitle>
                    Solicitação #{item.id} — {item.produto}
                  </CardTitle>
                  <Status value={item.status} />
                </div>
              </CardHeader>
              <CardContent className="pw-card-content">
                <div className="pw-facts">
                  <span>
                    <Package size={16} aria-hidden="true" />
                    {item.quantidade} {item.unidade}
                  </span>
                  <span>
                    <MapPin size={16} aria-hidden="true" />
                    {item.destinoCidade}/{item.destinoUf}
                  </span>
                  <span>
                    <CalendarDays size={16} aria-hidden="true" />
                    {item.prazoDesejado}
                  </span>
                </div>
                <details className="pw-specs">
                  <summary>Ver especificações</summary>
                  <p>{item.especificacoes}</p>
                </details>
                {item.operacaoId != null && (
                  <Link
                    className="pw-text-link"
                    href={`/operacao/${item.operacaoId}`}
                  >
                    Acompanhar operação vinculada{" "}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="pw-section">
        <h2 className="pw-section-title">
          <Route size={20} aria-hidden="true" /> Operações
        </h2>
        {isLoading && <p className="pw-empty">Carregando…</p>}
        {error && (
          <p className="pw-empty" role="alert">
            Não foi possível carregar suas operações.
          </p>
        )}
        {data?.length === 0 && (
          <p className="pw-empty">
            Suas operações aparecem aqui conforme os pedidos avançam.
          </p>
        )}
        <div className="pw-card-grid">
          {data?.map((operation) => (
            <Link
              aria-label={`${operation.codigo} — ${operation.titulo}`}
              className="pw-operation-link pw-panel"
              key={operation.id}
              href={`/operacao/${operation.id}`}
            >
              <span className="pw-tile-icon">
                <Package size={20} aria-hidden="true" />
              </span>
              <span className="pw-operation-description">
                <small>{operation.codigo}</small>
                <strong>{operation.titulo}</strong>
                <span>
                  {getStageLabel(operation.estagioAtual)} ·{" "}
                  {label(operation.status)}
                </span>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicOperation() {
  const [, params] = useRoute("/operacao/:id");
  const id = Number(params?.id);
  const { data, error, isLoading } = trpc.portal.get.useQuery(
    { id },
    { enabled: Number.isSafeInteger(id) && id > 0 },
  );
  if (isLoading)
    return (
      <div className="pw-page">
        <p className="pw-empty">Carregando…</p>
      </div>
    );
  if (error || !data)
    return (
      <div className="pw-page">
        <p className="pw-empty" role="alert">
          Operação não encontrada.
        </p>
      </div>
    );
  return (
    <section className="pw-page">
      <Link className="pw-text-link" href="/operacoes">
        <ArrowLeft size={17} aria-hidden="true" /> Acompanhamento
      </Link>
      <header className="pw-page-banner">
        <div>
          <h1>
            {data.codigo} — {data.titulo}
          </h1>
          <p>
            {getStageLabel(data.estagioAtual)} · {label(data.status)}
          </p>
        </div>
      </header>
      <dl className="pw-detail-summary pw-panel">
        <div>
          <dt>Prazo desejado</dt>
          <dd>{date(data.prazoDesejado)}</dd>
        </div>
        <div>
          <dt>Chegada prevista</dt>
          <dd>{date(data.trackingEta)}</dd>
        </div>
      </dl>
      <div className="pw-card-grid">
        <Card className="pw-panel">
          <CardHeader>
            <CardTitle>Marcos</CardTitle>
          </CardHeader>
          <CardContent className="pw-card-content">
            {data.milestones.length === 0 && (
              <p className="pw-muted">Nenhum marco registrado.</p>
            )}
            {data.milestones.map((milestone) => (
              <div className="pw-timeline-item" key={milestone.id}>
                <strong>{label(milestone.tipo)}</strong>
                <p>
                  {label(milestone.status)} · {date(milestone.dataReferencia)} ·
                  Prazo {date(milestone.vencimento)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="pw-panel">
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent className="pw-card-content">
            {data.history.length === 0 && (
              <p className="pw-muted">
                As atualizações da operação aparecerão aqui.
              </p>
            )}
            {data.history.map((event) => (
              <div className="pw-timeline-item" key={event.id}>
                <strong>{label(event.tipo)}</strong>
                <p>
                  {date(event.criadoEm)} · {getStageLabel(event.estagio)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Link
        className="pw-button pw-button-primary pw-fit"
        href={`/excambia?operacao=${data.id}`}
      >
        <MessageCircle size={17} aria-hidden="true" /> Conversar com a Excambia
        sobre esta operação
      </Link>
    </section>
  );
}
export function MyAccount() {
  const { user, logout, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const profile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado");
      void refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const change = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      toast.success("Senha alterada. Entre novamente.");
      await logout();
      location.href = "/login";
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="pw-page">
      <header className="pw-page-banner">
        <div>
          <h1>Minha conta</h1>
          <p>{user?.email}</p>
        </div>
        <span className="pw-account-icon">
          <UserRound size={24} aria-hidden="true" />
        </span>
      </header>
      <div className="pw-card-grid pw-account-grid">
        <form
          className="pw-panel pw-settings-form"
          onSubmit={(e) => {
            e.preventDefault();
            profile.mutate({ name });
          }}
        >
          <h2 className="pw-section-title">
            <UserRound size={19} aria-hidden="true" /> Perfil
          </h2>
          <label htmlFor="profile-name">Nome</label>
          <Input
            id="profile-name"
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
          <Button disabled={profile.isPending}>Salvar nome</Button>
        </form>
        <form
          className="pw-panel pw-settings-form"
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate({ currentPassword: current, newPassword: password });
          }}
        >
          <h2 className="pw-section-title">
            <LockKeyhole size={19} aria-hidden="true" /> Alterar senha
          </h2>
          <label htmlFor="current-password">Senha atual</label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
          <label htmlFor="new-password">Nova senha</label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button disabled={change.isPending}>Alterar senha</Button>
        </form>
      </div>
      <Button
        variant="outline"
        className="pw-fit"
        onClick={() => void logout()}
      >
        <LogOut size={17} aria-hidden="true" /> Sair
      </Button>
    </section>
  );
}
