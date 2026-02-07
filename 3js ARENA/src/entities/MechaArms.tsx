// =============================================================================
// MechaArms.tsx — First-person cockpit RIGHT arm driven by CV pose tracking
// Left arm removed (left hand is on keyboard for WASD movement).
// Right hand holds a sword. All joints interpolated for smooth motion.
// =============================================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCVContext } from '../cv/CVProvider';
import { useGameStore } from '../game/GameState';
import { fireSwing } from '../combat/SwingEvent';
import { updateSwordTransform } from '../combat/SwordState';

// ---- Colors ----
const MECHA_BLUE = '#2288cc';
const MECHA_DARK = '#334455';
const JOINT_COLOR = '#00ffff';

// ---- Cockpit anchor (camera-local space) ----
const R_SHOULDER = new THREE.Vector3(0.5, -0.45, -1.0);

// How much the pose delta drives the arm
const ARM_SCALE = 3.5;
const DEPTH_SCALE = 5.0;

// ---- Smoothing ----
const SMOOTH_SHOULDER = 0.25;
const SMOOTH_ELBOW = 0.2;
const SMOOTH_WRIST = 0.25;
const SMOOTH_HAND = 0.3;
const SMOOTH_SWORD_POS = 0.3;
const SMOOTH_SWORD_ROT = 0.15;

// ---- MediaPipe landmark indices (right side only) ----
const R_SHOULDER_IDX = 12;
const R_ELBOW_IDX = 14;
const R_WRIST_IDX = 16;
const R_INDEX_IDX = 20;

/**
 * Get the delta of a landmark relative to its shoulder in MediaPipe world space.
 */
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

/**
 * Position a limb mesh between two 3D points with smooth quaternion.
 */
function positionLimb(
  mesh: THREE.Mesh,
  from: THREE.Vector3,
  to: THREE.Vector3,
  defaultHeight: number
) {
  const mid = _tmpVec.addVectors(from, to).multiplyScalar(0.5);
  mesh.position.copy(mid);

  const dir = _tmpDir.subVectors(to, from);
  const len = dir.length();
  mesh.scale.y = len / defaultHeight;

  const dirNorm = dir.normalize();
  if (Math.abs(dirNorm.dot(_UP)) > 0.999) {
    dirNorm.x += 0.001;
    dirNorm.normalize();
  }
  _tmpQuat.setFromUnitVectors(_UP, dirNorm);
  mesh.quaternion.slerp(_tmpQuat, 0.35);
}

// Reusable temp objects
const _tmpVec = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _UP = new THREE.Vector3(0, 1, 0);

// Raw target positions (right arm only)
const _tRShoulder = new THREE.Vector3();
const _tRElbow = new THREE.Vector3();
const _tRWrist = new THREE.Vector3();
const _tRHand = new THREE.Vector3();

export function MechaArms() {
  const { camera } = useThree();
  const phase = useGameStore((s) => s.phase);
  const { cvEnabled, cvInputRef, worldLandmarksRef } = useCVContext();

  // Refs for right arm parts only
  const groupRef = useRef<THREE.Group>(null!);
  const rightUpperRef = useRef<THREE.Mesh>(null!);
  const rightForeRef = useRef<THREE.Mesh>(null!);
  const rightHandRef = useRef<THREE.Mesh>(null!);
  const rShoulderRef = useRef<THREE.Mesh>(null!);
  const rElbowRef = useRef<THREE.Mesh>(null!);
  const rWristRef = useRef<THREE.Mesh>(null!);
  const swordGroupRef = useRef<THREE.Group>(null!);

  // Smoothed world-space positions (right arm only)
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

    // Compute RAW right arm joint positions in camera-local space
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

    // ---- Lerp smoothing ----
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

    // ---- Apply to meshes ----
    rShoulderRef.current.position.copy(s.rShoulder);
    rElbowRef.current.position.copy(s.rElbow);
    rWristRef.current.position.copy(s.rWrist);

    positionLimb(rightUpperRef.current, s.rShoulder, s.rElbow, dims.upper);
    positionLimb(rightForeRef.current, s.rElbow, s.rWrist, dims.fore);
    positionLimb(rightHandRef.current, s.rWrist, s.rHand, dims.hand);

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
      {/* ---- Right arm joint spheres ---- */}
      <mesh ref={rShoulderRef}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={JOINT_COLOR} emissive={JOINT_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={rElbowRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={JOINT_COLOR} emissive={JOINT_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={rWristRef}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={JOINT_COLOR} emissive={JOINT_COLOR} emissiveIntensity={0.3} />
      </mesh>

      {/* ---- Right arm limbs ---- */}
      <mesh ref={rightUpperRef} castShadow>
        <boxGeometry args={[0.1, 0.35, 0.1]} />
        <meshStandardMaterial color={MECHA_BLUE} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={rightForeRef} castShadow>
        <boxGeometry args={[0.09, 0.32, 0.09]} />
        <meshStandardMaterial color={MECHA_DARK} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={rightHandRef} castShadow>
        <boxGeometry args={[0.08, 0.12, 0.06]} />
        <meshStandardMaterial color={MECHA_BLUE} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ---- Sword (attached to right hand) ---- */}
      <group ref={swordGroupRef} scale={0.65}>
        <mesh castShadow>
          <cylinderGeometry args={[0.02, 0.025, 0.18, 8]} />
          <meshStandardMaterial color="#5C3317" roughness={0.85} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.11, 0]} castShadow>
          <boxGeometry args={[0.14, 0.02, 0.04]} />
          <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[0.03, 0.6, 0.01]} />
          <meshStandardMaterial color="#dddddd" roughness={0.1} metalness={0.95} />
        </mesh>
        <mesh position={[0, 0.82, 0]} castShadow>
          <coneGeometry args={[0.015, 0.08, 4]} />
          <meshStandardMaterial color="#dddddd" roughness={0.1} metalness={0.95} />
        </mesh>
      </group>
    </group>
  );
}
