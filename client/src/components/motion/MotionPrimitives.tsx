/**
 * MotionPrimitives — Flagship Framer Motion Primitives for SUPPLEY & Excambia
 *
 * Includes:
 * - MotionProvider (<MotionConfig reducedMotion="user">)
 * - MaskLineReveal (editorial headline line-by-line mask reveal)
 * - Reveal & StaggerGroup / StaggerItem
 * - SpotlightCard (zero-rerender cursor-tracking radial lighting)
 * - TiltSpotlightCard (3D spring perspective tilt + cursor spotlight + specular glare)
 * - MagneticButton (spring-pulled tactile button with hover sheen sweep)
 * - ScrollScaleFrame (scroll-linked showcase elevation)
 * - VelocityMarquee (scroll-velocity-accelerated infinite trade ticker)
 * - AnimatedNumber & LiveSpringNumber (spring-interpolated tabular readouts)
 * - ScrollProgressBar & useScrolled
 */
import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  MotionConfig,
  useAnimationFrame,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type HTMLMotionProps,
} from "framer-motion";
import {
  EASE_EDITORIAL,
  EASE_SILK,
  SPRING_MAGNETIC,
  VIEWPORT_ONCE,
} from "@/lib/motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

interface MaskLineRevealProps {
  lines: React.ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  immediate?: boolean;
}

export function MaskLineReveal({
  lines,
  className = "",
  lineClassName = "",
  delay = 0.06,
  stagger = 0.08,
  immediate = true,
}: MaskLineRevealProps) {
  const prefersReduced = useReducedMotion();

  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span
          key={i}
          className="block overflow-hidden pb-[0.12em] -mb-[0.12em]"
        >
          <motion.span
            className={`block ${lineClassName}`}
            initial={prefersReduced ? { opacity: 0 } : { y: "110%", opacity: 0 }}
            animate={immediate ? { y: "0%", opacity: 1 } : undefined}
            whileInView={!immediate ? { y: "0%", opacity: 1 } : undefined}
            viewport={!immediate ? VIEWPORT_ONCE : undefined}
            transition={{
              duration: 0.72,
              delay: delay + i * stagger,
              ease: EASE_SILK,
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
  y?: number;
  duration?: number;
  immediate?: boolean;
}

export function Reveal({
  children,
  delay = 0,
  y = 22,
  duration = 0.62,
  immediate = false,
  ...props
}: RevealProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReduced ? 0 : y }}
      animate={immediate ? { opacity: 1, y: 0 } : undefined}
      whileInView={!immediate ? { opacity: 1, y: 0 } : undefined}
      viewport={!immediate ? VIEWPORT_ONCE : undefined}
      transition={{ duration, delay, ease: EASE_EDITORIAL }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({
  children,
  className,
  stagger = 0.075,
  delayChildren = 0.04,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: prefersReduced ? 0 : 22, scale: 0.98 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.56, ease: EASE_EDITORIAL },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(40, 231, 197, 0.14)",
}: SpotlightCardProps) {
  const prefersReduced = useReducedMotion();
  const mouseX = useMotionValue(-400);
  const mouseY = useMotionValue(-400);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  function handleMouseLeave() {
    mouseX.set(-400);
    mouseY.set(-400);
  }

  const background = useMotionTemplate`radial-gradient(380px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 75%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative overflow-hidden ${className}`}
    >
      {!prefersReduced && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100 hidden [@media(hover:hover)_and_(pointer:fine)]:block"
          style={{ background }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

interface TiltSpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  spotlightColor?: string;
  maxTilt?: number;
}

export function TiltSpotlightCard({
  children,
  className = "",
  wrapperClassName = "",
  spotlightColor = "rgba(40, 231, 197, 0.18)",
  maxTilt = 7,
}: TiltSpotlightCardProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-400);
  const mouseY = useMotionValue(-400);
  const rotXRaw = useMotionValue(0);
  const rotYRaw = useMotionValue(0);

  const rotateX = useSpring(rotXRaw, { stiffness: 260, damping: 24, mass: 0.6 });
  const rotateY = useSpring(rotYRaw, { stiffness: 260, damping: 24, mass: 0.6 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReduced || !ref.current) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    mouseX.set(px);
    mouseY.set(py);
    const nx = (px / rect.width - 0.5) * 2;
    const ny = (py / rect.height - 0.5) * 2;
    rotXRaw.set(-ny * maxTilt);
    rotYRaw.set(nx * maxTilt);
  }

  function handleMouseLeave() {
    mouseX.set(-400);
    mouseY.set(-400);
    rotXRaw.set(0);
    rotYRaw.set(0);
  }

  const background = useMotionTemplate`radial-gradient(420px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 72%)`;

  return (
    <div style={{ perspective: 1100 }} className={wrapperClassName}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          prefersReduced
            ? undefined
            : { rotateX, rotateY, transformStyle: "preserve-3d" }
        }
        className={`group relative overflow-hidden will-change-transform ${className}`}
      >
        {!prefersReduced && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100 hidden [@media(hover:hover)_and_(pointer:fine)]:block"
            style={{ background }}
          />
        )}
        <div className="relative z-10 h-full">{children}</div>
      </motion.div>
    </div>
  );
}

interface MagneticButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  strength?: number;
  sheen?: boolean;
}

export function MagneticButton({
  children,
  className = "",
  strength = 0.22,
  sheen = true,
  ...props
}: MagneticButtonProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING_MAGNETIC);
  const springY = useSpring(y, SPRING_MAGNETIC);

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (prefersReduced || !ref.current) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      ref={ref}
      style={prefersReduced ? undefined : { x: springX, y: springY }}
      whileHover={prefersReduced ? undefined : { scale: 1.02 }}
      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative overflow-hidden ${className}`}
      {...(props as HTMLMotionProps<"button">)}
    >
      {sheen && !prefersReduced && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[135%]"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

export function ScrollScaleFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [28, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.45], [0.7, 1]);

  return (
    <div ref={ref} className={className}>
      <motion.div
        style={prefersReduced ? undefined : { scale, y, opacity }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

export function VelocityMarquee({
  items,
  baseSpeed = 48,
  className = "",
}: {
  items: React.ReactNode[];
  baseSpeed?: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 350,
  });
  const x = useMotionValue(0);
  const pausedRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useAnimationFrame((_, delta) => {
    if (prefersReduced || pausedRef.current || !trackRef.current) return;
    const halfWidth = trackRef.current.scrollWidth / 2;
    if (halfWidth <= 0) return;

    const velBoost = Math.min(4.5, Math.abs(smoothVelocity.get()) / 450);
    const moveBy = (baseSpeed * (1 + velBoost) * Math.min(delta, 40)) / 1000;
    let next = x.get() - moveBy;
    if (next <= -halfWidth) next += halfWidth;
    x.set(next);
  });

  return (
    <div
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      className={`overflow-hidden ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
      }}
    >
      <motion.div
        ref={trackRef}
        style={prefersReduced ? undefined : { x }}
        className="flex w-max items-center gap-6 will-change-transform"
      >
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center gap-6">
            {items.map((item, idx) => (
              <div key={`${dup}-${idx}`} className="shrink-0">
                {item}
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 75, damping: 22, mass: 1 });
  const [display, setDisplay] = useState(prefersReduced ? value : 0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    if (inView) motionVal.set(value);
  }, [inView, value, prefersReduced, motionVal]);

  useEffect(() => {
    if (prefersReduced) return;
    return springVal.on("change", (latest) => setDisplay(latest));
  }, [springVal, prefersReduced]);

  const formatted = display.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/** Continuously spring-interpolated readout for interactive sliders & calculators */
export function LiveSpringNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const motionVal = useMotionValue(value);
  const springVal = useSpring(motionVal, { stiffness: 140, damping: 24, mass: 0.7 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    motionVal.set(value);
  }, [value, prefersReduced, motionVal]);

  useEffect(() => {
    if (prefersReduced) return;
    return springVal.on("change", (latest) => setDisplay(latest));
  }, [springVal, prefersReduced]);

  const formatted = display.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export function ScrollProgressBar({ className = "" }: { className?: string }) {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  if (prefersReduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className={`fixed top-0 left-0 right-0 z-50 h-[3px] origin-left ${className}`}
    />
  );
}

export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
