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
const label = (value: string) => value.replaceAll("_", " ");
export function PublicOperations() {
  const { data, error, isLoading } = trpc.portal.list.useQuery();
  return (
    <section className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Acompanhamento</h1>
      <p className="text-muted-foreground">
        Status e prazos das suas operações.
      </p>
      {isLoading && <p>Carregando…</p>}
      {error && <p role="alert">Não foi possível carregar suas operações.</p>}
      {data?.length === 0 && (
        <p>Você ainda não possui operações. Solicite a criação à Excambia.</p>
      )}
      {data?.map((op) => (
        <Card key={op.id}>
          <CardHeader>
            <CardTitle>
              <Link href={`/operacao/${op.id}`}>
                {op.codigo} — {op.titulo}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              {getStageLabel(op.estagioAtual)} · {label(op.status)}
            </p>
            <p>Prazo: {date(op.prazoDesejado)}</p>
          </CardContent>
        </Card>
      ))}
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
  if (isLoading) return <p>Carregando…</p>;
  if (error || !data) return <p role="alert">Operação não encontrada.</p>;
  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <Link href="/operacoes">← Acompanhamento</Link>
      <h1 className="text-2xl font-semibold">
        {data.codigo} — {data.titulo}
      </h1>
      <p>
        {getStageLabel(data.estagioAtual)} · {label(data.status)}
      </p>
      <p>
        Prazo: {date(data.prazoDesejado)} · Chegada prevista:{" "}
        {date(data.trackingEta)}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Marcos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.milestones.length === 0 && <p>Nenhum marco registrado.</p>}
          {data.milestones.map((m) => (
            <div key={m.id}>
              <strong>{label(m.tipo)}</strong>
              <p>
                {label(m.status)} · {date(m.dataReferencia)} · Prazo:{" "}
                {date(m.vencimento)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {data.history.map((e) => (
            <p key={e.id}>
              {date(e.criadoEm)} — {label(e.tipo)} · {getStageLabel(e.estagio)}
            </p>
          ))}
        </CardContent>
      </Card>
      <Link href={`/excambia?operacao=${data.id}`}>
        Conversar com a Excambia sobre esta operação
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
    <section className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Minha conta</h1>
      <p>{user?.email}</p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          profile.mutate({ name });
        }}
      >
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
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate({ currentPassword: current, newPassword: password });
        }}
      >
        <h2 className="font-semibold">Alterar senha</h2>
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
      <Button variant="outline" onClick={() => void logout()}>
        Sair
      </Button>
    </section>
  );
}
