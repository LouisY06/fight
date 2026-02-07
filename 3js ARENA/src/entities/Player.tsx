// =============================================================================
// Player.tsx — Player entity: weapon, position, health state
// =============================================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { Weapon } from './Weapon';
import type { PlayerInput } from '../game/InputManager';
import { useGameStore } from '../game/GameState';
import { OpponentHitbox } from './OpponentHitbox';
import { RobotEntity } from '../avatars/RobotEntity';

interface PlayerProps {
  playerId: 'player1' | 'player2';
  input: PlayerInput;
  color: string;
  spawnPosition: [number, number, number];
}

export function Player({ playerId, input, color, spawnPosition }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const phase = useGameStore((s) => s.phase);

  // Move player based on input during gameplay
  useFrame(() => {
    if (phase !== 'playing' || !groupRef.current) return;

    const speed = 0.05;
    groupRef.current.position.x += input.moveDirection.x * speed;
    groupRef.current.position.z += input.moveDirection.z * speed;
  });

  // Tag opponent for raycast hit detection
  const isOpponent = playerId === 'player2';

  return (
    <group ref={groupRef} position={spawnPosition} userData={{ isOpponent }}>
      {/* Player body (capsule) */}
      <RigidBody type="kinematicPosition" colliders={false}>
        <CapsuleCollider args={[0.5, 0.3]} position={[0, 1, 0]} />

        {/* Enemy: robot GLB (with solid fallback so we never show only wireframe). Local player: capsule. */}
        {isOpponent ? (
          <>
            {/* Guaranteed solid body so enemy is never just a wireframe */}
            <mesh position={[0, 1, 0]} castShadow renderOrder={0}>
              <capsuleGeometry args={[0.3, 1, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} depthWrite />
            </mesh>
            <mesh position={[0, 1.9, 0]} castShadow renderOrder={0}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} depthWrite />
            </mesh>
            <group renderOrder={1}>
              <RobotEntity
                color={color}
                isWalking={input.moveDirection.lengthSq() > 0.01}
                isSwinging={input.gesture === 'slash'}
              />
            </group>
          </>
        ) : (
          <>
            <mesh position={[0, 1, 0]} castShadow>
              <capsuleGeometry args={[0.3, 1, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
            </mesh>
            <mesh position={[0, 1.9, 0]} castShadow>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
            </mesh>
          </>
        )}

        {/* Hitbox visualization (only for opponent) */}
        {isOpponent && <OpponentHitbox />}
      </RigidBody>

      {/* Weapon */}
      <Weapon
        playerId={playerId}
        position={input.weaponPosition}
        rotation={input.weaponRotation}
        gesture={input.gesture}
        accentColor={color}
      />
    </group>
  );
}
