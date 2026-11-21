import React, { useRef, useState } from "react";
import {
  clampCordPull,
  playLampSwitchSound,
  shouldToggleLampOnRelease,
} from "./lampPhysics";

interface TripodLampProps {
  isLit: boolean;
  onToggle: () => void;
}

const PLEAT_COUNT = 20;

interface LegGeometry {
  woodPath: string;
  innerHighlightPath: string;
  ferrulePath: string;
  ferruleRingPath: string;
  ferruleHighlightPath: string;
  footCx: number;
  footCy: number;
}

/**
 * Computes exact tapered cylindrical geometry for an angled tripod leg,
 * including its wood shaft, inner specular edge, brass ferrule sleeve, and floor pad center.
 */
function buildTaperedLeg(
  xTop: number,
  yTop: number,
  xBot: number,
  yBot: number,
  topHalfWidth: number,
  botHalfWidth: number,
  ferruleRatio: number,
  highlightSide: "left" | "right" | "center",
): LegGeometry {
  const dx = xBot - xTop;
  const dy = yBot - yTop;
  const len = Math.hypot(dx, dy);
  // Unit perpendicular vector pointing to the right of the leg direction
  const nx = dy / len;
  const ny = -dx / len;

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const xFer = lerp(xTop, xBot, ferruleRatio);
  const yFer = lerp(yTop, yBot, ferruleRatio);
  const ferHalfWidth = lerp(topHalfWidth, botHalfWidth, ferruleRatio);

  const p = (x: number, y: number, hw: number, sign: number) =>
    `${(x + nx * hw * sign).toFixed(1)},${(y + ny * hw * sign).toFixed(1)}`;

  const woodPath = `M ${p(xTop, yTop, topHalfWidth, -1)} L ${p(xTop, yTop, topHalfWidth, 1)} L ${p(xFer, yFer, ferHalfWidth, 1)} L ${p(xFer, yFer, ferHalfWidth, -1)} Z`;

  const ferrulePath = `M ${p(xFer, yFer, ferHalfWidth + 0.35, -1)} L ${p(xFer, yFer, ferHalfWidth + 0.35, 1)} L ${p(xBot, yBot, botHalfWidth, 1)} L ${p(xBot, yBot, botHalfWidth, -1)} Z`;

  const ferruleRingPath = `M ${p(xFer, yFer, ferHalfWidth + 0.6, -1)} L ${p(xFer, yFer, ferHalfWidth + 0.6, 1)}`;

  const hlSign =
    highlightSide === "right" ? 0.58 : highlightSide === "left" ? -0.58 : 0;
  const innerHighlightPath = `M ${p(xTop, yTop, topHalfWidth, hlSign)} L ${p(xFer, yFer, ferHalfWidth, hlSign)}`;
  const ferruleHighlightPath = `M ${p(xFer, yFer, ferHalfWidth, hlSign * 0.7)} L ${p(xBot, yBot, botHalfWidth, hlSign * 0.7)}`;

  return {
    woodPath,
    innerHighlightPath,
    ferrulePath,
    ferruleRingPath,
    ferruleHighlightPath,
    footCx: xBot,
    footCy: yBot + 1.5,
  };
}

const LEFT_LEG = buildTaperedLeg(163, 326, 86, 494, 5.2, 3.1, 0.84, "right");
const RIGHT_LEG = buildTaperedLeg(177, 326, 254, 494, 5.2, 3.1, 0.84, "left");
const BACK_LEG = buildTaperedLeg(170, 328, 170, 472, 4.6, 2.8, 0.84, "center");

export const TripodLamp: React.FC<TripodLampProps> = ({ isLit, onToggle }) => {
  const [dragPullPx, setDragPullPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [tugCounter, setTugCounter] = useState(0);

  const dragStartYRef = useRef<number | null>(null);
  const maxPullRef = useRef<number>(0);

  const triggerToggle = () => {
    setTugCounter((prev) => prev + 1);
    playLampSwitchSound(!isLit);
    onToggle();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartYRef.current = e.clientY;
    maxPullRef.current = 0;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging || dragStartYRef.current === null) return;
    const pull = clampCordPull(e.clientY - dragStartYRef.current);
    if (pull > maxPullRef.current) {
      maxPullRef.current = pull;
    }
    setDragPullPx(pull);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const wasClick = maxPullRef.current <= 6;
    const shouldToggle = shouldToggleLampOnRelease(
      maxPullRef.current,
      wasClick,
    );

    dragStartYRef.current = null;
    maxPullRef.current = 0;
    setIsDragging(false);
    setDragPullPx(0);

    if (e.type !== "pointercancel" && shouldToggle) {
      triggerToggle();
    }
  };

  const pleats = Array.from({ length: PLEAT_COUNT }, (_, idx) => {
    const t0 = idx / PLEAT_COUNT;
    const t1 = (idx + 1) / PLEAT_COUNT;
    const topL = 112 + t0 * 116;
    const topR = 112 + t1 * 116;
    const botL = 78 + t0 * 184;
    const botR = 78 + t1 * 184;
    const centerFactor =
      1 - Math.abs(idx + 0.5 - PLEAT_COUNT / 2) / (PLEAT_COUNT / 2);
    return {
      id: idx,
      points: `${topL.toFixed(1)},74 ${topR.toFixed(1)},74 ${botR.toFixed(1)},196 ${botL.toFixed(1)},196`,
      ridgePath: `M ${((topL + topR) / 2).toFixed(1)},74 L ${((botL + botR) / 2).toFixed(1)},196`,
      groovePath: `M ${topR.toFixed(1)},74 L ${botR.toFixed(1)},196`,
      centerFactor,
    };
  });

  // Reserve beads (-36..0) slide smoothly out of the brass switch nozzle when pulled
  const beadPositions = Array.from(
    { length: 30 },
    (_, idx) => -35.8 + idx * 4.2,
  );

  const dustMotes = [
    { cx: 118, cy: 256, r: 1.3, opacity: 0.55 },
    { cx: 224, cy: 284, r: 1.5, opacity: 0.48 },
    { cx: 136, cy: 352, r: 1.1, opacity: 0.42 },
    { cx: 204, cy: 390, r: 1.4, opacity: 0.36 },
    { cx: 102, cy: 418, r: 1.1, opacity: 0.32 },
    { cx: 244, cy: 348, r: 1.2, opacity: 0.38 },
  ];

  return (
    <div
      data-testid="tripod-lamp"
      data-lit={isLit ? "true" : "false"}
      className="relative flex flex-col items-center justify-center select-none"
    >
      {/* Wide atmospheric volumetric light bloom behind & below lampshade */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-[11%] w-[500px] sm:w-[660px] h-[560px] sm:h-[660px] transition-opacity duration-700 ease-out ${
          isLit ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "conic-gradient(from 180deg at 50% 10%, rgba(148,224,255,0) 0deg, rgba(148,224,255,0) 134deg, rgba(124,84,235,0.22) 154deg, rgba(180,234,255,0.34) 180deg, rgba(124,84,235,0.22) 206deg, rgba(148,224,255,0) 226deg, rgba(148,224,255,0) 360deg)",
          filter: "blur(28px)",
        }}
      />

      {/* Soft ceiling spill above lampshade */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-[2%] w-[280px] h-[190px] rounded-full transition-all duration-700 ease-out ${
          isLit ? "opacity-90 scale-100" : "opacity-0 scale-75"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(162,226,255,0.26) 0%, rgba(124,58,237,0.16) 48%, rgba(0,0,0,0) 76%)",
          filter: "blur(24px)",
        }}
      />

      {/* Sculpted Realistic Tripod Floor Lamp SVG */}
      <div className="relative w-[148px] sm:w-[220px] lg:w-[354px] aspect-[340/530]">
        <svg
          viewBox="0 0 340 530"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            {/* Ground floor ambient illumination pool */}
            <radialGradient id="floorPoolLit" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#9EDFF8" stopOpacity="0.30" />
              <stop offset="42%" stopColor="#6D48C8" stopOpacity="0.18" />
              <stop offset="76%" stopColor="#2A1B56" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#07060F" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="floorPoolOff" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#161529" stopOpacity="0.44" />
              <stop offset="65%" stopColor="#07060E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#07060E" stopOpacity="0" />
            </radialGradient>

            {/* Grounded contact shadow under each foot */}
            <radialGradient id="footContactShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#030308" stopOpacity="0.92" />
              <stop offset="55%" stopColor="#05040C" stopOpacity="0.52" />
              <stop offset="100%" stopColor="#05040C" stopOpacity="0" />
            </radialGradient>

            {/* Volumetric downward light beams in moonlight-cyan & soft amethyst */}
            <linearGradient
              id="beamOuter"
              x1="170"
              y1="194"
              x2="170"
              y2="510"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#C4EDFF" stopOpacity="0.25" />
              <stop offset="38%" stopColor="#8B74F2" stopOpacity="0.13" />
              <stop offset="78%" stopColor="#4A2B8A" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#1E1342" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id="beamCore"
              x1="170"
              y1="192"
              x2="170"
              y2="415"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#F0FBFF" stopOpacity="0.33" />
              <stop offset="45%" stopColor="#A2DCFA" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#8F7AF6" stopOpacity="0" />
            </linearGradient>

            {/* Inner lampshade crisp moonlight-cyan bulb cavity */}
            <radialGradient id="shadeCavityLit" cx="50%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="38%" stopColor="#D2F3FF" />
              <stop offset="76%" stopColor="#899AE6" />
              <stop offset="100%" stopColor="#4C3B88" />
            </radialGradient>
            <radialGradient id="shadeCavityOff" cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#181629" />
              <stop offset="100%" stopColor="#090812" />
            </radialGradient>

            {/* Brushed satin platinum-silver cylindrical metal gradients */}
            <linearGradient
              id="brassMetalLit"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#262842" />
              <stop offset="22%" stopColor="#8492BE" />
              <stop offset="45%" stopColor="#EDF7FF" />
              <stop offset="64%" stopColor="#9FAAD6" />
              <stop offset="84%" stopColor="#52567E" />
              <stop offset="100%" stopColor="#1E2036" />
            </linearGradient>
            <linearGradient
              id="brassMetalOff"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#10101D" />
              <stop offset="32%" stopColor="#2C2E47" />
              <stop offset="52%" stopColor="#4B4F73" />
              <stop offset="78%" stopColor="#212238" />
              <stop offset="100%" stopColor="#0D0D18" />
            </linearGradient>

            {/* Smoked ebony / indigo-ash tapered tripod wood legs */}
            <linearGradient
              id="woodFrontLeftLit"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="12%"
            >
              <stop offset="0%" stopColor="#151526" />
              <stop offset="36%" stopColor="#35385A" />
              <stop offset="72%" stopColor="#6570A4" />
              <stop offset="92%" stopColor="#A9D5F2" />
              <stop offset="100%" stopColor="#4A5280" />
            </linearGradient>
            <linearGradient
              id="woodFrontRightLit"
              x1="100%"
              y1="0%"
              x2="0%"
              y2="12%"
            >
              <stop offset="0%" stopColor="#151526" />
              <stop offset="36%" stopColor="#35385A" />
              <stop offset="72%" stopColor="#6570A4" />
              <stop offset="92%" stopColor="#A9D5F2" />
              <stop offset="100%" stopColor="#4A5280" />
            </linearGradient>
            <linearGradient id="woodBackLit" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#141424" />
              <stop offset="48%" stopColor="#484B78" />
              <stop offset="100%" stopColor="#121222" />
            </linearGradient>

            <linearGradient id="woodFrontOff" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0F0F1C" />
              <stop offset="48%" stopColor="#292A42" />
              <stop offset="78%" stopColor="#1D1E32" />
              <stop offset="100%" stopColor="#0C0C17" />
            </linearGradient>
            <linearGradient id="woodBackOff" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0D0D18" />
              <stop offset="50%" stopColor="#23243A" />
              <stop offset="100%" stopColor="#0B0B15" />
            </linearGradient>

            {/* Machined satin-platinum ferrule caps on feet */}
            <linearGradient id="ferruleLit" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#303556" />
              <stop offset="34%" stopColor="#A0B5DE" />
              <stop offset="56%" stopColor="#F2FBFF" />
              <stop offset="82%" stopColor="#7584B5" />
              <stop offset="100%" stopColor="#252844" />
            </linearGradient>
            <linearGradient id="ferruleOff" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#171829" />
              <stop offset="48%" stopColor="#44486A" />
              <stop offset="100%" stopColor="#131424" />
            </linearGradient>

            {/* Moonlight-pearl & ice-lavender translucent silk lampshade */}
            <linearGradient
              id="shadeBaseLit"
              x1="170"
              y1="74"
              x2="170"
              y2="196"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#847CC2" />
              <stop offset="28%" stopColor="#C1C0F2" />
              <stop offset="68%" stopColor="#EBF7FF" />
              <stop offset="92%" stopColor="#CEE8FF" />
              <stop offset="100%" stopColor="#7C76BF" />
            </linearGradient>
            <linearGradient
              id="shadeBaseOff"
              x1="170"
              y1="74"
              x2="170"
              y2="196"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#282640" />
              <stop offset="50%" stopColor="#1D1B30" />
              <stop offset="100%" stopColor="#131222" />
            </linearGradient>

            {/* Internal radial bulb glow through the translucent silk fabric */}
            <radialGradient id="shadeInnerSubsurface" cx="50%" cy="64%" r="54%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.68" />
              <stop offset="45%" stopColor="#BCEEFF" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#7C5DF2" stopOpacity="0" />
            </radialGradient>

            {/* Soft 3D cylindrical falloff along edges of lampshade */}
            <linearGradient
              id="shadeEdgeWrap"
              x1="78"
              y1="135"
              x2="262"
              y2="135"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#16102E" stopOpacity="0.48" />
              <stop offset="18%" stopColor="#251B4A" stopOpacity="0.14" />
              <stop offset="50%" stopColor="#F5FCFF" stopOpacity="0" />
              <stop offset="82%" stopColor="#251B4A" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#16102E" stopOpacity="0.50" />
            </linearGradient>

            {/* Individual pleat 3D curvature shading */}
            <linearGradient id="pleatLitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B2F70" stopOpacity="0.30" />
              <stop offset="32%" stopColor="#F4FAFF" stopOpacity="0.36" />
              <stop offset="56%" stopColor="#D6F0FF" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#2F235E" stopOpacity="0.34" />
            </linearGradient>
            <linearGradient id="pleatOffGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#090814" stopOpacity="0.48" />
              <stop offset="36%" stopColor="#4F5178" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#080712" stopOpacity="0.50" />
            </linearGradient>

            <clipPath id="shadeRealisticClip">
              <path d="M112 74 C135 66.5, 205 66.5, 228 74 L262 196 C225 208, 115 208, 78 196 Z" />
            </clipPath>
          </defs>

          {/* Studio Floor Illumination Pool */}
          <ellipse
            cx="170"
            cy="490"
            rx="156"
            ry="28"
            fill={isLit ? "url(#floorPoolLit)" : "url(#floorPoolOff)"}
            className="transition-all duration-700"
          />

          {/* Three Grounded Contact Shadows Directly Under Each Brass Foot */}
          <ellipse
            cx={BACK_LEG.footCx}
            cy={BACK_LEG.footCy + 1}
            rx="14"
            ry="4.2"
            fill="url(#footContactShadow)"
          />
          <ellipse
            cx={LEFT_LEG.footCx}
            cy={LEFT_LEG.footCy + 1}
            rx="18"
            ry="5.2"
            fill="url(#footContactShadow)"
          />
          <ellipse
            cx={RIGHT_LEG.footCx}
            cy={RIGHT_LEG.footCy + 1}
            rx="18"
            ry="5.2"
            fill="url(#footContactShadow)"
          />

          {/* Dual-Layer Volumetric Downward Light Cone */}
          <g
            style={{
              opacity: isLit ? 1 : 0,
              transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <path
              d="M82 196 L258 196 L354 504 L-14 504 Z"
              fill="url(#beamOuter)"
            />
            <path
              d="M108 194 L232 194 L286 430 L54 430 Z"
              fill="url(#beamCore)"
            />
            {/* Subtle illuminated dust motes floating inside light cone */}
            {dustMotes.map((mote, i) => (
              <circle
                key={i}
                cx={mote.cx}
                cy={mote.cy}
                r={mote.r}
                fill="#E0F7FF"
                opacity={mote.opacity}
              />
            ))}
          </g>

          {/* === BACK TRIPOD LEG (Drawn behind hub & front legs for true 3D depth) === */}
          <g>
            <path
              d={BACK_LEG.woodPath}
              fill={isLit ? "url(#woodBackLit)" : "url(#woodBackOff)"}
            />
            {isLit && (
              <path
                d={BACK_LEG.innerHighlightPath}
                stroke="#B2DDF8"
                strokeWidth="0.9"
                strokeOpacity="0.34"
                strokeLinecap="round"
              />
            )}
            <path
              d={BACK_LEG.ferrulePath}
              fill={isLit ? "url(#ferruleLit)" : "url(#ferruleOff)"}
              opacity="0.92"
            />
            <path
              d={BACK_LEG.ferruleRingPath}
              stroke={isLit ? "#1B1C34" : "#0B0B16"}
              strokeWidth="1.2"
            />
            {/* Flat glider pad */}
            <ellipse
              cx={BACK_LEG.footCx}
              cy={BACK_LEG.footCy}
              rx="3.4"
              ry="1.5"
              fill={isLit ? "#1C1D30" : "#0E0E1A"}
            />
          </g>

          {/* === FRONT LEFT TAPERED WOOD + PLATINUM TRIPOD LEG === */}
          <g>
            <path
              d={LEFT_LEG.woodPath}
              fill={isLit ? "url(#woodFrontLeftLit)" : "url(#woodFrontOff)"}
            />
            {/* Cool inner-edge specular rim catching the bulb light */}
            <path
              d={LEFT_LEG.innerHighlightPath}
              stroke={isLit ? "#D6F2FF" : "#45486A"}
              strokeWidth={isLit ? "1.1" : "0.8"}
              strokeOpacity={isLit ? "0.52" : "0.35"}
              strokeLinecap="round"
            />
            {/* Machined satin-platinum ferrule sleeve */}
            <path
              d={LEFT_LEG.ferrulePath}
              fill={isLit ? "url(#ferruleLit)" : "url(#ferruleOff)"}
            />
            {/* Wood-to-metal collar seam */}
            <path
              d={LEFT_LEG.ferruleRingPath}
              stroke={isLit ? "#191B30" : "#0C0C18"}
              strokeWidth="1.35"
            />
            {/* Platinum specular highlight streak */}
            <path
              d={LEFT_LEG.ferruleHighlightPath}
              stroke={isLit ? "#F5FCFF" : "#656A91"}
              strokeWidth="1"
              strokeOpacity={isLit ? "0.72" : "0.35"}
              strokeLinecap="round"
            />
            {/* Grounded floor foot pad */}
            <ellipse
              cx={LEFT_LEG.footCx}
              cy={LEFT_LEG.footCy}
              rx="3.8"
              ry="1.7"
              fill={isLit ? "#181A2C" : "#0F0F1C"}
              stroke={isLit ? "#7B8EBE" : "#292C45"}
              strokeWidth="0.6"
            />
          </g>

          {/* === FRONT RIGHT TAPERED WOOD + PLATINUM TRIPOD LEG === */}
          <g>
            <path
              d={RIGHT_LEG.woodPath}
              fill={isLit ? "url(#woodFrontRightLit)" : "url(#woodFrontOff)"}
            />
            {/* Cool inner-edge specular rim catching the bulb light */}
            <path
              d={RIGHT_LEG.innerHighlightPath}
              stroke={isLit ? "#D6F2FF" : "#45486A"}
              strokeWidth={isLit ? "1.1" : "0.8"}
              strokeOpacity={isLit ? "0.52" : "0.35"}
              strokeLinecap="round"
            />
            {/* Machined satin-platinum ferrule sleeve */}
            <path
              d={RIGHT_LEG.ferrulePath}
              fill={isLit ? "url(#ferruleLit)" : "url(#ferruleOff)"}
            />
            {/* Wood-to-metal collar seam */}
            <path
              d={RIGHT_LEG.ferruleRingPath}
              stroke={isLit ? "#191B30" : "#0C0C18"}
              strokeWidth="1.35"
            />
            {/* Platinum specular highlight streak */}
            <path
              d={RIGHT_LEG.ferruleHighlightPath}
              stroke={isLit ? "#F5FCFF" : "#656A91"}
              strokeWidth="1"
              strokeOpacity={isLit ? "0.72" : "0.35"}
              strokeLinecap="round"
            />
            {/* Grounded floor foot pad */}
            <ellipse
              cx={RIGHT_LEG.footCx}
              cy={RIGHT_LEG.footCy}
              rx="3.8"
              ry="1.7"
              fill={isLit ? "#181A2C" : "#0F0F1C"}
              stroke={isLit ? "#7B8EBE" : "#292C45"}
              strokeWidth="0.6"
            />
          </g>

          {/* === MAIN VERTICAL BRUSHED BRASS STEM === */}
          <rect
            x="165"
            y="190"
            width="10"
            height="118"
            rx="3"
            fill={isLit ? "url(#brassMetalLit)" : "url(#brassMetalOff)"}
          />
          {/* Subtle upper socket collar right below shade */}
          <rect
            x="161"
            y="196"
            width="18"
            height="9"
            rx="3"
            fill={isLit ? "url(#brassMetalLit)" : "url(#brassMetalOff)"}
          />

          {/* === SCULPTED MACHINED BRASS TRIPOD YOKE / COLLAR === */}
          <g>
            {/* Upper turned brass flange */}
            <rect
              x="158"
              y="299"
              width="24"
              height="6"
              rx="3"
              fill={isLit ? "url(#brassMetalLit)" : "url(#brassMetalOff)"}
            />
            {/* Main fluted collar cylinder */}
            <rect
              x="154"
              y="305"
              width="32"
              height="24"
              rx="5"
              fill={isLit ? "url(#brassMetalLit)" : "url(#brassMetalOff)"}
            />
            {/* Center machined bevel grooves */}
            <line
              x1="154.5"
              y1="312"
              x2="185.5"
              y2="312"
              stroke={isLit ? "#262945" : "#0E0E1A"}
              strokeWidth="1.2"
            />
            <line
              x1="154.5"
              y1="313.3"
              x2="185.5"
              y2="313.3"
              stroke={isLit ? "#E2F5FF" : "#53577D"}
              strokeWidth="0.8"
              opacity="0.72"
            />
            <line
              x1="154.5"
              y1="322"
              x2="185.5"
              y2="322"
              stroke={isLit ? "#262945" : "#0E0E1A"}
              strokeWidth="1.2"
            />
            {/* Lower leg-socket yoke brackets seating the 3 legs cleanly */}
            <path
              d="M153 324 L187 324 L183 335 C178 337, 162 337, 157 335 Z"
              fill={isLit ? "url(#brassMetalLit)" : "url(#brassMetalOff)"}
            />
            {/* Tiny metallic rivets on the collar */}
            <circle
              cx="161"
              cy="317.5"
              r="1.3"
              fill={isLit ? "#E6F7FF" : "#4B4F73"}
              opacity="0.85"
            />
            <circle
              cx="170"
              cy="317.5"
              r="1.4"
              fill={isLit ? "#F4FCFF" : "#565B82"}
              opacity="0.92"
            />
            <circle
              cx="179"
              cy="317.5"
              r="1.3"
              fill={isLit ? "#9DB4DE" : "#383B59"}
              opacity="0.85"
            />
          </g>

          {/* === TOP PLATINUM FINIAL === */}
          <rect
            x="167.5"
            y="60"
            width="5"
            height="11"
            rx="2"
            fill={isLit ? "url(#brassMetalLit)" : "url(#brassMetalOff)"}
          />
          <circle
            cx="170"
            cy="56.5"
            r="4.2"
            fill={isLit ? "url(#ferruleLit)" : "url(#ferruleOff)"}
          />
          <circle
            cx="168.7"
            cy="55.2"
            r="1.2"
            fill={isLit ? "#F5FCFF" : "#61678E"}
            opacity="0.88"
          />

          {/* === LAMPSHADE UNDERSIDE CAVITY & VISIBLE BULB === */}
          <ellipse
            cx="170"
            cy="196"
            rx="92"
            ry="14.5"
            fill={isLit ? "url(#shadeCavityLit)" : "url(#shadeCavityOff)"}
            stroke={isLit ? "#C6E7FF" : "#292942"}
            strokeWidth="1.3"
          />
          {/* Subtle spider/harp ribs inside shade opening */}
          <path
            d="M126 196 L170 192 L214 196"
            stroke={isLit ? "#6874B2" : "#222136"}
            strokeWidth="1.2"
            opacity="0.65"
          />
          {/* Glowing daylight/moonlight bulb silhouette inside shade */}
          <ellipse
            cx="170"
            cy="190"
            rx="16"
            ry="8"
            fill={isLit ? "#F7FDFF" : "#1E1D33"}
            style={{
              opacity: isLit ? 0.96 : 0.45,
              filter: isLit ? "blur(3px)" : "none",
              transition: "opacity 450ms ease",
            }}
          />

          {/* === SCULPTURAL PLEATED SILK-LINEN LAMPSHADE === */}
          <g clipPath="url(#shadeRealisticClip)">
            {/* Base shade fabric */}
            <rect
              x="74"
              y="66"
              width="192"
              height="145"
              fill={isLit ? "url(#shadeBaseLit)" : "url(#shadeBaseOff)"}
            />

            {/* 20 3D-shaded silk fabric pleats */}
            {pleats.map((pleat) => (
              <g key={pleat.id}>
                <polygon
                  points={pleat.points}
                  fill={isLit ? "url(#pleatLitGrad)" : "url(#pleatOffGrad)"}
                  opacity={isLit ? 0.72 + pleat.centerFactor * 0.25 : 0.78}
                />
                {/* Crisp soft fabric ridge highlight */}
                <path
                  d={pleat.ridgePath}
                  stroke={isLit ? "#F4FCFF" : "#585A82"}
                  strokeWidth="0.9"
                  opacity={isLit ? 0.16 + pleat.centerFactor * 0.24 : 0.14}
                />
                {/* Deepened pleat crease */}
                <path
                  d={pleat.groovePath}
                  stroke={isLit ? "#3B2C70" : "#080712"}
                  strokeWidth="0.85"
                  opacity={isLit ? 0.22 : 0.44}
                />
              </g>
            ))}

            {/* Internal bulb subsurface glow radiating through fabric */}
            {isLit && (
              <rect
                x="74"
                y="66"
                width="192"
                height="145"
                fill="url(#shadeInnerSubsurface)"
              />
            )}

            {/* Cylindrical 3D edge falloff wrapping left & right sides of cone */}
            <rect
              x="74"
              y="66"
              width="192"
              height="145"
              fill="url(#shadeEdgeWrap)"
            />

            {/* Top and bottom piped fabric bias trim */}
            <path
              d="M110 77 C135 71, 205 71, 230 77"
              stroke={isLit ? "#E2F5FF" : "#3B3D5E"}
              strokeWidth="1.5"
              opacity="0.65"
            />
            <path
              d="M78 192 C115 203, 225 203, 262 192"
              stroke={isLit ? "#6F68B8" : "#26253D"}
              strokeWidth="2.4"
              opacity="0.85"
            />
            <path
              d="M78 190 C115 201, 225 201, 262 190"
              stroke={isLit ? "#E8F7FF" : "#46486E"}
              strokeWidth="0.9"
              opacity="0.58"
            />
          </g>

          {/* Subtle ambient rim contour around shade */}
          <path
            d="M112 74 C135 66.5, 205 66.5, 228 74 L262 196 C225 208, 115 208, 78 196 Z"
            stroke={isLit ? "rgba(208,240,255,0.40)" : "rgba(255,255,255,0.11)"}
            strokeWidth="1.1"
          />

          {/* Flared satin-platinum pull-chain switch nozzle tucked cleanly beneath shade underside rim */}
          <g>
            <path
              d="M198.4 202.2 L203.6 202.2 L204.5 207.2 C203.2 208.1, 198.8 208.1, 197.5 207.2 Z"
              fill={isLit ? "url(#ferruleLit)" : "url(#ferruleOff)"}
            />
            <ellipse
              cx="201"
              cy="207.4"
              rx="2.3"
              ry="0.85"
              fill={isLit ? "#1C1D34" : "#090912"}
            />
          </g>
        </svg>

        {/* Interactive Proportionally Scaled Beaded Brass Pull-Cord Assembly */}
        {/* Anchored 1:1 to lamp SVG nozzle at (201, 207.4) in 340x530 coordinate space */}
        <div
          className="absolute"
          style={{
            left: "59.12%",
            top: "39.13%",
            width: "9.41%",
            height: "24.53%",
          }}
        >
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={(event) => {
              if (event.detail === 0) triggerToggle();
            }}
            aria-label={
              isLit
                ? "Puxar corda para apagar a luz"
                : "Puxar corda para acender a luz"
            }
            aria-pressed={isLit}
            aria-controls="suppley-login-card"
            className="group relative w-full h-full -translate-x-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] rounded-2xl touch-none"
          >
            {/* Generous invisible hit area around delicate chain & finial */}
            <span
              aria-hidden="true"
              className="absolute -inset-x-4 -bottom-4 top-0"
            />

            {/* Top-edge nozzle clip so reserve beads pay out smoothly with zero detachment gap */}
            <div
              className="w-full h-full"
              style={{
                clipPath: "inset(0px -48px -72px -48px)",
              }}
            >
              {/* Sway + Tug wrapper */}
              <div
                key={tugCounter}
                className={`w-full h-full ${!isDragging && tugCounter > 0 ? "animate-cord-tug" : ""} ${
                  !isDragging && tugCounter === 0 ? "animate-cord-sway" : ""
                }`}
                style={{
                  transform: isDragging
                    ? `translateY(${dragPullPx}px)`
                    : undefined,
                  transition: isDragging
                    ? "none"
                    : "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <svg
                  viewBox="0 0 32 130"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full overflow-visible"
                  aria-hidden="true"
                >
                  <defs>
                    {/* Vertical lighting falloff along the fine platinum chain */}
                    <linearGradient
                      id="cordWireLit"
                      x1="16"
                      y1="0"
                      x2="16"
                      y2="86"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#F0FBFF" />
                      <stop offset="35%" stopColor="#A9C8EB" />
                      <stop offset="100%" stopColor="#5D6B9E" />
                    </linearGradient>
                    <linearGradient
                      id="cordWireOff"
                      x1="16"
                      y1="0"
                      x2="16"
                      y2="86"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#1F2138" />
                      <stop offset="55%" stopColor="#3B4166" />
                      <stop offset="100%" stopColor="#5A7EA6" />
                    </linearGradient>

                    {/* Individual 3D metallic ball-chain bead shading */}
                    <radialGradient id="beadLit" cx="35%" cy="32%" r="65%">
                      <stop offset="0%" stopColor="#F7FDFF" />
                      <stop offset="45%" stopColor="#A8C4E8" />
                      <stop offset="100%" stopColor="#3D4670" />
                    </radialGradient>
                    <radialGradient id="beadOff" cx="35%" cy="32%" r="65%">
                      <stop offset="0%" stopColor="#7286B2" />
                      <stop offset="52%" stopColor="#383E61" />
                      <stop offset="100%" stopColor="#141628" />
                    </radialGradient>

                    {/* Turned cylindrical-teardrop platinum finial matching stem & ferrules */}
                    <linearGradient
                      id="finialBrassLit"
                      x1="11.5"
                      y1="88"
                      x2="20.5"
                      y2="88"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#2A2F4F" />
                      <stop offset="28%" stopColor="#94AFDB" />
                      <stop offset="50%" stopColor="#F2FBFF" />
                      <stop offset="76%" stopColor="#7A8EC2" />
                      <stop offset="100%" stopColor="#232642" />
                    </linearGradient>
                    <linearGradient
                      id="finialBrassOff"
                      x1="11.5"
                      y1="88"
                      x2="20.5"
                      y2="88"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#1C2238" />
                      <stop offset="30%" stopColor="#4F799E" />
                      <stop offset="52%" stopColor="#9EE4F8" />
                      <stop offset="78%" stopColor="#526596" />
                      <stop offset="100%" stopColor="#181A30" />
                    </linearGradient>

                    {/* Delicate Suppley aqua-cyan & violet aura around pull finial when OFF */}
                    <radialGradient
                      id="fobBeaconGlow"
                      cx="50%"
                      cy="50%"
                      r="50%"
                    >
                      <stop
                        offset="0%"
                        stopColor="#67E8F9"
                        stopOpacity="0.34"
                      />
                      <stop
                        offset="46%"
                        stopColor="#7C3AED"
                        stopOpacity="0.16"
                      />
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Ultra-fine connecting chain wire */}
                  <line
                    x1="16"
                    y1="-38"
                    x2="16"
                    y2="87"
                    stroke={isLit ? "url(#cordWireLit)" : "url(#cordWireOff)"}
                    strokeWidth="0.72"
                    className="transition-opacity duration-300 group-hover:brightness-125"
                  />

                  {/* Tightly spaced, 3D-shaded fine ball-chain links */}
                  {beadPositions.map((cy) => (
                    <circle
                      key={cy}
                      cx="16"
                      cy={cy}
                      r="1.22"
                      fill={isLit ? "url(#beadLit)" : "url(#beadOff)"}
                      opacity={cy < 8 && !isLit ? 0.65 : 1}
                      className="transition-all duration-300 group-hover:brightness-125"
                    />
                  ))}

                  {/* Subtle breathing cyan-violet aura on pull weight when lamp is OFF */}
                  {!isLit && (
                    <circle
                      cx="16"
                      cy="99"
                      r="19"
                      fill="url(#fobBeaconGlow)"
                      className="animate-fob-beacon"
                      style={{ transformOrigin: "16px 99px" }}
                    />
                  )}

                  {/* Sleek Lathe-Turned Platinum Finial Pull Weight */}
                  <g className="transition-transform duration-150 group-hover:brightness-110">
                    {/* Top coupler sleeve */}
                    <rect
                      x="14.2"
                      y="86.2"
                      width="3.6"
                      height="3.4"
                      rx="1.2"
                      fill={
                        isLit ? "url(#finialBrassLit)" : "url(#finialBrassOff)"
                      }
                    />
                    {/* Turned spindle / teardrop weight */}
                    <path
                      d="M14 89.6 C12.4 94.4, 12.2 102.2, 13.7 107 C14.3 108.9, 17.7 108.9, 18.3 107 C19.8 102.2, 19.6 94.4, 18 89.6 Z"
                      fill={
                        isLit ? "url(#finialBrassLit)" : "url(#finialBrassOff)"
                      }
                      stroke={
                        isLit
                          ? "rgba(226,248,255,0.48)"
                          : "rgba(136,222,250,0.32)"
                      }
                      strokeWidth="0.45"
                    />
                    {/* Machined bevel groove echoing the tripod collar */}
                    <line
                      x1="13.2"
                      y1="94.8"
                      x2="18.8"
                      y2="94.8"
                      stroke={isLit ? "#262B4A" : "#15182C"}
                      strokeWidth="0.7"
                    />
                    <line
                      x1="13.2"
                      y1="95.5"
                      x2="18.8"
                      y2="95.5"
                      stroke={isLit ? "#E2F6FF" : "#96DFF6"}
                      strokeWidth="0.45"
                      opacity="0.68"
                    />
                    {/* Fine specular highlight streak */}
                    <line
                      x1="14.7"
                      y1="91.5"
                      x2="14.9"
                      y2="105.5"
                      stroke="#F4FCFF"
                      strokeWidth="0.65"
                      strokeOpacity={isLit ? "0.68" : "0.38"}
                      strokeLinecap="round"
                    />
                    {/* Matching lower tip finial bead */}
                    <circle
                      cx="16"
                      cy="109.8"
                      r="1.45"
                      fill={isLit ? "url(#beadLit)" : "url(#finialBrassOff)"}
                    />
                  </g>
                </svg>
              </div>
            </div>
          </button>

          {/* Subtle contextual instruction aligned directly with the pull finial */}
          <div
            className="pointer-events-none absolute left-[42%] top-[76%] -translate-y-1/2 whitespace-nowrap hidden lg:flex items-center gap-2 transition-all duration-500"
            aria-hidden="true"
          >
            <span
              className={`block h-[1px] transition-all duration-500 ${
                isLit ? "w-4 bg-white/24" : "w-5 bg-[#38BDF8]/55"
              }`}
            />
            <span
              className={`text-[10px] font-medium tracking-[0.13em] uppercase transition-colors duration-500 ${
                isLit ? "text-white/44" : "text-[#9CE8FB]/88"
              }`}
            >
              {isLit ? "Puxe para apagar" : "Puxe a corda para acender"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
