import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  Code2,
  Copy,
  Cpu,
  Database,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import ExcambiaOrb from "@/components/ExcambiaOrb";
import {
  EASE_EDITORIAL,
  MagneticButton,
  Reveal,
  SPRING_SNAPPY,
  SpotlightCard,
  StaggerGroup,
  StaggerItem,
} from "./MotionPrimitives";

type IntegrationMode = "mcp" | "api";
type PipelinePhase = "sending" | "routing" | "done";
type SnippetKey = "mcp_json" | "python_agent" | "curl_rest" | "webhook_hmac";

interface Scenario {
  id: string;
  label: string;
  targetEngineIdx: number;
  latencyMs: number;
  mcpPrompt: string;
  mcpTool: string;
  mcpArgs: string;
  mcpResult: {
    headline: string;
    metrics: { k: string; v: string }[];
  };
  apiMethod: "POST" | "GET" | "WEBHOOK";
  apiEndpoint: string;
  apiPayload: string;
  apiResponse: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "quote",
    label: "Cotar produto lá fora",
    targetEngineIdx: 0,
    latencyMs: 142,
    mcpPrompt: "Cotar 24t de Polipropileno na China para entrega em Itajaí/SC",
    mcpTool: "suppley.create_rfq",
    mcpArgs: `{ "product": "Polipropileno Homopolímero", "qtyTon": 24, "origin": "CN", "port": "Itajaí/SC" }`,
    mcpResult: {
      headline: "RFQ #2048 criada · NCM 3902.10.20 validada (98% conf.)",
      metrics: [
        { k: "Fábricas acionadas", v: "6 homologadas" },
        { k: "Incoterm", v: "FOB Ningbo" },
        { k: "Anuência", v: "Dispensa LI" },
      ],
    },
    apiMethod: "POST",
    apiEndpoint: "/v1/rfq/quotations",
    apiPayload: `{
  "externalRef": "ERP-PED-8841",
  "items": [{ "name": "Polipropileno Homopolímero", "quantity": 24, "unit": "TON" }],
  "preferredCountries": ["CN", "IN"],
  "destinationPort": "Itajaí/Navegantes"
}`,
    apiResponse: `{
  "rfqId": "rfq_2048",
  "ncmSuggested": "3902.10.20",
  "status": "sourcing_dispatched",
  "matchedFactories": 6
}`,
  },
  {
    id: "landed",
    label: "Simular Landed Cost + TTD",
    targetEngineIdx: 1,
    latencyMs: 118,
    mcpPrompt: "Qual o custo nacionalizado com TTD SC para US$ 42.800 FOB?",
    mcpTool: "suppley.simulate_landed_cost",
    mcpArgs: `{ "ncm": "3902.10.20", "fobUsd": 42800, "port": "Itajaí", "applyTtd": true }`,
    mcpResult: {
      headline: "Viabilidade calculada · Economia de 14,2% via TTD SC",
      metrics: [
        { k: "Landed Cost BR", v: "R$ 318.400" },
        { k: "Economia TTD", v: "-R$ 44.910" },
        { k: "Gate sugerido", v: "GO (Aprovação)" },
      ],
    },
    apiMethod: "POST",
    apiEndpoint: "/v1/estimativa/landed-cost",
    apiPayload: `{
  "ncmCode": "3902.10.20",
  "fobUsd": 42800,
  "originCountry": "CN",
  "destinationState": "SC",
  "taxRegime": "TTD_SC"
}`,
    apiResponse: `{
  "landedTotalBrl": 318400.00,
  "ttdSavingsBrl": 44910.00,
  "ptaxUsed": 5.7812,
  "gateRecommendation": "GO"
}`,
  },
  {
    id: "tracking",
    targetEngineIdx: 2,
    latencyMs: 94,
    label: "Rastrear os 30 marcos",
    mcpPrompt: "Em qual marco está a operação #OP-819 e quando chega no CD?",
    mcpTool: "suppley.get_operation_marcos",
    mcpArgs: `{ "operationId": "OP-819" }`,
    mcpResult: {
      headline: "Marco 27/30 concluído · DUIMP registrada e carga nacionalizada",
      metrics: [
        { k: "Porto atual", v: "Itajaí (SC)" },
        { k: "Próximo marco", v: "Entrega no CD" },
        { k: "ETA", v: "Amanhã · 09h00" },
      ],
    },
    apiMethod: "WEBHOOK",
    apiEndpoint: "evento → seu-sistema.com.br/webhooks/suppley",
    apiPayload: `{
  "event": "operation.marco_completed",
  "operationId": "OP-819",
  "marco": "nacionalizado",
  "progress": "27/30",
  "etaDelivery": "2026-11-27T09:00:00-03:00"
}`,
    apiResponse: `HTTP/1.1 200 OK
{ "erpSynced": true, "nfDraftCreated": true }`,
  },
];

const CODE_SNIPPETS: Record<SnippetKey, { label: string; lang: string; code: string }> = {
  mcp_json: {
    label: "mcp_config.json",
    lang: "JSON · Claude / Cursor / Antigravity",
    code: `{
  "mcpServers": {
    "suppley": {
      "serverUrl": "https://mcp.suppley.com.br/mcp",
      "headers": { "Authorization": "Bearer sk_live_suppley_..." }
    }
  }
}`,
  },
  python_agent: {
    label: "Python · Agente Próprio",
    lang: "LangGraph / OpenAI Agents SDK",
    code: `from langchain_mcp_adapters.client import MultiServerMCPClient

async with MultiServerMCPClient({
    "suppley": {"url": "https://mcp.suppley.com.br/mcp", "transport": "streamable_http"}
}) as client:
    tools = client.get_tools()  # create_rfq, simulate_landed_cost, get_operation_marcos`,
  },
  curl_rest: {
    label: "cURL · ERP / Sistema",
    lang: "REST API v1 · SAP / TOTVS / Omie",
    code: `curl -X POST https://api.suppley.com.br/v1/estimativa/landed-cost \\
  -H "Authorization: Bearer sk_live_suppley_..." \\
  -H "Content-Type: application/json" \\
  -d '{"ncmCode":"3902.10.20","fobUsd":42800,"destinationState":"SC","taxRegime":"TTD_SC"}'`,
  },
  webhook_hmac: {
    label: "Webhook · 30 Marcos",
    lang: "Node.js · Validação HMAC-SHA256",
    code: `app.post("/webhooks/suppley", verifySuppleyHmac(process.env.SUPPLEY_WEBHOOK_SECRET), (req, res) => {
  const { event, operationId, marco, progress } = req.body;
  // Ex.: operation.marco_completed -> atualiza pedido de compra no ERP
  res.json({ received: true });
});`,
  },
};

const MCP_CLIENTS = [
  { name: "Sua IA Própria", sub: "LangGraph · OpenAI · Agentes internos", y: 56 },
  { name: "Assistentes Corporativos", sub: "Claude · ChatGPT · Gemini · Copilot", y: 145 },
  { name: "Automações & Workflows", sub: "n8n · Python · Slack / WhatsApp Bots", y: 234 },
];

const API_CLIENTS = [
  { name: "ERPs Corporativos", sub: "SAP · TOTVS · Omie · Sankhya", y: 56 },
  { name: "Compras & E-commerce", sub: "Sistemas próprios · Portais B2B", y: 145 },
  { name: "Data Warehouse & BI", sub: "Power BI · BigQuery · Webhooks", y: 234 },
];

const OUTPUT_CAPABILITIES = [
  { title: "NCM & Sourcing Global", sub: "RFQ automática em 9 polos", y: 56 },
  { title: "Motor V2 + TTD", sub: "Landed Cost e PTAX ao vivo", y: 145 },
  { title: "30 Marcos da Operação", sub: "Da fábrica à NF-e no Brasil", y: 234 },
];

const BUSINESS_CASES = [
  {
    icon: Bot,
    tag: "MCP Nativo",
    title: "Sua própria IA vira compradora internacional",
    description:
      "Plugue o servidor MCP da Suppley no agente interno da sua empresa. Seu time pede cotações, valida NCM e consulta custos nacionalizados em linguagem natural.",
  },
  {
    icon: Cpu,
    tag: "REST API Tipada",
    title: "Reposição automática direto do seu ERP",
    description:
      "Quando o estoque atingir o ponto de pedido no SAP, TOTVS, Omie ou sistema próprio, dispare RFQs e receba o cálculo Landed Cost sem digitação manual.",
  },
  {
    icon: Webhook,
    tag: "Webhooks Assinados",
    title: "30 marcos sincronizados no seu BI e financeiro",
    description:
      "Cada avanço — proforma assinada, inspeção aprovada, BL emitido, DUIMP registrada e entrega — notifica seus sistemas automaticamente.",
  },
];

export default function McpApiIntegrationSection({
  onRequestIntegration,
}: {
  onRequestIntegration: () => void;
}) {
  const prefersReduced = useReducedMotion();
  const [mode, setMode] = useState<IntegrationMode>("mcp");
  const [clientIdx, setClientIdx] = useState(0);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [phase, setPhase] = useState<PipelinePhase>("done");
  const [runCount, setRunCount] = useState(0);
  const [snippetKey, setSnippetKey] = useState<SnippetKey>("mcp_json");
  const [copied, setCopied] = useState(false);

  const activeScenario = SCENARIOS[scenarioIdx];
  const leftNodes = mode === "mcp" ? MCP_CLIENTS : API_CLIENTS;
  const activeLeftNode = leftNodes[clientIdx] ?? leftNodes[0];
  const targetEngineIdx = activeScenario.targetEngineIdx;
  const activeSnippet = CODE_SNIPPETS[snippetKey];

  // Sincroniza aba de código sugerida ao trocar MCP <-> API
  useEffect(() => {
    setSnippetKey(mode === "mcp" ? "mcp_json" : "curl_rest");
  }, [mode]);

  // Coreografia causal curta (sending -> routing -> done) ao disparar um cenário
  useEffect(() => {
    if (prefersReduced || runCount === 0) {
      setPhase("done");
      return;
    }
    setPhase("sending");
    const t1 = window.setTimeout(() => setPhase("routing"), 240);
    const t2 = window.setTimeout(() => setPhase("done"), 520);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [runCount, prefersReduced]);

  function triggerScenario(nextIdx: number) {
    setScenarioIdx(nextIdx);
    setRunCount((c) => c + 1);
  }

  function triggerClient(nextClientIdx: number) {
    setClientIdx(nextClientIdx);
    setRunCount((c) => c + 1);
  }

  function handleCopySnippet() {
    navigator.clipboard?.writeText(activeSnippet.code);
    setCopied(true);
    toast.success(` Trecho ${activeSnippet.label} copiado!`);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const activeInPath = `M 168 ${activeLeftNode.y} C 212 ${activeLeftNode.y}, 214 145, 240 145`;
  const activeOutPath = `M 296 145 C 322 145, 324 ${OUTPUT_CAPABILITIES[targetEngineIdx].y}, 356 ${OUTPUT_CAPABILITIES[targetEngineIdx].y}`;

  return (
    <section
      id="integracoes"
      className="relative py-24 lg:py-32 border-t border-[#E7E4DC] overflow-x-clip"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Header + Mode Switcher */}
        <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#682ABA]">
              <Code2 className="h-3.5 w-3.5" />
              Infraestrutura Conectável · MCP &amp; APIs
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-[-0.035em] leading-[1.06] text-[#1B1523]">
              Conecte a Suppley à sua própria IA ou aos sistemas da sua empresa.
            </h2>
            <p className="mt-4 text-base text-[#6A6374] leading-relaxed">
              Além da plataforma web, disponibilizamos{" "}
              <strong className="text-[#1B1523]">servidor MCP oficial</strong> e{" "}
              <strong className="text-[#1B1523]">REST API + Webhooks</strong> para que seus agentes
              de IA, ERPs e ferramentas internas cotem no exterior e acompanhem cada embarque até o
              Brasil.
            </p>
          </div>

          {/* Animated Pill Switcher: MCP vs API */}
          <div
            role="tablist"
            aria-label="Modo de integração"
            className="inline-flex self-start rounded-2xl border border-[#E7E4DC] bg-white p-1.5 shadow-xs"
          >
            {[
              { id: "mcp" as const, label: "MCP · Para sua IA", icon: Sparkles },
              { id: "api" as const, label: "API & Webhooks · Sistemas", icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setMode(tab.id);
                    setRunCount((c) => c + 1);
                  }}
                  className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                    active ? "text-white" : "text-[#6A6374] hover:text-[#1B1523]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="integration-mode-pill"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 rounded-xl bg-[#682ABA]"
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Main Dark Studio Interactive Architecture + Console + Multi-Stack Code Drawer */}
        <Reveal className="rounded-[32px] bg-[#14101D] text-white p-6 sm:p-8 lg:p-10 shadow-[0_28px_70px_-24px_rgba(27,21,35,0.62)] border border-white/10 relative overflow-hidden">
          {/* Ambient studio glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 left-1/4 h-72 w-96 rounded-full bg-[#682ABA]/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 right-1/4 h-64 w-80 rounded-full bg-[#28E7C5]/14 blur-3xl"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* LEFT: Causal Interconnected Bridge Diagram */}
            <div className="lg:col-span-6">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#28E7C5]">
                  {mode === "mcp"
                    ? "Clique na origem IA ou no cenário"
                    : "Clique no sistema ou no endpoint"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 font-mono text-[10px] text-white/75">
                  <Lock className="h-3 w-3 text-[#28E7C5]" />
                  TLS 1.3 · Chaves com escopo
                </span>
              </div>

              <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                {/* Desktop SVG Beams with Causal Active Path & Travelling Luminous Packet */}
                <svg
                  viewBox="0 0 520 290"
                  fill="none"
                  aria-hidden="true"
                  className="hidden sm:block w-full h-[270px]"
                >
                  <defs>
                    <linearGradient id="mcpBeamIn" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B4FD0" />
                      <stop offset="100%" stopColor="#28E7C5" />
                    </linearGradient>
                    <filter id="mcpDotGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Inactive background rails (Left -> Hub) */}
                  {leftNodes.map((node, i) => (
                    <path
                      key={`bg-in-${i}`}
                      d={`M 168 ${node.y} C 212 ${node.y}, 214 145, 240 145`}
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  ))}

                  {/* Inactive background rails (Hub -> Right) */}
                  {OUTPUT_CAPABILITIES.map((cap, i) => (
                    <path
                      key={`bg-out-${i}`}
                      d={`M 296 145 C 322 145, 324 ${cap.y}, 356 ${cap.y}`}
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  ))}

                  {/* ACTIVE Incoming Beam (Selected Client -> Suppley Hub) */}
                  <path
                    d={activeInPath}
                    stroke="url(#mcpBeamIn)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  {!prefersReduced && (
                    <circle r="4" fill="#28E7C5" filter="url(#mcpDotGlow)">
                      <animateMotion
                        dur="1.4s"
                        repeatCount="indefinite"
                        path={activeInPath}
                      />
                    </circle>
                  )}

                  {/* ACTIVE Outgoing Beam (Suppley Hub -> Target Engine for Selected Scenario) */}
                  <path
                    d={activeOutPath}
                    stroke="#28E7C5"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  {!prefersReduced && (
                    <circle r="4" fill="#28E7C5" filter="url(#mcpDotGlow)">
                      <animateMotion
                        dur="1.4s"
                        begin="0.35s"
                        repeatCount="indefinite"
                        path={activeOutPath}
                      />
                    </circle>
                  )}
                </svg>

                {/* Overlaid Interactive Nodes */}
                <div className="sm:absolute sm:inset-4 flex flex-col gap-3 sm:block">
                  {/* Left: Customer's AI or ERP (Clickable!) */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.22, ease: EASE_EDITORIAL }}
                      className="space-y-2 sm:space-y-0"
                    >
                      {leftNodes.map((n, idx) => {
                        const tops = ["sm:top-[14px]", "sm:top-[101px]", "sm:top-[188px]"];
                        const isSelected = idx === clientIdx;
                        return (
                          <button
                            key={n.name}
                            type="button"
                            onClick={() => triggerClient(idx)}
                            className={`w-full text-left sm:absolute sm:left-0 ${tops[idx]} sm:w-[162px] rounded-xl border px-3 py-2.5 transition-all ${
                              isSelected
                                ? "border-[#8B4FD0] bg-[#241B35] shadow-[0_0_24px_rgba(139,79,208,0.28)]"
                                : "border-white/10 bg-[#1B1526]/80 opacity-75 hover:opacity-100 hover:border-white/25"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold text-white truncate">{n.name}</p>
                              {isSelected && (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#28E7C5]" />
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-white/60">{n.sub}</p>
                          </button>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>

                  {/* Center Gateway Hub (Pulses on execution) */}
                  <div className="sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 flex flex-col items-center py-2 sm:py-0">
                    <motion.div
                      animate={
                        phase === "routing" && !prefersReduced
                          ? { scale: 1.09 }
                          : { scale: 1 }
                      }
                      transition={SPRING_SNAPPY}
                      className="relative flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-[#28E7C5]/50 bg-[#FAF9F6] shadow-[0_0_36px_rgba(40,231,197,0.26)]"
                    >
                      <ExcambiaOrb size={42} duration={14} />
                    </motion.div>
                    <span className="mt-2 rounded-full bg-[#682ABA] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                      {mode === "mcp" ? "MCP Server" : "API Gateway"}
                    </span>
                  </div>

                  {/* Right: Suppley Execution Modules (Target highlights dynamically!) */}
                  <div className="space-y-2 sm:space-y-0">
                    {OUTPUT_CAPABILITIES.map((cap, idx) => {
                      const tops = ["sm:top-[14px]", "sm:top-[101px]", "sm:top-[188px]"];
                      const isTarget = idx === targetEngineIdx;
                      return (
                        <button
                          key={cap.title}
                          type="button"
                          onClick={() => triggerScenario(idx)}
                          className={`w-full text-left sm:absolute sm:right-0 ${tops[idx]} sm:w-[158px] rounded-xl border px-3 py-2.5 transition-all ${
                            isTarget
                              ? "border-[#28E7C5] bg-[#16292B] shadow-[0_0_26px_rgba(40,231,197,0.24)]"
                              : "border-white/10 bg-[#1B1526]/80 opacity-65 hover:opacity-100"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold leading-snug ${
                              isTarget ? "text-[#28E7C5]" : "text-white/85"
                            }`}
                          >
                            {cap.title}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-white/60">{cap.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Human Governance Callout Strip */}
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-[#28E7C5] mt-0.5" />
                <p className="text-xs leading-relaxed text-white/75">
                  <strong className="text-white">Autonomia com governança humana:</strong> sua IA ou
                  ERP cota, classifica NCM e simula TTD automaticamente — enquanto os Gates críticos
                  (<span className="font-mono text-[#28E7C5]">GO / NO-GO</span> e{" "}
                  <span className="font-mono text-[#28E7C5]">DUIMP</span>) permanecem sob sua aprovação.
                </p>
              </div>
            </div>

            {/* RIGHT: Interactive Live Playground Console */}
            <div className="lg:col-span-6">
              {/* Scenario selector pills + Replay button */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {SCENARIOS.map((sc, i) => {
                    const isCurrent = i === scenarioIdx;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => triggerScenario(i)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                          isCurrent
                            ? "bg-[#28E7C5] text-[#0D3D35] shadow-[0_4px_14px_rgba(40,231,197,0.3)]"
                            : "border border-white/12 bg-white/[0.04] text-white/70 hover:text-white"
                        }`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setRunCount((c) => c + 1)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] font-semibold text-white/85 hover:bg-white/15"
                  title="Simular chamada novamente"
                >
                  <Play className="h-2.5 w-2.5 fill-current text-[#28E7C5]" />
                  Testar
                </button>
              </div>

              {/* Console Window */}
              <div className="rounded-2xl border border-white/12 bg-[#0B0910] p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="h-4 w-4 shrink-0 text-[#28E7C5]" />
                    <span className="truncate font-mono text-xs font-semibold text-white/90">
                      {activeLeftNode.name} → Suppley
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-[#28E7C5]">
                    {phase === "sending"
                      ? "● enviando…"
                      : phase === "routing"
                        ? "● processando…"
                        : `● 200 OK · ${activeScenario.latencyMs}ms`}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${mode}-${activeScenario.id}-${clientIdx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
                    className="space-y-3"
                  >
                    {mode === "mcp" ? (
                      <>
                        {/* Step 1: Prompt from company's own AI */}
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                          <span className="block font-mono text-[10px] uppercase tracking-wider text-white/50">
                            1. Comando em {activeLeftNode.name}
                          </span>
                          <p className="mt-1 text-xs sm:text-sm font-medium text-white">
                            “{activeScenario.mcpPrompt}”
                          </p>
                        </div>

                        {/* Step 2: MCP Tool Call */}
                        <motion.div
                          animate={{ opacity: phase === "sending" ? 0.55 : 1 }}
                          className="rounded-xl border border-[#682ABA]/45 bg-[#682ABA]/15 p-3.5 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#28E7C5] font-semibold">
                              ⚡ 2. tool_call: {activeScenario.mcpTool}
                            </span>
                            <span className="text-white/50">JSON-RPC</span>
                          </div>
                          <pre className="mt-2 overflow-x-auto text-[11px] text-white/80 leading-relaxed">
                            {activeScenario.mcpArgs}
                          </pre>
                        </motion.div>

                        {/* Step 3: Structured Response back to Agent */}
                        <motion.div
                          animate={{
                            opacity: phase === "done" ? 1 : 0.4,
                            scale: phase === "done" ? 1 : 0.99,
                          }}
                          className="rounded-xl border border-[#28E7C5]/35 bg-[#28E7C5]/[0.08] p-3.5"
                        >
                          <p className="text-xs font-semibold text-[#28E7C5]">
                            ✓ 3. {activeScenario.mcpResult.headline}
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {activeScenario.mcpResult.metrics.map((m) => (
                              <div
                                key={m.k}
                                className="rounded-lg bg-black/35 px-2.5 py-2 border border-white/8"
                              >
                                <span className="block font-mono text-[10px] text-white/55">
                                  {m.k}
                                </span>
                                <span className="mt-0.5 block font-mono text-xs font-bold text-white">
                                  {m.v}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    ) : (
                      <>
                        {/* Endpoint line */}
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 font-mono text-xs">
                          <span className="rounded bg-[#682ABA] px-2 py-0.5 text-[10px] font-bold text-white">
                            {activeScenario.apiMethod}
                          </span>
                          <span className="truncate text-[#28E7C5]">
                            {activeScenario.apiEndpoint}
                          </span>
                        </div>

                        {/* Payload */}
                        <div className="rounded-xl border border-white/10 bg-black/45 p-3.5">
                          <span className="block font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">
                            Payload enviado ({activeLeftNode.name})
                          </span>
                          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-white/85">
                            {activeScenario.apiPayload}
                          </pre>
                        </div>

                        {/* Response */}
                        <motion.div
                          animate={{ opacity: phase === "done" ? 1 : 0.45 }}
                          className="rounded-xl border border-[#28E7C5]/35 bg-[#28E7C5]/[0.08] p-3.5"
                        >
                          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#28E7C5] mb-1.5">
                            Resposta / Sincronização imediata
                          </span>
                          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-white">
                            {activeScenario.apiResponse}
                          </pre>
                        </motion.div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Multi-Stack Developer Quick-Start Drawer */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(CODE_SNIPPETS) as SnippetKey[]).map((key) => {
                  const item = CODE_SNIPPETS[key];
                  const active = key === snippetKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSnippetKey(key)}
                      className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
                        active
                          ? "bg-white/15 text-white border border-white/20"
                          : "text-white/55 hover:text-white/90"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline font-mono text-[10px] text-white/45">
                  {activeSnippet.lang}
                </span>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#28E7C5]" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar código
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B0910] px-4 py-3.5">
              <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-[#E9E6F2]">
                {activeSnippet.code}
              </pre>
            </div>
          </div>
        </Reveal>

        {/* 3 Executive Business Value Cards */}
        <StaggerGroup className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {BUSINESS_CASES.map((item) => {
            const Icon = item.icon;
            return (
              <StaggerItem key={item.title}>
                <SpotlightCard
                  spotlightColor="rgba(104, 42, 186, 0.08)"
                  className="h-full rounded-[24px] border border-[#E7E4DC] bg-white p-6 shadow-[0_6px_24px_-16px_rgba(49,18,96,0.12)] transition-colors hover:border-[#682ABA]/35"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] text-[#682ABA]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-[#682ABA]/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#682ABA]">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold tracking-[-0.02em] text-[#1B1523]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6A6374]">
                    {item.description}
                  </p>
                </SpotlightCard>
              </StaggerItem>
            );
          })}
        </StaggerGroup>

        {/* Bottom Action Strip */}
        <Reveal className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[#E7E4DC] bg-white px-6 py-5">
          <div>
            <p className="text-sm sm:text-base font-bold text-[#1B1523]">
              Quer plugar sua IA própria ou integrar seu ERP direto na operação Suppley?
            </p>
            <p className="text-xs sm:text-sm text-[#6A6374]">
              Liberamos credenciais de sandbox, documentação OpenAPI/MCP e suporte direto de engenharia.
            </p>
          </div>
          <MagneticButton
            type="button"
            onClick={onRequestIntegration}
            className="btn-sheen shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#682ABA] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(104,42,186,0.5)] hover:bg-[#5A23A3]"
          >
            Solicitar acesso MCP &amp; API
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  );
}
