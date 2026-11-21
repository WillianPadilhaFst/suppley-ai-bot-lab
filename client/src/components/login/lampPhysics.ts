export const MAX_CORD_PULL_PX = 46;
export const PULL_TOGGLE_THRESHOLD_PX = 16;

/**
 * Clamps vertical cord pull distance to a natural tactile stretch range.
 */
export function clampCordPull(deltaY: number): number {
  if (!Number.isFinite(deltaY) || deltaY <= 0) return 0;
  return Math.min(MAX_CORD_PULL_PX, Math.round(deltaY));
}

/**
 * Determines whether releasing a cord interaction should toggle the lamp.
 * Both a deliberate click (<= 6px movement) and a downward drag (>= 16px) toggle the light.
 */
export function shouldToggleLampOnRelease(
  maxPullPx: number,
  wasClickGesture: boolean,
): boolean {
  if (wasClickGesture) return true;
  return maxPullPx >= PULL_TOGGLE_THRESHOLD_PX;
}

/**
 * Plays a subtle mechanical pull-chain switch click using Web Audio API.
 * Safe no-op in headless or unsupported environments.
 */
export function playLampSwitchSound(turningOn: boolean): void {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(turningOn ? 620 : 440, now);
    osc.frequency.exponentialRampToValueAtTime(
      turningOn ? 180 : 120,
      now + 0.045,
    );

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);

    window.setTimeout(() => {
      void ctx.close();
    }, 150);
  } catch {
    // Ignore audio context autoplay restrictions silently
  }
}
