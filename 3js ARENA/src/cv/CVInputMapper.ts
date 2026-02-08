// =============================================================================
// CVInputMapper.ts — Maps MediaPipe pose landmarks to game input
//
// Head look: Nose position relative to shoulder center drives camera yaw/pitch.
// Movement:  1:1 position mapping from hip center to game world.
// Weapon:    Right wrist position + wrist-to-elbow angle for rotation.
// Attack:    Right wrist velocity exceeding threshold.
// Block:     Left wrist raised above left shoulder.
// =============================================================================

import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// MediaPipe Pose landmark indices
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const _LEFT_ELBOW = 13; // unused — left arm on keyboard
const RIGHT_ELBOW = 14;
const _LEFT_WRIST = 15; // unused — left arm on keyboard
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

// Suppress unused warnings
void _LEFT_ELBOW;
void _LEFT_WRIST;

// ---- Head look tuning ----
const HEAD_YAW_SCALE = 12.0;   // radians per unit of normalized displacement (raised from 8)
const HEAD_PITCH_SCALE = 9.0;  // (raised from 6)
const HEAD_SMOOTH = 0.15;      // lower = smoother (was 0.12)
const HEAD_YAW_MAX = Math.PI * 0.75;  // ±135°
const HEAD_PITCH_MAX = Math.PI * 0.4;  // ±72°

/**
 * Mutable sensitivity config — UI sliders write to this object.
 * 1.0 = default, 0.5 = half sensitivity, 2.0 = double.
 */
export const headSensitivityConfig = {
  multiplier: 1.0,
};

// ---- Movement tuning ----
const POSITION_SCALE_X = 12.0;
const POSITION_SCALE_Z = 8.0;

// ---- Weapon tuning ----
const SWORD_RANGE_X = 2.5;
const SWORD_RANGE_Y = 2.5;
const WRIST_SMOOTH = 0.2;      // lower = smoother (was 0.4)
const ROTATION_SMOOTH = 0.15;   // lower = smoother (was 0.35)

// ---- Swing tuning ----
const SWING_VELOCITY_THRESHOLD = 2.5;  // raised: needs a deliberate swing (was 1.2)
const SWING_COOLDOWN_MS = 600;         // longer cooldown between swings (was 500)

// Block detection removed — left hand is on keyboard for WASD.

export interface CVGameInput {
  /** Head look yaw offset in radians (positive = look right) */
  lookYaw: number;
  /** Head look pitch offset in radians (positive = look up) */
  lookPitch: number;

  /** Position OFFSET from spawn in game units (physical coords, pre-rotation). */
  posOffsetX: number;
  posOffsetZ: number;

  /** Sword offset from camera center (local coords) */
  swordOffsetX: number;
  swordOffsetY: number;

  /** Sword rotation from wrist-elbow angle (radians) */
  swordRotX: number;
  swordRotY: number;
  swordRotZ: number;

  /** True if a swing was just detected this frame */
  isSwinging: boolean;

  /** True if left arm is in blocking position */
  isBlocking: boolean;

  /** True if we have a valid pose this frame */
  isTracking: boolean;
}

const defaultInput: CVGameInput = {
  lookYaw: 0,
  lookPitch: 0,
  posOffsetX: 0,
  posOffsetZ: 0,
  swordOffsetX: 0,
  swordOffsetY: 0,
  swordRotX: 0,
  swordRotY: 0.3,
  swordRotZ: 0.4,
  isSwinging: false,
  isBlocking: false,
  isTracking: false,
};

export class CVInputMapper {
  private neutralX = 0.5;
  private neutralY = 0.5;
  private isCalibrated = false;

  // Neutral nose offset relative to shoulder center (for head rotation)
  private neutralNoseRelX = 0;
  private neutralNoseRelY = 0;

  // Smoothed head look values
  private smoothLookYaw = 0;
  private smoothLookPitch = 0;

  private smoothWristX = 0;
  private smoothWristY = 0;
  private smoothRotX = 0;
  private smoothRotY = 0.3;
  private smoothRotZ = 0.4;

  private prevWristX = 0;
  private prevWristY = 0;
  private prevTimestamp = 0;
  private lastSwingTime = 0;

  calibrate(): void {
    this.isCalibrated = false;
  }

  process(
    landmarks: NormalizedLandmark[],
    worldLandmarks: NormalizedLandmark[],
    timestamp: number
  ): CVGameInput {
    if (!landmarks || landmarks.length < 25) {
      return { ...defaultInput };
    }

    const nose = landmarks[NOSE];
    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    const rightWrist = landmarks[RIGHT_WRIST];
    const rightElbow = landmarks[RIGHT_ELBOW];
    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];

    const hipCenterX = (leftHip.x + rightHip.x) / 2;
    const hipCenterY = (leftHip.y + rightHip.y) / 2;
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

    // Nose offset relative to shoulder center (body-relative, ignores body sway)
    const noseRelX = nose.x - shoulderMidX;
    const noseRelY = nose.y - shoulderMidY;

    if (!this.isCalibrated) {
      this.neutralX = hipCenterX;
      this.neutralY = hipCenterY;
      this.neutralNoseRelX = noseRelX;
      this.neutralNoseRelY = noseRelY;
      this.prevWristX = rightWrist.x;
      this.prevWristY = rightWrist.y;
      this.prevTimestamp = timestamp;
      this.smoothWristX = 0;
      this.smoothWristY = 0;
      this.smoothRotX = 0;
      this.smoothRotY = 0.3;
      this.smoothRotZ = 0.4;
      this.smoothLookYaw = 0;
      this.smoothLookPitch = 0;
      this.isCalibrated = true;
    }

    // ---- Head look: nose displacement from neutral → yaw / pitch ----
    // The webcam PiP is mirrored (scaleX(-1)), so the user perceives directions
    // as in a mirror. MediaPipe raw X must be negated to match what they see.
    // Negate: user "turns left" in mirror = raw nose.x decreases → we want +yaw.
    const sens = headSensitivityConfig.multiplier;
    const rawYaw = -(noseRelX - this.neutralNoseRelX) * HEAD_YAW_SCALE * sens;
    // Look UP → nose moves UP → noseRelY decreases (0=top, 1=bottom)
    const rawPitch = -(noseRelY - this.neutralNoseRelY) * HEAD_PITCH_SCALE * sens;

    const clampedYaw = Math.max(-HEAD_YAW_MAX, Math.min(HEAD_YAW_MAX, rawYaw));
    const clampedPitch = Math.max(-HEAD_PITCH_MAX, Math.min(HEAD_PITCH_MAX, rawPitch));

    this.smoothLookYaw += (clampedYaw - this.smoothLookYaw) * HEAD_SMOOTH;
    this.smoothLookPitch += (clampedPitch - this.smoothLookPitch) * HEAD_SMOOTH;

    // ---- Movement: 1:1 position mapping ----
    // Webcam is mirrored: step RIGHT → image moves LEFT → hipCenterX decreases.
    const posOffsetX = (this.neutralX - hipCenterX) * POSITION_SCALE_X;
    // Step FORWARD (away from camera) → you appear smaller → hipCenterY decreases.
    // Game +Z = forward (toward opponent).
    const posOffsetZ = (this.neutralY - hipCenterY) * POSITION_SCALE_Z;

    // ---- Sword position: right wrist relative to right shoulder ----
    const wristRelX = (this.neutralX > 0.5 ? 1 : -1) * (rightShoulder.x - rightWrist.x) * SWORD_RANGE_X;
    const wristRelY = -(rightWrist.y - rightShoulder.y) * SWORD_RANGE_Y;

    this.smoothWristX += (wristRelX - this.smoothWristX) * WRIST_SMOOTH;
    this.smoothWristY += (wristRelY - this.smoothWristY) * WRIST_SMOOTH;

    // ---- Sword rotation: align blade with forearm direction ----
    // The sword blade extends along local +Y. We need to rotate it
    // so the blade points in the forearm direction.
    //
    // Forearm direction in MediaPipe image coords:
    const armDirX = rightWrist.x - rightElbow.x;
    const armDirY = rightWrist.y - rightElbow.y;

    // Convert to camera-local 2D (sword lives in camera space):
    //   Camera +X = screen right, Camera +Y = screen up
    //   MediaPipe x: mirrored, so negate for camera-local X
    //   MediaPipe y: 0=top 1=bottom, so negate for camera-local Y
    const camDirX = -armDirX;
    const camDirY = -armDirY;

    // The blade's default direction is +Y (0,1). To rotate from +Y
    // to (camDirX, camDirY), we rotate around Z by the angle between them.
    // angle = atan2(camDirX, camDirY) — note: atan2(x,y) not atan2(y,x)
    // because we measure from +Y axis, clockwise.
    const bladeAngle = Math.atan2(camDirX, camDirY);

    const targetRotX = 0;                                 // no pitch
    const targetRotY = 0;                                 // no yaw
    const targetRotZ = -bladeAngle;                       // roll to match forearm

    this.smoothRotX += (targetRotX - this.smoothRotX) * ROTATION_SMOOTH;
    this.smoothRotY += (targetRotY - this.smoothRotY) * ROTATION_SMOOTH;
    this.smoothRotZ += (targetRotZ - this.smoothRotZ) * ROTATION_SMOOTH;

    // ---- Swing detection ----
    const dt = (timestamp - this.prevTimestamp) / 1000;
    let isSwinging = false;

    if (dt > 0 && dt < 0.5) {
      const velX = (rightWrist.x - this.prevWristX) / dt;
      const velY = (rightWrist.y - this.prevWristY) / dt;
      const speed = Math.sqrt(velX * velX + velY * velY);

      if (speed > SWING_VELOCITY_THRESHOLD && timestamp - this.lastSwingTime > SWING_COOLDOWN_MS) {
        isSwinging = true;
        this.lastSwingTime = timestamp;
      }
    }

    this.prevWristX = rightWrist.x;
    this.prevWristY = rightWrist.y;
    this.prevTimestamp = timestamp;

    // Block detection removed — left hand on keyboard
    const isBlocking = false;

    return {
      lookYaw: this.smoothLookYaw,
      lookPitch: this.smoothLookPitch,
      posOffsetX,
      posOffsetZ,
      swordOffsetX: this.smoothWristX,
      swordOffsetY: this.smoothWristY,
      swordRotX: this.smoothRotX,
      swordRotY: this.smoothRotY,
      swordRotZ: this.smoothRotZ,
      isSwinging,
      isBlocking,
      isTracking: true,
    };
  }
}
