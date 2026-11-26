import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { JORNADA_MARCOS, MARCO_GATE, MARCO_META, type TipoMarco } from "@/lib/marcoLabels";
import { EASE_EDITORIAL, Reveal, SPRING_SNAPPY } from "./MotionPrimitives";

export default function MarcosGovernanceExplorer() {
  const [activePhaseIdx, setActivePhaseIdx] = useState(2); // Default: Fase 3 (Viabilidade econômica + Gate GO/NO-GO)
  const activeGroup = JORNADA_MARCOS[activePhaseIdx] ?? JORNADA_MARCOS[0];

  return (
    <Reveal className="mb-12 rounded-[28px] border border-[#E7E4DC] bg-white p-6 sm:p-8 shadow-[0_12px_36px_-18px_rgba(49,18,96,0.12)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E7E4DC]">
        <div>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#682ABA]">
            Transparência radical · 9 fases &amp; 30 marcos interligados
          </span>
          <h3 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-[-0.025em] text-[#1B1523]">
            Explore cada marco real da sua carga até a nota fiscal no Brasil
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1 font-mono text-[11px] font-semibold text-amber-800">
          <ShieldAlert className="h-3.5 w-3.5" />
          3 Gates de governança humana
        </span>
      </div>

      {/* Connected 9-Phase Interactive Rail */}
      <div className="mt-6 overflow-x-auto scrollbar-hide pb-2">
        <div className="relative flex min-w-[720px] items-center justify-between gap-1.5">
          {/* Continuous connecting line behind phases */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-6 right-6 top-5 h-[2px] bg-[#E7E4DC]"
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-6 top-5 h-[2px] origin-left bg-gradient-to-r from-[#682ABA] to-[#28E7C5]"
            animate={{
              width: `calc(${(activePhaseIdx / (JORNADA_MARCOS.length - 1)) * 100}% - 3rem)`,
            }}
            transition={SPRING_SNAPPY}
          />

          {JORNADA_MARCOS.map((group, idx) => {
            const isActive = idx === activePhaseIdx;
            const isPast = idx < activePhaseIdx;
            const hasGate = group.tipos.some((t) => Boolean(MARCO_GATE[t]));

            return (
              <button
                key={group.fase}
                type="button"
                onClick={() => setActivePhaseIdx(idx)}
                onMouseEnter={() => setActivePhaseIdx(idx)}
                className="group relative z-10 flex flex-col items-center text-center px-1.5 py-1 focus:outline-none"
              >
                <span
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition-all ${
                    isActive
                      ? "border-[#682ABA] bg-[#682ABA] text-white scale-110 shadow-[0_6px_18px_-4px_rgba(104,42,186,0.55)]"
                      : isPast
                        ? "border-[#28E7C5] bg-[#FAF9F6] text-[#0D5D4D]"
                        : "border-[#E7E4DC] bg-white text-[#6A6374] group-hover:border-[#682ABA]/40"
                  }`}
                >
                  0{group.fase}
                  {hasGate && (
                    <span
                      title="Contém Gate de Governança"
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500"
                    />
                  )}
                </span>
                <span
                  className={`mt-2 max-w-[82px] text-[11px] leading-tight transition-colors ${
                    isActive ? "font-bold text-[#1B1523]" : "font-medium text-[#6A6374]"
                  }`}
                >
                  {group.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Phase Granular Milestones */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeGroup.fase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: EASE_EDITORIAL }}
          className="mt-5 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] p-4 sm:p-5"
        >
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[#682ABA] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                Fase 0{activeGroup.fase}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-[#1B1523]">
                {activeGroup.label}
              </h4>
            </div>
            <span className="font-mono text-[11px] text-[#6A6374]">
              {activeGroup.tipos.length} marcos monitorados via Web, MCP &amp; Webhook
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeGroup.tipos.map((tipo: TipoMarco, i: number) => {
              const meta = MARCO_META[tipo];
              const Icon = meta.Icon;
              const gateLabel = MARCO_GATE[tipo];

              return (
                <div
                  key={tipo}
                  className="relative flex flex-col justify-between rounded-xl border border-[#E7E4DC] bg-white p-3.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#682ABA]/10 text-[#682ABA]">
                      <Icon className="h-4 w-4" />
                    </span>
                    {gateLabel ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-800">
                        Gate · {gateLabel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#0D5D4D]">
                        <CheckCircle2 className="h-3 w-3 text-[#28E7C5]" />#{i + 1}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-bold text-[#1B1523]">{meta.label}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[#6A6374] truncate">{tipo}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </Reveal>
  );
}
