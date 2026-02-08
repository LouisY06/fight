// =============================================================================
// MechaArms.tsx — First-person cockpit RIGHT arm driven by CV pose tracking
// Left arm removed (left hand is on keyboard for WASD movement).
// Right hand holds a weapon (sword / gun / shield) based on WeaponState.
// All joints interpolated for smooth motion.
// Geometry builders and materials live in MechaGeometry.ts (shared with MechaEntity).
// =============================================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cvBridge } from '../cv/cvBridge';
import { useGameStore } from '../game/GameState';
import { useWeaponStore } from '../game/WeaponState';
import { fireSwing } from '../combat/SwingEvent';
import { updateSwordTransform } from '../combat/SwordState';
import {
  makeUpperArm, makeForearm, makeHand, makeJoint, makeSword, makeGun, makeShield,
} from '../avatars/MechaGeometry';
import { updateDashSpell, getDashState, getDashCharge } from '../combat/DashSpell';
import { getRedStickData } from '../cv/RedStickTracker';

// ============================================================================
// Cockpit anchors & tracking constants
// ============================================================================

const R_SHOULDER = new THREE.Vector3(0.5, -0.45, -0.55);
const L_SHOULDER = new THREE.Vector3(-0.5, -0.45, -0.55);
const ARM_SCALE = 3.5;
const DEPTH_SCALE = 4.5;    // reduced from 8 — Z depth from MediaPipe is very noisy
/** Forward bias so the arm's resting position sits slightly extended,
 *  giving more backward (close-to-body) range before hitting the camera. */
const DEPTH_BIAS = -0.15;

// Post-filter joint smoothing — higher values are safe because landmarks are pre-filtered
const SMOOTH_SHOULDER = 0.5;
const SMOOTH_ELBOW = 0.45;
const SMOOTH_WRIST = 0.5;
const SMOOTH_HAND = 0.55;
const SMOOTH_SWORD_POS = 0.5;
const SMOOTH_SWORD_ROT = 0.3;

// Landmark pre-filter EMA rates (base values at 60 fps)
const LM_FILTER_XY = 0.35;
const LM_FILTER_Z = 0.15;  // depth is noisier → heavier smoothing

// Right arm landmark indices
const R_SHOULDER_IDX = 12;
const R_ELBOW_IDX = 14;
const R_WRIST_IDX = 16;
const R_INDEX_IDX = 20;

// Left arm landmark indices
const L_SHOULDER_IDX = 11;
const L_ELBOW_IDX = 13;
const L_WRIST_IDX = 15;
const L_INDEX_IDX = 19;

const _deltaVec = new THREE.Vector3();

function getDelta(
  out: THREE.Vector3,
  lm: { x: number; y: number; z: number },
  shoulderLm: { x: number; y: number; z: number }
): THREE.Vector3 {
  return out.set(
    -(lm.x - shoulderLm.x) * ARM_SCALE,
    -(lm.y - shoulderLm.y) * ARM_SCALE,
    (lm.z - shoulderLm.z) * DEPTH_SCALE + DEPTH_BIAS
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
  defaultHeight: number,
  slerpAlpha = 0.65,
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
  obj.quaternion.slerp(_tmpQuat, slerpAlpha);
}

// Raw target positions — right arm
const _tRShoulder = new THREE.Vector3();
const _tRElbow = new THREE.Vector3();
const _tRWrist = new THREE.Vector3();
const _tRHand = new THREE.Vector3();

// Raw target positions — left arm
const _tLShoulder = new THREE.Vector3();
const _tLElbow = new THREE.Vector3();
const _tLWrist = new THREE.Vector3();
const _tLHand = new THREE.Vector3();

// ============================================================================
// Component
// ============================================================================

export function MechaArms() {
  const { camera, scene } = useThree();
  const phase = useGameStore((s) => s.phase);
  const activeWeapon = useWeaponStore((s) => s.activeWeapon);
  const cvEnabled = cvBridge.cvEnabled;
  const cvInputRef = cvBridge.cvInputRef;
  const worldLandmarksRef = cvBridge.worldLandmarksRef;

  // ---- Right arm geometry (+ sword) ----
  const rUpperArm = useMemo(() => makeUpperArm(), []);
  const rForearm = useMemo(() => makeForearm(), []);
  const rHand = useMemo(() => makeHand(), []);
  const rShoulderJoint = useMemo(() => makeJoint(0.08), []);
  const rElbowJoint = useMemo(() => makeJoint(0.06), []);
  const rWristJoint = useMemo(() => makeJoint(0.05), []);
  const sword = useMemo(() => makeSword(), []);
  const gun = useMemo(() => makeGun(), []);
  const shield = useMemo(() => makeShield(), []);

  // ---- Left arm geometry (no sword) ----
  const lUpperArm = useMemo(() => makeUpperArm(), []);
  const lForearm = useMemo(() => makeForearm(), []);
  const lHand = useMemo(() => makeHand(), []);
  const lShoulderJoint = useMemo(() => makeJoint(0.08), []);
  const lElbowJoint = useMemo(() => makeJoint(0.06), []);
  const lWristJoint = useMemo(() => makeJoint(0.05), []);

  const groupRef = useRef<THREE.Group>(null!);
  const swordGroupRef = useRef<THREE.Group>(null!);
  const gunGroupRef = useRef<THREE.Group>(null!);
  const shieldGroupRef = useRef<THREE.Group>(null!);

  const smoothJoints = useRef({
    // Right arm
    rShoulder: new THREE.Vector3(),
    rElbow: new THREE.Vector3(),
    rWrist: new THREE.Vector3(),
    rHand: new THREE.Vector3(),
    swordQuat: new THREE.Quaternion(),
    // Left arm
    lShoulder: new THREE.Vector3(),
    lElbow: new THREE.Vector3(),
    lWrist: new THREE.Vector3(),
    lHand: new THREE.Vector3(),
    // Pre-filter state for landmark EMA
    filteredLandmarks: null as Array<{x: number; y: number; z: number}> | null,
    // State
    initialized: false,
  });

  const prevCvSwinging = useRef(false);

  const dims = useMemo(
    () => ({ upper: 0.35, fore: 0.32, hand: 0.12 }),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'roundEnd';

    if (!isGameplay || !cvEnabled) {
      groupRef.current.visible = false;
      // Reset filter so we start fresh when gameplay resumes
      const sj = smoothJoints.current;
      sj.initialized = false;
      sj.filteredLandmarks = null;
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

    // Clamp delta to avoid large jumps when tab is backgrounded
    const dt = Math.min(delta, 0.1);

    const s = smoothJoints.current;
    const camQuat = camera.quaternion;
    const camPos = camera.position;
    const toWorld = (v: THREE.Vector3) => v.applyQuaternion(camQuat).add(camPos);

    // Frame-rate-independent lerp/slerp alpha helper
    const la = (base: number) => 1 - Math.pow(1 - base, dt * 60);

    // ---- Pre-filter: EMA on world landmarks (removes jitter at the source) ----
    let fl = s.filteredLandmarks;
    if (!fl || fl.length !== worldLandmarks.length) {
      fl = worldLandmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }));
      s.filteredLandmarks = fl;
    } else {
      const aXY = la(LM_FILTER_XY);
      const aZ = la(LM_FILTER_Z);
      for (let i = 0; i < worldLandmarks.length; i++) {
        fl[i].x += (worldLandmarks[i].x - fl[i].x) * aXY;
        fl[i].y += (worldLandmarks[i].y - fl[i].y) * aXY;
        fl[i].z += (worldLandmarks[i].z - fl[i].z) * aZ;
      }
    }

    // ==== RIGHT ARM (uses pre-filtered landmarks) ====
    const flRS = fl[R_SHOULDER_IDX];

    _tRShoulder.copy(R_SHOULDER);
    _tRElbow.copy(_tRShoulder).add(getDelta(_deltaVec, fl[R_ELBOW_IDX], flRS));
    _tRWrist.copy(_tRShoulder).add(getDelta(_deltaVec, fl[R_WRIST_IDX], flRS));
    _tRHand.copy(_tRShoulder).add(getDelta(_deltaVec, fl[R_INDEX_IDX], flRS));

    toWorld(_tRShoulder);
    toWorld(_tRElbow);
    toWorld(_tRWrist);
    toWorld(_tRHand);

    // ==== LEFT ARM (uses pre-filtered landmarks) ====
    const flLS = fl[L_SHOULDER_IDX];

    _tLShoulder.copy(L_SHOULDER);
    _tLElbow.copy(_tLShoulder).add(getDelta(_deltaVec, fl[L_ELBOW_IDX], flLS));
    _tLWrist.copy(_tLShoulder).add(getDelta(_deltaVec, fl[L_WRIST_IDX], flLS));
    _tLHand.copy(_tLShoulder).add(getDelta(_deltaVec, fl[L_INDEX_IDX], flLS));

    toWorld(_tLShoulder);
    toWorld(_tLElbow);
    toWorld(_tLWrist);
    toWorld(_tLHand);

    // ==== LERP SMOOTHING (frame-rate-independent) ====
    if (!s.initialized) {
      s.rShoulder.copy(_tRShoulder);
      s.rElbow.copy(_tRElbow);
      s.rWrist.copy(_tRWrist);
      s.rHand.copy(_tRHand);
      s.lShoulder.copy(_tLShoulder);
      s.lElbow.copy(_tLElbow);
      s.lWrist.copy(_tLWrist);
      s.lHand.copy(_tLHand);
      s.initialized = true;
    } else {
      s.rShoulder.lerp(_tRShoulder, la(SMOOTH_SHOULDER));
      s.rElbow.lerp(_tRElbow, la(SMOOTH_ELBOW));
      s.rWrist.lerp(_tRWrist, la(SMOOTH_WRIST));
      s.rHand.lerp(_tRHand, la(SMOOTH_HAND));
      s.lShoulder.lerp(_tLShoulder, la(SMOOTH_SHOULDER));
      s.lElbow.lerp(_tLElbow, la(SMOOTH_ELBOW));
      s.lWrist.lerp(_tLWrist, la(SMOOTH_WRIST));
      s.lHand.lerp(_tLHand, la(SMOOTH_HAND));
    }

    // ==== APPLY RIGHT ARM ====
    rShoulderJoint.position.copy(s.rShoulder);
    rElbowJoint.position.copy(s.rElbow);
    rWristJoint.position.copy(s.rWrist);

    const slerpA = la(0.65);
    positionLimb(rUpperArm, s.rShoulder, s.rElbow, dims.upper, slerpA);
    positionLimb(rForearm, s.rElbow, s.rWrist, dims.fore, slerpA);
    positionLimb(rHand, s.rWrist, s.rHand, dims.hand, slerpA);

    // Weapon at right hand, oriented along forearm
    const weaponDir = _tmpDir.subVectors(s.rHand, s.rWrist);
    let weaponTargetQuat: THREE.Quaternion | null = null;
    if (weaponDir.lengthSq() > 0.0001) {
      weaponDir.normalize();
      if (Math.abs(weaponDir.dot(_UP)) > 0.999) {
        weaponDir.x += 0.001;
        weaponDir.normalize();
      }
      weaponTargetQuat = _tmpQuat.setFromUnitVectors(_UP, weaponDir);
      s.swordQuat.slerp(weaponTargetQuat, la(SMOOTH_SWORD_ROT));
    }

    const weaponPosAlpha = la(SMOOTH_SWORD_POS);

    // --- Color-based weapon switching: red detected → switch to sword ---
    const stick = getRedStickData();
    if (stick.detected && activeWeapon !== 'sword') {
      useWeaponStore.getState().setActiveWeapon('sword');
    }

    // --- Sword ---
    if (swordGroupRef.current) {
      swordGroupRef.current.visible = activeWeapon === 'sword';
      if (activeWeapon === 'sword') {
        swordGroupRef.current.position.lerp(s.rHand, weaponPosAlpha);
        if (weaponTargetQuat) {
          swordGroupRef.current.quaternion.copy(s.swordQuat);
        }
        updateSwordTransform(swordGroupRef.current);
      }
    }

    // --- Gun ---
    if (gunGroupRef.current) {
      gunGroupRef.current.visible = activeWeapon === 'gun';
      if (activeWeapon === 'gun') {
        gunGroupRef.current.position.lerp(s.rHand, weaponPosAlpha);
        if (weaponTargetQuat) {
          gunGroupRef.current.quaternion.copy(s.swordQuat);
        }
      }
    }

    // --- Shield ---
    if (shieldGroupRef.current) {
      shieldGroupRef.current.visible = activeWeapon === 'shield';
      if (activeWeapon === 'shield') {
        shieldGroupRef.current.position.lerp(s.rHand, weaponPosAlpha);
        if (weaponTargetQuat) {
          shieldGroupRef.current.quaternion.copy(s.swordQuat);
        }
      }
    }

    // ==== APPLY LEFT ARM ====
    lShoulderJoint.position.copy(s.lShoulder);
    lElbowJoint.position.copy(s.lElbow);
    lWristJoint.position.copy(s.lWrist);

    positionLimb(lUpperArm, s.lShoulder, s.lElbow, dims.upper, slerpA);
    positionLimb(lForearm, s.lElbow, s.lWrist, dims.fore, slerpA);
    positionLimb(lHand, s.lWrist, s.lHand, dims.hand, slerpA);

    // ==== DASH SPELL ====
    updateDashSpell(dt, cvInput.leftArmRaised, cvInput.leftFistClosed, camera, scene);

    // Left hand + forearm charge glow effect
    const dashState = getDashState();
    const chargeLevel = getDashCharge();

    let emissiveHex = 0x000000;
    let emissiveIntensity = 0;

    if (dashState === 'charging' && chargeLevel < 1) {
      emissiveHex = 0xff6600;
      emissiveIntensity = chargeLevel * 3;
    } else if (dashState === 'charging' && chargeLevel >= 1) {
      // Pulsing glow when fully charged, waiting for release
      emissiveHex = 0xff6600;
      emissiveIntensity = 2.5 + Math.sin(Date.now() * 0.01) * 1.5;
    } else if (dashState === 'dashing') {
      emissiveHex = 0xffaa00;
      emissiveIntensity = 4;
    }

    // Apply glow to all left hand + forearm meshes
    const applyGlow = (group: THREE.Group) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissive.setHex(emissiveHex);
            mat.emissiveIntensity = emissiveIntensity;
          }
        }
      });
    };
    applyGlow(lHand);
    if (dashState !== 'idle') applyGlow(lForearm);
  });

  return (
    <group ref={groupRef}>
      {/* ---- Right arm ---- */}
      <primitive object={rShoulderJoint} />
      <primitive object={rElbowJoint} />
      <primitive object={rWristJoint} />
      <primitive object={rUpperArm} />
      <primitive object={rForearm} />
      <primitive object={rHand} />

      {/* ---- Left arm ---- */}
      <primitive object={lShoulderJoint} />
      <primitive object={lElbowJoint} />
      <primitive object={lWristJoint} />
      <primitive object={lUpperArm} />
      <primitive object={lForearm} />
      <primitive object={lHand} />

      {/* Sword — extension of the arm, driven by red stick detection */}
      <group ref={swordGroupRef} scale={0.65}>
        <primitive object={sword} />
      </group>

      {/* Gun — visible when gun is active */}
      <group ref={gunGroupRef} scale={0.55}>
        <primitive object={gun} />
      </group>

      {/* Shield — visible when shield is active */}
      <group ref={shieldGroupRef} scale={0.45}>
        <primitive object={shield} />
      </group>
    </group>
  );
}
