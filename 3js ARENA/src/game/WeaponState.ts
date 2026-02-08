// =============================================================================
// WeaponState.ts — Zustand store for weapon selection (1=sword, 2=gun)
// =============================================================================

import { create } from 'zustand';

export type ActiveWeapon = 'sword' | 'gun';

/** How long (ms) a manual weapon pick blocks CV auto-switching. */
const MANUAL_OVERRIDE_MS = 8000;

interface WeaponState {
  activeWeapon: ActiveWeapon;
  /** Timestamp until which CV auto-switching is suppressed (manual pick). */
  manualOverrideUntil: number;
  setActiveWeapon: (weapon: ActiveWeapon, manual?: boolean) => void;
}

export const useWeaponStore = create<WeaponState>((set) => ({
  activeWeapon: 'sword', // default weapon
  manualOverrideUntil: 0,
  setActiveWeapon: (weapon, manual = false) =>
    set({
      activeWeapon: weapon,
      ...(manual ? { manualOverrideUntil: Date.now() + MANUAL_OVERRIDE_MS } : {}),
    }),
}));

/** Returns true when CV auto-switching should be blocked (user picked manually). */
export function isManualOverrideActive(): boolean {
  return Date.now() < useWeaponStore.getState().manualOverrideUntil;
}

/**
 * Module-level keyboard listener for weapon switching.
 * Registered at module scope (like DebugState.ts) so that after Vite HMR
 * re-evaluates the module, the listener always references the CURRENT store.
 * The old listener (from the previous module instance) harmlessly calls
 * setActiveWeapon on a stale store that nothing reads.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (e.key) {
      case '1':
        useWeaponStore.getState().setActiveWeapon('sword', true);
        break;
      case '2':
        useWeaponStore.getState().setActiveWeapon('gun', true);
        break;
    }
  });
}

// =============================================================================
// Gun aiming configuration — KrunkerStyle delta-based camera steering
// Ported from leaning_control_system.py KrunkerStyleMouseController
// =============================================================================

export const GUN_AIM_CONFIG = {
  /** Angular delta multiplier. Higher = twitchier, lower = sluggish.
   *  Cranked from 2.5 → 10.0 so physical gun movement produces meaningful
   *  camera rotation. At 320x240 resolution, a 1cm wrist flick produces
   *  ~0.02 normalized delta → 0.02 * 10 = 0.2 rad ≈ 11° of camera turn. */
  sensitivity: 10.0,
  /** Minimum normalized delta magnitude to register (filters hand tremor).
   *  Shrunk from 0.004 → 0.001 so real movements aren't filtered away.
   *  Higher resolution (320x240) means sub-pixel noise is already lower. */
  deadZone: 0.001,
  /** Fraction of accumulated delta drained per 120Hz tick.
   *  Actual drain is frame-rate-independent: alpha = 1 - (1 - speed)^(dt * 120).
   *  Boosted from 0.15 → 0.5 for snappier, less-laggy camera response.
   *  At 60fps: ~93% of delta is drained per frame (vs old ~30%). */
  interpolationSpeed: 0.5,
  /** Flip horizontal axis for natural aiming.
   *
   *  Raw webcam pixel data (getImageData) is UNMIRRORED:
   *    physical-right → image-left → deltaX < 0
   *
   *  With invertX=false: gun-right → camera turns LEFT  (inverted feel)
   *  With invertX=true:  gun-right → camera turns RIGHT (natural feel)
   *
   *  Set to true for "point to aim" natural mapping.
   *  Set to false if a CSS mirror (scaleX(-1)) is applied to the video feed
   *  or if the webcam driver already mirrors. */
  invertX: true,
};
