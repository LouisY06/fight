// =============================================================================
// Player.tsx — Player entity: weapon, position, health state
// =============================================================================

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { Weapon } from './Weapon';
import { DeathEffect } from './DeathEffect';
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
  const playerState = useGameStore((s) => playerId === 'player1' ? s.player1 : s.player2);
  
  const [isDead, setIsDead] = useState(false);
  const [deathPosition, setDeathPosition] = useState<[number, number, number]>([0, 0, 0]);
  const previousHealthRef = useRef(playerState.health);

  // Detect when player dies or respawns
  useEffect(() => {
    // Check if player just died
    if (playerState.health <= 0 && !isDead) {
      setIsDead(true);
      if (groupRef.current) {
        setDeathPosition([
          groupRef.current.position.x,
          groupRef.current.position.y,
          groupRef.current.position.z,
        ]);
      }
    }
    // Check if player respawned (health restored)
    else if (playerState.health > 0 && isDead) {
      setIsDead(false);
    }
    previousHealthRef.current = playerState.health;
  }, [playerState.health, isDead]);

  // Reset death state when new round starts
  useEffect(() => {
    if (phase === 'countdown' && isDead) {
      setIsDead(false);
    }
  }, [phase, isDead]);

  // Move player based on input during gameplay
  useFrame(() => {
    if (phase !== 'playing' || !groupRef.current || isDead) return;

    const speed = 0.05;
    groupRef.current.position.x += input.moveDirection.x * speed;
    groupRef.current.position.z += input.moveDirection.z * speed;
  });

  // Tag opponent for raycast hit detection
  const isOpponent = playerId === 'player2';

  return (
    <>
      <group ref={groupRef} position={spawnPosition} userData={{ isOpponent }}>
        {/* Only show player if not dead */}
        {!isDead && (
          <>
            <RigidBody type="kinematicPosition" colliders={false}>
              <CapsuleCollider args={[0.5, 0.3]} position={[0, 1, 0]} />

              {/* Robot GLB normalized to 2 units height, feet at y=0 */}
              <RobotEntity
                color={color}
                targetHeight={2}
                isWalking={input.moveDirection.lengthSq() > 0.0001}
                isSwinging={input.gesture === 'slash' || input.gesture === 'stab'}
              />

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
          </>
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
