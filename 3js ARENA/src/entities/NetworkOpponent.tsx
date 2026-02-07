// =============================================================================
// NetworkOpponent.tsx — Renders the remote opponent using network state
// Position and rotation are interpolated from WebSocket updates.
// =============================================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useNetwork } from '../networking/NetworkProvider';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { OpponentHitbox } from './OpponentHitbox';
import { RobotEntity } from '../avatars/RobotEntity';

interface NetworkOpponentProps {
  color?: string;
}

export function NetworkOpponent({ color = '#ff4444' }: NetworkOpponentProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const phase = useGameStore((s) => s.phase);
  const { opponentState } = useNetwork();

  // Smoothly interpolate opponent position/rotation
  const targetPos = useRef(new THREE.Vector3(0, 0, GAME_CONFIG.playerSpawnDistance / 2));
  const targetRotY = useRef(0);
  const currentPos = useRef(new THREE.Vector3(0, 0, GAME_CONFIG.playerSpawnDistance / 2));

  useFrame(() => {
    if (!groupRef.current) return;

    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'roundEnd';

    if (!isGameplay) return;

    // Update target from network
    targetPos.current.set(
      opponentState.position[0],
      0, // Keep on ground
      opponentState.position[2]
    );
    targetRotY.current = opponentState.rotation[1];

    // Lerp toward target for smooth movement
    currentPos.current.lerp(targetPos.current, 0.2);
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY.current + Math.PI, // Face toward us
      0.2
    );
  });

  const isSwinging = opponentState.isSwinging;
  const isMovingRef = useRef(false);
  const prevPos = useRef({ x: opponentState.position[0], z: opponentState.position[2] });
  useFrame(() => {
    const dx = opponentState.position[0] - prevPos.current.x;
    const dz = opponentState.position[2] - prevPos.current.z;
    isMovingRef.current = dx * dx + dz * dz > 0.0001;
    prevPos.current = { x: opponentState.position[0], z: opponentState.position[2] };
  });

  return (
    <group ref={groupRef} position={[0, 0, GAME_CONFIG.playerSpawnDistance / 2]} userData={{ isOpponent: true }}>
      <RigidBody type="kinematicPosition" colliders={false}>
        <CapsuleCollider args={[0.5, 0.3]} position={[0, 1, 0]} />

        {/* Animated GLB: walk when moving, swing when attacking (SkeletonUtils clone from prefab) */}
        <RobotEntity
          color={color}
          isWalkingRef={isMovingRef}
          isSwinging={isSwinging}
        />

        {/* Hitbox visualization */}
        <OpponentHitbox />

        {/* Opponent's sword — simple representation */}
        <group
          position={[0.4, 1.2, -0.3]}
          rotation={[
            isSwinging ? -0.8 : -0.3,
            0,
            isSwinging ? -1.2 : -0.4,
          ]}
        >
          {/* Handle */}
          <mesh>
            <cylinderGeometry args={[0.02, 0.025, 0.18, 8]} />
            <meshStandardMaterial color="#5C3317" roughness={0.85} />
          </mesh>
          {/* Guard */}
          <mesh position={[0, 0.11, 0]}>
            <boxGeometry args={[0.12, 0.02, 0.04]} />
            <meshStandardMaterial color="#888" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Blade */}
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.03, 0.55, 0.01]} />
            <meshStandardMaterial color="#ddd" roughness={0.1} metalness={0.95} />
          </mesh>
        </group>
      </RigidBody>
    </group>
  );
}
