// =============================================================================
// MechaArms.tsx — First-person cockpit RIGHT arm driven by CV pose tracking
// Left arm removed (left hand is on keyboard for WASD movement).
// Right hand holds a greatsword. All joints interpolated for smooth motion.
// Geometry builders and materials live in MechaGeometry.ts (shared with MechaEntity).
// =============================================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cvBridge } from '../cv/cvBridge';
import { useGameStore } from '../game/GameState';
import { fireSwing } from '../combat/SwingEvent';
import { updateSwordTransform } from '../combat/SwordState';
import {
  makeUpperArm, makeForearm, makeHand, makeJoint, makeSword,
} from '../avatars/MechaGeometry';

// ============================================================================
// Cockpit anchor & tracking constants
// ============================================================================

const R_SHOULDER = new THREE.Vector3(0.5, -0.45, -1.0);
const ARM_SCALE = 3.5;
const DEPTH_SCALE = 5.0;

const SMOOTH_SHOULDER = 0.25;
const SMOOTH_ELBOW = 0.2;
const SMOOTH_WRIST = 0.25;
const SMOOTH_HAND = 0.3;
const SMOOTH_SWORD_POS = 0.3;
const SMOOTH_SWORD_ROT = 0.15;

const R_SHOULDER_IDX = 12;
const R_ELBOW_IDX = 14;
const R_WRIST_IDX = 16;
const R_INDEX_IDX = 20;

function getDelta(
  lm: { x: number; y: number; z: number },
  shoulderLm: { x: number; y: number; z: number }
): THREE.Vector3 {
  return new THREE.Vector3(
    -(lm.x - shoulderLm.x) * ARM_SCALE,
    -(lm.y - shoulderLm.y) * ARM_SCALE,
    (lm.z - shoulderLm.z) * DEPTH_SCALE
  );
}

// Reusable temp objects
const _tmpVec = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _UP = new THREE.Vector3(0, 1, 0);

/**
 * Position a group between two 3D points with uniform scaling.
 */
function positionLimb(
  obj: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  defaultHeight: number
) {
  const mid = _tmpVec.addVectors(from, to).multiplyScalar(0.5);
  obj.position.copy(mid);

  const dir = _tmpDir.subVectors(to, from);
  const len = dir.length();
  const s = len / defaultHeight;
  obj.scale.setScalar(s);

  const dirNorm = dir.normalize();
  if (Math.abs(dirNorm.dot(_UP)) > 0.999) {
    dirNorm.x += 0.001;
    dirNorm.normalize();
  }
  _tmpQuat.setFromUnitVectors(_UP, dirNorm);
  obj.quaternion.slerp(_tmpQuat, 0.35);
}

// Raw target positions
const _tRShoulder = new THREE.Vector3();
const _tRElbow = new THREE.Vector3();
const _tRWrist = new THREE.Vector3();
const _tRHand = new THREE.Vector3();

// ============================================================================
// Component
// ============================================================================

export function MechaArms() {
  const { camera } = useThree();
  const phase = useGameStore((s) => s.phase);
  const cvEnabled = cvBridge.cvEnabled;
  const cvInputRef = cvBridge.cvInputRef;
  const worldLandmarksRef = cvBridge.worldLandmarksRef;

  // Build detailed geometry once
  const upperArm = useMemo(() => makeUpperArm(), []);
  const forearm = useMemo(() => makeForearm(), []);
  const hand = useMemo(() => makeHand(), []);
  const shoulderJoint = useMemo(() => makeJoint(0.08), []);
  const elbowJoint = useMemo(() => makeJoint(0.06), []);
  const wristJoint = useMemo(() => makeJoint(0.05), []);
  const sword = useMemo(() => makeSword(), []);

  const groupRef = useRef<THREE.Group>(null!);
  const swordGroupRef = useRef<THREE.Group>(null!);

  const smoothJoints = useRef({
    rShoulder: new THREE.Vector3(),
    rElbow: new THREE.Vector3(),
    rWrist: new THREE.Vector3(),
    rHand: new THREE.Vector3(),
    swordQuat: new THREE.Quaternion(),
    initialized: false,
  });

  const prevCvSwinging = useRef(false);

  const dims = useMemo(
    () => ({ upper: 0.35, fore: 0.32, hand: 0.12 }),
    []
  );

  useFrame(() => {
    if (!groupRef.current) return;

    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'roundEnd';

    if (!isGameplay || !cvEnabled) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const cvInput = cvInputRef.current;
    const worldLandmarks = worldLandmarksRef.current;

    // Fire swing callback on rising edge
    if (cvInput.isSwinging && !prevCvSwinging.current) {
      fireSwing();
    }
    prevCvSwinging.current = cvInput.isSwinging;

    if (!worldLandmarks || worldLandmarks.length < 21) {
      groupRef.current.visible = false;
      return;
    }

    const s = smoothJoints.current;
    const wlRS = worldLandmarks[R_SHOULDER_IDX];

    // Compute raw right arm joint positions in camera-local space
    _tRShoulder.copy(R_SHOULDER);
    _tRElbow.copy(_tRShoulder).add(getDelta(worldLandmarks[R_ELBOW_IDX], wlRS));
    _tRWrist.copy(_tRShoulder).add(getDelta(worldLandmarks[R_WRIST_IDX], wlRS));
    _tRHand.copy(_tRShoulder).add(getDelta(worldLandmarks[R_INDEX_IDX], wlRS));

    // Transform from camera-local to world space
    const camQuat = camera.quaternion;
    const camPos = camera.position;
    const toWorld = (v: THREE.Vector3) => v.applyQuaternion(camQuat).add(camPos);

    toWorld(_tRShoulder);
    toWorld(_tRElbow);
    toWorld(_tRWrist);
    toWorld(_tRHand);

    // Lerp smoothing
    if (!s.initialized) {
      s.rShoulder.copy(_tRShoulder);
      s.rElbow.copy(_tRElbow);
      s.rWrist.copy(_tRWrist);
      s.rHand.copy(_tRHand);
      s.initialized = true;
    } else {
      s.rShoulder.lerp(_tRShoulder, SMOOTH_SHOULDER);
      s.rElbow.lerp(_tRElbow, SMOOTH_ELBOW);
      s.rWrist.lerp(_tRWrist, SMOOTH_WRIST);
      s.rHand.lerp(_tRHand, SMOOTH_HAND);
    }

    // Apply to joints
    shoulderJoint.position.copy(s.rShoulder);
    elbowJoint.position.copy(s.rElbow);
    wristJoint.position.copy(s.rWrist);

    // Apply to arm segments
    positionLimb(upperArm, s.rShoulder, s.rElbow, dims.upper);
    positionLimb(forearm, s.rElbow, s.rWrist, dims.fore);
    positionLimb(hand, s.rWrist, s.rHand, dims.hand);

    // Sword at right hand, oriented along forearm
    if (swordGroupRef.current) {
      swordGroupRef.current.position.lerp(s.rHand, SMOOTH_SWORD_POS);

      const swordDir = _tmpDir.subVectors(s.rHand, s.rWrist);
      if (swordDir.lengthSq() > 0.0001) {
        swordDir.normalize();
        if (Math.abs(swordDir.dot(_UP)) > 0.999) {
          swordDir.x += 0.001;
          swordDir.normalize();
        }
        const targetQuat = _tmpQuat.setFromUnitVectors(_UP, swordDir);
        s.swordQuat.slerp(targetQuat, SMOOTH_SWORD_ROT);
        swordGroupRef.current.quaternion.copy(s.swordQuat);
      }

      updateSwordTransform(swordGroupRef.current);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Detailed joint spheres */}
      <primitive object={shoulderJoint} />
      <primitive object={elbowJoint} />
      <primitive object={wristJoint} />

      {/* Detailed armored limbs */}
      <primitive object={upperArm} />
      <primitive object={forearm} />
      <primitive object={hand} />

      {/* Greatsword */}
      <group ref={swordGroupRef} scale={0.65}>
        <primitive object={sword} />
      </group>
    </group>
  );
}
