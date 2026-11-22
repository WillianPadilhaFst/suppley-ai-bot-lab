/**
 * UnicornShaderCanvas — Integração Oficial com `unicornstudio/react` (SDK v2.6.1)
 *
 * Conecta diretamente o componente oficial `<UnicornScene />` do pacote `unicornstudio`
 * à identidade visual da SUPPLEY & Excambia:
 * - Se `projectId` (ou `VITE_UNICORN_PROJECT_ID`) for informado, carrega a cena
 *   publicada diretamente da nuvem do Unicorn Studio.
 * - Caso contrário, carrega a cena JSON oficial auto-hospedada em
 *   `/shaders/excambia-editorial-scene.json`, com presets:
 *   "Suppley Aurora" | "Suppley Purple" | "Editorial Light"
 *   e variáveis dinâmicas (`intensity`, `distortion`, `speed`, `colorA`, `colorB`, `bg`).
 * - Respeita `prefers-reduced-motion` automaticamente via `useReducedMotion()`.
 */
import React, { useMemo, useRef } from "react";
import UnicornScene, { type UnicornStudioScene } from "unicornstudio/react";
import { useReducedMotion } from "framer-motion";

export type UnicornShaderPreset =
  | "Suppley Aurora"
  | "Suppley Purple"
  | "Editorial Light";

export interface UnicornShaderCanvasProps {
  /** ID do projeto publicado no Unicorn Studio (opcional — usa JSON local se omitido). */
  projectId?: string;
  /** Caminho para o arquivo JSON exportado do Unicorn Studio. */
  jsonFilePath?: string;
  /** Variante visual pré-configurada na cena. */
  variant?: "aurora" | "dark" | "light";
  /** Preset nomeado da cena Unicorn Studio. */
  preset?: UnicornShaderPreset;
  intensity?: number;
  distortion?: number;
  speed?: number;
  scale?: number;
  dpi?: number;
  fpsCap?: number;
  colorA?: string;
  colorB?: string;
  bgColor?: string;
  lazyLoad?: boolean;
  production?: boolean;
  className?: string;
  onSceneLoad?: (scene: UnicornStudioScene) => void;
}

const ENV_PROJECT_ID =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_UNICORN_PROJECT_ID as string | undefined)
    : undefined;

export function UnicornShaderCanvas({
  projectId,
  jsonFilePath = "/shaders/excambia-editorial-scene.json",
  variant = "aurora",
  preset,
  intensity,
  distortion,
  speed,
  scale = 0.75,
  dpi = 1,
  fpsCap = 60,
  colorA,
  colorB,
  bgColor,
  lazyLoad = false,
  production = false,
  className = "",
  onSceneLoad,
}: UnicornShaderCanvasProps) {
  const prefersReduced = useReducedMotion();
  const sceneRef = useRef<UnicornStudioScene | null>(null);

  const resolvedProjectId =
    (projectId || ENV_PROJECT_ID || "").trim() || undefined;

  const resolvedPreset: UnicornShaderPreset =
    preset ??
    (variant === "light"
      ? "Editorial Light"
      : variant === "dark"
        ? "Suppley Purple"
        : "Suppley Aurora");

  const variables = useMemo(() => {
    const vars: Record<string, string | number | boolean> = {};
    if (typeof intensity === "number") vars.intensity = intensity;
    if (typeof distortion === "number") vars.distortion = distortion;
    if (typeof speed === "number") vars.speed = speed;
    if (colorA) vars.colorA = colorA;
    if (colorB) vars.colorB = colorB;
    if (bgColor) vars.bg = bgColor;
    return Object.keys(vars).length > 0 ? vars : undefined;
  }, [intensity, distortion, speed, colorA, colorB, bgColor]);

  const fallbackGradient =
    variant === "light"
      ? "radial-gradient(70% 60% at 75% 25%, rgba(178,140,255,0.42) 0%, transparent 65%), radial-gradient(65% 55% at 20% 75%, rgba(96,235,210,0.42) 0%, transparent 65%), #FAF9F6"
      : variant === "dark"
        ? "radial-gradient(80% 70% at 72% 24%, rgba(40,231,197,0.28) 0%, rgba(147,51,234,0.52) 48%, #180834 100%)"
        : "radial-gradient(75% 65% at 72% 28%, rgba(124,58,237,0.45) 0%, transparent 62%), radial-gradient(65% 60% at 24% 76%, rgba(40,231,197,0.34) 0%, transparent 60%), #080512";

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <UnicornScene
        {...(resolvedProjectId
          ? { projectId: resolvedProjectId, production }
          : { jsonFilePath })}
        sceneRef={sceneRef}
        width="100%"
        height="100%"
        scale={scale}
        dpi={dpi}
        fps={fpsCap}
        lazyLoad={lazyLoad}
        paused={Boolean(prefersReduced)}
        preset={resolvedPreset}
        variables={variables}
        ariaLabel="SUPPLEY Excambia Interactive WebGL Aurora Scene"
        altText="SUPPLEY Excambia Importação Inteligente"
        onLoad={(scene) => {
          onSceneLoad?.(scene);
        }}
        placeholder={
          <div
            aria-hidden="true"
            className="h-full w-full"
            style={{ background: fallbackGradient }}
          />
        }
        className="h-full w-full"
      />
    </div>
  );
}

export default UnicornShaderCanvas;
