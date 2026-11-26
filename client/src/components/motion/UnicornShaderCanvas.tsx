/**
 * UnicornShaderCanvas — WebGL2 Interactive Aurora & Suppley Purple Shader
 *
 * Implementação WebGL2 pura (zero dependências externas além de React + Framer Motion)
 * para manter total paridade de lockfile com a baseline de produção:
 * - Presets: "Suppley Aurora" | "Suppley Purple" | "Editorial Light"
 * - Reativo ao ponteiro (mouse/touch), com `IntersectionObserver` quando `lazyLoad=true`
 * - Respeita `prefers-reduced-motion` automaticamente e faz fallback gracioso em CSS
 */
import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export type UnicornShaderPreset =
  | "Suppley Aurora"
  | "Suppley Purple"
  | "Editorial Light";

export interface UnicornShaderCanvasProps {
  projectId?: string;
  jsonFilePath?: string;
  variant?: "aurora" | "dark" | "light";
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
}

const VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_bg;
uniform vec3 u_colA;
uniform vec3 u_colB;
uniform float u_intensity;
uniform float u_distortion;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.02 + 0.13;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);

  float distMouse = length(p - m);
  float cursorPull = exp(-distMouse * 2.6) * 0.35;

  float t = u_time * 0.28;
  vec2 q = vec2(
    fbm(p * (1.8 + u_distortion * 0.6) + vec2(t, -t * 0.6)),
    fbm(p * (1.8 + u_distortion * 0.6) + vec2(-t * 0.5, t * 0.8) + 3.1)
  );
  float flow = fbm(p * 2.2 + q * (1.4 + u_distortion) + m * 0.28);

  float ribbonA = smoothstep(0.18, 0.88, flow + cursorPull * 0.65 - p.y * 0.22);
  float ribbonB = smoothstep(0.28, 0.92, fbm(p * 2.7 - q * 1.15 - t * 0.4) + cursorPull);

  vec3 col = u_bg;
  col = mix(col, u_colA, ribbonA * 0.62 * u_intensity);
  col = mix(col, u_colB, ribbonB * 0.44 * u_intensity);

  float grain = (hash(uv * u_res + fract(u_time)) - 0.5) * 0.018;
  outColor = vec4(clamp(col + grain, 0.0, 1.0), 1.0);
}`;

function hexToRgbNorm(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

export function UnicornShaderCanvas({
  variant = "aurora",
  preset,
  intensity = 1.0,
  distortion = 0.75,
  speed = 0.7,
  scale = 0.75,
  dpi = 1,
  fpsCap = 60,
  colorA,
  colorB,
  bgColor,
  lazyLoad = false,
  className = "",
}: UnicornShaderCanvasProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(!lazyLoad);
  const [webglReady, setWebglReady] = useState(false);

  const resolvedPreset: UnicornShaderPreset =
    preset ??
    (variant === "light"
      ? "Editorial Light"
      : variant === "dark"
        ? "Suppley Purple"
        : "Suppley Aurora");

  const defaults =
    resolvedPreset === "Editorial Light"
      ? { bg: "#FAF9F6", a: "#B28CFF", b: "#60EBD2" }
      : resolvedPreset === "Suppley Purple"
        ? { bg: "#180834", a: "#682ABA", b: "#28E7C5" }
        : { bg: "#080512", a: "#682ABA", b: "#28E7C5" };

  useEffect(() => {
    if (!lazyLoad || visible) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [lazyLoad, visible]);

  useEffect(() => {
    if (!visible || prefersReduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, "a_pos");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const uBg = gl.getUniformLocation(prog, "u_bg");
    const uColA = gl.getUniformLocation(prog, "u_colA");
    const uColB = gl.getUniformLocation(prog, "u_colB");
    const uIntensity = gl.getUniformLocation(prog, "u_intensity");
    const uDistortion = gl.getUniformLocation(prog, "u_distortion");

    const rgbBg = hexToRgbNorm(bgColor || defaults.bg);
    const rgbA = hexToRgbNorm(colorA || defaults.a);
    const rgbB = hexToRgbNorm(colorB || defaults.b);

    let mouseX = 0.65;
    let mouseY = 0.35;
    let curX = 0.65;
    let curY = 0.35;

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouseX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      mouseY =
        1 - Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5) * dpi * scale;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    setWebglReady(true);

    let rafId = 0;
    const start = performance.now();
    const minFrameMs = 1000 / Math.max(15, fpsCap);
    let lastDraw = 0;

    const render = (now: number) => {
      rafId = window.requestAnimationFrame(render);
      if (now - lastDraw < minFrameMs) return;
      lastDraw = now;

      curX += (mouseX - curX) * 0.06;
      curY += (mouseY - curY) * 0.06;

      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(uTime, ((now - start) / 1000) * speed);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, curX, curY);
      gl.uniform3f(uBg, rgbBg[0], rgbBg[1], rgbBg[2]);
      gl.uniform3f(uColA, rgbA[0], rgbA[1], rgbA[2]);
      gl.uniform3f(uColB, rgbB[0], rgbB[1], rgbB[2]);
      gl.uniform1f(uIntensity, intensity);
      gl.uniform1f(uDistortion, distortion);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [
    visible,
    prefersReduced,
    bgColor,
    colorA,
    colorB,
    defaults.bg,
    defaults.a,
    defaults.b,
    intensity,
    distortion,
    speed,
    scale,
    dpi,
    fpsCap,
  ]);

  const fallbackGradient =
    variant === "light"
      ? "radial-gradient(70% 60% at 75% 25%, rgba(178,140,255,0.42) 0%, transparent 65%), radial-gradient(65% 55% at 20% 75%, rgba(96,235,210,0.42) 0%, transparent 65%), #FAF9F6"
      : variant === "dark"
        ? "radial-gradient(80% 70% at 72% 24%, rgba(40,231,197,0.28) 0%, rgba(147,51,234,0.52) 48%, #180834 100%)"
        : "radial-gradient(75% 65% at 72% 28%, rgba(124,58,237,0.45) 0%, transparent 62%), radial-gradient(65% 60% at 24% 76%, rgba(40,231,197,0.34) 0%, transparent 60%), #080512";

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ background: fallbackGradient }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`h-full w-full block transition-opacity duration-500 ${
          webglReady && !prefersReduced ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default UnicornShaderCanvas;
