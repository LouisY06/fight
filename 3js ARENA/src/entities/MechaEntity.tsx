// =============================================================================
// MechaEntity.tsx — SR-3600 'DOOM' procedural mecha (blueprint reference)
// Reinforced gunmetal alloy, layered plating, emissive visor/bands/joints. Intro + bots.
// =============================================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { usePlayerTexture } from './usePlayerTexture';

export interface MechaEntityProps {
  color?: string;
  /** Optional per-segment scale overrides (0.5–1.5). Default 1. */
  scaleHead?: number;
  scaleTorso?: number;
  scaleArms?: number;
  scaleLegs?: number;
}

// Reinforced gunmetal alloy + glowing accents (SR-3600 blueprint)
const ARMOR_DARK = '#1a1a1e';
const ARMOR_MID = '#25252c';
const BOLT_COLOR = '#3d3d48';
const matArmor = { metalness: 0.9, roughness: 0.18 };
const matBolt = { color: BOLT_COLOR, metalness: 0.92, roughness: 0.1 };

/** Small bolt/rivet on panels */
function Bolt({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.03, 10, 10]} />
      <meshStandardMaterial {...matBolt} />
    </mesh>
  );
}

/** Emissive band ring around a cylinder (arm/leg) */
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

/** Glowing strip (head top, conduits) */
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
}: MechaEntityProps) {
  const rootRef = useRef<THREE.Group>(null!);
  const visorRef = useRef<THREE.Mesh>(null!);
  const phase = useGameStore((s) => s.phase);
  const armorTexture = usePlayerTexture();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (rootRef.current) {
      // Idle micro-motion: bob, breathing sway, subtle yaw
      const bob = Math.sin(t * 1.5) * 0.03;
      const sway = Math.sin(t * 0.8) * 0.025;
      rootRef.current.position.y = bob;
      rootRef.current.rotation.y = sway;
    }
    if (phase === 'intro' && visorRef.current?.material) {
      const mat = visorRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2 + Math.sin(t * 10) * 1.5;
    }
  });

  return (
    <group ref={rootRef} scale={[1.1, 1.1, 1.1]}>
      {/* ---- TORSO: layered chest + waist ---- */}
      <group position={[0, 1.05, 0]} scale={[scaleTorso, scaleTorso, scaleTorso]}>
        {/* Main chest plate — subtle emissive team accent */}
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

        {/* Back: layered armor (sensor array / shoulder unit) */}
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
      </group>

      {/* ---- HEAD: angular block + visor + top strips (blueprint) ---- */}
      <group position={[0, 1.48, 0.08]} scale={[scaleHead, scaleHead, scaleHead]}>
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
        {/* Glowing strips on top of head */}
        <EmissiveStrip position={[0, 0.14, 0.1]} args={[0.18, 0.025]} color={color} />
        <EmissiveStrip position={[0.08, 0.14, 0.06]} args={[0.06, 0.02]} color={color} intensity={1.1} />
        <EmissiveStrip position={[-0.08, 0.14, 0.06]} args={[0.06, 0.02]} color={color} intensity={1.1} />
        <Bolt position={[0.12, -0.08, 0.16]} />
        <Bolt position={[-0.12, -0.08, 0.16]} />
      </group>

      {/* ---- LEFT SHOULDER + ARM (glowing joint, elbow bolt, 3 bands, crush-grip) ---- */}
      <group position={[-0.42, 1.22, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.2, 0.18, 0.24]} />
          <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
        </mesh>
        {/* Shoulder joint: glowing pink cylindrical segment */}
        <mesh position={[-0.1, -0.04, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.06, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
        </mesh>
        <Bolt position={[0.06, 0.04, 0.14]} />
        <group position={[-0.18, -0.08, 0]} rotation={[0.15, 0, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.08, 0.07, 0.28, 20]} />
            <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
          </mesh>
          <EmissiveBand position={[0, 0.08, 0]} color={color} />
          <EmissiveBand position={[0, -0.08, 0]} color={color} />
          {/* Elbow: joint + central bolt */}
          <mesh position={[0, -0.18, 0]} castShadow>
            <sphereGeometry args={[0.06, 14, 14]} />
            <meshStandardMaterial color={ARMOR_DARK} map={armorTexture} {...matArmor} />
          </mesh>
          <Bolt position={[0, -0.18, 0.065]} />
          {/* Forearm: bulky, multiple bands */}
          <group position={[0, -0.35, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.07, 0.065, 0.22, 20]} />
              <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
            </mesh>
            <EmissiveBand position={[0, 0.07, 0]} innerR={0.055} outerR={0.085} color={color} />
            <EmissiveBand position={[0, 0, 0]} innerR={0.055} outerR={0.085} color={color} />
            <EmissiveBand position={[0, -0.07, 0]} innerR={0.055} outerR={0.085} color={color} />
            {/* Crush-grip manipulator: three-finger claw */}
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
      <group position={[0.42, 1.22, 0.02]} scale={[scaleArms, scaleArms, scaleArms]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.2, 0.18, 0.24]} />
          <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
        </mesh>
        <mesh position={[0.1, -0.04, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.06, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
        </mesh>
        <Bolt position={[-0.06, 0.04, 0.14]} />
        <group position={[0.18, -0.08, 0]} rotation={[0.15, 0, 0]}>
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
          <group position={[0, -0.35, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.07, 0.065, 0.22, 20]} />
              <meshStandardMaterial color={ARMOR_MID} map={armorTexture} {...matArmor} />
            </mesh>
            <EmissiveBand position={[0, 0.07, 0]} innerR={0.055} outerR={0.085} color={color} />
            <EmissiveBand position={[0, 0, 0]} innerR={0.055} outerR={0.085} color={color} />
            <EmissiveBand position={[0, -0.07, 0]} innerR={0.055} outerR={0.085} color={color} />
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
            </group>
          </group>
        </group>
      </group>

      {/* ---- LEGS: thighs (CORE POWER CONDUIT strip), knee bolt, shin, walking base ---- */}
      <group position={[-0.14, 0.68, 0]} scale={[scaleLegs, scaleLegs, scaleLegs]}>
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
        {/* Walking base: wide multi-segmented foot */}
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
      <group position={[0.14, 0.68, 0]} scale={[scaleLegs, scaleLegs, scaleLegs]}>
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
