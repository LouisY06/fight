// =============================================================================
// NetworkOpponent.tsx — Renders the remote opponent using network state
// Position and rotation are interpolated from WebSocket updates.
// Uses RiggedMechEntity (rigged_mechs_pack_2.glb) with random mech from pack.
// =============================================================================

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { DeathEffect } from './DeathEffect';
import { useNetwork } from '../networking/NetworkProvider';
import { useGameStore } from '../game/GameState';
import { OpponentHitbox } from './OpponentHitbox';
import { RiggedMechEntity } from '../riggedMechs/RiggedMechEntity';
import { MECH_PACK_COUNT } from '../riggedMechs/riggedMechPackConstants';

interface NetworkOpponentProps {
  color?: string;
}

export function NetworkOpponent({ color = '#ff4444' }: NetworkOpponentProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const phase = useGameStore((s) => s.phase);
  const randomEnemyMechIndex = useMemo(
    () => Math.floor(Math.random() * Math.max(1, MECH_PACK_COUNT)),
    []
  );
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
  const isMovingRef = useRef(false);
  const prevPos = useRef({ x: opponentState.position[0], z: opponentState.position[2] });
  useFrame(() => {
    const dx = opponentState.position[0] - prevPos.current.x;
    const dz = opponentState.position[2] - prevPos.current.z;
    isMovingRef.current = dx * dx + dz * dz > 0.0001;
    prevPos.current = { x: opponentState.position[0], z: opponentState.position[2] };
  });

  return (
    <>
      {/* Position/rotation set in useFrame */}
      <group ref={groupRef} userData={{ isOpponent: true }}>
        {!isDead && (
          <RigidBody type="kinematicPosition" colliders={false}>
            <CapsuleCollider args={[0.5, 0.3]} position={[0, 1, 0]} />

            <RiggedMechEntity
              key={`network-mech-${randomEnemyMechIndex}`}
              color={color}
              mechIndex={randomEnemyMechIndex}
              isSwinging={isSwinging}
              isWalkingRef={isMovingRef}
            />

            {/* Hitbox visualization */}
            <OpponentHitbox />
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
