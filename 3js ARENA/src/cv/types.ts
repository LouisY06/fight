// =============================================================================
// cv/types.ts — CV data types: hand landmarks, weapon pose, gestures
// =============================================================================

import * as THREE from 'three';

/** Gesture types detected by computer vision. */
export type GestureType = 'idle' | 'slash' | 'stab' | 'shoot' | 'block' | 'none';

/** Hand landmark data from MediaPipe. */
export interface HandLandmarks {
  /** 21 hand landmark positions (x, y, z normalized 0-1). */
  landmarks: Array<{ x: number; y: number; z: number }>;
  /** Handedness: left or right. */
  handedness: 'left' | 'right';
  /** Detection confidence 0-1. */
  confidence: number;
}

/** Pose landmark data from MediaPipe. */
export interface PoseLandmarks {
  /** 33 pose landmark positions. */
  landmarks: Array<{ x: number; y: number; z: number; visibility: number }>;
}

/** Complete CV input data consumed by the game. */
export interface CVInputData {
  /** 3D position of detected weapon tip. */
  weaponPosition: THREE.Vector3;
  /** Orientation of the weapon. */
  weaponRotation: THREE.Euler;
  /** Speed/direction of weapon movement (for swing detection). */
  weaponVelocity: THREE.Vector3;

  /** Detected gesture / action. */
  gesture: GestureType;
  /** Confidence of gesture detection 0-1. */
  gestureConfidence: number;

  /** Grip hand position in 3D space. */
  handPosition: THREE.Vector3;
  /** Which hand is gripping. */
  handedness: 'left' | 'right';

  /** Is CV actively detecting? */
  isTracking: boolean;
  /** CV processing framerate. */
  fps: number;
}
