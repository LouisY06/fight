// =============================================================================
// ProceduralMechaModel.tsx — High-poly mecha built from hierarchical primitives
// Torso → Head (visor), Arms (Upper → Lower), Legs. Walking bob, arm swing,
// optional CV sync for shoulder/elbow/wrist.
// =============================================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cvBridge } from '../cv/cvBridge';
import { usePlayerTexture } from './usePlayerTexture';

const TARGET_HEIGHT = 2;
const WALK_SPEED = 10;
const WALK_TORSO_BOB = 0.05;
const WALK_ARM_AMP = 0.25;
const SWING_DURATION = 0.35;
const SWING_ARM_PITCH = -1.2;

// MediaPipe Pose landmark indices
const RIGHT_SHOULDER = 12;
const RIGHT_ELBOW = 14;
const RIGHT_WRIST = 16;
const LEFT_SHOULDER = 11;
const LEFT_ELBOW = 13;
const LEFT_WRIST = 15;

export interface ProceduralMechaModelProps {
  color?: string;
  targetHeight?: number;
  isWalking?: boolean;
  isWalkingRef?: React.MutableRefObject<boolean>;
  isSwinging: boolean;
  /** Enable CV pose sync for arm joints (requires cvEnabled + tracking). */
  enableCVSync?: boolean;
  /** Override visor emissive intensity (e.g. for intro Power On: 0 → 2). Default 1.2. */
  visorIntensity?: number;
  /** When set, visor intensity is driven from this ref every frame (e.g. intro animation). Overrides visorIntensity. */
  visorIntensityRef?: React.MutableRefObject<number>;
  /** Optional ref to receive the Torso group (for IntroSequencer / Glambot targeting). */
  torsoRef?: React.MutableRefObject<THREE.Group | null>;
}

const matArmor = { metalness: 0.8, roughness: 0.2 };
const matBolt = { metalness: 0.9, roughness: 0.1 };

/** Refs for procedural mech joints — use for Glambot/intro targeting or direct CV mapping. */
export interface MechPartRefs {
  torso: React.MutableRefObject<THREE.Group | null>;
  head: React.MutableRefObject<THREE.Group | null>;
  upperArmL: React.MutableRefObject<THREE.Group | null>;
  lowerArmL: React.MutableRefObject<THREE.Group | null>;
  upperArmR: React.MutableRefObject<THREE.Group | null>;
  lowerArmR: React.MutableRefObject<THREE.Group | null>;
  upperLegL: React.MutableRefObject<THREE.Group | null>;
  upperLegR: React.MutableRefObject<THREE.Group | null>;
}

/** Compute angle from shoulder→elbow→wrist for CV arm mapping. */
function armAngleFromLandmarks(
  shoulder: { x: number; y: number; z: number },
  elbow: { x: number; y: number; z: number },
  wrist: { x: number; y: number; z: number }
): { shoulderPitch: number; elbowPitch: number } {
  const s = new THREE.Vector3(shoulder.x, shoulder.y, shoulder.z);
  const e = new THREE.Vector3(elbow.x, elbow.y, elbow.z);
  const w = new THREE.Vector3(wrist.x, wrist.y, wrist.z);
  const upper = new THREE.Vector3().subVectors(e, s);
  const lower = new THREE.Vector3().subVectors(w, e);
  const shoulderPitch = Math.atan2(-upper.y, upper.length());
  const elbowAngle = upper.angleTo(lower);
  const elbowPitch = Math.PI - elbowAngle; // bend at elbow
  return { shoulderPitch, elbowPitch };
}

export function ProceduralMechaModel({
  color = '#4488cc',
  targetHeight = TARGET_HEIGHT,
  isWalking = false,
  isWalkingRef,
  isSwinging,
  enableCVSync = false,
  visorIntensity = 1.2,
  visorIntensityRef,
  torsoRef: torsoRefProp,
}: ProceduralMechaModelProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const torsoRef = useRef<THREE.Group>(null!);
  const setTorsoRef = (el: THREE.Group | null) => {
    (torsoRef as React.MutableRefObject<THREE.Group | null>).current = el;
    if (torsoRefProp) torsoRefProp.current = el;
  };
  const headRef = useRef<THREE.Group>(null!);
  const upperArmLRef = useRef<THREE.Group>(null!);
  const lowerArmLRef = useRef<THREE.Group>(null!);
  const upperArmRRef = useRef<THREE.Group>(null!);
  const lowerArmRRef = useRef<THREE.Group>(null!);
  const upperLegLRef = useRef<THREE.Group>(null!);
  const upperLegRRef = useRef<THREE.Group>(null!);

  const cvEnabled = cvBridge.cvEnabled;
  const cvInputRef = cvBridge.cvInputRef;
  const worldLandmarksRef = cvBridge.worldLandmarksRef;
  const walkTime = useRef(0);
  const swingTime = useRef(0);
  const wasSwinging = useRef(false);
  const visorMeshRef = useRef<THREE.Mesh>(null!);
  const armorTexture = usePlayerTexture();

  const scale = targetHeight / TARGET_HEIGHT;

  useFrame((_, delta) => {
    const lerp = Math.min(1, delta * 8);
    const walking = isWalkingRef ? isWalkingRef.current : isWalking;
    const time = walkTime.current;

    if (walking) {
      walkTime.current += delta;
    } else {
      walkTime.current *= 0.95;
    }

    const phase = time * WALK_SPEED;
    const torsoBob = Math.sin(phase) * WALK_TORSO_BOB;
    const armPhase = Math.cos(phase) * WALK_ARM_AMP;
    const legPhase = Math.sin(phase) * 0.5;

    // Torso bob
    if (torsoRef.current) {
      torsoRef.current.position.y = THREE.MathUtils.lerp(
        torsoRef.current.position.y,
        torsoBob,
        lerp
      );
    }

    // Legs
    if (upperLegLRef.current) {
      upperLegLRef.current.rotation.x = THREE.MathUtils.lerp(
        upperLegLRef.current.rotation.x,
        legPhase,
        lerp
      );
    }
    if (upperLegRRef.current) {
      upperLegRRef.current.rotation.x = THREE.MathUtils.lerp(
        upperLegRRef.current.rotation.x,
        -legPhase,
        lerp
      );
    }

    // Intro / Power On: drive visor from ref when provided
    if (visorIntensityRef && visorMeshRef.current?.material) {
      (visorMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        visorIntensityRef.current;
    }

    const useCV = enableCVSync && cvEnabled && cvInputRef.current?.isTracking;
    const landmarks = worldLandmarksRef?.current;

    if (useCV && landmarks && landmarks.length >= 17) {
      // CV sync — map MediaPipe landmarks to arm joints
      const rs = landmarks[RIGHT_SHOULDER];
      const re = landmarks[RIGHT_ELBOW];
      const rw = landmarks[RIGHT_WRIST];
      const ls = landmarks[LEFT_SHOULDER];
      const le = landmarks[LEFT_ELBOW];
      const lw = landmarks[LEFT_WRIST];
      if (rs && re && rw && ls && le && lw) {
        const right = armAngleFromLandmarks(rs, re, rw);
        const left = armAngleFromLandmarks(ls, le, lw);
        if (upperArmRRef.current) {
          upperArmRRef.current.rotation.x = THREE.MathUtils.lerp(
            upperArmRRef.current.rotation.x,
            right.shoulderPitch * 0.8,
            lerp
          );
        }
        if (lowerArmRRef.current) {
          lowerArmRRef.current.rotation.x = THREE.MathUtils.lerp(
            lowerArmRRef.current.rotation.x,
            right.elbowPitch * 0.5,
            lerp
          );
        }
        if (upperArmLRef.current) {
          upperArmLRef.current.rotation.x = THREE.MathUtils.lerp(
            upperArmLRef.current.rotation.x,
            left.shoulderPitch * 0.8,
            lerp
          );
        }
        if (lowerArmLRef.current) {
          lowerArmLRef.current.rotation.x = THREE.MathUtils.lerp(
            lowerArmLRef.current.rotation.x,
            left.elbowPitch * 0.5,
            lerp
          );
        }
      }
    } else {
      // Procedural arm swing
      if (upperArmLRef.current) {
        upperArmLRef.current.rotation.x = THREE.MathUtils.lerp(
          upperArmLRef.current.rotation.x,
          -armPhase,
          lerp
        );
      }
      if (lowerArmLRef.current) {
        lowerArmLRef.current.rotation.x = THREE.MathUtils.lerp(
          lowerArmLRef.current.rotation.x,
          0,
          lerp
        );
      }
      if (upperArmRRef.current) {
        const baseArm = -armPhase;
        if (isSwinging) {
          wasSwinging.current = true;
          swingTime.current = Math.min(1, swingTime.current + delta / SWING_DURATION);
          const swingPitch = SWING_ARM_PITCH * swingTime.current;
          upperArmRRef.current.rotation.x = THREE.MathUtils.lerp(
            upperArmRRef.current.rotation.x,
            swingPitch * 0.7,
            lerp
          );
          if (lowerArmRRef.current) {
            lowerArmRRef.current.rotation.x = THREE.MathUtils.lerp(
              lowerArmRRef.current.rotation.x,
              swingPitch * 0.5,
              lerp
            );
          }
        } else {
          if (wasSwinging.current) {
            swingTime.current = Math.max(0, swingTime.current - delta / SWING_DURATION);
            const swingPitch = SWING_ARM_PITCH * swingTime.current;
            upperArmRRef.current.rotation.x = THREE.MathUtils.lerp(
              upperArmRRef.current.rotation.x,
              swingPitch * 0.7,
              lerp
            );
            if (lowerArmRRef.current) {
              lowerArmRRef.current.rotation.x = THREE.MathUtils.lerp(
                lowerArmRRef.current.rotation.x,
                swingPitch * 0.5,
                lerp
              );
            }
            if (swingTime.current <= 0) wasSwinging.current = false;
          } else {
            upperArmRRef.current.rotation.x = THREE.MathUtils.lerp(
              upperArmRRef.current.rotation.x,
              baseArm,
              lerp
            );
            if (lowerArmRRef.current) {
              lowerArmRRef.current.rotation.x = THREE.MathUtils.lerp(
                lowerArmRRef.current.rotation.x,
                0,
                lerp
              );
            }
          }
        }
      }
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      {/* Torso — bulky armored core */}
      <group ref={setTorsoRef} position={[0, 1.0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.7, 0.35]} />
          <meshStandardMaterial color="#334455" map={armorTexture} {...matArmor} />
        </mesh>
        {/* Chest plate */}
        <mesh position={[0, 0.15, 0.18]} castShadow>
          <boxGeometry args={[0.4, 0.5, 0.08]} />
          <meshStandardMaterial color={color} map={armorTexture} metalness={0.6} roughness={0.3} emissive={color} emissiveIntensity={0.15} />
        </mesh>

        {/* Head — with visor glow */}
        <group ref={headRef} position={[0, 0.55, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
            <meshStandardMaterial color="#2a3540" map={armorTexture} {...matArmor} />
          </mesh>
          {/* Visor */}
          <mesh ref={visorMeshRef} position={[0, 0, 0.16]} castShadow>
            <boxGeometry args={[0.2, 0.1, 0.02]} />
            <meshStandardMaterial
              color={color}
              metalness={0.3}
              roughness={0.1}
              emissive={color}
              emissiveIntensity={visorIntensityRef ? 0 : visorIntensity}
            />
          </mesh>
          {/* Bolt at head joint */}
          <mesh position={[0.12, -0.18, 0]} castShadow>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color="#888" {...matBolt} />
          </mesh>
        </group>

        {/* Left arm — hierarchical: Upper → Lower */}
        <group ref={upperArmLRef} position={[-0.32, 0.35, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.08, 0.35, 32]} />
            <meshStandardMaterial color="#3a4555" map={armorTexture} {...matArmor} />
          </mesh>
          <mesh position={[0, 0.1, 0]} castShadow>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#666" {...matBolt} />
          </mesh>
          <group ref={lowerArmLRef} position={[0, 0.2, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.07, 0.06, 0.3, 32]} />
              <meshStandardMaterial color="#3a4555" map={armorTexture} {...matArmor} />
            </mesh>
            <mesh position={[0, 0.08, 0]} castShadow>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshStandardMaterial color="#666" {...matBolt} />
            </mesh>
          </group>
        </group>

        {/* Right arm (sword arm) */}
        <group ref={upperArmRRef} position={[0.32, 0.35, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.08, 0.35, 32]} />
            <meshStandardMaterial color="#3a4555" map={armorTexture} {...matArmor} />
          </mesh>
          <mesh position={[0, 0.1, 0]} castShadow>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#666" {...matBolt} />
          </mesh>
          <group ref={lowerArmRRef} position={[0, 0.2, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.07, 0.06, 0.3, 32]} />
              <meshStandardMaterial color="#3a4555" map={armorTexture} {...matArmor} />
            </mesh>
            <mesh position={[0, 0.08, 0]} castShadow>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshStandardMaterial color="#666" {...matBolt} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Legs — hip joints at torso bottom */}
      <group ref={upperLegLRef} position={[-0.14, 0.65, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.5, 32]} />
          <meshStandardMaterial color="#2a3540" map={armorTexture} {...matArmor} />
        </mesh>
        <mesh position={[0, -0.08, 0]} castShadow>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#666" {...matBolt} />
        </mesh>
      </group>
      <group ref={upperLegRRef} position={[0.14, 0.65, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.5, 32]} />
          <meshStandardMaterial color="#2a3540" map={armorTexture} {...matArmor} />
        </mesh>
        <mesh position={[0, -0.08, 0]} castShadow>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#666" {...matBolt} />
        </mesh>
      </group>
    </group>
  );
}
