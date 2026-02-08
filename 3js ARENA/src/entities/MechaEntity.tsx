// =============================================================================
// MechaEntity.tsx — SR-3600 'DOOM' procedural mecha (blueprint reference)
// Reinforced gunmetal alloy, layered plating, emissive visor/bands/joints.
// Supports idle, walk, and swing animations via pivot groups + quaternion slerp.
// Used everywhere: main menu, intro, bot opponent, network opponent.
// =============================================================================

import { useRef, useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { usePlayerTexture } from './usePlayerTexture';
import { makeSword, makeCryoKatana, makePlasmaBlade } from '../avatars/MechaGeometry';
import { useSwordStore, type SwordId } from '../game/SwordSelection';

const SWORD_BUILDERS: Record<SwordId, () => THREE.Group> = {
  energy_greatsword: makeSword,
  mecha_sword: makeCryoKatana,
  mecha_textured: makePlasmaBlade,
};

export interface MechaEntityProps {
  color?: string;
  /** Optional per-segment scale overrides (0.5–1.5). Default 1. */
  scaleHead?: number;
  scaleTorso?: number;
  scaleArms?: number;
  scaleLegs?: number;
  /** Drive swing animation (right arm). If omitted, no swing. */
  isSwinging?: boolean;
  /** Drive walk animation (legs + arm counter-swing). Ref or boolean. */
  isWalking?: boolean;
  isWalkingRef?: MutableRefObject<boolean>;
  /** Optional ref to access the sword group for external hit detection. */
  swordRef?: MutableRefObject<THREE.Group | null>;
}

// ---- Colors ----
const ARMOR_DARK = '#1a1a1e';
const ARMOR_MID = '#25252c';
const BOLT_COLOR = '#3d3d48';
const matArmor = { metalness: 0.9, roughness: 0.18 };
const matBolt = { color: BOLT_COLOR, metalness: 0.92, roughness: 0.1 };

// ---- Animation constants ----
const WALK_SPEED = 5;
const WALK_LEG_AMP = 0.4;
const WALK_ARM_AMP = 0.3;
const WALK_TORSO_TWIST = 0.025;
const WALK_BOB = 0.015;

const SWING_DURATION = 0.35;
// Dramatic multi-axis slash: shoulder raises, arm sweeps across body
const SWING_SHOULDER_PITCH = -1.4; // forward/up
const SWING_SHOULDER_YAW = -0.6;   // across body
const SWING_SHOULDER_ROLL = 0.3;
const SWING_FOREARM_PITCH = -0.8;  // elbow extension
const SWING_FOREARM_ROLL = -0.4;

// Temp quaternion/euler for animation (reused per frame)
const _euler = new THREE.Euler();
const _targetQuat = new THREE.Quaternion();
const _restQuat = new THREE.Quaternion(); // identity

// ---- Sub-components ----

function Bolt({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.03, 10, 10]} />
      <meshStandardMaterial {...matBolt} />
    </mesh>
  );
}

function EmissiveBand({
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
      <ringGeometry args={[innerR, outerR, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function EmissiveStrip({
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
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function MechaEntity({
  color = '#CC00FF',
  scaleHead = 1,
  scaleTorso = 1,
  scaleArms = 1,
  scaleLegs = 1,
  isSwinging = false,
  isWalking = false,
  isWalkingRef,
  swordRef,
}: MechaEntityProps) {
  const rootRef = useRef<THREE.Group>(null!);
  const visorRef = useRef<THREE.Mesh>(null!);
  const internalSwordRef = useRef<THREE.Group>(null!);

  // Build sword geometry based on selected sword
  const selectedSwordId = useSwordStore((s) => s.selectedSwordId);
  const swordBuilder = SWORD_BUILDERS[selectedSwordId] ?? makeSword;
  const swordMesh = useMemo(() => swordBuilder(), [swordBuilder]);

  // Animation pivot refs
  const torsoRef = useRef<THREE.Group>(null!);
  const rightUpperArmRef = useRef<THREE.Group>(null!);
  const rightForearmRef = useRef<THREE.Group>(null!);
  const leftUpperArmRef = useRef<THREE.Group>(null!);
  const leftForearmRef = useRef<THREE.Group>(null!);
  const leftLegRef = useRef<THREE.Group>(null!);
  const rightLegRef = useRef<THREE.Group>(null!);

  const phase = useGameStore((s) => s.phase);
  const armorTexture = usePlayerTexture();

  // Animation state refs
  const walkTime = useRef(0);
  const swingTime = useRef(0);
  const wasSwinging = useRef(false);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // ---- Idle micro-motion (always active) ----
    if (rootRef.current) {
      const bob = Math.sin(t * 1.5) * 0.015;
      const sway = Math.sin(t * 0.8) * 0.012;
      rootRef.current.position.y = bob;
      // Only apply idle sway if not walking/swinging
      const walking = isWalkingRef ? isWalkingRef.current : isWalking;
      if (!walking && !isSwinging) {
        rootRef.current.rotation.y = sway;
      } else {
        // Decay idle sway smoothly
        rootRef.current.rotation.y *= 0.9;
      }
    }

    // Visor flicker during intro
    if (phase === 'intro' && visorRef.current?.material) {
      const mat = visorRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2 + Math.sin(t * 10) * 1.5;
    }

    // ---- Walk animation ----
    const walking = isWalkingRef ? isWalkingRef.current : isWalking;
    const lerpFactor = Math.min(1, delta * 8);

    if (walking) {
      walkTime.current += delta;
    } else {
      walkTime.current *= 0.92; // decay to idle
    }

    const walkLerp = walking ? lerpFactor : 0.1;
    const walkPhase = walkTime.current * WALK_SPEED;
    const sinP = Math.sin(walkPhase);

    // Legs: swing forward/back (whole leg group rotates at hip)
    if (leftLegRef.current) {
      _euler.set(sinP * WALK_LEG_AMP, 0, 0);
      _targetQuat.setFromEuler(_euler);
      leftLegRef.current.quaternion.slerp(_targetQuat, walkLerp);
    }
    if (rightLegRef.current) {
      _euler.set(-sinP * WALK_LEG_AMP, 0, 0);
      _targetQuat.setFromEuler(_euler);
      rightLegRef.current.quaternion.slerp(_targetQuat, walkLerp);
    }

    // Left arm: counter-swing (opposite legs)
    if (leftUpperArmRef.current) {
      _euler.set(-sinP * WALK_ARM_AMP, 0, 0);
      _targetQuat.setFromEuler(_euler);
      leftUpperArmRef.current.quaternion.slerp(_targetQuat, walkLerp);
    }
    if (leftForearmRef.current && !walking) {
      leftForearmRef.current.quaternion.slerp(_restQuat, 0.08);
    }

    // Right arm: counter-swing only when NOT swinging
    if (rightUpperArmRef.current && !isSwinging && !wasSwinging.current) {
      _euler.set(sinP * WALK_ARM_AMP, 0, 0);
      _targetQuat.setFromEuler(_euler);
      rightUpperArmRef.current.quaternion.slerp(_targetQuat, walkLerp);
    }

    // Torso twist
    if (torsoRef.current) {
      const twistTarget = walking
        ? sinP * WALK_TORSO_TWIST
        : 0;
      _euler.set(0, twistTarget, 0);
      _targetQuat.setFromEuler(_euler);
      torsoRef.current.quaternion.slerp(_targetQuat, walkLerp);

      // Bob
      const bobAmount = walking ? Math.abs(Math.cos(walkPhase)) * WALK_BOB : 0;
      torsoRef.current.position.y = 1.05 + bobAmount;
    }

    // ---- Swing animation (right arm — dramatic multi-axis slash) ----
    if (isSwinging) {
      wasSwinging.current = true;
      swingTime.current = Math.min(1, swingTime.current + delta / SWING_DURATION);
    } else if (wasSwinging.current) {
      swingTime.current = Math.max(0, swingTime.current - delta / SWING_DURATION);
      if (swingTime.current <= 0) wasSwinging.current = false;
    }

    if (wasSwinging.current || isSwinging) {
      const st = swingTime.current;
      // Ease in/out for dramatic feel
      const ease = st < 0.5
        ? 2 * st * st
        : 1 - Math.pow(-2 * st + 2, 2) / 2;

      // Right upper arm: raise + sweep across body
      if (rightUpperArmRef.current) {
        _euler.set(
          ease * SWING_SHOULDER_PITCH,
          ease * SWING_SHOULDER_YAW,
          ease * SWING_SHOULDER_ROLL
        );
        _targetQuat.setFromEuler(_euler);
        rightUpperArmRef.current.quaternion.slerp(_targetQuat, lerpFactor);
      }

      // Right forearm: extend + twist
      if (rightForearmRef.current) {
        _euler.set(
          ease * SWING_FOREARM_PITCH,
          0,
          ease * SWING_FOREARM_ROLL
        );
        _targetQuat.setFromEuler(_euler);
        rightForearmRef.current.quaternion.slerp(_targetQuat, lerpFactor);
      }
    }

    // Return right arm to rest when not swinging
    if (!isSwinging && !wasSwinging.current) {
      if (rightForearmRef.current) {
        rightForearmRef.current.quaternion.slerp(_restQuat, 0.08);
      }
    }
  });

  return (
    <group ref={rootRef} scale={[1.1, 1.1, 1.1]}>
      {/* ---- TORSO: layered chest + waist ---- */}
      <group ref={torsoRef} position={[0, 1.05, 0]} scale={[scaleTorso, scaleTorso, scaleTorso]}>
        {/* Main chest plate */}
        <mesh castShadow receiveShadow position={[0, 0.08, 0.12]}>
          <boxGeometry args={[0.58, 0.5, 0.22]} />
          <meshStandardMaterial color={ARMOR_DARK} emissive={color} emissiveIntensity={0.08} map={armorTexture} {...matArmor} />
        </mesh>
        <Bolt position={[0.2, 0.12, 0.23]} />
        <Bolt position={[-0.2, 0.12, 0.23]} />
        <Bolt position={[0.22, -0.1, 0.23]} />
        <Bolt position={[-0.22, -0.1, 0.23]} />

        {/* Side chest plates (angled) */}
        <group position={[0.38, 0.08, 0.08]} rotation={[0, 0, 0.12]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.12, 0.45, 0.28]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
          <Bolt position={[0, 0.1, 0.16]} />
        </group>
        <group position={[-0.38, 0.08, 0.08]} rotation={[0, 0, -0.12]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.12, 0.45, 0.28]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
          <Bolt position={[0, 0.1, 0.16]} />
        </group>

        {/* Waist / midsection */}
        <mesh castShadow receiveShadow position={[0, -0.38, 0.06]}>
          <cylinderGeometry args={[0.22, 0.26, 0.2, 16]} />
          <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
        </mesh>

        {/* Back: layered armor */}
        <group position={[0, 0.1, -0.18]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.4, 0.1]} />
            <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.15, -0.06]}>
            <boxGeometry args={[0.35, 0.2, 0.06]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
          <EmissiveStrip position={[0.1, 0.08, -0.04]} args={[0.06, 0.02]} color={color} intensity={1} />
          <EmissiveStrip position={[-0.1, 0.08, -0.04]} args={[0.06, 0.02]} color={color} intensity={1} />
        </group>

        {/* ---- HEAD ---- */}
        <group position={[0, 0.43, 0.08]} scale={[scaleHead, scaleHead, scaleHead]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.32, 0.26, 0.28]} />
            <meshStandardMaterial color={ARMOR_DARK} emissive={color} emissiveIntensity={0.06} map={armorTexture} {...matArmor} />
          </mesh>
          <mesh ref={visorRef} position={[0, 0, 0.16]} castShadow>
            <planeGeometry args={[0.22, 0.06]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={phase === 'intro' ? 2 : 1.4}
            />
          </mesh>
          <EmissiveStrip position={[0, 0.14, 0.1]} args={[0.18, 0.025]} color={color} />
          <EmissiveStrip position={[0.08, 0.14, 0.06]} args={[0.06, 0.02]} color={color} intensity={1.1} />
          <EmissiveStrip position={[-0.08, 0.14, 0.06]} args={[0.06, 0.02]} color={color} intensity={1.1} />
          <Bolt position={[0.12, -0.08, 0.16]} />
          <Bolt position={[-0.12, -0.08, 0.16]} />
        </group>

        {/* ---- LEFT SHOULDER + ARM ---- */}
        <group position={[-0.42, 0.17, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
          {/* Shoulder pad (stays fixed) */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.18, 0.24]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
          <mesh position={[-0.1, -0.04, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.06, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
          </mesh>
          <Bolt position={[0.06, 0.04, 0.14]} />

          {/* Left upper arm pivot (animates) */}
          <group ref={leftUpperArmRef} position={[-0.18, -0.08, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.08, 0.07, 0.28, 20]} />
              <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
            </mesh>
            <EmissiveBand position={[0, 0.08, 0]} color={color} />
            <EmissiveBand position={[0, -0.08, 0]} color={color} />
            <mesh position={[0, -0.18, 0]} castShadow>
              <sphereGeometry args={[0.06, 14, 14]} />
              <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
            </mesh>
            <Bolt position={[0, -0.18, 0.065]} />

            {/* Left forearm pivot (animates) */}
            <group ref={leftForearmRef} position={[0, -0.35, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.07, 0.065, 0.22, 20]} />
                <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
              </mesh>
              <EmissiveBand position={[0, 0.07, 0]} innerR={0.055} outerR={0.085} color={color} />
              <EmissiveBand position={[0, 0, 0]} innerR={0.055} outerR={0.085} color={color} />
              <EmissiveBand position={[0, -0.07, 0]} innerR={0.055} outerR={0.085} color={color} />
              {/* Crush-grip hand */}
              <group position={[0, -0.14, 0.04]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.1, 0.08, 0.08]} />
                  <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
                </mesh>
                <mesh castShadow position={[0.03, 0.02, 0.05]}>
                  <boxGeometry args={[0.04, 0.05, 0.06]} />
                  <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
                </mesh>
                <mesh castShadow position={[0, 0.01, 0.055]}>
                  <boxGeometry args={[0.035, 0.045, 0.055]} />
                  <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
                </mesh>
                <mesh castShadow position={[-0.03, 0.02, 0.05]}>
                  <boxGeometry args={[0.04, 0.05, 0.06]} />
                  <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* ---- RIGHT SHOULDER + ARM ---- */}
        <group position={[0.42, 0.17, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
          {/* Shoulder pad (stays fixed) */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.18, 0.24]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
          <mesh position={[0.1, -0.04, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.06, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
          </mesh>
          <Bolt position={[-0.06, 0.04, 0.14]} />

          {/* Right upper arm pivot (animates — this is the swing arm) */}
          <group ref={rightUpperArmRef} position={[0.18, -0.08, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.08, 0.07, 0.28, 20]} />
              <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
            </mesh>
            <EmissiveBand position={[0, 0.08, 0]} color={color} />
            <EmissiveBand position={[0, -0.08, 0]} color={color} />
            <mesh position={[0, -0.18, 0]} castShadow>
              <sphereGeometry args={[0.06, 14, 14]} />
              <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
            </mesh>
            <Bolt position={[0, -0.18, 0.065]} />

            {/* Right forearm pivot (animates — extends during swing) */}
            <group ref={rightForearmRef} position={[0, -0.35, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.07, 0.065, 0.22, 20]} />
                <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
              </mesh>
              <EmissiveBand position={[0, 0.07, 0]} innerR={0.055} outerR={0.085} color={color} />
              <EmissiveBand position={[0, 0, 0]} innerR={0.055} outerR={0.085} color={color} />
              <EmissiveBand position={[0, -0.07, 0]} innerR={0.055} outerR={0.085} color={color} />
              {/* Crush-grip hand */}
              <group position={[0, -0.14, 0.04]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.1, 0.08, 0.08]} />
                  <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
                </mesh>
                <mesh castShadow position={[-0.03, 0.02, 0.05]}>
                  <boxGeometry args={[0.04, 0.05, 0.06]} />
                  <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
                </mesh>
                <mesh castShadow position={[0, 0.01, 0.055]}>
                  <boxGeometry args={[0.035, 0.045, 0.055]} />
                  <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
                </mesh>
                <mesh castShadow position={[0.03, 0.02, 0.05]}>
                  <boxGeometry args={[0.04, 0.05, 0.06]} />
                  <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
                </mesh>

                {/* Greatsword held in right hand — blade extends downward from grip */}
                <group
                  ref={(node) => {
                    internalSwordRef.current = node!;
                    if (swordRef) swordRef.current = node;
                  }}
                  position={[0, -0.02, 0.02]}
                  rotation={[Math.PI, 0, 0]}
                  scale={[0.3, 0.3, 0.3]}
                >
                  <primitive object={swordMesh} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ---- LEFT LEG (animates at hip) ---- */}
      <group ref={leftLegRef} position={[-0.14, 0.68, 0]} scale={[scaleLegs, scaleLegs, scaleLegs]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.42, 20]} />
          <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
        </mesh>
        <EmissiveStrip position={[0.04, 0.08, 0.12]} args={[0.08, 0.25]} color={color} rotation={[0, 0, Math.PI / 2]} />
        <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.09, 0.08, 0.32, 20]} />
          <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
        </mesh>
        <Bolt position={[0.06, -0.28, 0.1]} />
        <Bolt position={[-0.04, -0.28, 0.1]} />
        <group position={[0, -0.48, 0.06]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.14, 0.06, 0.2]} />
            <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.04, -0.02, 0.06]}>
            <boxGeometry args={[0.06, 0.04, 0.1]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
          <mesh castShadow receiveShadow position={[-0.04, -0.02, 0.06]}>
            <boxGeometry args={[0.06, 0.04, 0.1]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
        </group>
      </group>

      {/* ---- RIGHT LEG (animates at hip) ---- */}
      <group ref={rightLegRef} position={[0.14, 0.68, 0]} scale={[scaleLegs, scaleLegs, scaleLegs]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.42, 20]} />
          <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
        </mesh>
        <EmissiveStrip position={[-0.04, 0.08, 0.12]} args={[0.08, 0.25]} color={color} rotation={[0, 0, Math.PI / 2]} />
        <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.09, 0.08, 0.32, 20]} />
          <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
        </mesh>
        <Bolt position={[-0.06, -0.28, 0.1]} />
        <Bolt position={[0.04, -0.28, 0.1]} />
        <group position={[0, -0.48, 0.06]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.14, 0.06, 0.2]} />
            <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
          </mesh>
          <mesh castShadow receiveShadow position={[-0.04, -0.02, 0.06]}>
            <boxGeometry args={[0.06, 0.04, 0.1]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.04, -0.02, 0.06]}>
            <boxGeometry args={[0.06, 0.04, 0.1]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
