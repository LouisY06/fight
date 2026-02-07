// =============================================================================
// SwordState.ts — Shared world-space sword positions for collision detection
// Both ViewmodelSword (keyboard) and MechaArms (CV) write here every frame.
// MeleeCombat reads hilt/tip every frame to check for contact with opponents.
// =============================================================================

import * as THREE from 'three';

/** World-space sword endpoints, updated every frame. */
export const swordHilt = new THREE.Vector3();
export const swordTip = new THREE.Vector3();

/** Speed of the sword tip in world units/second (for hit gating). */
export let swordSpeed = 0;

/** Whether a keyboard swing animation is currently active. */
export let keyboardSwingActive = false;
export function setKeyboardSwingActive(v: boolean): void {
  keyboardSwingActive = v;
}

// Internals
const _localTip = new THREE.Vector3();
const _prevTip = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
let _hasPrev = false;
let _prevTime = 0;

/** Sword blade length in local space (group origin to blade tip, post-scale). */
export const BLADE_LENGTH = 0.56;

/**
 * Call from MechaArms or ViewmodelSword each frame to publish
 * the sword's world-space line segment (hilt → tip) and speed.
 */
export function updateSwordTransform(group: THREE.Object3D): void {
  // Hilt = group world position
  group.getWorldPosition(swordHilt);

  // Tip = hilt + local +Y (blade direction) transformed to world
  _localTip.set(0, BLADE_LENGTH, 0);
  group.getWorldQuaternion(_tmpQuat);
  _localTip.applyQuaternion(_tmpQuat);
  swordTip.copy(swordHilt).add(_localTip);

  // Compute sword tip speed
  const now = performance.now() / 1000;
  if (_hasPrev) {
    const dt = now - _prevTime;
    if (dt > 0 && dt < 0.2) {
      swordSpeed = _prevTip.distanceTo(swordTip) / dt;
    }
  }
  _prevTip.copy(swordTip);
  _prevTime = now;
  _hasPrev = true;
}
