/**
 * Unified Motion Physics & Tokens — SUPPLEY / Excambia
 *
 * All transitions across the landing page, login showcase, and interactive
 * demos share this single physical language.
 */

export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;
export const EASE_SILK = [0.16, 1, 0.3, 1] as const;
export const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;

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
  amount: 0.2,
} as const;
