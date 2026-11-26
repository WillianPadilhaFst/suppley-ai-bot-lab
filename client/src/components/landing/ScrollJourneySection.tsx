import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  Anchor,
  Calculator,
  Check,
  CheckCircle2,
  Factory,
  FileSearch,
  Globe2,
  PackageCheck,
  Send,
  ShieldCheck,
  Ship,
  TrendingDown,
} from "lucide-react";
import { EASE_EDITORIAL, Reveal, SPRING_SNAPPY } from "./MotionPrimitives";

interface JourneyStep {
  id: string;
  number: string;
  phase: string;
  title: string;
  description: string;
  highlights: string[];
  badge: string;
}

const STEPS: JourneyStep[] = [
  {
    id: "rfq",
    number: "01",
    phase: "Pedido & NCM",
    title: "Você descreve o produto. A Excambia estrutura tudo.",
    description:
      "Envie o nome do item, foto, planilha ou especificação técnica. Nossa inteligência classifica a NCM, checa exigências de conformidade e monta a RFQ profissional em minutos.",
    highlights: ["Classificação NCM assistida", "Análise de anuências e certificações", "RFQ padronizada em inglês técnico"],
    badge: "Fase 1 · Produto e conformidade",
  },
  {
    id: "sourcing",
    number: "02",
    phase: "Sourcing Global",
    title: "Acionamos fábricas homologadas direto na origem.",
    description:
      "Buscamos e negociamos com fabricantes verificados na China, Índia, Turquia, Alemanha, EUA e Coreia do Sul — comparando preço FOB, lead time, MOQ e certificações lado a lado.",
    highlights: ["Comparativo multi-fornecedor", "Auditoria e histórico de preço", "Amostra e validação técnica"],
    badge: "Fase 2 · Sourcing e homologação",
  },
  {
    id: "viabilidade",
    number: "03",
    phase: "Landed Cost & TTD",
    title: "Custo total no Brasil antes de você aprovar o pedido.",
    description:
      "Nosso Motor V2 calcula frete internacional, seguro, II, IPI, PIS/COFINS, ICMS e benefício fiscal TTD com câmbio em tempo real e paridade contábil para você dar o GO com margem garantida.",
    highlights: ["Câmbio ao vivo e paridade contábil", "Simulação com benefício fiscal TTD", "Benchmark contra o mercado nacional"],
    badge: "Fase 3 · Viabilidade econômica",
  },
  {
    id: "entrega",
    number: "04",
    phase: "Embarque & Entrega",
    title: "A gente cuida de tudo e traz até a sua operação.",
    description:
      "Do contrato e inspeção na fábrica ao booking marítimo/aéreo, registro de DI/DUIMP, desembaraço portuário e entrega nacionalizada — com 30 marcos visíveis em tempo real.",
    highlights: ["Inspeção de qualidade na origem", "BL/AWB e registro DI / DUIMP", "Rastreio ponta a ponta nos 30 marcos"],
    badge: "Fases 4–9 · Da fábrica à sua porta",
  },
];

function StageVisual({ activeId }: { activeId: string }) {
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeId}
        initial={{ opacity: 0, y: prefersReduced ? 0 : 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: prefersReduced ? 0 : -12, scale: 0.985 }}
        transition={{ duration: 0.36, ease: EASE_EDITORIAL }}
        className="h-full"
      >
        {activeId === "rfq" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E4DC] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#682ABA]/10 text-[#682ABA]">
                  <FileSearch className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1B1523]">RFQ #2048 · Nova Cotação</p>
                  <p className="font-mono text-[11px] text-[#6A6374]">Excambia AI · Extração automática</p>
                </div>
              </div>
              <span className="rounded-full bg-[#28E7C5]/20 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#0D5D4D]">
                NCM 98% conf.
              </span>
            </div>

            <div className="rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6A6374]">Produto identificado</span>
                <span className="font-semibold text-[#1B1523]">Polipropileno Homopolímero (24 TON)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6A6374]">NCM sugerida</span>
                <span className="font-mono font-semibold text-[#682ABA]">3902.10.20</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6A6374]">Destino & Incoterm</span>
                <span className="font-medium text-[#1B1523]">Itajaí/SC · FOB</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Anuências", value: "Sem LI", ok: true },
                { label: "II / IPI", value: "14% / 0%", ok: true },
                { label: "Mercados", value: "CN · IN · KR", ok: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#E7E4DC] bg-white p-3"
                >
                  <span className="block font-mono text-[10px] uppercase text-[#6A6374]">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-[#1B1523]">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-[#682ABA] px-4 py-3 text-white text-xs font-medium">
              <Send className="h-4 w-4 text-[#28E7C5]" />
              Disparando RFQ técnica para 6 fábricas homologadas…
            </div>
          </div>
        )}

        {activeId === "sourcing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E4DC] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#682ABA]/10 text-[#682ABA]">
                  <Globe2 className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1B1523]">Comparativo de Fábricas</p>
                  <p className="font-mono text-[11px] text-[#6A6374]">3 propostas homologadas recebidas</p>
                </div>
              </div>
              <span className="rounded-full bg-[#682ABA]/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#682ABA]">
                Melhor oferta
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  name: "Ningbo Petrochem Ltd.",
                  country: "China · Ningbo",
                  fob: "US$ 1.180 / ton",
                  lead: "14 dias",
                  recommended: true,
                },
                {
                  name: "Gujarat Polymer Works",
                  country: "Índia · Mundra",
                  fob: "US$ 1.245 / ton",
                  lead: "18 dias",
                  recommended: false,
                },
                {
                  name: "Busan Industrial Corp.",
                  country: "Coreia · Busan",
                  fob: "US$ 1.290 / ton",
                  lead: "16 dias",
                  recommended: false,
                },
              ].map((sup) => (
                <div
                  key={sup.name}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 transition-colors ${
                    sup.recommended
                      ? "border-[#682ABA]/40 bg-[#FAF9F6] shadow-[0_8px_20px_-12px_rgba(104,42,186,0.3)]"
                      : "border-[#E7E4DC] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        sup.recommended
                          ? "bg-[#682ABA] text-white"
                          : "bg-[#FAF9F6] text-[#6A6374]"
                      }`}
                    >
                      <Factory className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#1B1523]">{sup.name}</p>
                      <p className="text-[11px] text-[#6A6374]">
                        {sup.country} · Lead {sup.lead}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <p className="font-mono text-xs font-bold text-[#1B1523] tabular-nums">
                      {sup.fob}
                    </p>
                    {sup.recommended && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-[#0D5D4D]">
                        <CheckCircle2 className="h-3 w-3" /> Selecionada
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeId === "viabilidade" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E4DC] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#28E7C5]/25 text-[#0D5D4D]">
                  <Calculator className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1B1523]">Motor de Cálculo V2</p>
                  <p className="font-mono text-[11px] text-[#6A6374]">Paridade contábil · PTAX ao vivo</p>
                </div>
              </div>
              <span className="rounded-full bg-[#28E7C5]/25 px-2.5 py-1 font-mono text-[10px] font-bold text-[#0D5D4D]">
                GO APROVADO
              </span>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] p-4">
              {[
                { label: "Valor FOB (24 TON)", val: "R$ 164.256", pct: 58 },
                { label: "Frete Internacional + Seguro", val: "R$ 19.840", pct: 12 },
                { label: "Impostos + Desembaraço (com TTD)", val: "R$ 54.120", pct: 30 },
              ].map((row) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6A6374]">{row.label}</span>
                    <span className="font-mono font-semibold text-[#1B1523] tabular-nums">
                      {row.val}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7E4DC]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.pct}%` }}
                      transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
                      className="h-full rounded-full bg-gradient-to-r from-[#682ABA] to-[#28E7C5]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#E7E4DC] bg-white p-3.5">
                <span className="block font-mono text-[10px] uppercase text-[#6A6374]">
                  Landed Cost Total
                </span>
                <span className="mt-1 block font-mono text-lg font-bold text-[#1B1523] tabular-nums">
                  R$ 238.216
                </span>
              </div>
              <div className="rounded-2xl border border-[#28E7C5]/50 bg-[#28E7C5]/15 p-3.5">
                <span className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase text-[#0D5D4D]">
                  <TrendingDown className="h-3.5 w-3.5" /> Economia vs. local
                </span>
                <span className="mt-1 block font-mono text-lg font-bold text-[#0D5D4D] tabular-nums">
                  -22,4%
                </span>
              </div>
            </div>
          </div>
        )}

        {activeId === "entrega" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E4DC] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#682ABA] text-white">
                  <Ship className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1B1523]">Trilho da Operação #OP-819</p>
                  <p className="font-mono text-[11px] text-[#6A6374]">30 marcos · Da fábrica à sua porta</p>
                </div>
              </div>
              <span className="rounded-full bg-[#682ABA]/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#682ABA]">
                27 / 30
              </span>
            </div>

            <ol className="relative space-y-3 pl-1">
              {[
                { label: "Inspeção de qualidade aprovada na fábrica", date: "Concluído · Ningbo", done: true, icon: ShieldCheck },
                { label: "Embarque marítimo & BL emitido", date: "Concluído · Navio MSC", done: true, icon: Ship },
                { label: "DUIMP registrada & carga nacionalizada", date: "Concluído · Porto de Itajaí", done: true, icon: Anchor },
                { label: "Entrega final agendada no CD do cliente", date: "Em andamento · Amanhã 09h", done: false, icon: PackageCheck },
              ].map((m, idx, arr) => {
                const Icon = m.icon;
                return (
                  <li key={m.label} className="relative flex items-start gap-3">
                    {idx < arr.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[13px] top-7 h-[calc(100%-6px)] w-px ${
                          m.done ? "bg-[#28E7C5]" : "bg-[#E7E4DC]"
                        }`}
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                        m.done
                          ? "border-[#0D5D4D] bg-[#28E7C5] text-[#0D5D4D]"
                          : "border-[#682ABA] bg-[#682ABA]/10 text-[#682ABA]"
                      }`}
                    >
                      {m.done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-xs font-semibold text-[#1B1523]">{m.label}</p>
                      <p className="font-mono text-[11px] text-[#6A6374]">{m.date}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default function ScrollJourneySection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start center", "end center"],
  });
  const railScaleY = useSpring(scrollYProgress, { stiffness: 180, damping: 28 });

  // Observa qual capítulo está no centro da viewport durante o scroll
  useEffect(() => {
    const elements = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-step-index"));
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { rootMargin: "-36% 0px -42% 0px", threshold: 0.1 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const currentStep = STEPS[activeIndex];

  return (
    <section
      id="como-funciona"
      ref={sectionRef}
      className="relative py-24 lg:py-32 border-t border-[#E7E4DC]"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl mb-14 lg:mb-20">
          <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#682ABA]">
            Jornada interligada · Ponta a ponta
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-[-0.035em] leading-[1.06] text-[#1B1523]">
            Você pede a cotação. Cada etapa se conecta até a carga chegar no Brasil.
          </h2>
          <p className="mt-4 text-base text-[#6A6374] leading-relaxed">
            Sem planilhas perdidas, despachantes desconectados ou surpresas tributárias. Uma linha
            contínua de inteligência liga o fabricante lá fora à sua empresa aqui dentro.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* LEFT: Connected narrative steps with continuous scroll-filled energy rail */}
          <div className="lg:col-span-6 relative pl-8 sm:pl-10">
            {/* Background track + live scroll progress fill */}
            <div
              aria-hidden="true"
              className="absolute left-3 top-2 bottom-2 w-[2px] rounded-full bg-[#E7E4DC]"
            >
              <motion.div
                style={{ scaleY: railScaleY }}
                className="h-full w-full origin-top rounded-full bg-gradient-to-b from-[#682ABA] via-[#8B4FD0] to-[#28E7C5]"
              />
            </div>

            <div className="space-y-6 lg:space-y-10">
              {STEPS.map((step, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={step.id}
                    ref={(el) => {
                      stepRefs.current[idx] = el;
                    }}
                    data-step-index={idx}
                    onClick={() => setActiveIndex(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveIndex(idx);
                      }
                    }}
                    className={`relative rounded-2xl border p-5 sm:p-6 transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "border-[#682ABA]/35 bg-white shadow-[0_14px_34px_-16px_rgba(49,18,96,0.16)]"
                        : "border-transparent bg-transparent hover:bg-white/60 hover:border-[#E7E4DC]"
                    }`}
                  >
                    {/* Node dot on the rail */}
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[31px] sm:-left-[39px] top-7 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                        isActive
                          ? "border-[#682ABA] bg-[#28E7C5] shadow-[0_0_0_5px_rgba(40,231,197,0.2)]"
                          : idx < activeIndex
                            ? "border-[#682ABA] bg-[#682ABA]"
                            : "border-[#D9D5CC] bg-[#FAF9F6]"
                      }`}
                    />

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isActive ? "text-[#682ABA]" : "text-[#6A6374]"
                        }`}
                      >
                        {step.number} /
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6A6374]">
                        {step.phase}
                      </span>
                    </div>

                    <h3 className="mt-2 text-lg sm:text-xl font-bold tracking-[-0.02em] text-[#1B1523]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#6A6374]">
                      {step.description}
                    </p>

                    <ul className="mt-4 flex flex-wrap gap-2">
                      {step.highlights.map((h) => (
                        <li
                          key={h}
                          className={`rounded-full px-3 py-1 text-[11px] font-medium border ${
                            isActive
                              ? "border-[#682ABA]/20 bg-[#FAF9F6] text-[#1B1523]"
                              : "border-[#E7E4DC] bg-white/70 text-[#6A6374]"
                          }`}
                        >
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Sticky living product showcase synced with scroll */}
          <div className="lg:col-span-6 lg:sticky lg:top-28">
            <div className="rounded-[28px] border border-[#E7E4DC] bg-white p-5 sm:p-7 shadow-[0_2px_4px_rgba(27,21,35,0.03),0_20px_48px_-18px_rgba(49,18,96,0.14)]">
              {/* Interconnected Step Tabs with shared layoutId pill */}
              <div className="mb-6 flex items-center justify-between gap-2 overflow-x-auto pb-1">
                <div className="inline-flex items-center gap-1 rounded-full border border-[#E7E4DC] bg-[#FAF9F6] p-1">
                  {STEPS.map((s, idx) => {
                    const isCurrent = idx === activeIndex;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        className={`relative whitespace-nowrap rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
                          isCurrent ? "text-white" : "text-[#6A6374] hover:text-[#1B1523]"
                        }`}
                      >
                        {isCurrent && (
                          <motion.span
                            layoutId="journey-active-tab"
                            transition={SPRING_SNAPPY}
                            className="absolute inset-0 rounded-full bg-[#682ABA]"
                          />
                        )}
                        <span className="relative z-10">{s.number}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#6A6374] hidden sm:inline">
                  {currentStep.badge}
                </span>
              </div>

              <div className="min-h-[340px]">
                <StageVisual activeId={currentStep.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
