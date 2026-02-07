// =============================================================================
// SwingEvent.ts — Shared sword-swing event bus
// Both ViewmodelSword (keyboard) and MechaArms (CV) fire swings through this.
// MeleeCombat subscribes to detect hits.
// =============================================================================

type SwingCallback = () => void;
const listeners = new Set<SwingCallback>();

/** Subscribe to sword swing events. Returns unsubscribe function. */
export function onSwordSwing(cb: SwingCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Fire a swing event (called by ViewmodelSword or MechaArms). */
export function fireSwing(): void {
  for (const cb of listeners) cb();
}
