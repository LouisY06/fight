// =============================================================================
// ClashEvent.ts — Sword clash (stun) event bus
// Fired when both player and opponent swords collide while swinging.
// Both fighters are briefly stunned (cannot swing).
// =============================================================================

import * as THREE from 'three';

export interface ClashEventData {
  /** World position of the clash impact (midpoint between swords) */
  point: THREE.Vector3;
}

type ClashCallback = (data: ClashEventData) => void;
const listeners = new Set<ClashCallback>();

/** Subscribe to clash events. Returns unsubscribe function. */
export function onClashEvent(cb: ClashCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Fire a clash event (called by MeleeCombat when swords collide). */
export function fireClashEvent(data: ClashEventData): void {
  for (const cb of listeners) cb(data);
}

// =============================================================================
// Stun state — shared mutable so both ViewmodelSword and BotOpponent can read
// =============================================================================

/** Duration of stun in milliseconds */
export const STUN_DURATION_MS = 1000;

/** Timestamp when stun started (0 = not stunned) */
let _stunStartTime = 0;

/** Whether the player is currently stunned from a sword clash */
export function isPlayerStunned(): boolean {
  if (_stunStartTime === 0) return false;
  if (Date.now() - _stunStartTime > STUN_DURATION_MS) {
    _stunStartTime = 0;
    return false;
  }
  return true;
}

/** Apply stun to the player */
export function applyPlayerStun(): void {
  _stunStartTime = Date.now();
}

/** Reset stun (e.g. on round reset) */
export function resetStun(): void {
  _stunStartTime = 0;
}
