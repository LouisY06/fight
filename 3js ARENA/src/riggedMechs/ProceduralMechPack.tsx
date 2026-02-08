// =============================================================================
// ProceduralMechPack.tsx — 5 high-poly procedural mech designs
// Replaces rigged_mechs_pack_2.glb with code-based models.
// Each mech has unique geometry/colors, shares walk/swing/idle animation.
// =============================================================================

import { useRef, useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { makeSword } from '../avatars/MechaGeometry';

// ---- Shared animation constants ----
const WALK_SPEED = 5;
const WALK_LEG_AMP = 0.4;
const WALK_ARM_AMP = 0.3;
const WALK_TORSO_TWIST = 0.025;
const WALK_BOB = 0.015;

const SWING_DURATION = 0.35;
const SWING_SHOULDER_PITCH = -1.4;
const SWING_SHOULDER_YAW = -0.6;
const SWING_SHOULDER_ROLL = 0.3;
const SWING_FOREARM_PITCH = -0.8;
const SWING_FOREARM_ROLL = -0.4;

const _euler = new THREE.Euler();
const _targetQuat = new THREE.Quaternion();
const _restQuat = new THREE.Quaternion();

// Shared material props
const HI = 10; // medium-poly — 32 was killing FPS; 10 looks identical at game distance

// =============================================================================
// Shared prop interface
// =============================================================================
export interface ProceduralMechProps {
  color?: string;
  scaleHead?: number;
  scaleTorso?: number;
  scaleArms?: number;
  scaleLegs?: number;
  isSwinging?: boolean;
  isWalking?: boolean;
  isWalkingRef?: MutableRefObject<boolean>;
  swordRef?: MutableRefObject<THREE.Group | null>;
}

// =============================================================================
// Shared animation hook
// =============================================================================
interface AnimRefs {
  rootRef: React.RefObject<THREE.Group>;
  torsoRef: React.RefObject<THREE.Group>;
  rightUpperArmRef: React.RefObject<THREE.Group>;
  rightForearmRef: React.RefObject<THREE.Group>;
  leftUpperArmRef: React.RefObject<THREE.Group>;
  leftForearmRef: React.RefObject<THREE.Group>;
  leftLegRef: React.RefObject<THREE.Group>;
  rightLegRef: React.RefObject<THREE.Group>;
}

function useMechAnimation(
  refs: AnimRefs,
  props: Pick<ProceduralMechProps, 'isSwinging' | 'isWalking' | 'isWalkingRef'>,
) {
  const { isSwinging = false, isWalking = false, isWalkingRef } = props;
  const phase = useGameStore((s) => s.phase);
  const walkTime = useRef(0);
  const swingTime = useRef(0);
  const wasSwinging = useRef(false);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const walking = isWalkingRef ? isWalkingRef.current : isWalking;
    const lerpFactor = Math.min(1, delta * 8);

    // ---- Idle micro-motion ----
    if (refs.rootRef.current) {
      const bob = Math.sin(t * 1.5) * 0.015;
      const sway = Math.sin(t * 0.8) * 0.012;
      refs.rootRef.current.position.y = bob;
      if (!walking && !isSwinging) {
        refs.rootRef.current.rotation.y = sway;
      } else {
        refs.rootRef.current.rotation.y *= 0.9;
      }
    }

    // ---- Walk ----
    if (walking) {
      walkTime.current += delta;
    } else {
      walkTime.current *= 0.92;
    }

    const walkLerp = walking ? lerpFactor : 0.1;
    const walkPhase = walkTime.current * WALK_SPEED;
    const sinP = Math.sin(walkPhase);

    if (refs.leftLegRef.current) {
      _euler.set(sinP * WALK_LEG_AMP, 0, 0);
      _targetQuat.setFromEuler(_euler);
      refs.leftLegRef.current.quaternion.slerp(_targetQuat, walkLerp);
    }
    if (refs.rightLegRef.current) {
      _euler.set(-sinP * WALK_LEG_AMP, 0, 0);
      _targetQuat.setFromEuler(_euler);
      refs.rightLegRef.current.quaternion.slerp(_targetQuat, walkLerp);
    }
    if (refs.leftUpperArmRef.current) {
      _euler.set(-sinP * WALK_ARM_AMP, 0, 0);
      _targetQuat.setFromEuler(_euler);
      refs.leftUpperArmRef.current.quaternion.slerp(_targetQuat, walkLerp);
    }
    if (refs.leftForearmRef.current && !walking) {
      refs.leftForearmRef.current.quaternion.slerp(_restQuat, 0.08);
    }
    if (refs.rightUpperArmRef.current && !isSwinging && !wasSwinging.current) {
      _euler.set(sinP * WALK_ARM_AMP, 0, 0);
      _targetQuat.setFromEuler(_euler);
      refs.rightUpperArmRef.current.quaternion.slerp(_targetQuat, walkLerp);
    }
    if (refs.torsoRef.current) {
      const twistTarget = walking ? sinP * WALK_TORSO_TWIST : 0;
      _euler.set(0, twistTarget, 0);
      _targetQuat.setFromEuler(_euler);
      refs.torsoRef.current.quaternion.slerp(_targetQuat, walkLerp);
      const bobAmount = walking ? Math.abs(Math.cos(walkPhase)) * WALK_BOB : 0;
      refs.torsoRef.current.position.y = 1.05 + bobAmount;
    }

    // ---- Swing ----
    if (isSwinging) {
      wasSwinging.current = true;
      swingTime.current = Math.min(1, swingTime.current + delta / SWING_DURATION);
    } else if (wasSwinging.current) {
      swingTime.current = Math.max(0, swingTime.current - delta / SWING_DURATION);
      if (swingTime.current <= 0) wasSwinging.current = false;
    }

    if (wasSwinging.current || isSwinging) {
      const st = swingTime.current;
      const ease = st < 0.5 ? 2 * st * st : 1 - Math.pow(-2 * st + 2, 2) / 2;

      if (refs.rightUpperArmRef.current) {
        _euler.set(ease * SWING_SHOULDER_PITCH, ease * SWING_SHOULDER_YAW, ease * SWING_SHOULDER_ROLL);
        _targetQuat.setFromEuler(_euler);
        refs.rightUpperArmRef.current.quaternion.slerp(_targetQuat, lerpFactor);
      }
      if (refs.rightForearmRef.current) {
        _euler.set(ease * SWING_FOREARM_PITCH, 0, ease * SWING_FOREARM_ROLL);
        _targetQuat.setFromEuler(_euler);
        refs.rightForearmRef.current.quaternion.slerp(_targetQuat, lerpFactor);
      }
    }

    if (!isSwinging && !wasSwinging.current) {
      if (refs.rightForearmRef.current) {
        refs.rightForearmRef.current.quaternion.slerp(_restQuat, 0.08);
      }
    }

    // Visor flicker during intro
    if (phase === 'intro' && refs.rootRef.current) {
      // handled per-mech if visorRef exists
    }
  });
}

function useMechRefs(): AnimRefs {
  return {
    rootRef: useRef<THREE.Group>(null!),
    torsoRef: useRef<THREE.Group>(null!),
    rightUpperArmRef: useRef<THREE.Group>(null!),
    rightForearmRef: useRef<THREE.Group>(null!),
    leftUpperArmRef: useRef<THREE.Group>(null!),
    leftForearmRef: useRef<THREE.Group>(null!),
    leftLegRef: useRef<THREE.Group>(null!),
    rightLegRef: useRef<THREE.Group>(null!),
  };
}

// =============================================================================
// Shared sub-components
// =============================================================================

function Bolt({ position, color = '#3d3d48' }: { position: [number, number, number]; color?: string }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.025, 6, 6]} />
      <meshStandardMaterial color={color} metalness={0.92} roughness={0.1} />
    </mesh>
  );
}

function GlowBand({
  position,
  innerR = 0.06,
  outerR = 0.095,
  color,
  intensity = 1.5,
}: {
  position: [number, number, number];
  innerR?: number;
  outerR?: number;
  color: string;
  intensity?: number;
}) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[innerR, outerR, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} side={THREE.DoubleSide} />
    </mesh>
  );
}

function GlowStrip({
  position,
  args = [0.12, 0.03],
  color,
  intensity = 1.3,
  rotation = [0, 0, 0] as [number, number, number],
}: {
  position: [number, number, number];
  args?: [number, number];
  color: string;
  intensity?: number;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={args} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ArmorPlate({
  position,
  args,
  color,
  metalness = 0.85,
  roughness = 0.18,
  rotation,
}: {
  position: [number, number, number];
  args: [number, number, number];
  color: string;
  metalness?: number;
  roughness?: number;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

// Sword helper
function SwordAttachment({
  swordRef,
  swordMesh,
}: {
  swordRef?: MutableRefObject<THREE.Group | null>;
  swordMesh: THREE.Group;
}) {
  return (
    <group
      ref={(node) => {
        if (swordRef) swordRef.current = node;
      }}
      position={[0, -0.02, 0.02]}
      rotation={[Math.PI, 0, 0]}
      scale={[0.3, 0.3, 0.3]}
    >
      <primitive object={swordMesh} />
    </group>
  );
}

// =============================================================================
// MECH 0 — VANGUARD (Samurai)
// Silver/gray body, red left arm, brown/copper accents, conical kasa hat
// =============================================================================

const V_PRIMARY = '#8a8d94';
const V_SECONDARY = '#5a5e66';
const V_DARK = '#2a2d33';
const V_RED = '#cc2222';
const V_RED_DARK = '#881818';
const V_COPPER = '#8b6914';
const V_GLOW = '#dd4444';

export function VanguardMech(props: ProceduralMechProps) {
  const {
    color = V_GLOW,
    scaleHead = 1, scaleTorso = 1, scaleArms = 1, scaleLegs = 1,
    isSwinging = false, isWalking = false, isWalkingRef, swordRef,
  } = props;
  const refs = useMechRefs();
  const swordMesh = useMemo(() => makeSword(), []);
  useMechAnimation(refs, { isSwinging, isWalking, isWalkingRef });
  const mat = { metalness: 0.85, roughness: 0.18 };

  return (
    <group ref={refs.rootRef} scale={[1.1, 1.1, 1.1]}>
      <group ref={refs.torsoRef} position={[0, 1.05, 0]} scale={[scaleTorso, scaleTorso, scaleTorso]}>
        {/* Main chest plate - silver */}
        <mesh castShadow receiveShadow position={[0, 0.08, 0.1]}>
          <boxGeometry args={[0.54, 0.48, 0.22]} />
          <meshStandardMaterial color={V_PRIMARY} {...mat} />
        </mesh>
        {/* Chest layered armor */}
        <mesh castShadow receiveShadow position={[0, 0.14, 0.22]}>
          <boxGeometry args={[0.44, 0.3, 0.04]} />
          <meshStandardMaterial color={V_SECONDARY} {...mat} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, -0.02, 0.22]}>
          <boxGeometry args={[0.38, 0.12, 0.03]} />
          <meshStandardMaterial color={V_DARK} {...mat} />
        </mesh>
        {/* Side chest armor */}
        {[-1, 1].map((s) => (
          <group key={`vc${s}`} position={[s * 0.34, 0.08, 0.06]} rotation={[0, 0, s * 0.1]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.1, 0.42, 0.26]} />
              <meshStandardMaterial color={V_SECONDARY} {...mat} />
            </mesh>
          </group>
        ))}
        {/* Copper accent strips */}
        <GlowStrip position={[0.15, 0.18, 0.245]} args={[0.08, 0.04]} color={V_COPPER} intensity={0.4} />
        <GlowStrip position={[-0.15, 0.18, 0.245]} args={[0.08, 0.04]} color={V_COPPER} intensity={0.4} />
        {/* Waist */}
        <mesh castShadow receiveShadow position={[0, -0.36, 0.06]}>
          <cylinderGeometry args={[0.2, 0.24, 0.18, HI]} />
          <meshStandardMaterial color={V_DARK} {...mat} />
        </mesh>
        {/* Back plate */}
        <mesh castShadow receiveShadow position={[0, 0.08, -0.14]}>
          <boxGeometry args={[0.48, 0.42, 0.08]} />
          <meshStandardMaterial color={V_DARK} {...mat} />
        </mesh>
        <Bolt position={[0.18, 0.15, 0.245]} color={V_COPPER} />
        <Bolt position={[-0.18, 0.15, 0.245]} color={V_COPPER} />

        {/* ---- HEAD: Samurai with kasa hat ---- */}
        <group position={[0, 0.42, 0.08]} scale={[scaleHead, scaleHead, scaleHead]}>
          {/* Helmet base */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.24, 0.26]} />
            <meshStandardMaterial color={V_PRIMARY} {...mat} />
          </mesh>
          {/* Face plate */}
          <mesh castShadow receiveShadow position={[0, -0.04, 0.02]}>
            <boxGeometry args={[0.26, 0.16, 0.24]} />
            <meshStandardMaterial color={V_DARK} {...mat} />
          </mesh>
          {/* Visor slit */}
          <mesh position={[0, 0, 0.14]} castShadow>
            <planeGeometry args={[0.2, 0.04]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} />
          </mesh>
          {/* Kasa (conical hat) */}
          <mesh castShadow receiveShadow position={[0, 0.18, -0.02]} rotation={[0.05, 0, 0]}>
            <coneGeometry args={[0.42, 0.12, HI]} />
            <meshStandardMaterial color={V_SECONDARY} metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Hat brim extension */}
          <mesh castShadow receiveShadow position={[0, 0.14, -0.02]}>
            <cylinderGeometry args={[0.44, 0.38, 0.04, HI]} />
            <meshStandardMaterial color={V_SECONDARY} metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Hat copper trim */}
          <mesh position={[0, 0.125, -0.02]}>
            <torusGeometry args={[0.4, 0.008, 8, HI]} />
            <meshStandardMaterial color={V_COPPER} metalness={0.9} roughness={0.15} />
          </mesh>
          {/* Chin guard */}
          <mesh castShadow receiveShadow position={[0, -0.12, 0.06]}>
            <boxGeometry args={[0.22, 0.06, 0.16]} />
            <meshStandardMaterial color={V_PRIMARY} {...mat} />
          </mesh>
          {/* Side cheek plates */}
          {[-1, 1].map((s) => (
            <mesh key={`sch${s}`} castShadow position={[s * 0.14, -0.02, 0]}>
              <boxGeometry args={[0.04, 0.18, 0.2]} />
              <meshStandardMaterial color={V_SECONDARY} {...mat} />
            </mesh>
          ))}
          <Bolt position={[0.12, -0.08, 0.14]} color={V_COPPER} />
          <Bolt position={[-0.12, -0.08, 0.14]} color={V_COPPER} />
        </group>

        {/* ---- LEFT ARM (RED — distinctive samurai asymmetry) ---- */}
        <group position={[-0.4, 0.16, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
          {/* Shoulder pad */}
          <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
            <boxGeometry args={[0.2, 0.16, 0.22]} />
            <meshStandardMaterial color={V_RED} {...mat} />
          </mesh>
          <mesh castShadow position={[-0.02, 0.1, 0]}>
            <boxGeometry args={[0.18, 0.06, 0.2]} />
            <meshStandardMaterial color={V_RED_DARK} {...mat} />
          </mesh>
          <Bolt position={[0.06, 0.06, 0.12]} color={V_COPPER} />
          <group ref={refs.leftUpperArmRef} position={[-0.16, -0.06, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.075, 0.065, 0.28, HI]} />
              <meshStandardMaterial color={V_RED} {...mat} />
            </mesh>
            <GlowBand position={[0, 0.08, 0]} color={V_GLOW} />
            <GlowBand position={[0, -0.08, 0]} color={V_GLOW} />
            {/* Red armor plates on upper arm */}
            <mesh castShadow position={[0, 0, 0.07]}>
              <boxGeometry args={[0.12, 0.22, 0.03]} />
              <meshStandardMaterial color={V_RED_DARK} {...mat} />
            </mesh>
            <mesh castShadow position={[0, -0.16, 0]}>
              <sphereGeometry args={[0.055, HI, HI]} />
              <meshStandardMaterial color={V_DARK} {...mat} />
            </mesh>
            <group ref={refs.leftForearmRef} position={[0, -0.33, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.065, 0.06, 0.22, HI]} />
                <meshStandardMaterial color={V_RED} {...mat} />
              </mesh>
              <GlowBand position={[0, 0.06, 0]} innerR={0.05} outerR={0.08} color={V_GLOW} />
              <mesh castShadow position={[0, 0, 0.06]}>
                <boxGeometry args={[0.1, 0.18, 0.02]} />
                <meshStandardMaterial color={V_RED_DARK} {...mat} />
              </mesh>
              {/* Hand */}
              <group position={[0, -0.14, 0.03]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.09, 0.07, 0.07]} />
                  <meshStandardMaterial color={V_RED_DARK} {...mat} />
                </mesh>
                {[0.03, 0, -0.03].map((x, i) => (
                  <mesh key={`lf${i}`} castShadow position={[x, 0.03, 0.04]}>
                    <boxGeometry args={[0.025, 0.04, 0.04]} />
                    <meshStandardMaterial color={V_RED} {...mat} />
                  </mesh>
                ))}
              </group>
            </group>
          </group>
        </group>

        {/* ---- RIGHT ARM (Silver — sword arm) ---- */}
        <group position={[0.4, 0.16, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
          <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
            <boxGeometry args={[0.2, 0.16, 0.22]} />
            <meshStandardMaterial color={V_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0.02, 0.1, 0]}>
            <boxGeometry args={[0.18, 0.06, 0.2]} />
            <meshStandardMaterial color={V_SECONDARY} {...mat} />
          </mesh>
          <Bolt position={[-0.06, 0.06, 0.12]} color={V_COPPER} />
          <group ref={refs.rightUpperArmRef} position={[0.16, -0.06, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.075, 0.065, 0.28, HI]} />
              <meshStandardMaterial color={V_PRIMARY} {...mat} />
            </mesh>
            <GlowBand position={[0, 0.08, 0]} color={color} />
            <GlowBand position={[0, -0.08, 0]} color={color} />
            <mesh castShadow position={[0, 0, 0.07]}>
              <boxGeometry args={[0.12, 0.22, 0.03]} />
              <meshStandardMaterial color={V_SECONDARY} {...mat} />
            </mesh>
            <mesh castShadow position={[0, -0.16, 0]}>
              <sphereGeometry args={[0.055, HI, HI]} />
              <meshStandardMaterial color={V_DARK} {...mat} />
            </mesh>
            <group ref={refs.rightForearmRef} position={[0, -0.33, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.065, 0.06, 0.22, HI]} />
                <meshStandardMaterial color={V_PRIMARY} {...mat} />
              </mesh>
              <GlowBand position={[0, 0.06, 0]} innerR={0.05} outerR={0.08} color={color} />
              <mesh castShadow position={[0, 0, 0.06]}>
                <boxGeometry args={[0.1, 0.18, 0.02]} />
                <meshStandardMaterial color={V_SECONDARY} {...mat} />
              </mesh>
              <group position={[0, -0.14, 0.03]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.09, 0.07, 0.07]} />
                  <meshStandardMaterial color={V_DARK} {...mat} />
                </mesh>
                {[0.03, 0, -0.03].map((x, i) => (
                  <mesh key={`rf${i}`} castShadow position={[x, 0.03, 0.04]}>
                    <boxGeometry args={[0.025, 0.04, 0.04]} />
                    <meshStandardMaterial color={V_SECONDARY} {...mat} />
                  </mesh>
                ))}
                <SwordAttachment swordRef={swordRef} swordMesh={swordMesh} />
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ---- LEGS ---- */}
      {[-1, 1].map((side) => (
        <group
          key={`vleg${side}`}
          ref={side === -1 ? refs.leftLegRef : refs.rightLegRef}
          position={[side * 0.14, 0.68, 0]}
          scale={[scaleLegs, scaleLegs, scaleLegs]}
        >
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.11, 0.09, 0.4, HI]} />
            <meshStandardMaterial color={V_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0, 0, 0.1]}>
            <boxGeometry args={[0.14, 0.32, 0.03]} />
            <meshStandardMaterial color={V_SECONDARY} {...mat} />
          </mesh>
          <GlowStrip position={[side * 0.04, 0.06, 0.115]} args={[0.06, 0.2]} color={color} rotation={[0, 0, Math.PI / 2]} />
          <Bolt position={[side * 0.04, -0.15, 0.09]} color={V_COPPER} />
          {/* Lower leg */}
          <mesh castShadow receiveShadow position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.3, HI]} />
            <meshStandardMaterial color={V_SECONDARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0, -0.28, 0.07]}>
            <boxGeometry args={[0.12, 0.24, 0.025]} />
            <meshStandardMaterial color={V_PRIMARY} {...mat} />
          </mesh>
          {/* Foot */}
          <group position={[0, -0.46, 0.05]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.13, 0.05, 0.18]} />
              <meshStandardMaterial color={V_DARK} {...mat} />
            </mesh>
            <mesh castShadow position={[0, 0, 0.06]}>
              <boxGeometry args={[0.11, 0.04, 0.08]} />
              <meshStandardMaterial color={V_PRIMARY} {...mat} />
            </mesh>
            {/* Copper toe accent */}
            <mesh castShadow position={[0, -0.01, 0.08]}>
              <boxGeometry args={[0.08, 0.02, 0.04]} />
              <meshStandardMaterial color={V_COPPER} metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// =============================================================================
// MECH 1 — SENTINEL (Dark Knight)
// Charcoal/black with crimson accents, T-shaped visor, heavy angular armor
// =============================================================================

const S_PRIMARY = '#2a2a32';
const S_SECONDARY = '#1e1e26';
const S_DARK = '#121218';
const S_ACCENT = '#cc2244';
const S_GLOW = '#ff2244';

export function SentinelMech(props: ProceduralMechProps) {
  const {
    color = S_GLOW,
    scaleHead = 1, scaleTorso = 1, scaleArms = 1, scaleLegs = 1,
    isSwinging = false, isWalking = false, isWalkingRef, swordRef,
  } = props;
  const refs = useMechRefs();
  const swordMesh = useMemo(() => makeSword(), []);
  useMechAnimation(refs, { isSwinging, isWalking, isWalkingRef });
  const mat = { metalness: 0.88, roughness: 0.15 };

  return (
    <group ref={refs.rootRef} scale={[1.1, 1.1, 1.1]}>
      <group ref={refs.torsoRef} position={[0, 1.05, 0]} scale={[scaleTorso, scaleTorso, scaleTorso]}>
        {/* Main chest — dark and angular */}
        <mesh castShadow receiveShadow position={[0, 0.08, 0.1]}>
          <boxGeometry args={[0.56, 0.5, 0.24]} />
          <meshStandardMaterial color={S_PRIMARY} {...mat} />
        </mesh>
        {/* Front armor plates */}
        <mesh castShadow receiveShadow position={[0, 0.12, 0.23]}>
          <boxGeometry args={[0.46, 0.36, 0.04]} />
          <meshStandardMaterial color={S_SECONDARY} {...mat} />
        </mesh>
        {/* Crimson accent strip across chest */}
        <GlowStrip position={[0, 0.02, 0.255]} args={[0.38, 0.025]} color={S_ACCENT} intensity={1.2} />
        <GlowStrip position={[0, -0.06, 0.255]} args={[0.32, 0.02]} color={S_ACCENT} intensity={0.8} />
        {/* Side armor */}
        {[-1, 1].map((s) => (
          <group key={`sc${s}`} position={[s * 0.36, 0.08, 0.06]} rotation={[0, 0, s * 0.12]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.12, 0.44, 0.28]} />
              <meshStandardMaterial color={S_PRIMARY} {...mat} />
            </mesh>
            <GlowStrip position={[0, 0, 0.145]} args={[0.08, 0.3]} color={S_ACCENT} intensity={0.6} rotation={[0, 0, Math.PI / 2]} />
          </group>
        ))}
        {/* Waist */}
        <mesh castShadow receiveShadow position={[0, -0.36, 0.06]}>
          <cylinderGeometry args={[0.22, 0.26, 0.2, HI]} />
          <meshStandardMaterial color={S_DARK} {...mat} />
        </mesh>
        {/* Back armor */}
        <mesh castShadow receiveShadow position={[0, 0.08, -0.16]}>
          <boxGeometry args={[0.5, 0.44, 0.08]} />
          <meshStandardMaterial color={S_DARK} {...mat} />
        </mesh>
        <Bolt position={[0.2, 0.2, 0.255]} color={S_ACCENT} />
        <Bolt position={[-0.2, 0.2, 0.255]} color={S_ACCENT} />
        <Bolt position={[0.2, -0.04, 0.255]} color={S_ACCENT} />
        <Bolt position={[-0.2, -0.04, 0.255]} color={S_ACCENT} />

        {/* ---- HEAD: T-shaped visor, Mandalorian style ---- */}
        <group position={[0, 0.43, 0.08]} scale={[scaleHead, scaleHead, scaleHead]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.26, 0.28]} />
            <meshStandardMaterial color={S_PRIMARY} {...mat} />
          </mesh>
          {/* Helmet crest */}
          <mesh castShadow position={[0, 0.14, -0.04]}>
            <boxGeometry args={[0.08, 0.04, 0.24]} />
            <meshStandardMaterial color={S_SECONDARY} {...mat} />
          </mesh>
          {/* Face plate */}
          <mesh castShadow position={[0, -0.02, 0.02]}>
            <boxGeometry args={[0.26, 0.2, 0.26]} />
            <meshStandardMaterial color={S_DARK} {...mat} />
          </mesh>
          {/* T-VISOR — distinctive horizontal + vertical glow */}
          <mesh position={[0, 0.02, 0.15]}>
            <planeGeometry args={[0.22, 0.035]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
          </mesh>
          <mesh position={[0, -0.03, 0.15]}>
            <planeGeometry args={[0.04, 0.08]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
          </mesh>
          {/* Side vents */}
          {[-1, 1].map((s) => (
            <group key={`sv${s}`}>
              {[0, 1, 2].map((i) => (
                <mesh key={`svl${i}`} position={[s * 0.155, -0.04 + i * 0.03, 0.02]}>
                  <boxGeometry args={[0.008, 0.015, 0.08]} />
                  <meshStandardMaterial color={S_ACCENT} emissive={S_ACCENT} emissiveIntensity={0.8} />
                </mesh>
              ))}
            </group>
          ))}
          <Bolt position={[0.12, -0.1, 0.145]} color={S_ACCENT} />
          <Bolt position={[-0.12, -0.1, 0.145]} color={S_ACCENT} />
        </group>

        {/* ---- ARMS ---- */}
        {[-1, 1].map((side) => {
          const isRight = side === 1;
          return (
            <group key={`sa${side}`} position={[side * 0.42, 0.16, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
              {/* Shoulder */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.2, 0.18, 0.24]} />
                <meshStandardMaterial color={S_PRIMARY} {...mat} />
              </mesh>
              <mesh castShadow position={[side * 0.08, 0.06, 0]}>
                <boxGeometry args={[0.08, 0.12, 0.22]} />
                <meshStandardMaterial color={S_SECONDARY} {...mat} />
              </mesh>
              <GlowStrip position={[0, -0.06, 0.125]} args={[0.16, 0.015]} color={S_ACCENT} intensity={1.0} />
              <group ref={isRight ? refs.rightUpperArmRef : refs.leftUpperArmRef} position={[side * 0.16, -0.08, 0]}>
                <mesh castShadow receiveShadow>
                  <cylinderGeometry args={[0.075, 0.065, 0.28, HI]} />
                  <meshStandardMaterial color={S_PRIMARY} {...mat} />
                </mesh>
                <mesh castShadow position={[0, 0, 0.065]}>
                  <boxGeometry args={[0.12, 0.22, 0.025]} />
                  <meshStandardMaterial color={S_SECONDARY} {...mat} />
                </mesh>
                <GlowBand position={[0, 0.08, 0]} color={S_ACCENT} />
                <GlowBand position={[0, -0.08, 0]} color={S_ACCENT} />
                <mesh castShadow position={[0, -0.16, 0]}>
                  <sphereGeometry args={[0.055, HI, HI]} />
                  <meshStandardMaterial color={S_DARK} {...mat} />
                </mesh>
                <group ref={isRight ? refs.rightForearmRef : refs.leftForearmRef} position={[0, -0.33, 0]}>
                  <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.065, 0.058, 0.22, HI]} />
                    <meshStandardMaterial color={S_PRIMARY} {...mat} />
                  </mesh>
                  <mesh castShadow position={[0, 0, 0.055]}>
                    <boxGeometry args={[0.1, 0.18, 0.02]} />
                    <meshStandardMaterial color={S_SECONDARY} {...mat} />
                  </mesh>
                  <GlowBand position={[0, 0.06, 0]} innerR={0.05} outerR={0.078} color={S_ACCENT} />
                  <GlowBand position={[0, -0.04, 0]} innerR={0.05} outerR={0.078} color={S_ACCENT} />
                  {/* Hand */}
                  <group position={[0, -0.14, 0.03]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={[0.09, 0.07, 0.07]} />
                      <meshStandardMaterial color={S_DARK} {...mat} />
                    </mesh>
                    {[0.025, 0, -0.025].map((x, i) => (
                      <mesh key={`sf${side}${i}`} castShadow position={[x, 0.025, 0.04]}>
                        <boxGeometry args={[0.022, 0.035, 0.035]} />
                        <meshStandardMaterial color={S_PRIMARY} {...mat} />
                      </mesh>
                    ))}
                    {isRight && <SwordAttachment swordRef={swordRef} swordMesh={swordMesh} />}
                  </group>
                </group>
              </group>
            </group>
          );
        })}
      </group>

      {/* ---- LEGS ---- */}
      {[-1, 1].map((side) => (
        <group
          key={`sleg${side}`}
          ref={side === -1 ? refs.leftLegRef : refs.rightLegRef}
          position={[side * 0.14, 0.68, 0]}
          scale={[scaleLegs, scaleLegs, scaleLegs]}
        >
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.11, 0.09, 0.4, HI]} />
            <meshStandardMaterial color={S_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0, 0, 0.1]}>
            <boxGeometry args={[0.14, 0.3, 0.03]} />
            <meshStandardMaterial color={S_SECONDARY} {...mat} />
          </mesh>
          <GlowStrip position={[0, 0, 0.116]} args={[0.1, 0.015]} color={S_ACCENT} />
          {/* Lower leg */}
          <mesh castShadow receiveShadow position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.085, 0.075, 0.3, HI]} />
            <meshStandardMaterial color={S_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0, -0.28, 0.075]}>
            <boxGeometry args={[0.12, 0.24, 0.025]} />
            <meshStandardMaterial color={S_SECONDARY} {...mat} />
          </mesh>
          <GlowStrip position={[0, -0.22, 0.088]} args={[0.08, 0.012]} color={S_ACCENT} />
          {/* Foot */}
          <group position={[0, -0.46, 0.05]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.13, 0.05, 0.18]} />
              <meshStandardMaterial color={S_DARK} {...mat} />
            </mesh>
            <mesh castShadow position={[0, 0, 0.06]}>
              <boxGeometry args={[0.11, 0.04, 0.08]} />
              <meshStandardMaterial color={S_PRIMARY} {...mat} />
            </mesh>
            <GlowStrip position={[0, -0.015, 0.09]} args={[0.08, 0.008]} color={S_ACCENT} />
          </group>
        </group>
      ))}
    </group>
  );
}

// =============================================================================
// MECH 2 — ENFORCER (Heavy Blue)
// Bright blue body, yellow/gold bands, extremely bulky/round
// =============================================================================

const E_PRIMARY = '#3a7ab8';
const E_SECONDARY = '#2a5a88';
const E_DARK = '#1a3a58';
const E_GOLD = '#e8b020';
const E_GOLD_DARK = '#aa8018';
const E_GLOW = '#ffcc00';

export function EnforcerMech(props: ProceduralMechProps) {
  const {
    color = E_GLOW,
    scaleHead = 1, scaleTorso = 1, scaleArms = 1, scaleLegs = 1,
    isSwinging = false, isWalking = false, isWalkingRef, swordRef,
  } = props;
  const refs = useMechRefs();
  const swordMesh = useMemo(() => makeSword(), []);
  useMechAnimation(refs, { isSwinging, isWalking, isWalkingRef });
  const mat = { metalness: 0.82, roughness: 0.2 };

  return (
    <group ref={refs.rootRef} scale={[1.15, 1.15, 1.15]}>
      <group ref={refs.torsoRef} position={[0, 1.05, 0]} scale={[scaleTorso, scaleTorso, scaleTorso]}>
        {/* Main chest — extra wide and bulky */}
        <mesh castShadow receiveShadow position={[0, 0.08, 0.08]}>
          <boxGeometry args={[0.62, 0.52, 0.28]} />
          <meshStandardMaterial color={E_PRIMARY} {...mat} />
        </mesh>
        {/* Rounded chest overlay */}
        <mesh castShadow receiveShadow position={[0, 0.1, 0.14]}>
          <sphereGeometry args={[0.28, HI, HI, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={E_SECONDARY} {...mat} />
        </mesh>
        {/* Gold chest bands */}
        {[-0.04, 0.08, 0.2].map((y, i) => (
          <mesh key={`eb${i}`} castShadow position={[0, y, 0.23]}>
            <boxGeometry args={[0.5, 0.035, 0.04]} />
            <meshStandardMaterial color={E_GOLD} metalness={0.9} roughness={0.12} />
          </mesh>
        ))}
        {/* Massive shoulder mounts */}
        {[-1, 1].map((s) => (
          <group key={`em${s}`} position={[s * 0.38, 0.14, 0]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.14, HI, HI]} />
              <meshStandardMaterial color={E_PRIMARY} {...mat} />
            </mesh>
            <mesh castShadow>
              <torusGeometry args={[0.14, 0.02, 8, HI]} />
              <meshStandardMaterial color={E_GOLD} metalness={0.9} roughness={0.12} />
            </mesh>
          </group>
        ))}
        {/* Waist — extra thick */}
        <mesh castShadow receiveShadow position={[0, -0.34, 0.04]}>
          <cylinderGeometry args={[0.24, 0.28, 0.22, HI]} />
          <meshStandardMaterial color={E_DARK} {...mat} />
        </mesh>
        <mesh castShadow position={[0, -0.24, 0.04]}>
          <torusGeometry args={[0.24, 0.015, 8, HI]} />
          <meshStandardMaterial color={E_GOLD} metalness={0.9} roughness={0.12} />
        </mesh>
        {/* Back */}
        <mesh castShadow receiveShadow position={[0, 0.06, -0.16]}>
          <boxGeometry args={[0.54, 0.44, 0.1]} />
          <meshStandardMaterial color={E_DARK} {...mat} />
        </mesh>
        {/* Back pack/reactor */}
        <mesh castShadow position={[0, 0.1, -0.22]}>
          <cylinderGeometry args={[0.12, 0.12, 0.24, HI]} />
          <meshStandardMaterial color={E_SECONDARY} {...mat} />
        </mesh>
        <mesh position={[0, 0.1, -0.28]}>
          <sphereGeometry args={[0.05, HI, HI]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} />
        </mesh>

        {/* ---- HEAD: Round dome with yellow visor ---- */}
        <group position={[0, 0.44, 0.06]} scale={[scaleHead, scaleHead, scaleHead]}>
          {/* Dome helmet */}
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.18, HI, HI, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
            <meshStandardMaterial color={E_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.06, 0]}>
            <boxGeometry args={[0.3, 0.16, 0.28]} />
            <meshStandardMaterial color={E_PRIMARY} {...mat} />
          </mesh>
          {/* Visor */}
          <mesh position={[0, -0.02, 0.15]}>
            <planeGeometry args={[0.2, 0.06]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
          </mesh>
          {/* Gold bands around head */}
          <mesh castShadow position={[0, 0.04, 0]}>
            <torusGeometry args={[0.18, 0.012, 8, HI]} />
            <meshStandardMaterial color={E_GOLD} metalness={0.9} roughness={0.12} />
          </mesh>
          <mesh castShadow position={[0, -0.06, 0]}>
            <torusGeometry args={[0.16, 0.01, 8, HI]} />
            <meshStandardMaterial color={E_GOLD} metalness={0.9} roughness={0.12} />
          </mesh>
          {/* Chin guard */}
          <mesh castShadow position={[0, -0.12, 0.04]}>
            <boxGeometry args={[0.2, 0.06, 0.14]} />
            <meshStandardMaterial color={E_SECONDARY} {...mat} />
          </mesh>
        </group>

        {/* ---- ARMS ---- */}
        {[-1, 1].map((side) => {
          const isRight = side === 1;
          return (
            <group key={`ea${side}`} position={[side * 0.44, 0.14, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
              {/* Massive spherical shoulder pad */}
              <mesh castShadow receiveShadow position={[side * 0.04, 0.04, 0]}>
                <sphereGeometry args={[0.12, HI, HI]} />
                <meshStandardMaterial color={E_PRIMARY} {...mat} />
              </mesh>
              <group ref={isRight ? refs.rightUpperArmRef : refs.leftUpperArmRef} position={[side * 0.16, -0.06, 0]}>
                {/* Thick upper arm */}
                <mesh castShadow receiveShadow>
                  <cylinderGeometry args={[0.09, 0.08, 0.28, HI]} />
                  <meshStandardMaterial color={E_PRIMARY} {...mat} />
                </mesh>
                {/* Gold bands on arm */}
                {[-0.08, 0, 0.08].map((y, i) => (
                  <mesh key={`gb${i}`} castShadow position={[0, y, 0]}>
                    <torusGeometry args={[0.09, 0.01, 8, HI]} />
                    <meshStandardMaterial color={E_GOLD} metalness={0.9} roughness={0.12} />
                  </mesh>
                ))}
                <mesh castShadow position={[0, 0, 0.08]}>
                  <boxGeometry args={[0.14, 0.22, 0.03]} />
                  <meshStandardMaterial color={E_SECONDARY} {...mat} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0]}>
                  <sphereGeometry args={[0.06, HI, HI]} />
                  <meshStandardMaterial color={E_GOLD_DARK} metalness={0.85} roughness={0.15} />
                </mesh>
                <group ref={isRight ? refs.rightForearmRef : refs.leftForearmRef} position={[0, -0.33, 0]}>
                  <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.08, 0.07, 0.22, HI]} />
                    <meshStandardMaterial color={E_PRIMARY} {...mat} />
                  </mesh>
                  {[-0.04, 0.04].map((y, i) => (
                    <mesh key={`fgb${i}`} castShadow position={[0, y, 0]}>
                      <torusGeometry args={[0.08, 0.008, 8, HI]} />
                      <meshStandardMaterial color={E_GOLD} metalness={0.9} roughness={0.12} />
                    </mesh>
                  ))}
                  <mesh castShadow position={[0, 0, 0.065]}>
                    <boxGeometry args={[0.12, 0.16, 0.025]} />
                    <meshStandardMaterial color={E_SECONDARY} {...mat} />
                  </mesh>
                  {/* Hand — big blocky */}
                  <group position={[0, -0.14, 0.03]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={[0.11, 0.08, 0.08]} />
                      <meshStandardMaterial color={E_DARK} {...mat} />
                    </mesh>
                    {[0.03, 0, -0.03].map((x, i) => (
                      <mesh key={`ef${side}${i}`} castShadow position={[x, 0.03, 0.045]}>
                        <boxGeometry args={[0.028, 0.04, 0.04]} />
                        <meshStandardMaterial color={E_PRIMARY} {...mat} />
                      </mesh>
                    ))}
                    {isRight && <SwordAttachment swordRef={swordRef} swordMesh={swordMesh} />}
                  </group>
                </group>
              </group>
            </group>
          );
        })}
      </group>

      {/* ---- LEGS: Extra thick and round ---- */}
      {[-1, 1].map((side) => (
        <group
          key={`eleg${side}`}
          ref={side === -1 ? refs.leftLegRef : refs.rightLegRef}
          position={[side * 0.16, 0.68, 0]}
          scale={[scaleLegs, scaleLegs, scaleLegs]}
        >
          {/* Extra thick thigh */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.13, 0.11, 0.4, HI]} />
            <meshStandardMaterial color={E_PRIMARY} {...mat} />
          </mesh>
          {/* Gold bands on thigh */}
          {[-0.1, 0.0, 0.1].map((y, i) => (
            <mesh key={`lgb${i}`} castShadow position={[0, y, 0]}>
              <torusGeometry args={[0.13, 0.01, 8, HI]} />
              <meshStandardMaterial color={E_GOLD} metalness={0.9} roughness={0.12} />
            </mesh>
          ))}
          <mesh castShadow position={[0, 0, 0.12]}>
            <boxGeometry args={[0.16, 0.3, 0.03]} />
            <meshStandardMaterial color={E_SECONDARY} {...mat} />
          </mesh>
          {/* Knee joint */}
          <mesh castShadow position={[0, -0.22, 0]}>
            <sphereGeometry args={[0.07, HI, HI]} />
            <meshStandardMaterial color={E_GOLD_DARK} metalness={0.85} roughness={0.15} />
          </mesh>
          {/* Lower leg */}
          <mesh castShadow receiveShadow position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.1, 0.09, 0.26, HI]} />
            <meshStandardMaterial color={E_PRIMARY} {...mat} />
          </mesh>
          {[-0.3, -0.4].map((y, i) => (
            <mesh key={`slgb${i}`} castShadow position={[0, y, 0]}>
              <torusGeometry args={[0.1, 0.008, 8, HI]} />
              <meshStandardMaterial color={E_GOLD} metalness={0.9} roughness={0.12} />
            </mesh>
          ))}
          {/* Foot — big and round */}
          <group position={[0, -0.5, 0.04]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.16, 0.06, 0.2]} />
              <meshStandardMaterial color={E_DARK} {...mat} />
            </mesh>
            <mesh castShadow position={[0, 0.01, 0.04]}>
              <cylinderGeometry args={[0.08, 0.08, 0.04, HI]} />
              <meshStandardMaterial color={E_GOLD_DARK} metalness={0.85} roughness={0.15} />
            </mesh>
            <mesh castShadow position={[0, 0, 0.08]}>
              <boxGeometry args={[0.14, 0.05, 0.06]} />
              <meshStandardMaterial color={E_PRIMARY} {...mat} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// =============================================================================
// MECH 3 — SPECTRE (Green Stealth)
// Bright green body, red accents, angular/stealth design, energy blade vents
// =============================================================================

const SP_PRIMARY = '#40cc55';
const SP_SECONDARY = '#30aa40';
const SP_DARK = '#1a6630';
const SP_ACCENT = '#cc2233';
const SP_GLOW = '#ff4466';

export function SpectreMech(props: ProceduralMechProps) {
  const {
    color = SP_GLOW,
    scaleHead = 1, scaleTorso = 1, scaleArms = 1, scaleLegs = 1,
    isSwinging = false, isWalking = false, isWalkingRef, swordRef,
  } = props;
  const refs = useMechRefs();
  const swordMesh = useMemo(() => makeSword(), []);
  useMechAnimation(refs, { isSwinging, isWalking, isWalkingRef });
  const mat = { metalness: 0.8, roughness: 0.22 };

  return (
    <group ref={refs.rootRef} scale={[1.08, 1.08, 1.08]}>
      <group ref={refs.torsoRef} position={[0, 1.05, 0]} scale={[scaleTorso, scaleTorso, scaleTorso]}>
        {/* Main chest — angular, stealth profile */}
        <mesh castShadow receiveShadow position={[0, 0.08, 0.08]}>
          <boxGeometry args={[0.52, 0.46, 0.22]} />
          <meshStandardMaterial color={SP_PRIMARY} {...mat} />
        </mesh>
        {/* Angled chest plates */}
        <mesh castShadow receiveShadow position={[0, 0.14, 0.2]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.42, 0.28, 0.04]} />
          <meshStandardMaterial color={SP_SECONDARY} {...mat} />
        </mesh>
        {/* Red accent V on chest */}
        <mesh position={[0.08, 0.08, 0.225]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.18, 0.025, 0.01]} />
          <meshStandardMaterial color={SP_ACCENT} emissive={SP_ACCENT} emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[-0.08, 0.08, 0.225]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.18, 0.025, 0.01]} />
          <meshStandardMaterial color={SP_ACCENT} emissive={SP_ACCENT} emissiveIntensity={0.8} />
        </mesh>
        {/* Side armor — angular/wedge shaped */}
        {[-1, 1].map((s) => (
          <group key={`spc${s}`}>
            <mesh castShadow receiveShadow position={[s * 0.32, 0.1, 0.04]} rotation={[0, s * 0.15, 0]}>
              <boxGeometry args={[0.12, 0.38, 0.24]} />
              <meshStandardMaterial color={SP_PRIMARY} {...mat} />
            </mesh>
            <mesh castShadow position={[s * 0.34, 0.18, 0.06]} rotation={[0, s * 0.2, s * -0.1]}>
              <boxGeometry args={[0.08, 0.14, 0.18]} />
              <meshStandardMaterial color={SP_SECONDARY} {...mat} />
            </mesh>
          </group>
        ))}
        {/* Angular waist */}
        <mesh castShadow receiveShadow position={[0, -0.34, 0.04]}>
          <boxGeometry args={[0.4, 0.18, 0.2]} />
          <meshStandardMaterial color={SP_DARK} {...mat} />
        </mesh>
        {/* Back */}
        <mesh castShadow receiveShadow position={[0, 0.06, -0.14]}>
          <boxGeometry args={[0.46, 0.4, 0.08]} />
          <meshStandardMaterial color={SP_DARK} {...mat} />
        </mesh>
        {/* Back thruster vents */}
        {[-1, 1].map((s) => (
          <group key={`spv${s}`} position={[s * 0.14, 0.08, -0.18]}>
            <mesh castShadow>
              <boxGeometry args={[0.1, 0.16, 0.06]} />
              <meshStandardMaterial color={SP_DARK} {...mat} />
            </mesh>
            <mesh position={[0, 0, -0.035]}>
              <planeGeometry args={[0.06, 0.1]} />
              <meshStandardMaterial color={SP_GLOW} emissive={SP_GLOW} emissiveIntensity={1.0} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}

        {/* ---- HEAD: Angular visor, predator-like ---- */}
        <group position={[0, 0.42, 0.06]} scale={[scaleHead, scaleHead, scaleHead]}>
          {/* Angular helmet */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.28, 0.22, 0.26]} />
            <meshStandardMaterial color={SP_PRIMARY} {...mat} />
          </mesh>
          {/* Angled top */}
          <mesh castShadow position={[0, 0.1, -0.04]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.24, 0.06, 0.22]} />
            <meshStandardMaterial color={SP_SECONDARY} {...mat} />
          </mesh>
          {/* Face plate */}
          <mesh castShadow position={[0, -0.04, 0.01]}>
            <boxGeometry args={[0.24, 0.14, 0.24]} />
            <meshStandardMaterial color={SP_DARK} {...mat} />
          </mesh>
          {/* Visor — angular split */}
          <mesh position={[0.05, 0.01, 0.14]}>
            <planeGeometry args={[0.08, 0.04]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
          </mesh>
          <mesh position={[-0.05, 0.01, 0.14]}>
            <planeGeometry args={[0.08, 0.04]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
          </mesh>
          {/* Red accent on forehead */}
          <mesh position={[0, 0.08, 0.135]}>
            <boxGeometry args={[0.04, 0.04, 0.01]} />
            <meshStandardMaterial color={SP_ACCENT} emissive={SP_ACCENT} emissiveIntensity={1.2} />
          </mesh>
          {/* Angular cheek fins */}
          {[-1, 1].map((s) => (
            <mesh key={`cf${s}`} castShadow position={[s * 0.14, 0.02, -0.06]} rotation={[0, s * 0.2, 0]}>
              <boxGeometry args={[0.03, 0.1, 0.14]} />
              <meshStandardMaterial color={SP_PRIMARY} {...mat} />
            </mesh>
          ))}
        </group>

        {/* ---- ARMS ---- */}
        {[-1, 1].map((side) => {
          const isRight = side === 1;
          return (
            <group key={`spa${side}`} position={[side * 0.38, 0.16, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
              {/* Angular shoulder */}
              <mesh castShadow receiveShadow rotation={[0, 0, side * 0.1]}>
                <boxGeometry args={[0.18, 0.16, 0.2]} />
                <meshStandardMaterial color={SP_PRIMARY} {...mat} />
              </mesh>
              <mesh castShadow position={[side * 0.06, 0.06, 0]} rotation={[0, 0, side * 0.15]}>
                <boxGeometry args={[0.08, 0.1, 0.18]} />
                <meshStandardMaterial color={SP_SECONDARY} {...mat} />
              </mesh>
              {/* Red shoulder accent */}
              <mesh position={[0, 0.085, 0.105]}>
                <boxGeometry args={[0.14, 0.01, 0.01]} />
                <meshStandardMaterial color={SP_ACCENT} emissive={SP_ACCENT} emissiveIntensity={0.8} />
              </mesh>
              <group ref={isRight ? refs.rightUpperArmRef : refs.leftUpperArmRef} position={[side * 0.14, -0.08, 0]}>
                <mesh castShadow receiveShadow>
                  <cylinderGeometry args={[0.07, 0.06, 0.28, HI]} />
                  <meshStandardMaterial color={SP_PRIMARY} {...mat} />
                </mesh>
                <mesh castShadow position={[0, 0, 0.06]}>
                  <boxGeometry args={[0.1, 0.2, 0.025]} />
                  <meshStandardMaterial color={SP_SECONDARY} {...mat} />
                </mesh>
                <GlowBand position={[0, 0.08, 0]} color={SP_ACCENT} />
                <mesh castShadow position={[0, -0.16, 0]}>
                  <sphereGeometry args={[0.05, HI, HI]} />
                  <meshStandardMaterial color={SP_DARK} {...mat} />
                </mesh>
                <group ref={isRight ? refs.rightForearmRef : refs.leftForearmRef} position={[0, -0.32, 0]}>
                  <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.06, 0.055, 0.22, HI]} />
                    <meshStandardMaterial color={SP_PRIMARY} {...mat} />
                  </mesh>
                  <mesh castShadow position={[0, 0, 0.05]}>
                    <boxGeometry args={[0.09, 0.16, 0.02]} />
                    <meshStandardMaterial color={SP_SECONDARY} {...mat} />
                  </mesh>
                  <GlowBand position={[0, 0.04, 0]} innerR={0.045} outerR={0.072} color={SP_ACCENT} />
                  {/* Hand */}
                  <group position={[0, -0.14, 0.03]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={[0.08, 0.065, 0.065]} />
                      <meshStandardMaterial color={SP_DARK} {...mat} />
                    </mesh>
                    {[0.025, 0, -0.025].map((x, i) => (
                      <mesh key={`spf${side}${i}`} castShadow position={[x, 0.025, 0.035]}>
                        <boxGeometry args={[0.02, 0.035, 0.035]} />
                        <meshStandardMaterial color={SP_PRIMARY} {...mat} />
                      </mesh>
                    ))}
                    {isRight && <SwordAttachment swordRef={swordRef} swordMesh={swordMesh} />}
                  </group>
                </group>
              </group>
            </group>
          );
        })}
      </group>

      {/* ---- LEGS: Angular with energy blade vents ---- */}
      {[-1, 1].map((side) => (
        <group
          key={`spleg${side}`}
          ref={side === -1 ? refs.leftLegRef : refs.rightLegRef}
          position={[side * 0.14, 0.68, 0]}
          scale={[scaleLegs, scaleLegs, scaleLegs]}
        >
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.085, 0.4, HI]} />
            <meshStandardMaterial color={SP_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0, 0, 0.09]}>
            <boxGeometry args={[0.13, 0.3, 0.025]} />
            <meshStandardMaterial color={SP_SECONDARY} {...mat} />
          </mesh>
          {/* Red accent strip */}
          <GlowStrip position={[0, 0.04, 0.105]} args={[0.08, 0.015]} color={SP_ACCENT} />
          {/* Lower leg */}
          <mesh castShadow receiveShadow position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.28, HI]} />
            <meshStandardMaterial color={SP_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0, -0.28, 0.07]}>
            <boxGeometry args={[0.11, 0.22, 0.02]} />
            <meshStandardMaterial color={SP_SECONDARY} {...mat} />
          </mesh>
          {/* Energy blade vents on calf */}
          <group position={[side * 0.06, -0.32, -0.04]} rotation={[0.3, side * 0.1, 0]}>
            <mesh>
              <boxGeometry args={[0.015, 0.22, 0.04]} />
              <meshStandardMaterial color={SP_GLOW} emissive={SP_GLOW} emissiveIntensity={1.5} transparent opacity={0.7} />
            </mesh>
            <mesh position={[0, -0.06, 0]}>
              <boxGeometry args={[0.01, 0.12, 0.03]} />
              <meshStandardMaterial color={'#ff8899'} emissive={'#ff8899'} emissiveIntensity={2.0} transparent opacity={0.5} />
            </mesh>
          </group>
          {/* Foot */}
          <group position={[0, -0.44, 0.05]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.12, 0.05, 0.18]} />
              <meshStandardMaterial color={SP_DARK} {...mat} />
            </mesh>
            <mesh castShadow position={[0, 0, 0.06]}>
              <boxGeometry args={[0.1, 0.04, 0.08]} />
              <meshStandardMaterial color={SP_PRIMARY} {...mat} />
            </mesh>
            {/* Angular toe */}
            <mesh castShadow position={[0, 0.01, 0.1]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.08, 0.03, 0.04]} />
              <meshStandardMaterial color={SP_ACCENT} {...mat} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// =============================================================================
// MECH 4 — WARDEN (Knight)
// Green/gold body, brown accents, knight-like design with shield
// =============================================================================

const W_PRIMARY = '#55aa44';
const W_SECONDARY = '#ccaa33';
const W_DARK = '#4a3520';
const W_GOLD = '#ddbb22';
const W_BROWN = '#6b4420';
const W_GLOW = '#eedd00';

export function WardenMech(props: ProceduralMechProps) {
  const {
    color = W_GLOW,
    scaleHead = 1, scaleTorso = 1, scaleArms = 1, scaleLegs = 1,
    isSwinging = false, isWalking = false, isWalkingRef, swordRef,
  } = props;
  const refs = useMechRefs();
  const swordMesh = useMemo(() => makeSword(), []);
  useMechAnimation(refs, { isSwinging, isWalking, isWalkingRef });
  const mat = { metalness: 0.82, roughness: 0.22 };

  return (
    <group ref={refs.rootRef} scale={[1.1, 1.1, 1.1]}>
      <group ref={refs.torsoRef} position={[0, 1.05, 0]} scale={[scaleTorso, scaleTorso, scaleTorso]}>
        {/* Main chest — heavy knight armor */}
        <mesh castShadow receiveShadow position={[0, 0.08, 0.1]}>
          <boxGeometry args={[0.56, 0.48, 0.24]} />
          <meshStandardMaterial color={W_PRIMARY} {...mat} />
        </mesh>
        {/* Gold chest cross */}
        <mesh castShadow position={[0, 0.1, 0.225]}>
          <boxGeometry args={[0.04, 0.32, 0.02]} />
          <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
        </mesh>
        <mesh castShadow position={[0, 0.14, 0.225]}>
          <boxGeometry args={[0.3, 0.04, 0.02]} />
          <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
        </mesh>
        {/* Side armor panels */}
        {[-1, 1].map((s) => (
          <group key={`wc${s}`} position={[s * 0.34, 0.08, 0.06]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.12, 0.42, 0.26]} />
              <meshStandardMaterial color={W_PRIMARY} {...mat} />
            </mesh>
            <mesh castShadow position={[0, 0, 0.135]}>
              <boxGeometry args={[0.08, 0.32, 0.02]} />
              <meshStandardMaterial color={W_SECONDARY} metalness={0.88} roughness={0.15} />
            </mesh>
          </group>
        ))}
        {/* Brown leather-like waist */}
        <mesh castShadow receiveShadow position={[0, -0.34, 0.06]}>
          <cylinderGeometry args={[0.22, 0.26, 0.2, HI]} />
          <meshStandardMaterial color={W_BROWN} metalness={0.4} roughness={0.6} />
        </mesh>
        {/* Gold waist band */}
        <mesh castShadow position={[0, -0.24, 0.06]}>
          <torusGeometry args={[0.24, 0.012, 8, HI]} />
          <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
        </mesh>
        {/* Back armor */}
        <mesh castShadow receiveShadow position={[0, 0.06, -0.15]}>
          <boxGeometry args={[0.5, 0.42, 0.08]} />
          <meshStandardMaterial color={W_DARK} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Reactor glow on chest */}
        <mesh position={[0, 0.02, 0.235]}>
          <sphereGeometry args={[0.04, HI, HI]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
        </mesh>
        <Bolt position={[0.2, 0.22, 0.225]} color={W_GOLD} />
        <Bolt position={[-0.2, 0.22, 0.225]} color={W_GOLD} />
        <Bolt position={[0.2, -0.04, 0.225]} color={W_GOLD} />
        <Bolt position={[-0.2, -0.04, 0.225]} color={W_GOLD} />

        {/* ---- HEAD: Knight helmet with visor ---- */}
        <group position={[0, 0.44, 0.08]} scale={[scaleHead, scaleHead, scaleHead]}>
          {/* Helmet main */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.26, 0.28]} />
            <meshStandardMaterial color={W_PRIMARY} {...mat} />
          </mesh>
          {/* Raised crown */}
          <mesh castShadow position={[0, 0.12, -0.02]}>
            <boxGeometry args={[0.22, 0.06, 0.22]} />
            <meshStandardMaterial color={W_SECONDARY} metalness={0.88} roughness={0.15} />
          </mesh>
          {/* Gold crown trim */}
          <mesh castShadow position={[0, 0.1, 0]}>
            <boxGeometry args={[0.28, 0.02, 0.26]} />
            <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
          </mesh>
          {/* Face plate */}
          <mesh castShadow position={[0, -0.04, 0.02]}>
            <boxGeometry args={[0.26, 0.18, 0.26]} />
            <meshStandardMaterial color={W_DARK} metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Visor slit — warm yellow/green glow */}
          <mesh position={[0, 0, 0.155]}>
            <planeGeometry args={[0.18, 0.05]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
          </mesh>
          {/* Chin guard */}
          <mesh castShadow position={[0, -0.12, 0.06]}>
            <boxGeometry args={[0.2, 0.06, 0.14]} />
            <meshStandardMaterial color={W_PRIMARY} {...mat} />
          </mesh>
          {/* Side horns/crests */}
          {[-1, 1].map((s) => (
            <mesh key={`wh${s}`} castShadow position={[s * 0.16, 0.06, -0.06]} rotation={[0, s * 0.3, s * -0.2]}>
              <boxGeometry args={[0.04, 0.08, 0.12]} />
              <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
            </mesh>
          ))}
          <Bolt position={[0.12, -0.08, 0.15]} color={W_BROWN} />
          <Bolt position={[-0.12, -0.08, 0.15]} color={W_BROWN} />
        </group>

        {/* ---- LEFT ARM (Shield arm) ---- */}
        <group position={[-0.4, 0.16, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
          <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
            <boxGeometry args={[0.2, 0.18, 0.24]} />
            <meshStandardMaterial color={W_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[-0.06, 0.1, 0]}>
            <boxGeometry args={[0.1, 0.08, 0.22]} />
            <meshStandardMaterial color={W_SECONDARY} metalness={0.88} roughness={0.15} />
          </mesh>
          <group ref={refs.leftUpperArmRef} position={[-0.16, -0.06, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.075, 0.065, 0.28, HI]} />
              <meshStandardMaterial color={W_PRIMARY} {...mat} />
            </mesh>
            <mesh castShadow position={[0, 0, 0.065]}>
              <boxGeometry args={[0.12, 0.22, 0.025]} />
              <meshStandardMaterial color={W_SECONDARY} metalness={0.88} roughness={0.15} />
            </mesh>
            <GlowBand position={[0, 0.08, 0]} color={W_GOLD} />
            <mesh castShadow position={[0, -0.16, 0]}>
              <sphereGeometry args={[0.055, HI, HI]} />
              <meshStandardMaterial color={W_BROWN} metalness={0.6} roughness={0.3} />
            </mesh>
            <group ref={refs.leftForearmRef} position={[0, -0.33, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.065, 0.06, 0.22, HI]} />
                <meshStandardMaterial color={W_PRIMARY} {...mat} />
              </mesh>
              <GlowBand position={[0, 0.05, 0]} innerR={0.05} outerR={0.078} color={W_GOLD} />
              {/* SHIELD attached to left forearm */}
              <group position={[-0.08, -0.02, 0.08]} rotation={[0.15, 0.3, 0.1]}>
                {/* Main shield body */}
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.35, 0.45, 0.03]} />
                  <meshStandardMaterial color={W_PRIMARY} {...mat} />
                </mesh>
                {/* Gold border */}
                <mesh castShadow position={[0, 0.21, 0.01]}>
                  <boxGeometry args={[0.36, 0.03, 0.035]} />
                  <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
                </mesh>
                <mesh castShadow position={[0, -0.21, 0.01]}>
                  <boxGeometry args={[0.36, 0.03, 0.035]} />
                  <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
                </mesh>
                {[-1, 1].map((s) => (
                  <mesh key={`sb${s}`} castShadow position={[s * 0.17, 0, 0.01]}>
                    <boxGeometry args={[0.03, 0.45, 0.035]} />
                    <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
                  </mesh>
                ))}
                {/* Shield boss */}
                <mesh castShadow position={[0, 0, 0.025]}>
                  <sphereGeometry args={[0.05, HI, HI]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} />
                </mesh>
                {/* Cross pattern */}
                <mesh castShadow position={[0, 0, 0.02]}>
                  <boxGeometry args={[0.03, 0.36, 0.015]} />
                  <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
                </mesh>
                <mesh castShadow position={[0, 0.02, 0.02]}>
                  <boxGeometry args={[0.28, 0.03, 0.015]} />
                  <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
                </mesh>
              </group>
              {/* Hand behind shield */}
              <group position={[0, -0.14, 0.03]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.09, 0.07, 0.07]} />
                  <meshStandardMaterial color={W_BROWN} metalness={0.5} roughness={0.4} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* ---- RIGHT ARM (Sword arm) ---- */}
        <group position={[0.4, 0.16, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
          <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
            <boxGeometry args={[0.2, 0.18, 0.24]} />
            <meshStandardMaterial color={W_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0.06, 0.1, 0]}>
            <boxGeometry args={[0.1, 0.08, 0.22]} />
            <meshStandardMaterial color={W_SECONDARY} metalness={0.88} roughness={0.15} />
          </mesh>
          <group ref={refs.rightUpperArmRef} position={[0.16, -0.06, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.075, 0.065, 0.28, HI]} />
              <meshStandardMaterial color={W_PRIMARY} {...mat} />
            </mesh>
            <mesh castShadow position={[0, 0, 0.065]}>
              <boxGeometry args={[0.12, 0.22, 0.025]} />
              <meshStandardMaterial color={W_SECONDARY} metalness={0.88} roughness={0.15} />
            </mesh>
            <GlowBand position={[0, 0.08, 0]} color={W_GOLD} />
            <mesh castShadow position={[0, -0.16, 0]}>
              <sphereGeometry args={[0.055, HI, HI]} />
              <meshStandardMaterial color={W_BROWN} metalness={0.6} roughness={0.3} />
            </mesh>
            <group ref={refs.rightForearmRef} position={[0, -0.33, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.065, 0.06, 0.22, HI]} />
                <meshStandardMaterial color={W_PRIMARY} {...mat} />
              </mesh>
              <GlowBand position={[0, 0.05, 0]} innerR={0.05} outerR={0.078} color={W_GOLD} />
              {/* Hand */}
              <group position={[0, -0.14, 0.03]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.09, 0.07, 0.07]} />
                  <meshStandardMaterial color={W_BROWN} metalness={0.5} roughness={0.4} />
                </mesh>
                {[0.025, 0, -0.025].map((x, i) => (
                  <mesh key={`wrf${i}`} castShadow position={[x, 0.025, 0.04]}>
                    <boxGeometry args={[0.022, 0.035, 0.035]} />
                    <meshStandardMaterial color={W_PRIMARY} {...mat} />
                  </mesh>
                ))}
                <SwordAttachment swordRef={swordRef} swordMesh={swordMesh} />
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ---- LEGS ---- */}
      {[-1, 1].map((side) => (
        <group
          key={`wleg${side}`}
          ref={side === -1 ? refs.leftLegRef : refs.rightLegRef}
          position={[side * 0.14, 0.68, 0]}
          scale={[scaleLegs, scaleLegs, scaleLegs]}
        >
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.11, 0.09, 0.4, HI]} />
            <meshStandardMaterial color={W_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0, 0, 0.1]}>
            <boxGeometry args={[0.14, 0.3, 0.03]} />
            <meshStandardMaterial color={W_SECONDARY} metalness={0.88} roughness={0.15} />
          </mesh>
          {/* Gold knee band */}
          <mesh castShadow position={[0, -0.12, 0]}>
            <torusGeometry args={[0.1, 0.008, 8, HI]} />
            <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
          </mesh>
          {/* Lower leg */}
          <mesh castShadow receiveShadow position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.085, 0.075, 0.3, HI]} />
            <meshStandardMaterial color={W_PRIMARY} {...mat} />
          </mesh>
          <mesh castShadow position={[0, -0.28, 0.075]}>
            <boxGeometry args={[0.12, 0.22, 0.025]} />
            <meshStandardMaterial color={W_SECONDARY} metalness={0.88} roughness={0.15} />
          </mesh>
          {/* Brown leather straps on shin */}
          {[-0.22, -0.32].map((y, i) => (
            <mesh key={`ws${i}`} castShadow position={[0, y, 0]}>
              <torusGeometry args={[0.082, 0.006, 8, HI]} />
              <meshStandardMaterial color={W_BROWN} metalness={0.4} roughness={0.6} />
            </mesh>
          ))}
          {/* Foot — armored boot */}
          <group position={[0, -0.46, 0.05]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.14, 0.06, 0.2]} />
              <meshStandardMaterial color={W_BROWN} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh castShadow position={[0, 0.01, 0.04]}>
              <boxGeometry args={[0.12, 0.04, 0.14]} />
              <meshStandardMaterial color={W_PRIMARY} {...mat} />
            </mesh>
            <mesh castShadow position={[0, 0.01, 0.09]}>
              <boxGeometry args={[0.1, 0.035, 0.04]} />
              <meshStandardMaterial color={W_GOLD} metalness={0.9} roughness={0.12} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// =============================================================================
// Pack selector — returns the mech component for a given index
// =============================================================================

const MECH_COMPONENTS = [
  VanguardMech,
  SentinelMech,
  EnforcerMech,
  SpectreMech,
  WardenMech,
];

export function getProceduralMech(index: number) {
  const count = MECH_COMPONENTS.length;
  const i = Math.max(0, index % count);
  return MECH_COMPONENTS[i];
}

export const PROCEDURAL_MECH_COUNT = MECH_COMPONENTS.length;
