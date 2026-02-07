// =============================================================================
// MechaArms.tsx — First-person cockpit mecha arms driven by CV pose tracking
// Ported from mecha.js: robot arms mirror your real arm movements.
// Right hand holds a sword. Left hand for blocking.
//
// All joint positions are interpolated (lerp) for smooth, fluid motion.
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

// ---- Cockpit anchor offsets (camera-local space) ----
const L_SHOULDER = new THREE.Vector3(-0.5, -0.45, -1.0);
const R_SHOULDER = new THREE.Vector3(0.5, -0.45, -1.0);

// How much the pose delta drives the arm
const ARM_SCALE = 3.5;
const DEPTH_SCALE = 5.0;

// ---- Smoothing ----
// Lerp factor per frame: 0 = frozen, 1 = instant (no smoothing).
// Higher values for fast-moving joints (wrists/hands), lower for shoulders.
const SMOOTH_SHOULDER = 0.25;
const SMOOTH_ELBOW = 0.2;
const SMOOTH_WRIST = 0.25;
const SMOOTH_HAND = 0.3;
const SMOOTH_SWORD_POS = 0.3;
const SMOOTH_SWORD_ROT = 0.15;

// ---- MediaPipe landmark indices ----
const L_SHOULDER_IDX = 11;
const R_SHOULDER_IDX = 12;
const L_ELBOW_IDX = 13;
const R_ELBOW_IDX = 14;
const L_WRIST_IDX = 15;
const R_WRIST_IDX = 16;
const L_INDEX_IDX = 19;
const R_INDEX_IDX = 20;

/**
 * Get the delta of a landmark relative to its shoulder in MediaPipe world space.
 * Converts MediaPipe coords to camera-local coords.
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
  mesh.quaternion.slerp(_tmpQuat, 0.35); // smooth orientation too
}

// Reusable temp objects
const _tmpVec = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _UP = new THREE.Vector3(0, 1, 0);

// Raw target positions (camera-local, before world transform)
const _tLShoulder = new THREE.Vector3();
const _tRShoulder = new THREE.Vector3();
const _tLElbow = new THREE.Vector3();
const _tRElbow = new THREE.Vector3();
const _tLWrist = new THREE.Vector3();
const _tRWrist = new THREE.Vector3();
const _tLHand = new THREE.Vector3();
const _tRHand = new THREE.Vector3();

export function MechaArms() {
  const { camera } = useThree();
  const phase = useGameStore((s) => s.phase);
  const { cvEnabled, cvInputRef, worldLandmarksRef } = useCVContext();

  // Refs for each mecha part
  const groupRef = useRef<THREE.Group>(null!);
  const leftUpperRef = useRef<THREE.Mesh>(null!);
  const rightUpperRef = useRef<THREE.Mesh>(null!);
  const leftForeRef = useRef<THREE.Mesh>(null!);
  const rightForeRef = useRef<THREE.Mesh>(null!);
  const leftHandRef = useRef<THREE.Mesh>(null!);
  const rightHandRef = useRef<THREE.Mesh>(null!);
  const lShoulderRef = useRef<THREE.Mesh>(null!);
  const rShoulderRef = useRef<THREE.Mesh>(null!);
  const lElbowRef = useRef<THREE.Mesh>(null!);
  const rElbowRef = useRef<THREE.Mesh>(null!);
  const lWristRef = useRef<THREE.Mesh>(null!);
  const rWristRef = useRef<THREE.Mesh>(null!);
  const swordGroupRef = useRef<THREE.Group>(null!);

  // Smoothed world-space positions (persistent between frames)
  const smoothJoints = useRef({
    lShoulder: new THREE.Vector3(),
    rShoulder: new THREE.Vector3(),
    lElbow: new THREE.Vector3(),
    rElbow: new THREE.Vector3(),
    lWrist: new THREE.Vector3(),
    rWrist: new THREE.Vector3(),
    lHand: new THREE.Vector3(),
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
    const wlLS = worldLandmarks[L_SHOULDER_IDX];
    const wlRS = worldLandmarks[R_SHOULDER_IDX];

    // Compute RAW joint positions in camera-local space
    _tLShoulder.copy(L_SHOULDER);
    _tRShoulder.copy(R_SHOULDER);

    _tLElbow.copy(_tLShoulder).add(getDelta(worldLandmarks[L_ELBOW_IDX], wlLS));
    _tLWrist.copy(_tLShoulder).add(getDelta(worldLandmarks[L_WRIST_IDX], wlLS));
    _tLHand.copy(_tLShoulder).add(getDelta(worldLandmarks[L_INDEX_IDX], wlLS));

    _tRElbow.copy(_tRShoulder).add(getDelta(worldLandmarks[R_ELBOW_IDX], wlRS));
    _tRWrist.copy(_tRShoulder).add(getDelta(worldLandmarks[R_WRIST_IDX], wlRS));
    _tRHand.copy(_tRShoulder).add(getDelta(worldLandmarks[R_INDEX_IDX], wlRS));

    // Transform from camera-local to world space
    const camQuat = camera.quaternion;
    const camPos = camera.position;
    const toWorld = (v: THREE.Vector3) => v.applyQuaternion(camQuat).add(camPos);

    toWorld(_tLShoulder);
    toWorld(_tRShoulder);
    toWorld(_tLElbow);
    toWorld(_tRElbow);
    toWorld(_tLWrist);
    toWorld(_tRWrist);
    toWorld(_tLHand);
    toWorld(_tRHand);

    // ---- Lerp smoothing: blend toward target positions ----
    if (!s.initialized) {
      // First frame: snap to position
      s.lShoulder.copy(_tLShoulder);
      s.rShoulder.copy(_tRShoulder);
      s.lElbow.copy(_tLElbow);
      s.rElbow.copy(_tRElbow);
      s.lWrist.copy(_tLWrist);
      s.rWrist.copy(_tRWrist);
      s.lHand.copy(_tLHand);
      s.rHand.copy(_tRHand);
      s.initialized = true;
    } else {
      s.lShoulder.lerp(_tLShoulder, SMOOTH_SHOULDER);
      s.rShoulder.lerp(_tRShoulder, SMOOTH_SHOULDER);
      s.lElbow.lerp(_tLElbow, SMOOTH_ELBOW);
      s.rElbow.lerp(_tRElbow, SMOOTH_ELBOW);
      s.lWrist.lerp(_tLWrist, SMOOTH_WRIST);
      s.rWrist.lerp(_tRWrist, SMOOTH_WRIST);
      s.lHand.lerp(_tLHand, SMOOTH_HAND);
      s.rHand.lerp(_tRHand, SMOOTH_HAND);
    }

    // ---- Apply smoothed positions to meshes ----

    // Joints
    lShoulderRef.current.position.copy(s.lShoulder);
    rShoulderRef.current.position.copy(s.rShoulder);
    lElbowRef.current.position.copy(s.lElbow);
    rElbowRef.current.position.copy(s.rElbow);
    lWristRef.current.position.copy(s.lWrist);
    rWristRef.current.position.copy(s.rWrist);

    // Limbs (positioned between smoothed joints)
    positionLimb(leftUpperRef.current, s.lShoulder, s.lElbow, dims.upper);
    positionLimb(rightUpperRef.current, s.rShoulder, s.rElbow, dims.upper);
    positionLimb(leftForeRef.current, s.lElbow, s.lWrist, dims.fore);
    positionLimb(rightForeRef.current, s.rElbow, s.rWrist, dims.fore);
    positionLimb(leftHandRef.current, s.lWrist, s.lHand, dims.hand);
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

      // Publish world-space sword line for collision detection
      updateSwordTransform(swordGroupRef.current);
    }
  });

  return (
    <group ref={groupRef}>
      {/* ---- Joint spheres ---- */}
      <mesh ref={lShoulderRef}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={JOINT_COLOR} emissive={JOINT_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={rShoulderRef}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={JOINT_COLOR} emissive={JOINT_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={lElbowRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={JOINT_COLOR} emissive={JOINT_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={rElbowRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={JOINT_COLOR} emissive={JOINT_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={lWristRef}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={JOINT_COLOR} emissive={JOINT_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={rWristRef}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={JOINT_COLOR} emissive={JOINT_COLOR} emissiveIntensity={0.3} />
      </mesh>

      {/* ---- Limb boxes ---- */}
      <mesh ref={leftUpperRef} castShadow>
        <boxGeometry args={[0.1, 0.35, 0.1]} />
        <meshStandardMaterial color={MECHA_BLUE} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={rightUpperRef} castShadow>
        <boxGeometry args={[0.1, 0.35, 0.1]} />
        <meshStandardMaterial color={MECHA_BLUE} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={leftForeRef} castShadow>
        <boxGeometry args={[0.09, 0.32, 0.09]} />
        <meshStandardMaterial color={MECHA_DARK} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={rightForeRef} castShadow>
        <boxGeometry args={[0.09, 0.32, 0.09]} />
        <meshStandardMaterial color={MECHA_DARK} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={leftHandRef} castShadow>
        <boxGeometry args={[0.08, 0.12, 0.06]} />
        <meshStandardMaterial color={MECHA_BLUE} metalness={0.6} roughness={0.3} />
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
