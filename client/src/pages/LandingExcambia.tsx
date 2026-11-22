/**
 * LandingExcambia — Flagship Interactive Landing Page SUPPLEY & Excambia
 *
 * Arquitetura de alta interatividade & motion alinhada à baseline de produção (`release/public-chat`):
 * - Unicorn Studio SDK oficial (`unicornstudio/react` v2.6.1) com shader WebGL2
 *   reativo a cursor e clique ("Suppley Aurora" no Hero e "Suppley Purple" no CTA final).
 * - Framer Motion v12: `MaskLineReveal`, frase cinética rotativa, `TiltSpotlightCard`,
 *   `MagneticButton` com sheen, `VelocityMarquee`, `ScrollProgressBar`, `LiveSpringNumber`
 *   e `StickyJourneyWithRouteMap`.
 * - Integrada às rotas oficiais já existentes em produção: `/register` (solicitação de
 *   cadastro com aprovação administrativa), `/login` e `/excambia` (via `useAuth` / `auth.me`),
 *   sem chamar APIs internas bloqueadas pela política de segurança pública.
 */
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  FileSpreadsheet,
  Globe2,
  KeyRound,
  LogIn,
  ShieldCheck,
  Ship,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import ExcambiaOrb from "@/components/ExcambiaOrb";
import {
  AnimatedNumber,
  MagneticButton,
  MaskLineReveal,
  MotionProvider,
  Reveal,
  ScrollProgressBar,
  ScrollScaleFrame,
  StaggerGroup,
  StaggerItem,
  TiltSpotlightCard,
  VelocityMarquee,
  useScrolled,
} from "@/components/motion/MotionPrimitives";
import UnicornShaderCanvas from "@/components/motion/UnicornShaderCanvas";
import {
  HeroExcambiaTerminal,
  InteractiveBeforeAfterCurtain,
  InteractiveLandedCostSimulator,
  InteractiveProformaSandbox,
  StickyJourneyWithRouteMap,
} from "@/components/excambia/LandingInteractiveModules";
import { EASE_EDITORIAL, SPRING_GENTLE } from "@/lib/motion";
import { useAuth } from "@/_core/hooks/useAuth";

const HERO_CYCLING_PHRASES = [
  "na Excambia.",
  "com custo real.",
  "sem surpresas.",
];

const TRADE_CORRIDORS = [
  "SHANGHAI → ITAJAÍ",
  "NINGBO → SANTOS",
  "HAMBURGO → PARANAGUÁ",
  "HOUSTON → SUAPE",
  "QINGDAO → NAVEGANTES",
  "10.515 NCMS OFICIAIS",
  "TTD 409/SC · LUCRO REAL",
  "SOURCING GLOBAL AUDITADO",
];

const SERVICE_PILLARS = [
  {
    icon: Globe2,
    tag: "SOURCING",
    title: "Acesso direto a fabricantes globais",
    desc: "Conectamos sua indústria a fábricas auditadas na Ásia, Europa e Américas, eliminando camadas de intermediários.",
  },
  {
    icon: Calculator,
    tag: "TRIBUTÁRIO",
    title: "Custo nacionalizado com precisão",
    desc: "Motor certificado para II, IPI, PIS/COFINS, ICMS, AFRMM e regimes especiais como TTD 409 em Santa Catarina.",
  },
  {
    icon: TrendingUp,
    tag: "BENCHMARK",
    title: "Inteligência real de mercado",
    desc: "Valide se o valor FOB da fábrica está competitivo frente às referências reais praticadas no comércio exterior.",
  },
  {
    icon: FileSpreadsheet,
    tag: "AUTOMAÇÃO",
    title: "Proformas estruturadas em segundos",
    desc: "Envie PDFs, planilhas ou imagens na Excambia e receba cada SKU classificado, convertido e pronto para decisão.",
  },
  {
    icon: Ship,
    tag: "OPERAÇÃO",
    title: "Embarque e desembaraço rastreados",
    desc: "Da confirmação na fábrica até a entrega na sua planta, cada marco, documento e câmbio fica visível ao vivo.",
  },
  {
    icon: ShieldCheck,
    tag: "SEGURANÇA",
    title: "Ambiente privado e seguro",
    desc: "Login liberado pela equipe SUPPLEY com sigilo total dos seus fornecedores, preços e margens.",
  },
];

const FAQ_ITEMS = [
  {
    q: "O que é a SUPPLEY e qual é o papel da Excambia?",
    a: "A SUPPLEY entrega o serviço completo de importação e inteligência em comércio exterior — do sourcing de fabricantes no exterior até a entrega nacionalizada no Brasil. A Excambia é a plataforma interativa da SUPPLEY onde você faz suas cotações, analisa custos e acompanha cada operação.",
  },
  {
    q: "Como faço para solicitar uma cotação dentro da Excambia?",
    a: "Ao entrar com seu login, basta descrever o insumo/volume ou anexar uma Proforma Invoice (PDF ou Excel). A Excambia estrutura os itens, valida a NCM e cruza custos, tributos e fabricantes junto à equipe SUPPLEY.",
  },
  {
    q: "Como obtenho meu login de acesso?",
    a: "Para garantir sigilo comercial absoluto para cada cliente, o login é liberado pela equipe SUPPLEY. Clique em 'Solicitar acesso', faça seu cadastro e nossa equipe liberará seu acesso.",
  },
  {
    q: "Minha empresa precisa já importar para usar o serviço?",
    a: "Não. Atendemos tanto indústrias com importação recorrente que desejam reduzir custos e ganhar velocidade quanto empresas estruturando suas primeiras compras internacionais com segurança tributária.",
  },
];

export default function LandingExcambia() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const scrolled = useScrolled(32);

  // Reference exchange rates for public interactive simulator (keeps anonymous UI
  // strictly within `server/security/policy.ts` anonymous allowlist without hitting internal APIs)
  const usdRate = 5.89;
  const eurRate = 6.47;

  const [phraseIdx, setPhraseIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhraseIdx((i) => (i + 1) % HERO_CYCLING_PHRASES.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const handleOpenAccess = (_note = "") => {
    setLocation(isAuthenticated && user ? "/excambia" : "/register");
  };

  return (
    <MotionProvider>
      <div
        className="relative min-h-screen bg-[#FAF9F6] text-[#1B1523] selection:bg-[#28E7C5] selection:text-[#120A22]"
        style={{ overflowX: "clip" }}
      >
        {/* Top 3px Scroll Progress Rail */}
        <ScrollProgressBar className="bg-gradient-to-r from-[#682ABA] via-[#9333EA] to-[#28E7C5]" />

        {/* =================================================================
            ADAPTIVE MORPHING FLOATING NAVBAR
           ================================================================= */}
        <header className="fixed inset-x-0 top-0 z-40 px-4 pt-3 sm:px-6">
          <div
            className={`mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl px-4 py-3 transition-all duration-300 ${
              scrolled
                ? "border border-white/15 bg-[#0D071B]/88 text-white shadow-[0_14px_40px_-14px_rgba(0,0,0,0.65)] backdrop-blur-xl"
                : "border border-white/10 bg-[#080512]/40 text-white backdrop-blur-md"
            }`}
          >
            <Link
              href="/apresentacao"
              className="flex items-center gap-2.5 focus:outline-none"
            >
              <img
                src="/logo-suppley.png"
                alt="SUPPLEY"
                className="h-9 w-auto object-contain brightness-0 invert"
              />
            </Link>

            <nav className="hidden items-center gap-7 text-xs font-medium text-white/75 md:flex">
              <a
                href="#simulador"
                className="transition-colors hover:text-[#28E7C5]"
              >
                Simulador ao Vivo
              </a>
              <a
                href="#sandbox"
                className="transition-colors hover:text-[#28E7C5]"
              >
                Testar Excambia
              </a>
              <a
                href="#jornada"
                className="transition-colors hover:text-[#28E7C5]"
              >
                Como Funciona
              </a>
              <a
                href="#comparativo"
                className="transition-colors hover:text-[#28E7C5]"
              >
                Comparativo
              </a>
              <a
                href="#duvidas"
                className="transition-colors hover:text-[#28E7C5]"
              >
                Dúvidas
              </a>
            </nav>

            <div className="flex items-center gap-2.5">
              {isAuthenticated && user ? (
                <MagneticButton
                  onClick={() => setLocation("/excambia")}
                  className="rounded-xl bg-[#28E7C5] px-4 py-2 text-xs font-bold text-[#120A22] shadow-sm transition-colors hover:bg-[#49F2D4]"
                >
                  <span>Abrir Excambia</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </MagneticButton>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/18 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:border-[#28E7C5]/50 hover:text-[#28E7C5]"
                  >
                    <LogIn className="h-3.5 w-3.5 text-[#28E7C5]" />
                    <span>Entrar</span>
                  </Link>
                  <MagneticButton
                    onClick={() => handleOpenAccess()}
                    className="rounded-xl bg-[#28E7C5] px-4 py-2 text-xs font-bold text-[#120A22] shadow-[0_0_24px_-6px_rgba(40,231,197,0.6)] transition-colors hover:bg-[#49F2D4]"
                  >
                    <span>Solicitar acesso</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </MagneticButton>
                </>
              )}
            </div>
          </div>
        </header>

        <main>
          {/* =================================================================
              1. HERO — CINEMATIC OBSIDIAN + UNICORN STUDIO INTERACTIVE AURORA
             ================================================================= */}
          <section className="relative overflow-hidden bg-[#080512] pt-28 pb-20 text-white sm:pt-36 sm:pb-28">
            {/* Official `unicornstudio/react` WebGL2 Interactive Aurora Scene */}
            <div className="pointer-events-none absolute inset-0">
              <UnicornShaderCanvas
                variant="aurora"
                preset="Suppley Aurora"
                intensity={1.05}
                distortion={0.76}
                speed={0.68}
                className="h-full w-full"
              />
              {/* Subtle architectural depth overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 75% 55% at 50% 0%, rgba(8,5,18,0.12) 0%, rgba(8,5,18,0.68) 100%)",
                }}
              />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
                {/* Left Column: Kinetic Headline + Magnetic CTAs */}
                <div className="space-y-6 lg:col-span-6">
                  <Reveal immediate delay={0.02} y={8}>
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-md">
                      <span className="h-2 w-2 rounded-full bg-[#28E7C5] shadow-[0_0_10px_#28E7C5]" />
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">
                        SUPPLEY · Importação Inteligente
                      </span>
                    </div>
                  </Reveal>

                  <h1
                    className="text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.55rem] lg:leading-[1.03]"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                    }}
                  >
                    <MaskLineReveal
                      immediate
                      delay={0.06}
                      stagger={0.08}
                      lines={["Importe direto da origem,", "com cotações"]}
                    />
                    <span className="mt-1 block min-h-[1.15em]">
                      <motion.span
                        key={phraseIdx}
                        initial={{ y: 16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.42, ease: EASE_EDITORIAL }}
                        className="inline-block text-[#28E7C5]"
                        style={{
                          textShadow: "0 0 36px rgba(40, 231, 197, 0.35)",
                        }}
                      >
                        {HERO_CYCLING_PHRASES[phraseIdx]}
                      </motion.span>
                    </span>
                  </h1>

                  <Reveal immediate delay={0.24} y={14}>
                    <p className="max-w-[52ch] text-base leading-relaxed text-white/75 sm:text-lg">
                      A <strong className="font-semibold text-white">SUPPLEY</strong> conecta sua empresa a fabricantes globais de ponta a ponta. Na{" "}
                      <strong className="font-semibold text-[#28E7C5]">Excambia</strong>, você solicita cotações, valida impostos e custo nacionalizado em minutos e rastreia o embarque até o seu estoque.
                    </p>
                  </Reveal>

                  <Reveal immediate delay={0.3} y={14}>
                    <div className="flex flex-wrap items-center gap-3.5 pt-2">
                      <MagneticButton
                        onClick={() => handleOpenAccess()}
                        className="rounded-xl bg-[#28E7C5] px-6 py-3.5 text-sm font-bold text-[#120A22] shadow-[0_14px_38px_-10px_rgba(40,231,197,0.65)] transition-colors hover:bg-[#49F2D4]"
                      >
                        <KeyRound className="h-4 w-4" />
                        <span>Solicitar acesso para cotar</span>
                        <ArrowRight className="h-4 w-4" />
                      </MagneticButton>

                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:border-[#28E7C5]/50 hover:bg-white/[0.12]"
                      >
                        <LogIn className="h-4 w-4 text-[#28E7C5]" />
                        <span>Já tenho login · Entrar</span>
                      </Link>
                    </div>
                  </Reveal>

                  <Reveal immediate delay={0.38} y={10}>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs text-white/70">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-[#28E7C5]" />
                        Custo nacionalizado real
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-[#28E7C5]" />
                        Fábricas homologadas
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-[#28E7C5]" />
                        Operação ponta a ponta
                      </span>
                    </div>
                  </Reveal>
                </div>

                {/* Right Column: 3D-Tilting Interactive Hero Excambia Terminal */}
                <Reveal
                  immediate
                  delay={0.28}
                  y={22}
                  className="lg:col-span-6"
                >
                  <HeroExcambiaTerminal
                    usdRate={usdRate}
                    eurRate={eurRate}
                    onRequestAccess={handleOpenAccess}
                  />
                </Reveal>
              </div>
            </div>
          </section>

          {/* =================================================================
              VELOCITY-REACTIVE GLOBAL TRADE MARQUEE
             ================================================================= */}
          <div className="border-y border-white/10 bg-[#120A22] py-4 text-white">
            <VelocityMarquee
              baseSpeed={42}
              items={TRADE_CORRIDORS.map((corridor) => (
                <div
                  key={corridor}
                  className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 font-mono text-[11px] font-semibold tracking-wider text-white/80"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#28E7C5]" />
                  <span>{corridor}</span>
                </div>
              ))}
            />
          </div>

          {/* =================================================================
              SECTION 01: LIVE INTERACTIVE LANDED COST & SAVINGS SIMULATOR
             ================================================================= */}
          <section id="simulador" className="bg-[#FAF9F6] py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <Reveal className="max-w-3xl space-y-3">
                <div className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#682ABA]">
                  01 / SIMULADOR AO VIVO
                </div>
                <h2 className="text-3xl font-bold tracking-[-0.035em] text-[#1B1523] sm:text-4xl">
                  Simule sua importação e descubra sua margem em tempo real.
                </h2>
                <p className="text-base leading-relaxed text-[#5B5466]">
                  Arraste os controles abaixo, alterne o regime tributário e veja na hora como a inteligência fiscal e o sourcing da SUPPLEY transformam seu custo nacionalizado com o câmbio PTAX de hoje.
                </p>
              </Reveal>

              <ScrollScaleFrame className="mt-10">
                <InteractiveLandedCostSimulator
                  usdRate={usdRate}
                  onRequestAccess={handleOpenAccess}
                />
              </ScrollScaleFrame>
            </div>
          </section>

          {/* =================================================================
              SECTION 02: INTERACTIVE PROFORMA LASER SCANNER & LIVE CHAT SANDBOX
             ================================================================= */}
          <section
            id="sandbox"
            className="relative overflow-hidden border-y border-white/10 bg-[#0A0616] py-20 text-white sm:py-28"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 50% at 80% 15%, rgba(104,42,186,0.28) 0%, transparent 70%), radial-gradient(50% 45% at 15% 85%, rgba(40,231,197,0.16) 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
              <Reveal className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#28E7C5]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>02 / EXPERIMENTE A EXCAMBIA</span>
                </div>
                <h2 className="text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
                  Escaneie uma Proforma ou converse com a Excambia agora.
                </h2>
                <p className="text-base leading-relaxed text-white/70">
                  Antes mesmo de solicitar seu login, teste como a Excambia lê documentos internacionais com OCR fiscal e responde dúvidas reais da sua equipe de compras.
                </p>
              </Reveal>

              <div className="mt-10">
                <InteractiveProformaSandbox
                  usdRate={usdRate}
                  onRequestAccess={handleOpenAccess}
                />
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 03: SCROLL-CHOREOGRAPHED STICKY JOURNEY + ROUTE MAP
             ================================================================= */}
          <section id="jornada" className="bg-[#FAF9F6] py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <Reveal className="max-w-2xl space-y-3">
                  <div className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#682ABA]">
                    03 / JORNADA PONTA A PONTA
                  </div>
                  <h2 className="text-3xl font-bold tracking-[-0.035em] text-[#1B1523] sm:text-4xl">
                    Da fábrica no exterior ao seu estoque, 100% rastreável.
                  </h2>
                </Reveal>
                <Reveal delay={0.1}>
                  <button
                    type="button"
                    onClick={() => handleOpenAccess()}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#682ABA] hover:underline"
                  >
                    <span>Solicitar acesso para começar</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Reveal>
              </div>

              <div className="mt-12">
                <StickyJourneyWithRouteMap onRequestAccess={handleOpenAccess} />
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 04: INTERACTIVE DRAG-TO-COMPARE + 3D TILT SERVICE PILLARS
             ================================================================= */}
          <section
            id="comparativo"
            className="border-t border-[#E7E4DC] bg-white py-20 sm:py-28"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-20">
              <div>
                <Reveal className="max-w-3xl space-y-3">
                  <div className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#682ABA]">
                    04 / COMPARATIVO INTERATIVO
                  </div>
                  <h2 className="text-3xl font-bold tracking-[-0.035em] text-[#1B1523] sm:text-4xl">
                    Veja a diferença entre importar no escuro e operar na Excambia.
                  </h2>
                </Reveal>

                <div className="mt-8">
                  <InteractiveBeforeAfterCurtain />
                </div>
              </div>

              {/* 6 Service Pillar Cards with Real 3D Perspective Tilt + Spotlight */}
              <div>
                <Reveal className="max-w-2xl space-y-2">
                  <div className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#682ABA]">
                    PILARES DO SERVIÇO SUPPLEY
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#1B1523] sm:text-3xl">
                    Engenharia fiscal, sourcing global e software no mesmo fluxo
                  </h3>
                </Reveal>

                <StaggerGroup className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {SERVICE_PILLARS.map((pillar) => {
                    const Icon = pillar.icon;
                    return (
                      <StaggerItem key={pillar.title}>
                        <TiltSpotlightCard
                          maxTilt={6}
                          spotlightColor="rgba(104, 42, 186, 0.12)"
                          className="h-full rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] p-6 transition-colors hover:border-[#682ABA]/35 hover:bg-white shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#682ABA] text-[#28E7C5] shadow-sm">
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#682ABA]">
                              {pillar.tag}
                            </span>
                          </div>
                          <h4 className="mt-5 text-base font-bold text-[#1B1523]">
                            {pillar.title}
                          </h4>
                          <p className="mt-2 text-sm leading-relaxed text-[#5B5466]">
                            {pillar.desc}
                          </p>
                        </TiltSpotlightCard>
                      </StaggerItem>
                    );
                  })}
                </StaggerGroup>
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 05: ANIMATED METRICS STRIP + SPRING FAQ ACCORDION
             ================================================================= */}
          <section
            id="duvidas"
            className="border-t border-[#E7E4DC] bg-[#FAF9F6] py-20 sm:py-28"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-16">
              <Reveal>
                <div className="grid grid-cols-2 gap-6 rounded-3xl border border-[#E7E4DC] bg-white p-7 shadow-sm sm:grid-cols-4 sm:p-9">
                  <div>
                    <div className="font-mono text-3xl font-bold text-[#682ABA] sm:text-4xl">
                      <AnimatedNumber value={10515} />
                    </div>
                    <div className="mt-1 text-xs font-medium text-[#6A6374]">
                      NCMs oficiais na base fiscal
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-3xl font-bold text-[#1B1523] sm:text-4xl">
                      <AnimatedNumber value={3} />
                    </div>
                    <div className="mt-1 text-xs font-medium text-[#6A6374]">
                      Regimes tributários + TTD 409
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-3xl font-bold text-[#0F8A74] sm:text-4xl">
                      <AnimatedNumber value={18} prefix="-" suffix="%" />
                    </div>
                    <div className="mt-1 text-xs font-medium text-[#6A6374]">
                      Economia média estimada por lote
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-3xl font-bold text-[#1B1523] sm:text-4xl">
                      <AnimatedNumber value={100} suffix="%" />
                    </div>
                    <div className="mt-1 text-xs font-medium text-[#6A6374]">
                      Rastreabilidade da cotação à entrega
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Smooth Spring FAQ Accordion */}
              <div className="mx-auto max-w-3xl">
                <Reveal className="text-center space-y-2 pb-8">
                  <div className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#682ABA]">
                    05 / DÚVIDAS FREQUENTES
                  </div>
                  <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#1B1523]">
                    Perguntas sobre o serviço e o acesso
                  </h2>
                </Reveal>

                <div className="space-y-3">
                  {FAQ_ITEMS.map((item, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div
                        key={item.q}
                        className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
                          isOpen
                            ? "border-[#682ABA]/40 shadow-sm"
                            : "border-[#E7E4DC]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-[#1B1523]"
                          style={{ color: "#1B1523" }}
                        >
                          <span>{item.q}</span>
                          <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={SPRING_GENTLE}
                            className="shrink-0 text-[#682ABA]"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-[#E7E4DC] px-5 py-4 text-sm leading-relaxed text-[#5B5466]">
                                {item.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 06: CLOSING INTERACTIVE UNICORN STUDIO WEBGL CTA PORTAL
             ================================================================= */}
          <section className="border-t border-[#E7E4DC] bg-white py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <Reveal>
                <div className="relative overflow-hidden rounded-3xl px-6 py-16 text-center text-white shadow-[0_32px_80px_-24px_rgba(24,8,52,0.65)] sm:px-12 sm:py-20">
                  <div className="pointer-events-none absolute inset-0">
                    <UnicornShaderCanvas
                      variant="dark"
                      preset="Suppley Purple"
                      intensity={1.08}
                      distortion={0.78}
                      speed={0.7}
                      lazyLoad
                      className="h-full w-full"
                    />
                  </div>

                  <div className="relative z-10 mx-auto max-w-2xl space-y-6">
                    <div className="flex justify-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl">
                        <ExcambiaOrb size={42} duration={8} />
                      </div>
                    </div>

                    <h2 className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                      Pronto para cotar sua próxima importação na Excambia?
                    </h2>
                    <p className="text-sm leading-relaxed text-white/80 sm:text-base">
                      Solicite seu login para acessar o ambiente completo ou entre agora se você já possui acesso ativo.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
                      <MagneticButton
                        onClick={() => handleOpenAccess()}
                        className="rounded-xl bg-[#28E7C5] px-6 py-3.5 text-sm font-bold text-[#120A22] shadow-[0_14px_38px_-10px_rgba(40,231,197,0.65)] transition-colors hover:bg-[#49F2D4]"
                      >
                        <KeyRound className="h-4 w-4" />
                        <span>Solicitar login de acesso</span>
                        <ArrowRight className="h-4 w-4" />
                      </MagneticButton>

                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
                      >
                        <LogIn className="h-4 w-4 text-[#28E7C5]" />
                        <span>Já tenho login · Entrar</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#E7E4DC] bg-[#FAF9F6] py-10 text-xs text-[#6A6374]">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo-suppley.png"
                alt="SUPPLEY"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[#C8C2D4]">|</span>
              <span>SUPPLEY &amp; Excambia · Importação Inteligente</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 font-medium">
              <a href="#simulador" className="hover:text-[#1B1523]">
                Simulador
              </a>
              <a href="#sandbox" className="hover:text-[#1B1523]">
                Excambia
              </a>
              <a href="#jornada" className="hover:text-[#1B1523]">
                Como Funciona
              </a>
              <button
                type="button"
                onClick={() => handleOpenAccess()}
                className="hover:text-[#682ABA]"
              >
                Solicitar acesso
              </button>
              <Link
                href="/login"
                className="font-semibold text-[#682ABA] hover:underline"
              >
                Entrar
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </MotionProvider>
  );
}
