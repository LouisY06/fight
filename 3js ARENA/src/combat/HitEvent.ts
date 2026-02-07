// =============================================================================
// HitEvent.ts — Shared hit event bus
// MeleeCombat fires hit events with position. Hitbox visuals subscribe.
// =============================================================================

import type * as THREE from 'three';

export interface HitEventData {
  /** World position of the hit impact */
  point: THREE.Vector3;
  /** Damage dealt */
  amount: number;
}

type HitCallback = (data: HitEventData) => void;
const listeners = new Set<HitCallback>();

/** Subscribe to hit events. Returns unsubscribe function. */
export function onHitEvent(cb: HitCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Fire a hit event (called by MeleeCombat). */
export function fireHitEvent(data: HitEventData): void {
  for (const cb of listeners) cb(data);
}
