import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { setStoredToken } from "@/lib/authToken";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Eye,
  EyeOff,
  LogIn,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import UnicornShaderCanvas from "@/components/motion/UnicornShaderCanvas";
import {
  MotionProvider,
  TiltSpotlightCard,
} from "@/components/motion/MotionPrimitives";
import RequestAccessModal from "@/components/excambia/RequestAccessModal";
import { EASE_EDITORIAL } from "@/lib/motion";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);

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
    <MotionProvider>
      <div
        className="relative flex flex-col justify-between overflow-hidden bg-[#080512] text-white p-4 sm:p-6"
        style={{ minHeight: "100svh" }}
      >
        {/* Interactive Unicorn Studio WebGL Aurora Backdrop */}
        <div className="pointer-events-none absolute inset-0">
          <UnicornShaderCanvas
            variant="aurora"
            preset="Suppley Aurora"
            intensity={0.95}
            distortion={0.72}
            speed={0.62}
            className="h-full w-full"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(8,5,18,0.22) 0%, rgba(8,5,18,0.72) 100%)",
            }}
          />
        </div>

        {/* Top navigation bar */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Link
            href="/apresentacao"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md transition-colors hover:border-[#28E7C5]/45 hover:bg-white/[0.14]"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#28E7C5]" />
            <span>Voltar para a apresentação</span>
          </Link>

          <button
            type="button"
            onClick={() => setAccessModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#28E7C5]/40 bg-[#28E7C5]/12 px-3.5 py-2 text-xs font-semibold text-[#28E7C5] backdrop-blur-md transition-colors hover:bg-[#28E7C5] hover:text-[#120A22]"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Solicitar acesso</span>
          </button>
        </div>

        {/* Center 3D-Tilt Elevated Login Card */}
        <div className="relative z-10 my-auto flex items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: EASE_EDITORIAL }}
            className="w-full max-w-md"
          >
            <TiltSpotlightCard
              maxTilt={3.5}
              spotlightColor="rgba(40, 231, 197, 0.14)"
              className="rounded-3xl"
            >
              <Card className="w-full rounded-3xl border border-white/20 bg-white/95 text-[#1B1523] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center mb-4">
                    <img
                      src="/logo-suppley.png"
                      alt="SUPPLEY"
                      className="h-14 w-auto"
                    />
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight text-[#1B1523]">
                    Entrar na Excambia
                  </CardTitle>
                  <CardDescription className="text-[#6A6374]">
                    Acesse sua conta para solicitar cotações e acompanhar suas importações
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
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
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <Link
                        href="/forgot-password"
                        className="text-xs font-medium text-[#682ABA] hover:underline"
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button
                      type="submit"
                      className="w-full bg-[#682ABA] hover:bg-[#5A23A3] text-white"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Entrar
                        </>
                      )}
                    </Button>

                    <div className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] p-3.5 text-center space-y-1.5">
                      <p className="text-xs text-[#6A6374]">
                        Ainda não tem acesso? As credenciais são liberadas pelo administrador.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAccessModalOpen(true)}
                        className="text-xs font-semibold text-[#682ABA] hover:underline"
                      >
                        Solicitar login de acesso →
                      </button>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </TiltSpotlightCard>
          </motion.div>
        </div>

        {/* Footer trust line */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-white/65">
          <div className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#28E7C5]" />
            <span>SUPPLEY · Plataforma de Importação Inteligente</span>
          </div>
          <span>Acesso corporativo protegido</span>
        </div>

        <RequestAccessModal
          open={accessModalOpen}
          onClose={() => setAccessModalOpen(false)}
        />
      </div>
    </MotionProvider>
  );
}
