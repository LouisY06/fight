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
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_EYE = 2;
const RIGHT_EYE = 5;
const LEFT_PINKY = 17;
const LEFT_INDEX = 19;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

void LEFT_ELBOW; // used for future arm tracking

// ---- Head look tuning ----
const HEAD_TILT_SCALE = 4.0;   // radians of yaw per radian of head tilt
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
const SWING_VELOCITY_THRESHOLD = 1.6;  // moderate: responsive to arm swings without false triggers
const SWING_COOLDOWN_MS = 400;         // shorter cooldown for snappier feel

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

  /** True if left arm is raised above shoulder */
  leftArmRaised: boolean;

  /** True if left hand is closed (fist) */
  leftFistClosed: boolean;

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
  leftArmRaised: false,
  leftFistClosed: false,
  isTracking: false,
};

export class CVInputMapper {
  private neutralX = 0.5;
  private neutralY = 0.5;
  private isCalibrated = false;

  // Neutral nose offset relative to shoulder center (for head pitch)
  private neutralNoseRelY = 0;

  // Neutral head tilt angle (for yaw)
  private neutralTilt = 0;

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

  // Left hand fist detection (hysteresis)
  private fistClosed = false;

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
    const leftEye = landmarks[LEFT_EYE];
    const rightEye = landmarks[RIGHT_EYE];
    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    const rightWrist = landmarks[RIGHT_WRIST];
    const rightElbow = landmarks[RIGHT_ELBOW];
    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];

    const hipCenterX = (leftHip.x + rightHip.x) / 2;
    const hipCenterY = (leftHip.y + rightHip.y) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

    // Nose offset relative to shoulder center (for pitch)
    const noseRelY = nose.y - shoulderMidY;

    // Head tilt angle from eye landmarks (for yaw)
    const tiltAngle = Math.atan2(
      leftEye.y - rightEye.y,
      leftEye.x - rightEye.x
    );

    if (!this.isCalibrated) {
      this.neutralX = hipCenterX;
      this.neutralY = hipCenterY;
      this.neutralNoseRelY = noseRelY;
      this.neutralTilt = tiltAngle;
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

    // ---- Head look ----
    const sens = headSensitivityConfig.multiplier;
    // Yaw from head tilt: tilt right → turn right, tilt left → turn left
    const rawYaw = -(tiltAngle - this.neutralTilt) * HEAD_TILT_SCALE * sens;
    // Pitch from nose Y displacement
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

    // ---- Left hand gesture detection (dash spell) ----
    const leftWrist = landmarks[LEFT_WRIST];
    const leftPinky = landmarks[LEFT_PINKY];
    const leftIndex = landmarks[LEFT_INDEX];

    // Arm raised: left wrist above left shoulder (Y=0 is top in image coords)
    const leftArmRaised = leftWrist.y < leftShoulder.y - 0.03;

    // Fist detection: average distance of fingertip landmarks to wrist
    const dPinky = Math.hypot(leftPinky.x - leftWrist.x, leftPinky.y - leftWrist.y);
    const dIndex = Math.hypot(leftIndex.x - leftWrist.x, leftIndex.y - leftWrist.y);
    const avgFingerDist = (dPinky + dIndex) / 2;

    // Hysteresis: close at < 0.06, open at > 0.09
    if (this.fistClosed) {
      if (avgFingerDist > 0.09) this.fistClosed = false;
    } else {
      if (avgFingerDist < 0.06) this.fistClosed = true;
    }

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
      leftArmRaised,
      leftFistClosed: this.fistClosed,
      isTracking: true,
    };
  }
}
