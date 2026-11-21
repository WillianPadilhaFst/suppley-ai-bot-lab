/**
 * LandingInteractiveModules — Interactive Motion Modules for SUPPLEY & Excambia
 *
 * Modules:
 * 1. HeroExcambiaTerminal — 3D-tilting live interactive Excambia terminal with
 *    laser Proforma scan, progressive spring chips, and streaming AI quotation.
 * 2. InteractiveLandedCostSimulator — Hands-on FOB / tonnage / tax regime simulator
 *    connected to live PTAX USD/BRL (`trpc.exchange.getRate`) with spring readouts
 *    and morphing stacked cost bar.
 * 3. InteractiveProformaSandbox — Clickable Proforma laser scanner + real live
 *    interactive Excambia chat input where visitors can type and get streamed replies.
 * 4. StickyJourneyWithRouteMap — Scroll-choreographed 4-stage sticky narrative
 *    with animated global SVG maritime route map and live vessel path.
 * 5. InteractiveBeforeAfterCurtain — Draggable comparison curtain contrasting
 *    traditional fragmented importing vs. SUPPLEY + Excambia.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Globe2,
  GripVertical,
  KeyRound,
  LogIn,
  ScanLine,
  Send,
  ShieldCheck,
  Ship,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";
import ExcambiaOrb from "@/components/ExcambiaOrb";
import {
  LiveSpringNumber,
  MagneticButton,
  TiltSpotlightCard,
} from "@/components/motion/MotionPrimitives";
import { EASE_EDITORIAL, SPRING_SNAPPY } from "@/lib/motion";

// ============================================================================
// 1. HERO INTERACTIVE EXCAMBIA TERMINAL (3D Tilt + Laser Scan + Live Stream)
// ============================================================================

const HERO_SCENARIOS = [
  {
    id: "aco",
    label: "Aço 24t",
    file: "Proforma_Shanghai_Steel.pdf",
    ncm: "7308.40.00",
    origin: "Shanghai, CN → Itajaí, SC",
    prompt:
      "Preciso cotar 24 toneladas de escoras de aço da China para Santa Catarina. Qual fica o custo nacionalizado final e a economia vs. mercado local?",
    streamText:
      "Proforma validada! Classifiquei o lote na NCM 7308.40.00, cruzei com 4 fábricas homologadas e apliquei o cenário TTD 409/SC com PTAX atual.",
    fobUsd: 42800,
    savingPct: 18.4,
    leadDays: 42,
    factories: 4,
    tags: ["NCM 7308.40 validada", "4 fábricas homologadas", "TTD 409/SC ativo"],
  },
  {
    id: "polimeros",
    label: "PEAD 40t",
    file: "Cotacao_PEAD_Houston.xlsx",
    ncm: "3901.20.29",
    origin: "Houston, US → Santos, SP",
    prompt:
      "Queremos importar 40t de Polietileno PEAD grau filme no Lucro Real. Como fica o comparativo EUA x Ásia com créditos de PIS/COFINS?",
    streamText:
      "Planilha processada! Mapeamos 6 fabricantes (EUA e Coreia) com aproveitamento integral de créditos de PIS/COFINS e IPI no Lucro Real.",
    fobUsd: 58400,
    savingPct: 15.2,
    leadDays: 34,
    factories: 6,
    tags: ["NCM 3901.20 validada", "6 indústrias mapeadas", "Crédito PIS/COFINS"],
  },
  {
    id: "quimicos",
    label: "Químicos 36t",
    file: "Spec_Stearic_Acid.pdf",
    ncm: "3823.11.00",
    origin: "Port Klang, MY → Paranaguá, PR",
    prompt:
      "Buscamos contrato recorrente de 36t de ácido esteárico industrial. Qual o benchmark FOB e a janela ideal de fechamento cambial?",
    streamText:
      "Especificação extraída! O preço FOB está 7,4% abaixo da mediana Comex Stat. Viabilidade confirmada com 5 indústrias qualificadas.",
    fobUsd: 51200,
    savingPct: 19.6,
    leadDays: 38,
    factories: 5,
    tags: ["NCM 3823.11 validada", "Benchmark Comex Stat", "5 fábricas na Ásia"],
  },
] as const;

export function HeroExcambiaTerminal({
  usdRate,
  eurRate,
  onRequestAccess,
}: {
  usdRate: number;
  eurRate: number;
  onRequestAccess: (note: string) => void;
}) {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [scanRunId, setScanRunId] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [streamedChars, setStreamedChars] = useState(
    HERO_SCENARIOS[0].streamText.length
  );

  const scenario = HERO_SCENARIOS[scenarioIdx];

  // Trigger scan & live typing whenever scenario or manual rescan changes
  useEffect(() => {
    setIsScanning(true);
    setStreamedChars(0);

    const scanTimer = window.setTimeout(() => {
      setIsScanning(false);
    }, 820);

    let charIdx = 0;
    const targetLen = scenario.streamText.length;
    const typeInterval = window.setInterval(() => {
      charIdx += 4;
      if (charIdx >= targetLen) {
        setStreamedChars(targetLen);
        window.clearInterval(typeInterval);
      } else {
        setStreamedChars(charIdx);
      }
    }, 22);

    return () => {
      window.clearTimeout(scanTimer);
      window.clearInterval(typeInterval);
    };
  }, [scenarioIdx, scanRunId, scenario.streamText.length]);

  const landedBrl = Math.round(scenario.fobUsd * usdRate * 1.44);
  const savingBrl = Math.round((landedBrl * scenario.savingPct) / 100);

  return (
    <TiltSpotlightCard
      maxTilt={5.5}
      spotlightColor="rgba(40, 231, 197, 0.2)"
      className="rounded-3xl border border-white/15 bg-[#120B21]/85 shadow-[0_28px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-2xl"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.04] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <ExcambiaOrb size={30} duration={9} />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span>Excambia · Terminal de Cotação</span>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#28E7C5] shadow-[0_0_8px_#28E7C5]" />
            </div>
            <div className="font-mono text-[11px] text-white/60 tabular-nums">
              PTAX USD R$ {usdRate.toFixed(2).replace(".", ",")} · EUR R${" "}
              {eurRate.toFixed(2).replace(".", ",")}
            </div>
          </div>
        </div>

        {/* Interactive Scenario Pills */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
          {HERO_SCENARIOS.map((s, idx) => {
            const active = idx === scenarioIdx;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenarioIdx(idx)}
                className="relative rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="hero-term-pill"
                    transition={SPRING_SNAPPY}
                    className="pointer-events-none absolute inset-0 z-0 rounded-lg bg-[#682ABA]"
                  />
                )}
                <span
                  className="relative z-10"
                  style={{ color: active ? "#FFFFFF" : "rgba(255,255,255,0.68)" }}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Conversation & Live Scan Stage */}
      <div className="space-y-4 p-5 sm:p-6">
        {/* Attached Proforma Card with Laser Scan Sweep */}
        <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] p-4">
          <AnimatePresence>
            {isScanning && (
              <motion.div
                key={`laser-${scanRunId}-${scenarioIdx}`}
                initial={{ top: "-15%", opacity: 0.95 }}
                animate={{ top: "110%", opacity: [0.95, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-x-0 z-20 h-10"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(40,231,197,0) 0%, rgba(40,231,197,0.38) 50%, rgba(40,231,197,0) 100%)",
                  borderBottom: "2px solid #28E7C5",
                }}
              />
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2 text-white/90 font-semibold">
              <FileText className="h-3.5 w-3.5 text-[#28E7C5]" />
              <span className="font-mono">{scenario.file}</span>
            </div>
            <button
              type="button"
              onClick={() => setScanRunId((n) => n + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#28E7C5]/35 bg-[#28E7C5]/12 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#28E7C5] transition-colors hover:bg-[#28E7C5]/22"
            >
              <ScanLine className="h-3 w-3" />
              <span>{isScanning ? "Escaneando..." : "Reescanear Proforma"}</span>
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/80 sm:text-[13px]">
            “{scenario.prompt}”
          </p>
        </div>

        {/* Excambia Live AI Response */}
        <div className="rounded-2xl border border-[#28E7C5]/25 bg-gradient-to-b from-[#1D1234]/95 to-[#120B21]/95 p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#682ABA] text-[#28E7C5]">
                <Sparkles className="h-3 w-3" />
              </span>
              <span className="text-xs font-semibold text-white">
                Excambia · Viabilidade Instantânea
              </span>
            </div>
            <span className="rounded-full border border-[#28E7C5]/35 bg-[#28E7C5]/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#28E7C5]">
              {scenario.origin}
            </span>
          </div>

          {/* Live Typed Stream Text */}
          <p className="min-h-[38px] text-xs leading-relaxed text-white/85">
            {scenario.streamText.slice(0, streamedChars)}
            {streamedChars < scenario.streamText.length && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-[#28E7C5] align-middle" />
            )}
          </p>

          {/* Progressive Validation Chips */}
          <div className="flex flex-wrap gap-1.5">
            {scenario.tags.map((tag, i) => (
              <motion.span
                key={`${scenario.id}-${tag}-${scanRunId}`}
                initial={{ opacity: 0, scale: 0.85, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: 0.16 + i * 0.11,
                  duration: 0.34,
                  ease: EASE_EDITORIAL,
                }}
                className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] text-white/90"
              >
                <Check className="h-2.5 w-2.5 text-[#28E7C5]" />
                {tag}
              </motion.span>
            ))}
          </div>

          {/* Live Spring-Interpolated KPIs */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-white/55">
                Custo Nacionaliz.
              </div>
              <div className="mt-1 font-mono text-xs font-bold text-white sm:text-sm">
                <LiveSpringNumber value={landedBrl} prefix="R$ " />
              </div>
            </div>
            <div className="rounded-xl border border-[#28E7C5]/25 bg-[#28E7C5]/10 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#28E7C5]">
                Economia Est.
              </div>
              <div className="mt-1 font-mono text-xs font-bold text-[#28E7C5] sm:text-sm">
                <LiveSpringNumber value={savingBrl} prefix="-R$ " />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-white/55">
                Entrega Total
              </div>
              <div className="mt-1 font-mono text-xs font-bold text-white sm:text-sm">
                <LiveSpringNumber value={scenario.leadDays} suffix=" dias" />
              </div>
            </div>
          </div>

          {/* Direct Action Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs">
            <span className="text-white/75">
              Quer rodar sua cotação real de {scenario.label}?
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onRequestAccess(
                    `Cotação de ${scenario.label} (NCM ${scenario.ncm})`
                  )
                }
                className="font-semibold text-[#28E7C5] hover:underline"
              >
                Solicitar acesso
              </button>
              <span className="text-white/25">|</span>
              <Link
                href="/login"
                className="inline-flex items-center gap-1 font-semibold text-white hover:text-[#28E7C5]"
              >
                <span>Entrar</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </TiltSpotlightCard>
  );
}

// ============================================================================
// 2. INTERACTIVE LIVE LANDED COST & SAVINGS SIMULATOR
// ============================================================================

const SIM_SECTORS = [
  {
    id: "aco",
    label: "Aço & Metalurgia",
    ncm: "7308.40.00",
    ii: 0.126,
    ipi: 0.0325,
    freightPerTon: 145,
    domesticMarkup: 1.24,
  },
  {
    id: "polimeros",
    label: "Polímeros & Resinas",
    ncm: "3901.20.29",
    ii: 0.126,
    ipi: 0.0325,
    freightPerTon: 120,
    domesticMarkup: 1.19,
  },
  {
    id: "quimicos",
    label: "Insumos Químicos",
    ncm: "3823.11.00",
    ii: 0.108,
    ipi: 0.0,
    freightPerTon: 160,
    domesticMarkup: 1.27,
  },
  {
    id: "maquinas",
    label: "Máquinas & Equip.",
    ncm: "8477.10.11",
    ii: 0.112,
    ipi: 0.0,
    freightPerTon: 210,
    domesticMarkup: 1.29,
  },
] as const;

const TAX_REGIMES = [
  {
    id: "ttd",
    label: "TTD 409 / SC",
    icmsEff: 0.026,
    pisCofinsCredit: 0.85,
    badge: "Benefício fiscal otimizado",
  },
  {
    id: "real",
    label: "Lucro Real",
    icmsEff: 0.12,
    pisCofinsCredit: 1.0,
    badge: "Crédito integral PIS/COFINS",
  },
  {
    id: "presumido",
    label: "Lucro Presumido",
    icmsEff: 0.17,
    pisCofinsCredit: 0.0,
    badge: "Simulação padrão nacional",
  },
] as const;

export function InteractiveLandedCostSimulator({
  usdRate,
  onRequestAccess,
}: {
  usdRate: number;
  onRequestAccess: (note: string) => void;
}) {
  const [sectorId, setSectorId] = useState<string>("aco");
  const [regimeId, setRegimeId] = useState<string>("ttd");
  const [fobUsd, setFobUsd] = useState<number>(85000);
  const [tons, setTons] = useState<number>(36);

  const sector =
    SIM_SECTORS.find((s) => s.id === sectorId) ?? SIM_SECTORS[0];
  const regime =
    TAX_REGIMES.find((r) => r.id === regimeId) ?? TAX_REGIMES[0];

  const calc = useMemo(() => {
    const fobBrl = fobUsd * usdRate;
    const freightUsd = tons * sector.freightPerTon + 1250;
    const freightBrl = freightUsd * usdRate;
    const cifBrl = fobBrl + freightBrl;

    const iiBrl = cifBrl * sector.ii;
    const ipiBrl = (cifBrl + iiBrl) * sector.ipi;
    const pisCofinsGross = cifBrl * 0.1175;
    const pisCofinsNet = pisCofinsGross * (1 - regime.pisCofinsCredit * 0.65);
    const federalBrl = iiBrl + ipiBrl + pisCofinsNet;

    const icmsAndPortBrl = cifBrl * regime.icmsEff + freightBrl * 0.08 + 7800;
    const landedSuppley = fobBrl + freightBrl + federalBrl + icmsAndPortBrl;
    const domesticCost = landedSuppley * sector.domesticMarkup;
    const savingsBrl = Math.max(0, domesticCost - landedSuppley);
    const savingsPct = (savingsBrl / domesticCost) * 100;

    const totalVisual = landedSuppley + savingsBrl;
    return {
      fobBrl,
      freightBrl,
      federalBrl,
      icmsAndPortBrl,
      landedSuppley,
      domesticCost,
      savingsBrl,
      savingsPct,
      pctFob: (fobBrl / totalVisual) * 100,
      pctFreight: (freightBrl / totalVisual) * 100,
      pctFed: (federalBrl / totalVisual) * 100,
      pctIcms: (icmsAndPortBrl / totalVisual) * 100,
      pctSave: (savingsBrl / totalVisual) * 100,
    };
  }, [fobUsd, tons, usdRate, sector, regime]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Controls Panel */}
      <div className="space-y-6 rounded-3xl border border-[#E7E4DC] bg-white p-6 shadow-[0_12px_40px_-20px_rgba(27,21,35,0.12)] sm:p-8 lg:col-span-6">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#682ABA]">
              1. Escolha o setor industrial
            </span>
            <span className="font-mono text-[11px] text-[#6A6374]">
              NCM ref. {sector.ncm}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SIM_SECTORS.map((s) => {
              const active = s.id === sectorId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSectorId(s.id)}
                  className="relative rounded-xl border border-[#E7E4DC] px-3.5 py-2.5 text-left text-xs font-semibold transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="sim-sector-pill"
                      transition={SPRING_SNAPPY}
                      className="pointer-events-none absolute inset-0 z-0 rounded-xl bg-[#682ABA]"
                    />
                  )}
                  <span
                    className="relative z-10 block"
                    style={{ color: active ? "#FFFFFF" : "#1B1523" }}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Range Slider: FOB USD */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1B1523]">
              2. Valor FOB da Mercadoria (USD)
            </span>
            <span className="rounded-lg bg-[#F6F1FE] px-2.5 py-1 font-mono font-bold text-[#682ABA] tabular-nums">
              US$ {fobUsd.toLocaleString("pt-BR")}
            </span>
          </div>
          <input
            type="range"
            min={25000}
            max={500000}
            step={5000}
            value={fobUsd}
            onChange={(e) => setFobUsd(Number(e.target.value))}
            aria-label="Valor FOB da Mercadoria em dólares"
            className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-[#ECE8F4] accent-[#682ABA]"
          />
          <div className="flex justify-between font-mono text-[10px] text-[#6A6374]">
            <span>US$ 25k</span>
            <span>US$ 250k</span>
            <span>US$ 500k</span>
          </div>
        </div>

        {/* Interactive Range Slider: Weight / Volume */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1B1523]">
              3. Volume do Embarque (Toneladas)
            </span>
            <span className="rounded-lg bg-[#ECFCF8] px-2.5 py-1 font-mono font-bold text-[#0F8A74] tabular-nums">
              {tons} toneladas ({Math.max(1, Math.ceil(tons / 24))}x Container 40')
            </span>
          </div>
          <input
            type="range"
            min={12}
            max={180}
            step={4}
            value={tons}
            onChange={(e) => setTons(Number(e.target.value))}
            aria-label="Volume do Embarque em toneladas"
            className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-[#E5F7F3] accent-[#0F9D84]"
          />
          <div className="flex justify-between font-mono text-[10px] text-[#6A6374]">
            <span>12t (LCL / 20')</span>
            <span>96t (4 containers)</span>
            <span>180t (Contrato)</span>
          </div>
        </div>

        {/* Interactive Tax Regime Pills */}
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#682ABA]">
              4. Regime Tributário / Benefício
            </span>
            <span className="text-[11px] text-[#0F8A74] font-medium">
              {regime.badge}
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] p-1.5">
            {TAX_REGIMES.map((r) => {
              const active = r.id === regimeId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRegimeId(r.id)}
                  className="relative rounded-xl px-2 py-2 text-center text-xs font-semibold transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="sim-regime-pill"
                      transition={SPRING_SNAPPY}
                      className="pointer-events-none absolute inset-0 z-0 rounded-xl bg-[#1B1523]"
                    />
                  )}
                  <span
                    className="relative z-10"
                    style={{ color: active ? "#FFFFFF" : "#5B5466" }}
                  >
                    {r.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Output Dashboard */}
      <TiltSpotlightCard
        maxTilt={4}
        spotlightColor="rgba(40, 231, 197, 0.16)"
        wrapperClassName="lg:col-span-6"
        className="flex h-full flex-col justify-between rounded-3xl border border-[#2C1A4D] bg-[#120A22] p-6 text-white shadow-[0_28px_70px_-22px_rgba(49,18,96,0.55)] sm:p-8"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[#28E7C5]" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white/85">
                Simulação Excambia ao Vivo
              </span>
            </div>
            <span className="rounded-full border border-[#28E7C5]/35 bg-[#28E7C5]/12 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#28E7C5] tabular-nums">
              PTAX USD R$ {usdRate.toFixed(2).replace(".", ",")}
            </span>
          </div>

          {/* Big Animated Savings Hero Readout */}
          <div className="rounded-2xl border border-[#28E7C5]/25 bg-gradient-to-br from-[#28E7C5]/12 via-[#682ABA]/18 to-transparent p-5">
            <div className="flex items-center justify-between text-xs text-white/75">
              <span>Economia estimada importando com a SUPPLEY</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#28E7C5] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#120A22]">
                <TrendingDown className="h-3 w-3" />-
                <LiveSpringNumber value={calc.savingsPct} decimals={1} suffix="%" />
              </span>
            </div>
            <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-[#28E7C5] sm:text-4xl">
              <LiveSpringNumber value={Math.round(calc.savingsBrl)} prefix="R$ " />
            </div>
            <div className="mt-1.5 text-xs text-white/65">
              Margem recuperada neste lote frente à compra equivalente no mercado interno.
            </div>
          </div>

          {/* Side-by-side Cost Readouts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/60">
                Custo Nacionalizado SUPPLEY
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-white sm:text-xl">
                <LiveSpringNumber
                  value={Math.round(calc.landedSuppley)}
                  prefix="R$ "
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-[11px] text-white/50">
                Referência Mercado Interno
              </div>
              <div className="mt-1 font-mono text-lg font-semibold text-white/55 line-through sm:text-xl">
                <LiveSpringNumber
                  value={Math.round(calc.domesticCost)}
                  prefix="R$ "
                />
              </div>
            </div>
          </div>

          {/* Morphing Stacked Composition Bar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-white/70">
              <span>Composição em tempo real do lote</span>
              <span className="font-mono text-[#28E7C5]">
                {regime.label} · {sector.label}
              </span>
            </div>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
              <motion.div
                className="h-full rounded-l-full bg-[#7C3AED]"
                animate={{ width: `${calc.pctFob}%` }}
                transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
                title="FOB Mercadoria"
              />
              <motion.div
                className="h-full bg-[#A855F7]"
                animate={{ width: `${calc.pctFreight}%` }}
                transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
                title="Frete + Seguro"
              />
              <motion.div
                className="h-full bg-[#6366F1]"
                animate={{ width: `${calc.pctFed}%` }}
                transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
                title="Tributos Federais"
              />
              <motion.div
                className="h-full bg-[#38BDF8]"
                animate={{ width: `${calc.pctIcms}%` }}
                transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
                title="ICMS / Portuárias"
              />
              <motion.div
                className="h-full rounded-r-full bg-[#28E7C5]"
                animate={{ width: `${calc.pctSave}%` }}
                transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
                title="Economia SUPPLEY"
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[10px] text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                FOB (R$ {Math.round(calc.fobBrl).toLocaleString("pt-BR")})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#A855F7]" />
                Frete (R$ {Math.round(calc.freightBrl).toLocaleString("pt-BR")})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#6366F1]" />
                Federais (R$ {Math.round(calc.federalBrl).toLocaleString("pt-BR")})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#28E7C5]" />
                Margem Ganha
              </span>
            </div>
          </div>
        </div>

        {/* Handoff CTA */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <MagneticButton
            onClick={() =>
              onRequestAccess(
                `Simulação: ${sector.label} (NCM ${sector.ncm}) · FOB US$ ${fobUsd.toLocaleString("pt-BR")} · ${tons}t · ${regime.label}`
              )
            }
            className="w-full justify-center rounded-xl bg-[#28E7C5] px-5 py-3.5 text-sm font-bold text-[#120A22] shadow-[0_12px_30px_-10px_rgba(40,231,197,0.55)] transition-colors hover:bg-[#49F2D4]"
          >
            <span>Levar esta simulação para a Excambia</span>
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </TiltSpotlightCard>
    </div>
  );
}

// ============================================================================
// 3. INTERACTIVE PROFORMA LASER SCANNER + LIVE EXCAMBIA CHAT SANDBOX
// ============================================================================

const SAMPLE_PROFORMAS = [
  {
    id: "pi-steel",
    filename: "PI_SHANGHAI_STEEL_24T.pdf",
    supplier: "Jiangsu Heavy Structural Steel Co.",
    origin: "Shanghai, China",
    ncm: "7308.40.00",
    incoterm: "FOB Shanghai",
    valueUsd: "US$ 42.800,00",
    weight: "24.000 kg (1x 40'HC)",
    taxes: "II 12,6% · IPI 3,25% · TTD 409/SC",
    summary:
      "Extraí todos os 4 SKUs da Proforma de Shanghai. NCM 7308.40.00 validada sem restrições antidumping. Economia estimada de 18,4% no desembaraço em Itajaí.",
  },
  {
    id: "pi-pead",
    filename: "QUOTE_PEAD_HOUSTON_40T.xlsx",
    supplier: "Gulf Coast Polymer Resins LLC",
    origin: "Houston, USA",
    ncm: "3901.20.29",
    incoterm: "CIF Santos",
    valueUsd: "US$ 58.400,00",
    weight: "40.000 kg (2x 40'HC)",
    taxes: "II 12,6% · Crédito PIS/COFINS 100%",
    summary:
      "Planilha lida com sucesso! O preço CIF Santos está competitivo frente ao benchmark da Ásia, com trânsito 11 dias mais rápido e crédito integral no Lucro Real.",
  },
  {
    id: "pi-chem",
    filename: "INVOICE_STEARIC_MY_36T.pdf",
    supplier: "Kuala Lumpur Oleochemicals Bhd",
    origin: "Port Klang, Malásia",
    ncm: "3823.11.00",
    incoterm: "FOB Port Klang",
    valueUsd: "US$ 51.200,00",
    weight: "36.000 kg (2x 20'FCL)",
    taxes: "II 10,8% · IPI 0% · Licenciamento OK",
    summary:
      "Invoice de ácido esteárico auditada! Nenhuma licença MAPA/ANVISA bloqueante para uso industrial. Custo nacionalizado 19,6% abaixo da média doméstica.",
  },
] as const;

const QUICK_PROMPTS = [
  "Qual o custo nacionalizado de 25t de resina PP da China?",
  "Como funciona o TTD 409/SC na importação?",
  "Consigo comparar 3 fábricas antes de fechar pedido?",
];

interface SandboxMsg {
  id: string;
  role: "user" | "excambia";
  text: string;
  badge?: string;
}

export function InteractiveProformaSandbox({
  usdRate,
  onRequestAccess,
}: {
  usdRate: number;
  onRequestAccess: (note: string) => void;
}) {
  const [selectedPi, setSelectedPi] = useState(0);
  const [scanningPi, setScanningPi] = useState(false);
  const [scanTick, setScanTick] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<SandboxMsg[]>([
    {
      id: "init-1",
      role: "excambia",
      badge: "Modo Demonstração · Excambia AI",
      text: "Olá! Clique em uma Proforma ao lado para ver a leitura instantânea ou digite abaixo o produto que sua empresa deseja importar.",
    },
  ]);

  const pi = SAMPLE_PROFORMAS[selectedPi];

  const handleScanProforma = (idx: number) => {
    setSelectedPi(idx);
    setScanningPi(true);
    setScanTick((t) => t + 1);
    const target = SAMPLE_PROFORMAS[idx];

    window.setTimeout(() => {
      setScanningPi(false);
      setMessages((prev) => [
        ...prev.slice(-3),
        {
          id: `u-${Date.now()}`,
          role: "user",
          text: `Analisar anexo: ${target.filename} (${target.valueUsd})`,
        },
        {
          id: `a-${Date.now() + 1}`,
          role: "excambia",
          badge: `NCM ${target.ncm} · ${target.incoterm}`,
          text: target.summary,
        },
      ]);
    }, 880);
  };

  const handleSendPrompt = (rawText?: string) => {
    const query = (rawText ?? inputVal).trim();
    if (!query || isThinking) return;
    setInputVal("");
    setIsThinking(true);

    const userMsg: SandboxMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: query,
    };
    setMessages((prev) => [...prev.slice(-3), userMsg]);

    window.setTimeout(() => {
      const lower = query.toLowerCase();
      let reply = `Recebi sua consulta sobre "${query}". Na Excambia completa, cruzamos instantaneamente a NCM oficial, câmbio PTAX (R$ ${usdRate.toFixed(2).replace(".", ",")}), frete internacional e fabricantes homologados para entregar seu estudo de viabilidade completo.`;
      let badge = "Análise Prévia Excambia";

      if (lower.includes("ttd") || lower.includes("sc") || lower.includes("imposto")) {
        reply =
          "Com o TTD 409 em Santa Catarina, o desembolso de ICMS na nacionalização pode cair drasticamente frente à alíquota cheia de 17%–20%, elevando o fluxo de caixa da operação. Dentro da Excambia simulamos lado a lado Lucro Real, Presumido e TTD.";
        badge = "Inteligência Fiscal · TTD 409/SC";
      } else if (lower.includes("fábrica") || lower.includes("fabrica") || lower.includes("fornecedor")) {
        reply =
          "Sim! A SUPPLEY conduz o sourcing ativo com fábricas auditadas na Ásia, Europa e Américas. Você visualiza o comparativo lado a lado (FOB, lead time, MOQ e custo final em reais) diretamente no painel da Excambia.";
        badge = "Sourcing Global Homologado";
      } else if (lower.includes("resina") || lower.includes("pp") || lower.includes("pead") || lower.includes("aço") || lower.includes("aco")) {
        reply = `Para insumos industriais com PTAX a R$ ${usdRate.toFixed(2).replace(".", ",")}, o ganho médio dos clientes SUPPLEY varia entre 14% e 19% no custo nacionalizado. Solicite seu acesso para receber o estudo com NCM exata e cotações de fábricas.`;
        badge = "Benchmark Comex Stat Ativo";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "excambia",
          badge,
          text: reply,
        },
      ]);
      setIsThinking(false);
    }, 680);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left: Interactive Proforma Scanner Deck */}
      <div className="space-y-4 lg:col-span-6">
        <div className="flex items-center justify-between text-xs text-white/70">
          <span className="font-mono uppercase tracking-wider text-[#28E7C5]">
            Clique em um documento para escanear
          </span>
          <span className="font-mono text-[11px] text-white/50">
            PDF · XLSX · Imagem
          </span>
        </div>

        {/* Document Picker Cards */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {SAMPLE_PROFORMAS.map((doc, idx) => {
            const active = idx === selectedPi;
            return (
              <motion.button
                key={doc.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleScanProforma(idx)}
                className={`rounded-2xl border p-3.5 text-left transition-all ${
                  active
                    ? "border-[#28E7C5] bg-[#28E7C5]/12 shadow-[0_0_24px_-8px_rgba(40,231,197,0.5)]"
                    : "border-white/10 bg-white/[0.04] hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet
                    className={`h-4 w-4 ${active ? "text-[#28E7C5]" : "text-white/60"}`}
                  />
                  <span className="font-mono text-[10px] text-white/55">
                    {doc.ncm}
                  </span>
                </div>
                <div className="mt-2 truncate font-mono text-[11px] font-semibold text-white">
                  {doc.filename}
                </div>
                <div className="mt-0.5 text-[11px] text-white/60">
                  {doc.valueUsd}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Active Proforma Document Preview with Animated Laser Scanner */}
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#160E29] p-6 shadow-2xl">
          <AnimatePresence>
            {scanningPi && (
              <motion.div
                key={`pi-beam-${scanTick}`}
                initial={{ top: "-10%", opacity: 1 }}
                animate={{ top: "105%", opacity: [1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-x-0 z-20 h-14"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(40,231,197,0) 0%, rgba(40,231,197,0.42) 55%, rgba(40,231,197,0) 100%)",
                  borderBottom: "2px solid #28E7C5",
                }}
              />
            )}
          </AnimatePresence>

          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#28E7C5]">
                PROFORMA INVOICE · OCR EXCAMBIA
              </div>
              <div className="mt-1 text-sm font-bold text-white">
                {pi.supplier}
              </div>
              <div className="text-xs text-white/60">{pi.origin}</div>
            </div>
            <button
              type="button"
              onClick={() => handleScanProforma(selectedPi)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#28E7C5]/40 bg-[#28E7C5]/12 px-3 py-1.5 font-mono text-[11px] font-semibold text-[#28E7C5] hover:bg-[#28E7C5]/22"
            >
              <ScanLine className="h-3.5 w-3.5" />
              <span>{scanningPi ? "Lendo..." : "Escanear"}</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            {[
              { k: "NCM Extraída", v: pi.ncm, accent: true },
              { k: "Valor Total", v: pi.valueUsd, accent: false },
              { k: "Incoterm", v: pi.incoterm, accent: false },
              { k: "Peso / Container", v: pi.weight, accent: false },
            ].map((field, i) => (
              <motion.div
                key={`${pi.id}-${field.k}-${scanTick}`}
                initial={{ opacity: 0.35, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
                className={`rounded-xl border p-3 ${
                  field.accent
                    ? "border-[#28E7C5]/40 bg-[#28E7C5]/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider text-white/55">
                  {field.k}
                </div>
                <div
                  className={`mt-1 font-mono font-bold ${
                    field.accent ? "text-[#28E7C5]" : "text-white"
                  }`}
                >
                  {field.v}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-[11px] text-white/80">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#28E7C5]" />
              {pi.taxes}
            </span>
            <span className="text-[#28E7C5]">100% estruturado</span>
          </div>
        </div>
      </div>

      {/* Right: Real Live Interactive Excambia Chat Playground */}
      <div className="flex flex-col justify-between rounded-3xl border border-white/15 bg-[#120A22] p-5 shadow-2xl sm:p-6 lg:col-span-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <ExcambiaOrb size={30} duration={isThinking ? 3 : 10} />
            <div>
              <div className="text-xs font-bold text-white">
                Converse com a Excambia (Preview Interativo)
              </div>
              <div className="text-[11px] text-white/55">
                Teste uma pergunta real sobre importação ou clique em uma sugestão
              </div>
            </div>
          </div>
        </div>

        {/* Message Feed */}
        <div className="my-4 flex-1 space-y-3 max-h-[290px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#682ABA] px-4 py-3 text-xs leading-relaxed text-white"
                    : "max-w-[92%] rounded-2xl rounded-tl-sm border border-white/12 bg-white/[0.06] px-4 py-3 text-xs leading-relaxed text-white/90"
                }
              >
                {m.badge && (
                  <div className="mb-1.5 inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-[#28E7C5]">
                    <Sparkles className="h-3 w-3" />
                    {m.badge}
                  </div>
                )}
                <p>{m.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>

          {isThinking && (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[#28E7C5]/25 bg-[#28E7C5]/10 px-3.5 py-2 font-mono text-[11px] text-[#28E7C5]">
              <Zap className="h-3.5 w-3.5 animate-pulse" />
              <span>Excambia analisando NCM, câmbio e fornecedores...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts + Real Input Box */}
        <div className="space-y-3 border-t border-white/10 pt-3.5">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendPrompt(q)}
                className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] text-white/75 transition-colors hover:border-[#28E7C5]/50 hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/35 p-1.5 focus-within:border-[#28E7C5]/60"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Digite um produto ou dúvida (ex: 30t de aço da China)..."
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isThinking}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#28E7C5] px-4 py-2 text-xs font-bold text-[#120A22] transition-colors hover:bg-[#49F2D4] disabled:opacity-50"
            >
              <span>Enviar</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span>Para cotações reais com sua base e documentos:</span>
            <button
              type="button"
              onClick={() => onRequestAccess("Interesse após testar o sandbox da Excambia")}
              className="font-semibold text-[#28E7C5] hover:underline"
            >
              Solicitar login →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. SCROLL-CHOREOGRAPHED STICKY JOURNEY + ANIMATED GLOBAL MARITIME ROUTE MAP
// ============================================================================

const JOURNEY_STAGES = [
  {
    step: "01",
    kicker: "COTAÇÃO INTELIGENTE",
    title: "Você envia o item ou Proforma na Excambia",
    desc: "Descreva a matéria-prima ou suba a proforma em PDF/Excel. Em segundos a Excambia valida a NCM, checa exigências aduaneiras e estrutura o estudo.",
    metricLabel: "Tempo de estruturação",
    metricValue: "< 2 minutos",
    routeProgress: 0.15,
    statusBadge: "PROFORMA & NCM VALIDADAS",
  },
  {
    step: "02",
    kicker: "SOURCING & VIABILIDADE",
    title: "Comparamos fabricantes globais com custo real",
    desc: "Cruzamos fábricas homologadas na Ásia, Europa e Américas já com frete, seguro, impostos do seu regime (Lucro Real, Presumido ou TTD) e margem final.",
    metricLabel: "Fornecedores comparados",
    metricValue: "3 a 6 fábricas/lote",
    routeProgress: 0.42,
    statusBadge: "BENCHMARK & VIABILIDADE OK",
  },
  {
    step: "03",
    kicker: "EMBARQUE & CÂMBIO",
    title: "Produção, fechamento cambial e frete rastreados",
    desc: "Com a cotação aprovada, a SUPPLEY conduz o pedido na fábrica, trava a melhor janela cambial e monitora o navio e toda a documentação internacional.",
    metricLabel: "Rota marítima ativa",
    metricValue: "Shanghai → Itajaí · 31d",
    routeProgress: 0.74,
    statusBadge: "EM TRÂNSITO MARÍTIMO",
  },
  {
    step: "04",
    kicker: "NACIONALIZAÇÃO & ENTREGA",
    title: "Desembaraço sem surpresas até o seu estoque",
    desc: "DI/DUIMP parametrizada, custos previstos vs. realizados transparentes e transporte rodoviário coordenado até o descarregamento na sua planta.",
    metricLabel: "Aderência de orçamento",
    metricValue: "99,2% previsto x real",
    routeProgress: 1.0,
    statusBadge: "ENTREGUE NO ARMAZÉM",
  },
] as const;

export function StickyJourneyWithRouteMap({
  onRequestAccess,
}: {
  onRequestAccess: (note?: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [manualLock, setManualLock] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 65%", "end 60%"],
  });

  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0.05, 1]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (manualLock) return;
    const idx = Math.min(
      JOURNEY_STAGES.length - 1,
      Math.max(0, Math.floor(latest * JOURNEY_STAGES.length))
    );
    setActiveStage(idx);
  });

  const stage = JOURNEY_STAGES[activeStage];

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start"
    >
      {/* Left: Scrollable / Clickable 4 Stages with Glowing Vertical Scroll Rail */}
      <div className="relative space-y-4 pl-6 lg:col-span-5">
        {/* Background Rail */}
        <div className="absolute left-2 top-3 bottom-3 w-[2px] rounded-full bg-[#E7E4DC]" />
        {/* Scroll-Driven Glowing Rail */}
        <motion.div
          style={{ scaleY: lineScaleY, transformOrigin: "top" }}
          className="absolute left-2 top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b from-[#682ABA] via-[#7E3FD4] to-[#28E7C5]"
        />

        {JOURNEY_STAGES.map((item, idx) => {
          const active = idx === activeStage;
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => {
                setActiveStage(idx);
                setManualLock(true);
                window.setTimeout(() => setManualLock(false), 1800);
              }}
              className={`relative block w-full rounded-2xl border p-5 text-left transition-all duration-300 ${
                active
                  ? "border-[#682ABA]/40 bg-white shadow-[0_18px_42px_-16px_rgba(104,42,186,0.22)]"
                  : "border-[#E7E4DC] bg-white/55 hover:bg-white"
              }`}
            >
              {/* Node indicator dot */}
              <span
                className={`absolute -left-[22px] top-6 h-3 w-3 rounded-full border-2 transition-all ${
                  active
                    ? "scale-125 border-[#682ABA] bg-[#28E7C5] shadow-[0_0_12px_#28E7C5]"
                    : idx < activeStage
                      ? "border-[#682ABA] bg-[#682ABA]"
                      : "border-[#CFC9DC] bg-white"
                }`}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-[#682ABA]">
                  {item.step} · {item.kicker}
                </span>
                <span className="font-mono text-[10px] text-[#6A6374]">
                  {item.metricValue}
                </span>
              </div>
              <h3 className="mt-2 text-base font-bold text-[#1B1523]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5B5466]">
                {item.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Right: Sticky Live Animated Global Trade Route & Telemetry Stage */}
      <div className="lg:sticky lg:top-28 lg:col-span-7">
        <div className="overflow-hidden rounded-3xl border border-[#2C1A4D] bg-[#0D071A] p-6 text-white shadow-[0_28px_70px_-20px_rgba(49,18,96,0.55)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Ship className="h-4 w-4 text-[#28E7C5]" />
              <span className="font-mono text-xs font-semibold text-white">
                Corredor Global SUPPLEY · Etapa {stage.step}/04
              </span>
            </div>
            <motion.span
              key={stage.statusBadge}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-full border border-[#28E7C5]/35 bg-[#28E7C5]/12 px-3 py-1 font-mono text-[10px] font-bold text-[#28E7C5]"
            >
              {stage.statusBadge}
            </motion.span>
          </div>

          {/* Animated SVG Global Trade Corridor Map */}
          <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#080412] p-4">
            <svg
              viewBox="0 0 640 240"
              className="h-auto w-full"
              role="img"
              aria-label="Mapa animado de rota marítima global SUPPLEY"
            >
              <defs>
                <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#9333EA" />
                  <stop offset="55%" stopColor="#682ABA" />
                  <stop offset="100%" stopColor="#28E7C5" />
                </linearGradient>
                <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#28E7C5" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#28E7C5" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Subtle latitude/longitude grid */}
              {[48, 96, 144, 192].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="640"
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="4 6"
                />
              ))}
              {[128, 256, 384, 512].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2="240"
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="4 6"
                />
              ))}

              {/* Secondary Origin Corridor (Hamburg -> Santos) */}
              <path
                d="M 355 56 Q 275 110 185 182"
                fill="none"
                stroke="rgba(147,51,234,0.28)"
                strokeWidth="1.5"
                strokeDasharray="4 5"
              />

              {/* Primary Origin Corridor Base (Shanghai -> Itajaí) */}
              <path
                d="M 555 78 C 445 35, 300 180, 185 182"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="2.5"
              />

              {/* Animated Progress Corridor */}
              <motion.path
                d="M 555 78 C 445 35, 300 180, 185 182"
                fill="none"
                stroke="url(#routeGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                initial={{ pathLength: 0.15 }}
                animate={{ pathLength: stage.routeProgress }}
                transition={{ duration: 0.75, ease: EASE_EDITORIAL }}
              />

              {/* Origin Hub: Shanghai */}
              <g transform="translate(555,78)">
                <circle r="14" fill="url(#nodeGlow)" opacity="0.55" />
                <circle r="5" fill="#9333EA" stroke="#FFFFFF" strokeWidth="1.5" />
                <text
                  x="-12"
                  y="-14"
                  textAnchor="end"
                  fill="#FFFFFF"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  SHANGHAI · FÁBRICA
                </text>
              </g>

              {/* Secondary Hub: Hamburg */}
              <g transform="translate(355,56)">
                <circle r="4" fill="#A855F7" opacity="0.85" />
                <text
                  x="10"
                  y="4"
                  fill="rgba(255,255,255,0.55)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  HAMBURGO
                </text>
              </g>

              {/* Mid-Ocean Checkpoint */}
              <g transform="translate(365,126)">
                <circle
                  r="4.5"
                  fill={activeStage >= 2 ? "#28E7C5" : "#4C3B6E"}
                />
                <text
                  x="0"
                  y="-12"
                  textAnchor="middle"
                  fill={activeStage >= 2 ? "#28E7C5" : "rgba(255,255,255,0.4)"}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  EMBARQUE &amp; BL
                </text>
              </g>

              {/* Destination Hub: Porto de Itajaí / Brasil */}
              <g transform="translate(185,182)">
                <motion.circle
                  r="18"
                  fill="url(#nodeGlow)"
                  animate={{ scale: activeStage === 3 ? [1, 1.35, 1] : 1 }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                <circle r="6" fill="#28E7C5" stroke="#080412" strokeWidth="2" />
                <text
                  x="-12"
                  y="24"
                  textAnchor="start"
                  fill="#28E7C5"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  ITAJAÍ / SANTOS · SEU ESTOQUE
                </text>
              </g>

              {/* Origin: Houston */}
              <g transform="translate(115,72)">
                <circle r="3.5" fill="#A855F7" opacity="0.7" />
                <path
                  d="M 0 0 Q 30 62 70 110"
                  fill="none"
                  stroke="rgba(40,231,197,0.22)"
                  strokeWidth="1.4"
                  strokeDasharray="3 5"
                />
                <text
                  x="0"
                  y="-10"
                  fill="rgba(255,255,255,0.5)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  HOUSTON
                </text>
              </g>
            </svg>
          </div>

          {/* Dynamic Stage Telemetry Details */}
          <motion.div
            key={stage.step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: EASE_EDITORIAL }}
            className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/55">
                {stage.metricLabel}
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-[#28E7C5]">
                {stage.metricValue}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/55">
                Controle Documental
              </div>
              <div className="mt-1 text-sm font-bold text-white">
                100% na Excambia
              </div>
            </div>
            <div className="flex items-center justify-center rounded-2xl border border-[#28E7C5]/30 bg-[#28E7C5]/10 p-4">
              <button
                type="button"
                onClick={() =>
                  onRequestAccess(`Interesse na etapa ${stage.step}: ${stage.title}`)
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#28E7C5] hover:underline"
              >
                <span>Iniciar minha cotação</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. INTERACTIVE DRAG-TO-COMPARE CURTAIN (Tradicional ⇄ SUPPLEY + Excambia)
// ============================================================================

export function InteractiveBeforeAfterCurtain() {
  const [split, setSplit] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.max(12, Math.min(88, pct)));
  };

  return (
    <div className="space-y-4">
      {/* Quick Split Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-medium text-[#6A6374]">
          Arraste a barra central para comparar o antes e o depois na prática:
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-[#E7E4DC] bg-white p-1">
          {[
            { label: "Modelo Tradicional", val: 84 },
            { label: "50 / 50", val: 50 },
            { label: "SUPPLEY + Excambia", val: 16 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSplit(preset.val)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                Math.abs(split - preset.val) < 10
                  ? "bg-[#682ABA] text-white"
                  : "text-[#5B5466] hover:text-[#1B1523]"
              }`}
              style={{
                color: Math.abs(split - preset.val) < 10 ? "#FFFFFF" : "#5B5466",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Split Stage */}
      <div
        ref={containerRef}
        onPointerDown={(e) => {
          draggingRef.current = true;
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          updateFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) updateFromClientX(e.clientX);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        className="relative h-[420px] sm:h-[380px] select-none overflow-hidden rounded-3xl border border-[#E7E4DC] shadow-[0_24px_60px_-24px_rgba(27,21,35,0.22)] cursor-ew-resize touch-none"
      >
        {/* RIGHT LAYER (Underneath): SUPPLEY + Excambia */}
        <div className="absolute inset-0 bg-[#0F0820] p-6 sm:p-10 text-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-[#28E7C5]/40 bg-[#28E7C5]/15 px-3 py-1 font-mono text-[11px] font-bold text-[#28E7C5]">
              COM SUPPLEY + EXCAMBIA
            </span>
            <span className="font-mono text-xs text-white/55">
              100% previsível e digital
            </span>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                t: "Proforma lida em segundos",
                d: "Upload de PDF/Excel com extração de NCM, FOB e impostos na hora.",
              },
              {
                t: "Custo nacionalizado certificado",
                d: "II, IPI, PIS/COFINS, ICMS, AFRMM e TTD 409 sem surpresa no porto.",
              },
              {
                t: "Fábricas homologadas lado a lado",
                d: "Benchmark global real para negociar com poder de compra.",
              },
              {
                t: "Timeline ponta a ponta",
                d: "Produção, embarque, câmbio e entrega visíveis no mesmo painel.",
              },
            ].map((item) => (
              <div
                key={item.t}
                className="rounded-2xl border border-white/12 bg-white/[0.06] p-4"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#28E7C5]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{item.t}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/75">
                  {item.d}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 text-xs text-white/70">
            <ShieldCheck className="h-4 w-4 text-[#28E7C5]" />
            <span>Margem protegida · Governança corporativa total</span>
          </div>
        </div>

        {/* LEFT LAYER (Clipped by Split): Modelo Tradicional */}
        <div
          className="absolute inset-0 bg-[#F3EFE8] p-6 sm:p-10 text-[#1B1523] flex flex-col justify-between"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-[#D4CBBF] bg-white px-3 py-1 font-mono text-[11px] font-bold text-[#7A6F63]">
              MODELO TRADICIONAL
            </span>
            <span className="font-mono text-xs text-[#8C8175]">
              Lento, fragmentado e opaco
            </span>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                t: "Dias esperando planilhas soltas",
                d: "E-mails desconectados com despachantes, agentes e tradings sem padrão.",
              },
              {
                t: "Surpresas tributárias na chegada",
                d: "NCM imprecisa, multas e despesas portuárias fora da conta inicial.",
              },
              {
                t: "Compra no escuro sem benchmark",
                d: "Sem saber se o preço da fábrica está competitivo no mercado global.",
              },
              {
                t: "Zero visibilidade do embarque",
                d: "Cobranças manuais por WhatsApp para descobrir onde está a carga.",
              },
            ].map((item) => (
              <div
                key={item.t}
                className="rounded-2xl border border-[#DFD8CE] bg-white/85 p-4"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#8B4D4D]">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#FBEAEA] text-[10px]">
                    ✕
                  </span>
                  <span>{item.t}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#6E655E]">
                  {item.d}
                </p>
              </div>
            ))}
          </div>

          <div className="text-xs font-medium text-[#7A6F63]">
            Custos ocultos corroendo até 18% da sua margem de importação
          </div>
        </div>

        {/* Draggable Vertical Handle */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-30 w-[3px] -translate-x-1/2 bg-gradient-to-b from-[#682ABA] via-[#28E7C5] to-[#682ABA]"
          style={{ left: `${split}%` }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#28E7C5] bg-[#120A22] text-[#28E7C5] shadow-[0_0_24px_rgba(40,231,197,0.65)]">
            <GripVertical className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
