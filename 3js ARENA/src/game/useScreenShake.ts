// =============================================================================
// useScreenShake.ts — Screen shake store for impact feedback
// =============================================================================

import { create } from 'zustand';

interface ScreenShakeState {
  intensity: number;
  durationMs: number;
  startTime: number | null;
  trigger: (intensity?: number, durationMs?: number) => void;
}

export const useScreenShakeStore = create<ScreenShakeState>((set) => ({
  intensity: 0,
  durationMs: 0,
  startTime: null,

  trigger: (intensity = 0.4, durationMs = 150) => {
    set({ intensity, durationMs, startTime: Date.now() });
  },
}));

/** Deterministic shake offset from elapsed time (call per frame) */
export function computeShakeOffset(
  startTime: number | null,
  durationMs: number,
  intensity: number
): { x: number; y: number } {
  if (!startTime || intensity <= 0) return { x: 0, y: 0 };
  const elapsed = (Date.now() - startTime) / 1000;
  if (elapsed * 1000 >= durationMs) return { x: 0, y: 0 };
  const progress = elapsed / (durationMs / 1000);
  const decay = 1 - progress * progress;
  const amount = intensity * decay * 0.12;
  const t = elapsed * 50;
  return {
    x: (Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1) * 0.5) * amount,
    y: (Math.sin(t * 5.7) * 0.5 + Math.sin(t * 11.2) * 0.5) * amount,
  };
}
