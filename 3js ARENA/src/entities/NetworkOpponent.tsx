// =============================================================================
// NetworkOpponent.tsx — Renders the remote opponent using network state
// Position and rotation are interpolated from WebSocket updates.
// =============================================================================

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { DeathEffect } from './DeathEffect';
import { useNetwork } from '../networking/NetworkProvider';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { OpponentHitbox } from './OpponentHitbox';

interface NetworkOpponentProps {
  color?: string;
}

export function NetworkOpponent({ color = '#ff4444' }: NetworkOpponentProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const phase = useGameStore((s) => s.phase);
  const { opponentState } = useNetwork();
  const player2 = useGameStore((s) => s.player2);
  
  const [isDead, setIsDead] = useState(false);
  const [deathPosition, setDeathPosition] = useState<[number, number, number]>([0, 0, 0]);
  const previousHealthRef = useRef(player2.health);

  // Detect when opponent dies or respawns
  useEffect(() => {
    // Check if opponent just died
    if (player2.health <= 0 && !isDead) {
      setIsDead(true);
      if (groupRef.current) {
        setDeathPosition([
          groupRef.current.position.x,
          groupRef.current.position.y,
          groupRef.current.position.z,
        ]);
      }
    }
    // Check if opponent respawned (health restored)
    else if (player2.health > 0 && isDead) {
      setIsDead(false);
    }
    previousHealthRef.current = player2.health;
  }, [player2.health, isDead]);

  // Reset death state when new round starts
  useEffect(() => {
    if (phase === 'countdown' && isDead) {
      setIsDead(false);
    }
  }, [phase, isDead]);

  // Smoothly interpolate opponent position/rotation
  // The opponent's position comes directly from network (their camera position).
  const targetPos = useRef(new THREE.Vector3());
  const targetRotY = useRef(0);
  const currentPos = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!groupRef.current || isDead) return;

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

  return (
    <>
      <group ref={groupRef} position={[0, 0, 0]} userData={{ isOpponent: true }}>
        {/* Only show opponent if not dead */}
        {!isDead && (
          <RigidBody type="kinematicPosition" colliders={false}>
            <CapsuleCollider args={[0.5, 0.3]} position={[0, 1, 0]} />

            {/* Body */}
            <mesh position={[0, 1, 0]} castShadow>
              <capsuleGeometry args={[0.3, 1, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
            </mesh>

            {/* Head */}
            <mesh position={[0, 1.9, 0]} castShadow>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
            </mesh>

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
        )}
      </group>
      
      {/* Death effect */}
      {isDead && (
        <DeathEffect 
          position={deathPosition}
          color={color}
        />
      )}
    </>
  );
}
