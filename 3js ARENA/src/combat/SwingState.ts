// =============================================================================
// SwingState.ts — Global sword swing state for cross-component effects
// ViewmodelSword/MechaArms write swing progress; ArenaEffects reads it for
// bloom spikes, SwordModel reads it for emissive glow.
// =============================================================================

/** Normalised swing progress: 0 = idle, 0→1 during swing, resets to 0 after. */
let _swingProgress = 0;
/** Whether the sword is currently mid-swing (any mode). */
let _isSwinging = false;

export function setSwingProgress(progress: number): void {
  _swingProgress = progress;
  _isSwinging = progress > 0 && progress < 1;
}

export function getSwingProgress(): number {
  return _swingProgress;
}

export function isGlobalSwingActive(): boolean {
  return _isSwinging;
}
