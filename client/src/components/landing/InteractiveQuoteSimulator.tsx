import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Calculator, Ship, Sparkles, TrendingDown } from "lucide-react";
import { MagneticButton, Reveal, SPRING_SNAPPY } from "./MotionPrimitives";

interface OriginOption {
  id: string;
  label: string;
  hub: string;
  freightFactor: number;
  days: number;
}

interface CategoryOption {
  id: string;
  label: string;
  ncm: string;
  taxRate: number;
  ttdBenefit: number;
  baseFobUsd: number;
}

interface PortOption {
  id: string;
  label: string;
  state: string;
  hasTtd: boolean;
}

const CATEGORIES: CategoryOption[] = [
  { id: "polimeros", label: "Matérias-primas & Polímeros", ncm: "3902.10.20", taxRate: 0.34, ttdBenefit: 0.13, baseFobUsd: 42000 },
  { id: "maquinas", label: "Máquinas & Peças CNC", ncm: "8481.80.99", taxRate: 0.31, ttdBenefit: 0.115, baseFobUsd: 65000 },
  { id: "eletronicos", label: "Componentes Eletrônicos", ncm: "8542.31.90", taxRate: 0.28, ttdBenefit: 0.105, baseFobUsd: 38000 },
  { id: "embalagens", label: "Embalagens & Insumos", ncm: "3923.30.90", taxRate: 0.36, ttdBenefit: 0.14, baseFobUsd: 29000 },
];

const ORIGINS: OriginOption[] = [
  { id: "cn", label: "China", hub: "Ningbo / Shenzhen", freightFactor: 0.085, days: 34 },
  { id: "de", label: "Alemanha", hub: "Hamburgo", freightFactor: 0.072, days: 25 },
  { id: "in", label: "Índia", hub: "Nhava Sheva", freightFactor: 0.09, days: 31 },
  { id: "tr", label: "Turquia", hub: "Ambarli", freightFactor: 0.078, days: 24 },
];

const PORTS: PortOption[] = [
  { id: "itajai", label: "Itajaí / Navegantes (SC)", state: "SC", hasTtd: true },
  { id: "santos", label: "Santos (SP)", state: "SP", hasTtd: false },
  { id: "paranagua", label: "Paranaguá (PR)", state: "PR", hasTtd: false },
];

const USD_BRL = 5.78;

function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export default function InteractiveQuoteSimulator({
  onRequestQuote,
}: {
  onRequestQuote: (preset: { category: string; origin: string; port: string }) => void;
}) {
  const prefersReduced = useReducedMotion();
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [originId, setOriginId] = useState(ORIGINS[0].id);
  const [portId, setPortId] = useState(PORTS[0].id);
  const [lotMultiplier, setLotMultiplier] = useState(1);

  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0];
  const origin = ORIGINS.find((o) => o.id === originId) ?? ORIGINS[0];
  const port = PORTS.find((p) => p.id === portId) ?? PORTS[0];

  const calc = useMemo(() => {
    const fobUsd = category.baseFobUsd * lotMultiplier;
    const fobBrl = fobUsd * USD_BRL;
    const freightBrl = fobBrl * origin.freightFactor;
    const standardTaxBrl = (fobBrl + freightBrl) * category.taxRate;
    const ttdSavingsBrl = port.hasTtd ? (fobBrl + freightBrl) * category.ttdBenefit : 0;
    const netTaxBrl = standardTaxBrl - ttdSavingsBrl;
    const totalLanded = fobBrl + freightBrl + netTaxBrl;
    return {
      fobUsd,
      fobBrl,
      freightBrl,
      netTaxBrl,
      ttdSavingsBrl,
      totalLanded,
    };
  }, [category, origin, port, lotMultiplier]);

  return (
    <section id="simulador" className="py-24 lg:py-32 border-t border-[#E7E4DC]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#682ABA]">
              Simulador interativo · Prévia do Motor V2
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-[-0.035em] leading-[1.08] text-[#1B1523]">
              Veja na hora como a rota muda seu custo no Brasil.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-[#6A6374]">
            Combine categoria, país de origem e porto brasileiro para simular frete, tributos e
            economia com benefício fiscal TTD.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT: Interactive controls */}
          <div className="lg:col-span-7 rounded-[28px] border border-[#E7E4DC] bg-white p-6 sm:p-8 shadow-[0_12px_36px_-18px_rgba(49,18,96,0.12)] space-y-6">
            {/* Category selector */}
            <div>
              <label className="block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6A6374] mb-3">
                1. O que você quer importar?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CATEGORIES.map((c) => {
                  const active = c.id === categoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`relative rounded-2xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-[#682ABA] bg-[#FAF9F6]"
                          : "border-[#E7E4DC] bg-white hover:border-[#682ABA]/35"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-[#1B1523]">{c.label}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-[#6A6374]">
                        NCM ref. {c.ncm}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Origin selector */}
            <div>
              <label className="block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6A6374] mb-3">
                2. País de origem
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ORIGINS.map((o) => {
                  const active = o.id === originId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOriginId(o.id)}
                      className={`relative rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition-colors ${
                        active ? "border-[#682ABA] text-white" : "border-[#E7E4DC] text-[#1B1523] hover:border-[#682ABA]/35"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="sim-origin-pill"
                          transition={SPRING_SNAPPY}
                          className="absolute inset-0 rounded-xl bg-[#682ABA]"
                        />
                      )}
                      <span className="relative z-10">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Destination port + Volume */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6A6374] mb-3">
                  3. Porto de entrada no Brasil
                </label>
                <div className="space-y-2">
                  {PORTS.map((p) => {
                    const active = p.id === portId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPortId(p.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-[#682ABA] bg-[#FAF9F6] text-[#1B1523]"
                            : "border-[#E7E4DC] text-[#6A6374] hover:border-[#682ABA]/30"
                        }`}
                      >
                        <span>{p.label}</span>
                        {p.hasTtd && (
                          <span className="rounded-full bg-[#28E7C5]/25 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0D5D4D]">
                            TTD SC
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] p-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6A6374]">
                      4. Escala do lote
                    </span>
                    <span className="font-mono text-xs font-bold text-[#682ABA] tabular-nums">
                      {lotMultiplier}× container
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={1}
                    value={lotMultiplier}
                    onChange={(e) => setLotMultiplier(Number(e.target.value))}
                    aria-label="Escala do lote em containers"
                    className="mt-4 w-full accent-[#682ABA]"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-[#6A6374]">
                    <span>1× (FCL 20')</span>
                    <span>2×</span>
                    <span>3×</span>
                    <span>4×</span>
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-[#6A6374]">
                  FOB estimado:{" "}
                  <strong className="font-mono text-[#1B1523] tabular-nums">
                    US$ {calc.fobUsd.toLocaleString("pt-BR")}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Live interconnected route readout */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-[28px] bg-[#1B1523] text-white p-6 sm:p-8 shadow-[0_24px_60px_-20px_rgba(27,21,35,0.55)] relative overflow-hidden">
            {/* Subtle top ambient studio light */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-[#682ABA]/35 blur-3xl"
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#28E7C5]">
                  <Calculator className="h-3.5 w-3.5" />
                  Estimativa Landed Cost
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-white/70 tabular-nums">
                  <Ship className="h-3.5 w-3.5 text-[#28E7C5]" />
                  ~{origin.days} dias
                </span>
              </div>

              {/* Mini animated route arc */}
              <div className="my-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{origin.hub}</span>
                  <span className="text-[#28E7C5]">{port.state} · Brasil</span>
                </div>
                <svg viewBox="0 0 320 42" fill="none" className="mt-2 w-full h-9" aria-hidden="true">
                  <path
                    d="M 10 34 Q 160 -8 310 34"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <motion.path
                    key={`${origin.id}-${port.id}`}
                    d="M 10 34 Q 160 -8 310 34"
                    stroke="#28E7C5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={prefersReduced ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <circle cx="10" cy="34" r="4.5" fill="#8B4FD0" />
                  <circle cx="310" cy="34" r="4.5" fill="#28E7C5" />
                </svg>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-white/70">
                  <span>Mercadoria (FOB convertido)</span>
                  <span className="font-mono text-white tabular-nums">{formatBrl(calc.fobBrl)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Frete internacional + seguro</span>
                  <span className="font-mono text-white tabular-nums">{formatBrl(calc.freightBrl)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Tributos & nacionalização</span>
                  <span className="font-mono text-white tabular-nums">{formatBrl(calc.netTaxBrl)}</span>
                </div>
                {calc.ttdSavingsBrl > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-[#28E7C5]/30 bg-[#28E7C5]/10 px-3 py-2 text-[#28E7C5]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <TrendingDown className="h-3.5 w-3.5" />
                      Economia estimada TTD SC
                    </span>
                    <span className="font-mono font-bold tabular-nums">
                      -{formatBrl(calc.ttdSavingsBrl)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
                  Custo estimado nacionalizado no Brasil
                </span>
                <motion.p
                  key={Math.round(calc.totalLanded)}
                  initial={prefersReduced ? false : { opacity: 0.6, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-1 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums"
                >
                  {formatBrl(calc.totalLanded)}
                </motion.p>
                <p className="mt-1 text-[11px] text-white/55">
                  Simulação ilustrativa. O cálculo oficial usa NCM exata, PTAX do dia e cotações reais.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-6">
              <MagneticButton
                type="button"
                onClick={() =>
                  onRequestQuote({
                    category: category.label,
                    origin: origin.label,
                    port: port.label,
                  })
                }
                className="btn-sheen flex w-full items-center justify-center gap-2 rounded-2xl bg-[#28E7C5] px-5 py-3.5 text-sm font-bold text-[#0D3D35] shadow-[0_12px_30px_-8px_rgba(40,231,197,0.5)] transition-colors hover:bg-[#3bf0cf]"
              >
                <Sparkles className="h-4 w-4" />
                Cotar essa rota com a Suppley
                <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
