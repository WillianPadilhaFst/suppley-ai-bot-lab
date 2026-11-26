import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  MotionConfig,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";

export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;
export const EASE_SILK = [0.16, 1, 0.3, 1] as const;

export const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 400,
  damping: 32,
  mass: 0.8,
};

export const SPRING_MAGNETIC = {
  type: "spring" as const,
  stiffness: 260,
  damping: 20,
  mass: 0.5,
};

export const SPRING_GENTLE = {
  type: "spring" as const,
  stiffness: 180,
  damping: 26,
  mass: 1,
};

export const VIEWPORT_ONCE = {
  once: true,
  amount: 0.18,
} as const;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

interface MaskLineRevealProps {
  lines: string[];
  className?: string;
  lineClassName?: string;
  accentLineIndex?: number;
  accentClassName?: string;
  delay?: number;
  stagger?: number;
  immediate?: boolean;
}

export function MaskLineReveal({
  lines,
  className = "",
  lineClassName = "",
  accentLineIndex,
  accentClassName = "",
  delay = 0.06,
  stagger = 0.085,
  immediate = true,
}: MaskLineRevealProps) {
  const prefersReduced = useReducedMotion();

  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
          <motion.span
            className={`block ${lineClassName} ${
              accentLineIndex === i ? accentClassName : ""
            }`}
            initial={prefersReduced ? { opacity: 0 } : { y: "108%", opacity: 0 }}
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
  y = 20,
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
  className = "",
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
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: prefersReduced ? 0 : 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: EASE_EDITORIAL },
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
  spotlightColor = "rgba(104, 42, 186, 0.09)",
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

  const background = useMotionTemplate`radial-gradient(340px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 75%)`;

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

interface MagneticButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref"> {
  strength?: number;
}

export function MagneticButton({
  children,
  className = "",
  strength = 0.16,
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
      whileTap={prefersReduced ? undefined : { scale: 0.97 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
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
  const motionVal = useMotionValue(prefersReduced ? value : 0);
  const springVal = useSpring(motionVal, { stiffness: 80, damping: 22, mass: 0.9 });
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
      className={`fixed top-0 left-0 right-0 z-50 h-[2.5px] origin-left ${className}`}
    />
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

  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [28, 0]);

  return (
    <div ref={ref} className={className}>
      <motion.div
        style={prefersReduced ? undefined : { scale, y }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </div>
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
