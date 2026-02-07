// =============================================================================
// SimpleCharacterModel.tsx — Procedural character built from Three.js primitives
// No GLB dependency. Drop-in replacement for RobotEntity in Player.tsx.
// =============================================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TARGET_HEIGHT = 2;
const WALK_SPEED = 5;
const WALK_LEG_AMP = 0.5;
const WALK_ARM_AMP = 0.4;
const SWING_DURATION = 0.35;
const SWING_ARM_PITCH = -1.2;

export interface SimpleCharacterModelProps {
  color?: string;
  targetHeight?: number;
  isWalking?: boolean;
  isWalkingRef?: React.MutableRefObject<boolean>;
  isSwinging: boolean;
}

export function SimpleCharacterModel({
  color = '#4488cc',
  targetHeight = TARGET_HEIGHT,
  isWalking = false,
  isWalkingRef,
  isSwinging,
}: SimpleCharacterModelProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const leftLegRef = useRef<THREE.Group>(null!);
  const rightLegRef = useRef<THREE.Group>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const rightArmRef = useRef<THREE.Group>(null!);

  const walkTime = useRef(0);
  const swingTime = useRef(0);
  const wasSwinging = useRef(false);

  // Scale so total height matches targetHeight (roughly 2 units)
  const scale = targetHeight / TARGET_HEIGHT;

  useFrame((_, delta) => {
    const lerp = Math.min(1, delta * 8);
    const walking = isWalkingRef ? isWalkingRef.current : isWalking;

    if (walking) {
      walkTime.current += delta;
    } else {
      walkTime.current *= 0.95;
    }
    const phase = walkTime.current * WALK_SPEED;
    const legAngle = Math.sin(phase) * WALK_LEG_AMP;
    const armAngle = Math.sin(phase) * WALK_ARM_AMP;

    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(
        leftLegRef.current.rotation.x,
        legAngle,
        lerp
      );
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(
        rightLegRef.current.rotation.x,
        -legAngle,
        lerp
      );
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.x,
        -armAngle,
        lerp
      );
    }
    if (rightArmRef.current) {
      const baseArm = -armAngle;
      if (isSwinging) {
        wasSwinging.current = true;
        swingTime.current = Math.min(1, swingTime.current + delta / SWING_DURATION);
        const swingPitch = SWING_ARM_PITCH * swingTime.current;
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
          rightArmRef.current.rotation.x,
          swingPitch,
          lerp
        );
      } else {
        if (wasSwinging.current) {
          swingTime.current = Math.max(0, swingTime.current - delta / SWING_DURATION);
          const swingPitch = SWING_ARM_PITCH * swingTime.current;
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.x,
            swingPitch,
            lerp
          );
          if (swingTime.current <= 0) wasSwinging.current = false;
        } else {
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.x,
            baseArm,
            lerp
          );
        }
      }
    }
  });

  const mat = (
    <meshStandardMaterial
      color={color}
      roughness={0.6}
      metalness={0.3}
    />
  );

  return (
    <group ref={groupRef} scale={scale}>
      {/* Torso — capsule body */}
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.35, 0.9, 8, 16]} />
        {mat}
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        {mat}
      </mesh>

      {/* Left leg */}
      <group ref={leftLegRef} position={[-0.15, 0.6, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.6, 8]} />
          {mat}
        </mesh>
      </group>

      {/* Right leg */}
      <group ref={rightLegRef} position={[0.15, 0.6, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.6, 8]} />
          {mat}
        </mesh>
      </group>

      {/* Left arm */}
      <group ref={leftArmRef} position={[-0.4, 1.4, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.5, 8]} />
          {mat}
        </mesh>
      </group>

      {/* Right arm (sword arm) */}
      <group ref={rightArmRef} position={[0.4, 1.4, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.5, 8]} />
          {mat}
        </mesh>
      </group>
    </group>
  );
}
