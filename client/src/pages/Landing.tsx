import React, { useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Code2,
  Globe2,
  LogIn,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ExcambiaOrb from "@/components/ExcambiaOrb";
import {
  AnimatedNumber,
  EASE_EDITORIAL,
  MagneticButton,
  MaskLineReveal,
  MotionProvider,
  Reveal,
  ScrollProgressBar,
  SpotlightCard,
  StaggerGroup,
  StaggerItem,
  useScrolled,
} from "@/components/landing/MotionPrimitives";
import InterconnectedHeroStage from "@/components/landing/InterconnectedHeroStage";
import ScrollJourneySection from "@/components/landing/ScrollJourneySection";
import InteractiveQuoteSimulator from "@/components/landing/InteractiveQuoteSimulator";
import McpApiIntegrationSection from "@/components/landing/McpApiIntegrationSection";
import MarcosGovernanceExplorer from "@/components/landing/MarcosGovernanceExplorer";

const CORRIDORS = [
  "China · Shenzhen & Ningbo",
  "Alemanha · Hamburgo",
  "Índia · Nhava Sheva",
  "Turquia · Istambul",
  "Coreia do Sul · Busan",
  "Itália · Gênova",
  "Estados Unidos · Houston",
  "Vietnã · Ho Chi Minh",
  "Itajaí / Navegantes (SC)",
  "Santos (SP)",
  "Paranaguá (PR)",
  "Suape (PE)",
];

const PILLARS = [
  {
    icon: Sparkles,
    tag: "Excambia AI",
    title: "Classificação NCM & inteligência de mercado",
    description:
      "Envie texto, PDF ou planilha: a Excambia extrai especificações técnicas, valida a NCM, verifica anuências e compara benchmarks antes do embarque.",
  },
  {
    icon: Calculator,
    tag: "Motor V2 + TTD",
    title: "Custo Landed com paridade contábil",
    description:
      "Simulação completa de II, IPI, PIS/COFINS, ICMS, frete, armazenagem e benefício fiscal TTD de Santa Catarina com câmbio atualizado.",
  },
  {
    icon: Globe2,
    tag: "Sourcing Direto",
    title: "Fábricas homologadas sem intermediários opacos",
    description:
      "Rede validada em 9 polos industriais globais com histórico real de cotações, amostras técnicas e inspeção de qualidade pré-embarque.",
  },
  {
    icon: Workflow,
    tag: "30 Marcos",
    title: "Operação rastreada da proforma à nota fiscal",
    description:
      "Acompanhe cada etapa — RFQ, contratação, produção, booking, BL/AWB, DI/DUIMP e liberação portuária — em uma linha do tempo única.",
  },
];

const FAQS = [
  {
    q: "Preciso já ter fornecedor no exterior para pedir uma cotação?",
    a: "Não. Você pode enviar apenas o nome do produto, especificação técnica, foto ou planilha. Nossa equipe e a inteligência Excambia localizam e homologam fábricas direto na origem e trazem propostas comparadas.",
  },
  {
    q: "A Suppley cuida também do frete internacional e do desembaraço no Brasil?",
    a: "Sim. Atuamos ponta a ponta: cotação na fábrica, análise tributária e cálculo Landed Cost, inspeção de qualidade, contratação de frete marítimo ou aéreo, registro de DI/DUIMP, nacionalização e entrega no seu endereço no Brasil.",
  },
  {
    q: "Posso conectar a Suppley à IA própria ou ao ERP da minha empresa?",
    a: "Sim. Disponibilizamos servidor MCP oficial (Model Context Protocol) para conectar agentes de IA corporativos (Claude, ChatGPT, Gemini ou agentes internos) e REST API + Webhooks para integrar ERPs como SAP, TOTVS, Omie, Sankhya ou sistemas próprios.",
  },
  {
    q: "Como funciona a economia com o benefício fiscal TTD?",
    a: "Ao estruturar a entrada da operação por portos com Tratamento Tributário Diferenciado (como Itajaí e Navegantes em SC), simulamos automaticamente a redução de carga de ICMS e mostramos no cálculo V2 o impacto exato na sua margem.",
  },
  {
    q: "Antes de fechar o pedido, eu sei exatamente quanto o produto vai custar aqui no Brasil?",
    a: "Sim. Antes de qualquer aprovação (gate GO/NO-GO), entregamos o estudo de viabilidade com valor FOB, frete, seguro, tributos e custo unitário nacionalizado — com paridade contábil.",
  },
];

interface QuoteModalState {
  open: boolean;
  intent: "quote" | "integration";
  product: string;
  origin: string;
  port: string;
  systemStack: string;
  name: string;
  email: string;
  company: string;
  submitted: boolean;
}

export default function Landing() {
  const scrolled = useScrolled(24);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [quoteModal, setQuoteModal] = useState<QuoteModalState>({
    open: false,
    intent: "quote",
    product: "",
    origin: "China",
    port: "Itajaí / Navegantes (SC)",
    systemStack: "Agente IA via MCP",
    name: "",
    email: "",
    company: "",
    submitted: false,
  });

  function openQuoteWithPreset(preset?: {
    intent?: "quote" | "integration";
    category?: string;
    origin?: string;
    port?: string;
  }) {
    setQuoteModal((prev) => ({
      ...prev,
      open: true,
      submitted: false,
      intent: preset?.intent ?? "quote",
      product: preset?.category ?? prev.product,
      origin: preset?.origin ?? prev.origin,
      port: preset?.port ?? prev.port,
    }));
  }

  function handleQuoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quoteModal.name.trim() || !quoteModal.email.trim()) {
      toast.error("Preencha seu nome e e-mail corporativo.");
      return;
    }
    if (quoteModal.intent === "quote" && !quoteModal.product.trim()) {
      toast.error("Informe o produto ou matéria-prima que deseja cotar.");
      return;
    }
    setQuoteModal((prev) => ({ ...prev, submitted: true }));
    toast.success(
      quoteModal.intent === "integration"
        ? "Solicitação de credenciais MCP/API registrada!"
        : "Solicitação recebida! Nossa equipe de sourcing entrará em contato."
    );
  }

  return (
    <MotionProvider>
      <div className="page-shell surface-grain min-h-screen bg-[#FAF9F6] text-[#1B1523] selection:bg-[#682ABA]/15 selection:text-[#682ABA]">
        {/* Scroll Progress Rail */}
        <ScrollProgressBar className="bg-gradient-to-r from-[#682ABA] via-[#8B4FD0] to-[#28E7C5]" />

        {/* Adaptive Floating Navbar */}
        <header className="fixed top-0 inset-x-0 z-40 px-4 sm:px-6 pt-3 sm:pt-4 pointer-events-none">
          <div
            className={`pointer-events-auto mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 sm:px-6 transition-all duration-300 ${
              scrolled
                ? "h-14 border border-[#E7E4DC]/90 bg-white/88 backdrop-blur-md shadow-[0_10px_30px_-14px_rgba(49,18,96,0.16)]"
                : "h-16 border border-transparent bg-transparent"
            }`}
          >
            <a href="#topo" className="flex items-center gap-2.5 focus:outline-none">
              <img
                src="/logo-suppley.png"
                alt="SUPPLEY Raw Material"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </a>

            <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6A6374]">
              <a href="#como-funciona" className="transition-colors hover:text-[#1B1523]">
                Como funciona
              </a>
              <a href="#simulador" className="transition-colors hover:text-[#1B1523]">
                Simulador
              </a>
              <a href="#integracoes" className="inline-flex items-center gap-1.5 transition-colors hover:text-[#1B1523]">
                <span>MCP &amp; API</span>
                <span className="rounded-full bg-[#28E7C5]/25 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-[#0D5D4D]">
                  IA
                </span>
              </a>
              <a href="#ecossistema" className="transition-colors hover:text-[#1B1523]">
                Plataforma
              </a>
              <a href="#faq" className="transition-colors hover:text-[#1B1523]">
                Dúvidas
              </a>
            </nav>

            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E4DC] bg-white/80 px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#1B1523] transition-colors hover:border-[#682ABA]/35 hover:text-[#682ABA]"
              >
                <LogIn className="h-3.5 w-3.5" />
                Entrar
              </Link>
              <MagneticButton
                type="button"
                onClick={() => openQuoteWithPreset()}
                className="btn-sheen hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#682ABA] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(104,42,186,0.55)] transition-colors hover:bg-[#5A23A3]"
              >
                Cotar produto
                <ArrowRight className="h-3.5 w-3.5" />
              </MagneticButton>
            </div>
          </div>
        </header>

        <main id="topo">
          {/* ============================================================== */}
          {/* HERO SECTION — Immediate Mount Choreography + Live Beam Stage  */}
          {/* ============================================================== */}
          <section className="relative pt-28 sm:pt-32 lg:pt-36 pb-16 lg:pb-24 overflow-x-clip">
            {/* Soft studio radial washes in official brand palette */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[780px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(104,42,186,0.10)_0%,rgba(40,231,197,0.06)_45%,transparent_72%)]"
            />

            <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
              <div className="max-w-3xl">
                <Reveal immediate delay={0.0} y={10}>
                  <p className="inline-flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#682ABA]">
                    <span className="h-px w-6 bg-[#682ABA]" />
                    Suppley · Inteligência de Comércio Exterior
                  </p>
                </Reveal>

                <h1 className="mt-4 text-[clamp(2.45rem,5.4vw,4.35rem)] font-bold tracking-[-0.04em] leading-[1.02] text-[#1B1523]">
                  <MaskLineReveal
                    lines={[
                      "Você cota no mundo inteiro.",
                      "A gente traz pro Brasil.",
                    ]}
                    accentLineIndex={1}
                    accentClassName="text-[#682ABA]"
                    delay={0.07}
                    stagger={0.09}
                    immediate
                  />
                </h1>

                <Reveal immediate delay={0.26} y={14}>
                  <p className="mt-5 max-w-[58ch] text-base sm:text-lg leading-relaxed text-[#6A6374]">
                    Da cotação com fábricas na China, Europa ou Ásia ao cálculo exato de impostos,
                    benefício TTD, embarque e desembaraço — tudo interligado em uma única operação
                    até a entrega na sua empresa.
                  </p>
                </Reveal>

                <Reveal immediate delay={0.34} y={14} className="mt-8 flex flex-wrap items-center gap-3.5">
                  <MagneticButton
                    type="button"
                    onClick={() => openQuoteWithPreset()}
                    className="btn-sheen inline-flex items-center gap-2 rounded-2xl bg-[#682ABA] px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-[0_14px_34px_-10px_rgba(104,42,186,0.55)] transition-colors hover:bg-[#5A23A3]"
                  >
                    Fazer uma cotação internacional
                    <ArrowRight className="h-4 w-4" />
                  </MagneticButton>

                  <a
                    href="#simulador"
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#E7E4DC] bg-white px-5 py-3.5 text-sm sm:text-base font-semibold text-[#1B1523] transition-all hover:border-[#682ABA]/35 hover:shadow-sm"
                  >
                    Simular custo no Brasil
                  </a>
                </Reveal>

                <Reveal immediate delay={0.39} y={10} className="mt-4">
                  <a
                    href="#integracoes"
                    className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#6A6374] transition-colors hover:text-[#682ABA]"
                  >
                    <Code2 className="h-3.5 w-3.5 text-[#682ABA]" />
                    <span>
                      Disponível também via <strong className="font-semibold text-[#1B1523]">Servidor MCP</strong> e{" "}
                      <strong className="font-semibold text-[#1B1523]">APIs</strong> para conectar sua IA própria ou ERP →
                    </span>
                  </a>
                </Reveal>
              </div>

              {/* Interconnected Global-to-Brazil Animated Beam Stage */}
              <Reveal immediate delay={0.42} y={22} className="mt-12 lg:mt-14">
                <InterconnectedHeroStage />
              </Reveal>
            </div>
          </section>

          {/* ============================================================== */}
          {/* GLOBAL CORRIDORS MARQUEE                                       */}
          {/* ============================================================== */}
          <section aria-label="Corredores globais atendidos" className="py-8 border-y border-[#E7E4DC] bg-white/60">
            <div className="marquee-viewport mx-auto max-w-6xl">
              <div className="marquee-track">
                {[...CORRIDORS, ...CORRIDORS].map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className="inline-flex items-center gap-3 whitespace-nowrap font-mono text-xs font-medium text-[#6A6374]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#28E7C5]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* STICKY SCROLL-LINKED INTERCONNECTED JOURNEY                    */}
          {/* ============================================================== */}
          <ScrollJourneySection />

          {/* ============================================================== */}
          {/* INTERACTIVE QUOTE & TTD SIMULATOR                              */}
          {/* ============================================================== */}
          <InteractiveQuoteSimulator onRequestQuote={(preset) => openQuoteWithPreset(preset)} />

          {/* ============================================================== */}
          {/* MCP & API INTEGRATION SECTION (Own AI & ERP Connectivity)      */}
          {/* ============================================================== */}
          <McpApiIntegrationSection
            onRequestIntegration={() => openQuoteWithPreset({ intent: "integration" })}
          />

          {/* ============================================================== */}
          {/* PLATFORM PILLARS + ANIMATED METRICS                            */}
          {/* ============================================================== */}
          <section id="ecossistema" className="py-24 lg:py-32 border-t border-[#E7E4DC]">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
              <Reveal className="max-w-2xl mb-14">
                <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#682ABA]">
                  Tecnologia + Operação real
                </span>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-[-0.035em] leading-[1.08] text-[#1B1523]">
                  Inteligência própria para eliminar o achismo da importação.
                </h2>
              </Reveal>

              {/* Metrics strip */}
              <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {[
                  { value: 30, suffix: "", label: "Marcos rastreados por operação" },
                  { value: 9, suffix: "+", label: "Polos industriais de origem" },
                  { value: 7, suffix: "", label: "Portos brasileiros integrados" },
                  { value: 100, suffix: "%", label: "Visibilidade do FOB à NF-e" },
                ].map((stat) => (
                  <StaggerItem key={stat.label}>
                    <div className="rounded-2xl border border-[#E7E4DC] bg-white p-5 sm:p-6">
                      <p className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#682ABA]">
                        <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                      </p>
                      <p className="mt-2 text-xs sm:text-sm text-[#6A6374]">{stat.label}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>

              {/* Interactive 9-Phase / 30-Milestone Connected Rail */}
              <MarcosGovernanceExplorer />

              {/* Spotlight Bento Pillars */}
              <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {PILLARS.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <StaggerItem key={pillar.title}>
                      <SpotlightCard
                        spotlightColor="rgba(104, 42, 186, 0.08)"
                        className="h-full rounded-[24px] border border-[#E7E4DC] bg-white p-6 sm:p-8 shadow-[0_6px_24px_-16px_rgba(49,18,96,0.12)] transition-colors hover:border-[#682ABA]/35"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FAF9F6] border border-[#E7E4DC] text-[#682ABA]">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0D5D4D] rounded-full bg-[#28E7C5]/20 px-3 py-1">
                            {pillar.tag}
                          </span>
                        </div>
                        <h3 className="mt-5 text-xl font-bold tracking-[-0.02em] text-[#1B1523]">
                          {pillar.title}
                        </h3>
                        <p className="mt-2.5 text-sm leading-relaxed text-[#6A6374]">
                          {pillar.description}
                        </p>
                      </SpotlightCard>
                    </StaggerItem>
                  );
                })}
              </StaggerGroup>
            </div>
          </section>

          {/* ============================================================== */}
          {/* FAQ ACCORDION                                                  */}
          {/* ============================================================== */}
          <section id="faq" className="py-24 border-t border-[#E7E4DC]">
            <div className="mx-auto max-w-4xl px-5 sm:px-8">
              <Reveal className="mb-10">
                <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#682ABA]">
                  Perguntas frequentes
                </span>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-[-0.035em] text-[#1B1523]">
                  Tudo claro antes do seu primeiro embarque.
                </h2>
              </Reveal>

              <div className="divide-y divide-[#E7E4DC] rounded-[24px] border border-[#E7E4DC] bg-white overflow-hidden">
                {FAQS.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={item.q}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#FAF9F6]/70"
                      >
                        <span className="text-sm sm:text-base font-semibold text-[#1B1523]">
                          {item.q}
                        </span>
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
                          className="shrink-0 text-[#682ABA]"
                        >
                          <ChevronDown className="h-5 w-5" />
                        </motion.span>
                      </button>
                      <div
                        className="accordion-panel"
                        data-open={isOpen ? "true" : "false"}
                      >
                        <div>
                          <p className="px-6 pb-5 text-sm leading-relaxed text-[#6A6374]">
                            {item.a}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* CLOSING CTA BAND                                               */}
          {/* ============================================================== */}
          <section className="pb-24 pt-6 px-5 sm:px-8">
            <Reveal className="mx-auto max-w-6xl">
              <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#311260] via-[#511D97] to-[#682ABA] px-7 py-14 sm:px-14 sm:py-20 text-white shadow-[0_28px_70px_-24px_rgba(49,18,96,0.55)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#28E7C5]/20 blur-3xl"
                />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                  <div className="max-w-2xl">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
                        <ExcambiaOrb size={38} duration={14} />
                      </div>
                      <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#28E7C5]">
                        Pronto para importar com previsibilidade?
                      </span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.035em] leading-[1.05]">
                      Envie o produto que você precisa. Nós cotamos lá fora e entregamos no Brasil.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm sm:text-base text-white/80 leading-relaxed">
                      Receba um estudo completo com fornecedores homologados, NCM validada, cálculo
                      Landed Cost + TTD e prazo estimado porta a porta — ou plugue tudo na sua IA via MCP.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                    <MagneticButton
                      type="button"
                      onClick={() => openQuoteWithPreset()}
                      className="btn-sheen inline-flex items-center justify-center gap-2 rounded-2xl bg-[#28E7C5] px-7 py-4 text-sm sm:text-base font-bold text-[#0D3D35] shadow-[0_14px_34px_-10px_rgba(40,231,197,0.55)] transition-colors hover:bg-[#3bf0cf]"
                    >
                      Solicitar cotação agora
                      <ArrowRight className="h-4 w-4" />
                    </MagneticButton>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-7 py-4 text-sm sm:text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/18"
                    >
                      Já sou cliente · Acessar plataforma
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-[#E7E4DC] py-10">
          <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-5 sm:px-8 text-xs text-[#6A6374]">
            <div className="flex items-center gap-3">
              <img src="/logo-suppley.png" alt="SUPPLEY" className="h-6 w-auto object-contain" />
              <span className="hidden sm:inline text-[#E7E4DC]">|</span>
              <span>Inteligência para Comércio Exterior &amp; Importação Ponta a Ponta</span>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <a href="#como-funciona" className="hover:text-[#1B1523]">Como funciona</a>
              <a href="#simulador" className="hover:text-[#1B1523]">Simulador</a>
              <a href="#integracoes" className="hover:text-[#1B1523]">MCP &amp; API</a>
              <Link href="/login" className="font-semibold text-[#682ABA] hover:underline">
                Entrar na plataforma
              </Link>
            </div>
          </div>
        </footer>

        {/* ============================================================== */}
        {/* INTERACTIVE QUOTE / MCP-API INTEGRATION MODAL                  */}
        {/* ============================================================== */}
        <AnimatePresence>
          {quoteModal.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1523]/55 p-4 backdrop-blur-sm"
              onClick={() => setQuoteModal((prev) => ({ ...prev, open: false }))}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-[28px] border border-[#E7E4DC] bg-white p-6 sm:p-8 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#682ABA]">
                      {quoteModal.intent === "integration"
                        ? "Integração Técnica · MCP & API"
                        : "Cotação Internacional · Suppley"}
                    </span>
                    <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#1B1523]">
                      {quoteModal.intent === "integration"
                        ? "Conecte sua IA ou sistema próprio"
                        : "O que vamos trazer pro Brasil?"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    aria-label="Fechar janela"
                    onClick={() => setQuoteModal((prev) => ({ ...prev, open: false }))}
                    className="rounded-xl p-2 text-[#6A6374] hover:bg-[#FAF9F6] hover:text-[#1B1523]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Intent Switcher */}
                {!quoteModal.submitted && (
                  <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] p-1">
                    <button
                      type="button"
                      onClick={() => setQuoteModal((p) => ({ ...p, intent: "quote" }))}
                      className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                        quoteModal.intent === "quote"
                          ? "bg-white text-[#1B1523] shadow-xs"
                          : "text-[#6A6374] hover:text-[#1B1523]"
                      }`}
                    >
                      Cotar produto
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuoteModal((p) => ({ ...p, intent: "integration" }))}
                      className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                        quoteModal.intent === "integration"
                          ? "bg-[#682ABA] text-white shadow-xs"
                          : "text-[#6A6374] hover:text-[#1B1523]"
                      }`}
                    >
                      Integrar MCP / API
                    </button>
                  </div>
                )}

                {quoteModal.submitted ? (
                  <div className="mt-6 rounded-2xl border border-[#28E7C5]/50 bg-[#FAF9F6] p-6 text-center space-y-3">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#28E7C5]/25 text-[#0D5D4D]">
                      <CheckCircle2 className="h-6 w-6" />
                    </span>
                    <h4 className="text-lg font-bold text-[#1B1523]">
                      {quoteModal.intent === "integration"
                        ? "Solicitação de acesso MCP/API registrada!"
                        : "Pedido de cotação registrado!"}
                    </h4>
                    <p className="text-sm text-[#6A6374]">
                      {quoteModal.intent === "integration" ? (
                        <>
                          Enviaremos as credenciais de sandbox e documentação para{" "}
                          <strong>{quoteModal.email}</strong> ({quoteModal.systemStack}).
                        </>
                      ) : (
                        <>
                          Recebemos os dados para <strong>{quoteModal.product}</strong> (
                          {quoteModal.origin} → {quoteModal.port}). Nossa equipe já pode estruturar
                          sua NCM e viabilidade econômica.
                        </>
                      )}
                    </p>
                    <div className="pt-2 flex flex-wrap justify-center gap-2.5">
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#682ABA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5A23A3]"
                      >
                        Acessar minha conta
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setQuoteModal((prev) => ({ ...prev, open: false }))}
                        className="rounded-xl border border-[#E7E4DC] px-5 py-2.5 text-sm font-semibold text-[#1B1523] hover:bg-white"
                      >
                        Voltar à página
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleQuoteSubmit} className="mt-5 space-y-4">
                    {quoteModal.intent === "quote" ? (
                      <>
                        <div>
                          <label htmlFor="quote-product" className="block text-xs font-semibold text-[#1B1523] mb-1.5">
                            Produto ou matéria-prima *
                          </label>
                          <input
                            id="quote-product"
                            type="text"
                            required
                            placeholder="Ex.: Polipropileno, peças industriais, embalagens…"
                            value={quoteModal.product}
                            onChange={(e) => setQuoteModal((p) => ({ ...p, product: e.target.value }))}
                            className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#1B1523] outline-none focus:border-[#682ABA] focus:bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label htmlFor="quote-origin" className="block text-xs font-semibold text-[#1B1523] mb-1.5">
                              Origem preferida
                            </label>
                            <select
                              id="quote-origin"
                              value={quoteModal.origin}
                              onChange={(e) => setQuoteModal((p) => ({ ...p, origin: e.target.value }))}
                              className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#1B1523] outline-none focus:border-[#682ABA] focus:bg-white"
                            >
                              <option>China</option>
                              <option>Alemanha</option>
                              <option>Índia</option>
                              <option>Turquia</option>
                              <option>Coreia do Sul</option>
                              <option>Estados Unidos</option>
                              <option>Melhor origem global</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="quote-port" className="block text-xs font-semibold text-[#1B1523] mb-1.5">
                              Porto / Destino no Brasil
                            </label>
                            <input
                              id="quote-port"
                              type="text"
                              value={quoteModal.port}
                              onChange={(e) => setQuoteModal((p) => ({ ...p, port: e.target.value }))}
                              className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#1B1523] outline-none focus:border-[#682ABA] focus:bg-white"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label htmlFor="quote-stack" className="block text-xs font-semibold text-[#1B1523] mb-1.5">
                            O que deseja conectar?
                          </label>
                          <select
                            id="quote-stack"
                            value={quoteModal.systemStack}
                            onChange={(e) => setQuoteModal((p) => ({ ...p, systemStack: e.target.value }))}
                            className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#1B1523] outline-none focus:border-[#682ABA] focus:bg-white"
                          >
                            <option>Agente IA via MCP</option>
                            <option>ERP (SAP / TOTVS / Omie / Sankhya)</option>
                            <option>Sistema próprio via REST API</option>
                            <option>BI / Data Warehouse via Webhooks</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="quote-company" className="block text-xs font-semibold text-[#1B1523] mb-1.5">
                            Empresa
                          </label>
                          <input
                            id="quote-company"
                            type="text"
                            placeholder="Nome da empresa"
                            value={quoteModal.company}
                            onChange={(e) => setQuoteModal((p) => ({ ...p, company: e.target.value }))}
                            className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#1B1523] outline-none focus:border-[#682ABA] focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label htmlFor="quote-name" className="block text-xs font-semibold text-[#1B1523] mb-1.5">
                          Seu nome *
                        </label>
                        <input
                          id="quote-name"
                          type="text"
                          required
                          placeholder="Seu nome"
                          value={quoteModal.name}
                          onChange={(e) => setQuoteModal((p) => ({ ...p, name: e.target.value }))}
                          className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#1B1523] outline-none focus:border-[#682ABA] focus:bg-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="quote-email" className="block text-xs font-semibold text-[#1B1523] mb-1.5">
                          E-mail corporativo *
                        </label>
                        <input
                          id="quote-email"
                          type="email"
                          required
                          placeholder="voce@empresa.com.br"
                          value={quoteModal.email}
                          onChange={(e) => setQuoteModal((p) => ({ ...p, email: e.target.value }))}
                          className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#1B1523] outline-none focus:border-[#682ABA] focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-[11px] text-[#6A6374]">
                        <ShieldCheck className="h-4 w-4 text-[#0D5D4D]" />
                        {quoteModal.intent === "integration"
                          ? "Sandbox + documentação técnica"
                          : "Sem compromisso · Retorno técnico"}
                      </span>
                      <button
                        type="submit"
                        className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-[#682ABA] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5A23A3]"
                      >
                        {quoteModal.intent === "integration"
                          ? "Solicitar chaves"
                          : "Enviar cotação"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionProvider>
  );
}
