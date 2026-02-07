// =============================================================================
// Weapon.tsx — Weapon mesh + collider + trail effect
// =============================================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { WeaponTrail } from './WeaponTrail';

interface WeaponProps {
  playerId: 'player1' | 'player2';
  position: THREE.Vector3;
  rotation: THREE.Euler;
  gesture: string;
  accentColor: string;
}

export function Weapon({
  playerId,
  position,
  rotation,
  gesture,
  accentColor,
}: WeaponProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const isAttacking = gesture === 'slash' || gesture === 'stab';

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.copy(position);
    meshRef.current.rotation.copy(rotation);
  });

  return (
    <group ref={meshRef}>
      <RigidBody
        type="kinematicPosition"
        colliders={false}
        userData={{ type: 'weapon', owner: playerId }}
      >
        {/* Sword blade collider */}
        <CapsuleCollider args={[0.5, 0.05]} rotation={[0, 0, Math.PI / 2]} />

        {/* Sword handle */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.25, 8]} />
          <meshStandardMaterial color="#8B4513" roughness={0.8} metalness={0.2} />
        </mesh>

        {/* Sword guard */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.2, 0.03, 0.06]} />
          <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Sword blade */}
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[0.04, 0.8, 0.015]} />
          <meshStandardMaterial
            color="#cccccc"
            roughness={0.15}
            metalness={0.95}
            emissive={isAttacking ? accentColor : '#000000'}
            emissiveIntensity={isAttacking ? 0.5 : 0}
          />
        </mesh>

        {/* Blade tip */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <coneGeometry args={[0.02, 0.1, 4]} />
          <meshStandardMaterial
            color="#cccccc"
            roughness={0.15}
            metalness={0.95}
          />
        </mesh>
      </RigidBody>

      {/* Swing trail effect */}
      {isAttacking && <WeaponTrail color={accentColor} />}
    </group>
  );
}
