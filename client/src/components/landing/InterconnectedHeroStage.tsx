import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Anchor,
  CheckCircle2,
  Factory,
  PackageCheck,
  ShieldCheck,
  Ship,
  Sparkles,
} from "lucide-react";
import ExcambiaOrb from "@/components/ExcambiaOrb";
import { EASE_EDITORIAL, SPRING_SNAPPY } from "./MotionPrimitives";

interface RoutePreset {
  id: string;
  origin: string;
  city: string;
  code: string;
  product: string;
  ncm: string;
  fobUsd: string;
  landedBrl: string;
  savingsTtd: string;
  port: string;
  transitDays: string;
  yPos: number;
}

const ROUTES: RoutePreset[] = [
  {
    id: "cn",
    origin: "China",
    city: "Shenzhen / Ningbo",
    code: "CN",
    product: "Resina Industrial & Componentes",
    ncm: "3907.61.00",
    fobUsd: "US$ 42.800",
    landedBrl: "R$ 318.400",
    savingsTtd: "-14,2% com TTD SC",
    port: "Itajaí / Navegantes (SC)",
    transitDays: "34 dias",
    yPos: 74,
  },
  {
    id: "de",
    origin: "Alemanha",
    city: "Hamburgo / Stuttgart",
    code: "DE",
    product: "Válvulas & Automação CNC",
    ncm: "8481.80.99",
    fobUsd: "US$ 68.500",
    landedBrl: "R$ 492.150",
    savingsTtd: "-11,8% com TTD SC",
    port: "Santos (SP)",
    transitDays: "26 dias",
    yPos: 156,
  },
  {
    id: "in",
    origin: "Índia",
    city: "Mumbai / Nhava Sheva",
    code: "IN",
    product: "Insumos Químicos & Têxteis",
    ncm: "2917.36.00",
    fobUsd: "US$ 31.200",
    landedBrl: "R$ 234.900",
    savingsTtd: "-13,5% com TTD SC",
    port: "Paranaguá (PR)",
    transitDays: "31 dias",
    yPos: 238,
  },
];

export default function InterconnectedHeroStage() {
  const prefersReduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Ciclo automático suave entre as rotas para manter o palco vivo, pausando ao interagir
  useEffect(() => {
    if (prefersReduced || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % ROUTES.length);
    }, 4600);
    return () => window.clearInterval(timer);
  }, [prefersReduced, paused]);

  const active = ROUTES[activeIndex];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative rounded-[28px] border border-[#E7E4DC] bg-white p-5 sm:p-7 shadow-[0_2px_4px_rgba(27,21,35,0.03),0_18px_40px_-14px_rgba(49,18,96,0.12)]"
    >
      {/* Top status bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E4DC] pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-[#28E7C5]" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#6A6374]">
            Fluxo conectado · Origem → Brasil
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[#E7E4DC] bg-[#FAF9F6] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#1B1523]">
            PTAX 5,78 · Motor V2
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-[#FAF9F6] p-1 border border-[#E7E4DC]">
          {ROUTES.map((r, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setActiveIndex(idx);
                  setPaused(true);
                }}
                className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isSelected ? "text-white" : "text-[#6A6374] hover:text-[#1B1523]"
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="hero-route-pill"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 rounded-full bg-[#682ABA]"
                  />
                )}
                <span className="relative z-10">{r.origin}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interconnected Visual Canvas */}
      <div className="relative">
        {/* Desktop SVG Beam Network connecting Left Origins -> Center Excambia Core -> Right Brazil Delivery */}
        <svg
          viewBox="0 0 760 312"
          fill="none"
          aria-hidden="true"
          className="hidden md:block w-full h-[312px]"
        >
          <defs>
            <linearGradient id="suppleyBeamActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#682ABA" />
              <stop offset="55%" stopColor="#8B4FD0" />
              <stop offset="100%" stopColor="#28E7C5" />
            </linearGradient>
            <linearGradient id="suppleyBeamOut" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#682ABA" />
              <stop offset="100%" stopColor="#28E7C5" />
            </linearGradient>
            <filter id="beamGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Subtle background rails for all origins + glowing travelling packet on active route */}
          {ROUTES.map((r, idx) => {
            const pathD = `M 196 ${r.yPos} C 285 ${r.yPos}, 295 156, 362 156`;
            const isSelected = idx === activeIndex;
            return (
              <g key={r.id}>
                <path
                  d={pathD}
                  stroke={isSelected ? "url(#suppleyBeamActive)" : "#E7E4DC"}
                  strokeWidth={isSelected ? 2.6 : 1.3}
                  strokeLinecap="round"
                  opacity={isSelected ? 1 : 0.85}
                />
                {isSelected && !prefersReduced && (
                  <>
                    <motion.path
                      key={`pulse-in-${r.id}`}
                      d={pathD}
                      stroke="#28E7C5"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      filter="url(#beamGlow)"
                      strokeDasharray="24 220"
                      initial={{ strokeDashoffset: 244 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    <circle r="4.5" fill="#28E7C5" filter="url(#beamGlow)">
                      <animateMotion dur="1.8s" repeatCount="indefinite" path={pathD} />
                    </circle>
                  </>
                )}
              </g>
            );
          })}

          {/* Outgoing interconnected beams from Excambia Core -> Port -> Delivery */}
          {[
            { id: "port", d: "M 426 156 C 482 156, 495 102, 560 102" },
            { id: "delivery", d: "M 426 156 C 482 156, 495 212, 560 212" },
          ].map((out, i) => (
            <g key={out.id}>
              <path
                d={out.d}
                stroke="url(#suppleyBeamOut)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              {!prefersReduced && (
                <>
                  <motion.path
                    d={out.d}
                    stroke="#28E7C5"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    filter="url(#beamGlow)"
                    strokeDasharray="20 190"
                    initial={{ strokeDashoffset: 210 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{
                      duration: 1.65,
                      delay: i * 0.35,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <circle r="4" fill="#28E7C5" filter="url(#beamGlow)">
                    <animateMotion
                      dur="1.65s"
                      begin={`${i * 0.4}s`}
                      repeatCount="indefinite"
                      path={out.d}
                    />
                  </circle>
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Positioned Nodes Overlay on Desktop / Clean Vertical Flow on Mobile */}
        <div className="md:absolute md:inset-0 flex flex-col gap-3 md:block">
          {/* LEFT COLUMN: Global Origin Nodes */}
          <div className="grid grid-cols-3 gap-2 md:block">
            {ROUTES.map((r, idx) => {
              const isSelected = idx === activeIndex;
              const topPositions = ["md:top-[36px]", "md:top-[118px]", "md:top-[200px]"];
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    setPaused(true);
                  }}
                  className={`md:absolute md:left-0 ${topPositions[idx]} md:w-[196px] text-left rounded-2xl border px-3.5 py-3 transition-all duration-300 ${
                    isSelected
                      ? "border-[#682ABA]/40 bg-[#FAF9F6] shadow-[0_8px_24px_-10px_rgba(104,42,186,0.28)]"
                      : "border-[#E7E4DC] bg-white hover:border-[#682ABA]/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B1523]">
                      <Factory
                        className={`h-3.5 w-3.5 ${
                          isSelected ? "text-[#682ABA]" : "text-[#6A6374]"
                        }`}
                      />
                      {r.origin}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-[#682ABA] text-white"
                          : "bg-[#FAF9F6] text-[#6A6374]"
                      }`}
                    >
                      {r.code}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-[#6A6374] hidden sm:block">
                    {r.city}
                  </p>
                </button>
              );
            })}
          </div>

          {/* CENTER HUB: Excambia / Suppley Core */}
          <div className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex flex-col items-center">
            <motion.div
              animate={prefersReduced ? undefined : { scale: [1, 1.03, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-[112px] w-[112px] items-center justify-center rounded-full border border-[#682ABA]/20 bg-[#FAF9F6] shadow-[0_12px_36px_-10px_rgba(104,42,186,0.28)]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-2 rounded-full border border-dashed border-[#28E7C5]/60"
              />
              <ExcambiaOrb size={56} duration={16} />
            </motion.div>
            <div className="mt-2.5 rounded-full border border-[#E7E4DC] bg-white px-3 py-1 shadow-xs">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1B1523]">
                <Sparkles className="h-3 w-3 text-[#682ABA]" />
                Motor Suppley AI
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Port Clearance + Final Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:block">
            <div className="md:absolute md:right-0 md:top-[48px] md:w-[204px] rounded-2xl border border-[#28E7C5]/45 bg-[#FAF9F6] p-3.5 shadow-[0_8px_24px_-12px_rgba(40,231,197,0.35)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1B1523]">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#28E7C5]/25 text-[#0D5D4D]">
                  <Anchor className="h-3.5 w-3.5" />
                </span>
                Desembaraço BR
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
                  className="mt-2 space-y-1"
                >
                  <p className="text-[11px] font-medium text-[#1B1523]">{active.port}</p>
                  <p className="font-mono text-[10px] text-[#0D5D4D] font-semibold">
                    {active.savingsTtd}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="md:absolute md:right-0 md:top-[166px] md:w-[204px] rounded-2xl border border-[#682ABA]/25 bg-white p-3.5 shadow-[0_10px_28px_-14px_rgba(49,18,96,0.2)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1B1523]">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#682ABA]/12 text-[#682ABA]">
                  <PackageCheck className="h-3.5 w-3.5" />
                </span>
                Entrega Nacionalizada
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
                  className="mt-2 space-y-1"
                >
                  <p className="text-[11px] text-[#6A6374]">Custo Landed fechado</p>
                  <p className="font-mono text-sm font-bold text-[#1B1523] tabular-nums">
                    {active.landedBrl}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Live synchronized readout footer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: EASE_EDITORIAL }}
          className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] p-3.5"
        >
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[#6A6374]">
              Item cotado
            </span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-[#1B1523]">
              {active.product}
            </span>
          </div>
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[#6A6374]">
              NCM validada
            </span>
            <span className="mt-0.5 flex items-center gap-1 font-mono text-xs font-semibold text-[#682ABA]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              {active.ncm}
            </span>
          </div>
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[#6A6374]">
              FOB na origem
            </span>
            <span className="mt-0.5 block font-mono text-xs font-semibold text-[#1B1523] tabular-nums">
              {active.fobUsd}
            </span>
          </div>
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[#6A6374]">
              Trânsito estimado
            </span>
            <span className="mt-0.5 flex items-center gap-1 font-mono text-xs font-semibold text-[#0D5D4D] tabular-nums">
              <Ship className="h-3.5 w-3.5 shrink-0" />
              {active.transitDays}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 flex items-center justify-between text-[11px] text-[#6A6374]">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#0D5D4D]" />
          30 marcos monitorados da cotação à nota fiscal no Brasil
        </span>
        <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider">
          Clique nas origens para explorar
        </span>
      </div>
    </div>
  );
}
