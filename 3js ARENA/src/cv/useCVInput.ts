// =============================================================================
// cv/useCVInput.ts — Placeholder hook: returns keyboard/mouse input for now
// =============================================================================

import * as THREE from 'three';
import type { CVInputData } from './types';

/**
 * PLACEHOLDER — returns keyboard/mouse controls mapped to the CVInputData interface.
 * When MediaPipe is integrated, replace the internals of this hook.
 *
 * Returns: { weaponPosition, weaponRotation, weaponVelocity, gesture, ... }
 */
export function useCVInput(_playerId: 'player1' | 'player2'): CVInputData {
  // TODO: Replace with actual MediaPipe Hands/Pose integration
  return {
    weaponPosition: new THREE.Vector3(0, 1, 0),
    weaponRotation: new THREE.Euler(0, 0, 0),
    weaponVelocity: new THREE.Vector3(0, 0, 0),
    gesture: 'idle',
    gestureConfidence: 0,
    handPosition: new THREE.Vector3(0, 1, 0),
    handedness: 'right',
    isTracking: false,
    fps: 0,
  };
}
