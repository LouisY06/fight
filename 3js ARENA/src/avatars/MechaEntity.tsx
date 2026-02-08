// =============================================================================
// MechaEntity.tsx — Full-body procedural mecha for third-person rendering
// Used for opponents (NetworkOpponent, LocalOpponent). Pivot-based animation
// using nested THREE.Groups — no skeleton needed.
// =============================================================================

import { useRef, useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  makeUpperArm, makeForearm, makeHand, makeJoint, makeSword,
  makeHead, makeTorso, makeHips,
  makeUpperLeg, makeLowerLeg, makeFoot,
} from './MechaGeometry';

// ---- Animation constants (heavy mech — slower, more deliberate) ----
const WALK_SPEED = 3.8;
const WALK_LEG_AMP = 0.38;
const WALK_KNEE_AMP = 0.30;
const WALK_ARM_AMP = 0.25;
const WALK_TORSO_TWIST = 0.025;
const WALK_BOB = 0.03;

const SWING_DURATION = 0.40;
const SWING_UPPER_PITCH = -0.9;
const SWING_LOWER_PITCH = -0.50;

// ---- Body layout (heavy mech — wide stance, total height ~2.0 units) ----
const HIP_Y = 0.90;
const UPPER_LEG_LEN = 0.44;
const LOWER_LEG_LEN = 0.44;
const HIP_SPREAD_X = 0.18;
const SHOULDER_Y = 0.42; // relative to torso pivot
const SHOULDER_SPREAD_X = 0.38;
const NECK_Y = 0.30; // relative to torso pivot
const HEAD_OFFSET_Y = 0.08;

// Slerp helper temps
const _euler = new THREE.Euler();
const _targetQuat = new THREE.Quaternion();
const _restQuat = new THREE.Quaternion(); // identity

export interface MechaEntityProps {
  isWalking?: boolean;
  isSwinging: boolean;
  isWalkingRef?: MutableRefObject<boolean>;
}

/**
 * Build the full mecha body hierarchy. Returns root group + named pivot refs
 * for animation. All geometry is built imperatively via useMemo.
 */
function buildMechaBody() {
  const root = new THREE.Group();

  // ---- Hips (center of mass, pivot for walk bob) ----
  const hipsGroup = new THREE.Group();
  hipsGroup.position.y = HIP_Y;
  root.add(hipsGroup);

  const hipsMesh = makeHips();
  hipsGroup.add(hipsMesh);

  // ---- Torso (pivots at hips top — raised slightly for taller torso) ----
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.08;
  hipsGroup.add(torsoGroup);

  const torsoMesh = makeTorso();
  torsoGroup.add(torsoMesh);

  // ---- Neck + Head ----
  const neckGroup = new THREE.Group();
  neckGroup.position.y = NECK_Y;
  torsoGroup.add(neckGroup);

  const headMesh = makeHead();
  headMesh.position.y = HEAD_OFFSET_Y;
  neckGroup.add(headMesh);

  // ---- Arms (L & R) ----
  const armPivots = { left: {} as ArmPivots, right: {} as ArmPivots };
  for (const side of ['left', 'right'] as const) {
    const sign = side === 'left' ? -1 : 1;

    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(sign * SHOULDER_SPREAD_X, SHOULDER_Y, 0);
    torsoGroup.add(shoulderGroup);

    // Shoulder joint sphere (big pauldron joint)
    const shoulderJoint = makeJoint(0.08);
    shoulderGroup.add(shoulderJoint);

    // Upper arm pivot (rotates at shoulder)
    const upperArmPivot = new THREE.Group();
    shoulderGroup.add(upperArmPivot);

    const upperArmMesh = makeUpperArm();
    upperArmMesh.position.y = -0.20; // offset so pivot is at shoulder
    if (side === 'left') upperArmMesh.scale.x = -1; // mirror left arm
    upperArmPivot.add(upperArmMesh);

    // Elbow joint
    const elbowGroup = new THREE.Group();
    elbowGroup.position.y = -0.42;
    upperArmPivot.add(elbowGroup);

    const elbowJoint = makeJoint(0.07);
    elbowGroup.add(elbowJoint);

    // Forearm pivot (rotates at elbow)
    const forearmPivot = new THREE.Group();
    elbowGroup.add(forearmPivot);

    const forearmMesh = makeForearm();
    forearmMesh.position.y = -0.18;
    if (side === 'left') forearmMesh.scale.x = -1;
    forearmPivot.add(forearmMesh);

    // Wrist joint
    const wristGroup = new THREE.Group();
    wristGroup.position.y = -0.36;
    forearmPivot.add(wristGroup);

    const wristJoint = makeJoint(0.05);
    wristGroup.add(wristJoint);

    // Hand
    const handMesh = makeHand();
    handMesh.position.y = -0.07;
    handMesh.rotation.x = 0.1; // slight natural angle
    if (side === 'left') handMesh.scale.x = -1;
    wristGroup.add(handMesh);

    armPivots[side] = {
      shoulder: shoulderGroup,
      upperArm: upperArmPivot,
      elbow: elbowGroup,
      forearm: forearmPivot,
      wrist: wristGroup,
    };
  }

  // ---- Sword on right hand (scaled up for heavy mech) ----
  const swordGroup = new THREE.Group();
  swordGroup.scale.setScalar(0.55);
  swordGroup.rotation.set(-0.3, 0, 0.15);
  swordGroup.position.y = -0.10;
  const swordMesh = makeSword();
  swordGroup.add(swordMesh);
  armPivots.right.wrist.add(swordGroup);

  // ---- Legs (L & R) ----
  const legPivots = { left: {} as LegPivots, right: {} as LegPivots };
  for (const side of ['left', 'right'] as const) {
    const sign = side === 'left' ? -1 : 1;

    // Hip joint
    const hipJointGroup = new THREE.Group();
    hipJointGroup.position.set(sign * HIP_SPREAD_X, 0, 0);
    hipsGroup.add(hipJointGroup);

    const hipJoint = makeJoint(0.07);
    hipJointGroup.add(hipJoint);

    // Upper leg pivot (rotates at hip)
    const upperLegPivot = new THREE.Group();
    hipJointGroup.add(upperLegPivot);

    const upperLegMesh = makeUpperLeg();
    if (side === 'left') upperLegMesh.scale.x = -1;
    upperLegPivot.add(upperLegMesh);

    // Knee joint
    const kneeGroup = new THREE.Group();
    kneeGroup.position.y = -UPPER_LEG_LEN;
    upperLegPivot.add(kneeGroup);

    const kneeJoint = makeJoint(0.06);
    kneeGroup.add(kneeJoint);

    // Lower leg pivot (rotates at knee)
    const lowerLegPivot = new THREE.Group();
    kneeGroup.add(lowerLegPivot);

    const lowerLegMesh = makeLowerLeg();
    if (side === 'left') lowerLegMesh.scale.x = -1;
    lowerLegPivot.add(lowerLegMesh);

    // Ankle + foot
    const ankleGroup = new THREE.Group();
    ankleGroup.position.y = -LOWER_LEG_LEN;
    lowerLegPivot.add(ankleGroup);

    const footMesh = makeFoot();
    ankleGroup.add(footMesh);

    legPivots[side] = {
      hip: hipJointGroup,
      upperLeg: upperLegPivot,
      knee: kneeGroup,
      lowerLeg: lowerLegPivot,
      ankle: ankleGroup,
    };
  }

  return { root, hipsGroup, torsoGroup, neckGroup, armPivots, legPivots };
}

interface ArmPivots {
  shoulder: THREE.Group;
  upperArm: THREE.Group;
  elbow: THREE.Group;
  forearm: THREE.Group;
  wrist: THREE.Group;
}

interface LegPivots {
  hip: THREE.Group;
  upperLeg: THREE.Group;
  knee: THREE.Group;
  lowerLeg: THREE.Group;
  ankle: THREE.Group;
}

export function MechaEntity({ isWalking = false, isSwinging, isWalkingRef }: MechaEntityProps) {
  const body = useMemo(() => buildMechaBody(), []);

  const walkTime = useRef(0);
  const swingTime = useRef(0);
  const wasSwinging = useRef(false);

  useFrame((_, delta) => {
    const walking = isWalkingRef ? isWalkingRef.current : isWalking;
    const lerpFactor = Math.min(1, delta * 8);

    // ---- Walk animation ----
    if (walking) {
      walkTime.current += delta;
    } else {
      walkTime.current *= 0.95; // decay to idle
    }

    const walkLerp = walking ? lerpFactor : 0.12;
    const phase = walkTime.current * WALK_SPEED;
    const sinP = Math.sin(phase);
    const cosP = Math.cos(phase);

    // Legs
    const lL = body.legPivots.left;
    const lR = body.legPivots.right;

    // Upper legs: swing forward/back
    _euler.set(sinP * WALK_LEG_AMP, 0, 0);
    _targetQuat.setFromEuler(_euler);
    lL.upperLeg.quaternion.slerp(_targetQuat, walkLerp);

    _euler.set(-sinP * WALK_LEG_AMP, 0, 0);
    _targetQuat.setFromEuler(_euler);
    lR.upperLeg.quaternion.slerp(_targetQuat, walkLerp);

    // Knees: bend only backward (positive X rotation)
    _euler.set(Math.max(0, sinP) * WALK_KNEE_AMP, 0, 0);
    _targetQuat.setFromEuler(_euler);
    lL.lowerLeg.quaternion.slerp(_targetQuat, walkLerp);

    _euler.set(Math.max(0, -sinP) * WALK_KNEE_AMP, 0, 0);
    _targetQuat.setFromEuler(_euler);
    lR.lowerLeg.quaternion.slerp(_targetQuat, walkLerp);

    // Arms: counter-swing (opposite to legs)
    const aL = body.armPivots.left;
    const aR = body.armPivots.right;

    _euler.set(-sinP * WALK_ARM_AMP, 0, 0);
    _targetQuat.setFromEuler(_euler);
    aL.upperArm.quaternion.slerp(_targetQuat, walkLerp);

    // Right arm walks only when not swinging
    if (!isSwinging && !wasSwinging.current) {
      _euler.set(sinP * WALK_ARM_AMP, 0, 0);
      _targetQuat.setFromEuler(_euler);
      aR.upperArm.quaternion.slerp(_targetQuat, walkLerp);
    }

    // Torso twist
    _euler.set(0, sinP * WALK_TORSO_TWIST, 0);
    _targetQuat.setFromEuler(_euler);
    body.torsoGroup.quaternion.slerp(_targetQuat, walkLerp);

    // Hip bob
    body.hipsGroup.position.y = HIP_Y + Math.abs(cosP) * WALK_BOB * (walking ? 1 : walkTime.current > 0.01 ? 1 : 0);

    // ---- Swing animation ----
    if (isSwinging) {
      wasSwinging.current = true;
      swingTime.current = Math.min(1, swingTime.current + delta / SWING_DURATION);
    } else if (wasSwinging.current) {
      swingTime.current = Math.max(0, swingTime.current - delta / SWING_DURATION);
      if (swingTime.current <= 0) wasSwinging.current = false;
    }

    if (wasSwinging.current || isSwinging) {
      const t = swingTime.current;

      // Right upper arm: pitch forward
      _euler.set(t * SWING_UPPER_PITCH, 0, 0);
      _targetQuat.setFromEuler(_euler);
      aR.upperArm.quaternion.slerp(_targetQuat, lerpFactor);

      // Right forearm: extend forward
      _euler.set(t * SWING_LOWER_PITCH, 0, 0);
      _targetQuat.setFromEuler(_euler);
      aR.forearm.quaternion.slerp(_targetQuat, lerpFactor);
    }

    // ---- Idle: return right forearm to rest when not swinging ----
    if (!isSwinging && !wasSwinging.current) {
      aR.forearm.quaternion.slerp(_restQuat, 0.1);
    }
  });

  return (
    <primitive object={body.root} />
  );
}
