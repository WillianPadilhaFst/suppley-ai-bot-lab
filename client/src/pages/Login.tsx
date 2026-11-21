import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { setStoredToken } from "@/lib/authToken";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { TripodLamp } from "@/components/login/TripodLamp";
import "./login.css";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLit, setIsLit] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isLit) heading.current?.focus({ preventScroll: true });
  }, [isLit]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // Save token to localStorage for Safari iOS fallback
      if (data.token) {
        setStoredToken(data.token);
      }
      toast.success("Login realizado com sucesso!");
      // Excambia é o cérebro do sistema: o usuário cai direto nela ao entrar.
      setLocation("/excambia");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fazer login");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <main className="suppley-login" data-lit={isLit}>
      <header className="suppley-login__bar">
        <span>calculasuppley.com.br</span>
        <span>{isLit ? "Ambiente iluminado" : "Ambiente em espera"}</span>
      </header>

      <div className="suppley-login__stage">
        <div className="suppley-login__lamp">
          <TripodLamp isLit={isLit} onToggle={() => setIsLit((lit) => !lit)} />
          {!isLit && (
            <div className="suppley-login__intro">
              <p>Puxe a corda para acender</p>
              <button type="button" onClick={() => setIsLit(true)}>
                Ir para o login <ArrowRight aria-hidden="true" size={16} />
              </button>
            </div>
          )}
        </div>

        <section
          id="suppley-login-card"
          className="suppley-login__card"
          aria-labelledby="suppley-login-heading"
          hidden={!isLit}
        >
          <div className="suppley-login__identity">
            <img
              src="/logo-suppley.png"
              alt="Suppley"
              width="180"
              height="48"
            />
            <span>Calcula Suppley</span>
          </div>
          <h1 id="suppley-login-heading" tabIndex={-1} ref={heading}>
            Entrar
          </h1>
          <p>Acesse sua conta para gerenciar importações.</p>

          <form onSubmit={handleSubmit} className="suppley-login__form">
            <div className="suppley-login__field">
              <Label htmlFor="email">E-mail</Label>
              <div className="suppley-login__control">
                <Mail size={17} aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginMutation.isPending}
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="suppley-login__field">
              <Label htmlFor="password">Senha</Label>
              <div className="suppley-login__control">
                <Lock size={17} aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <Link href="/forgot-password" className="suppley-login__forgot">
                Esqueceu a senha?
              </Link>
            </div>
            <Button
              type="submit"
              className="suppley-login__submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />{" "}
                  Entrando...
                </>
              ) : (
                <>
                  Entrar <ArrowRight aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
          <div className="suppley-login__signup">
            <p>O acesso é criado pelo administrador. Solicite suas credenciais ao administrador do sistema.</p>
          </div>
        </section>
      </div>

      <footer className="suppley-login__bar suppley-login__footer">
        <span>Suppley Raw Material</span>
        <span>Itajaí, SC · Brasil</span>
      </footer>
    </main>
  );
}
