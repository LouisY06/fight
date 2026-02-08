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
import { GAME_CONFIG } from '../game/GameConfig';
import { OpponentHitbox } from './OpponentHitbox';
import { MechaEntity } from './MechaEntity';
import { DebuffVFX } from '../combat/DebuffVFX';
import { RiggedMechEntity } from '../riggedMechs/RiggedMechEntity';
import { useMechaCustomizationStore } from '../game/MechaCustomizationStore';

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
  const { avatarType, selectedPlayerMechId, segmentScales } = useMechaCustomizationStore();

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

  // Reset death state and position when new round starts
  useEffect(() => {
    if (phase === 'countdown') {
      if (isDead) setIsDead(false);
      // Reset to spawn position
      if (groupRef.current) {
        groupRef.current.position.set(...spawnPosition);
      }
    }
  }, [phase, isDead, spawnPosition]);

  // Move player based on input during gameplay
  useFrame(() => {
    if (phase !== 'playing' || !groupRef.current || isDead) return;

    const speed = 0.05;
    groupRef.current.position.x += input.moveDirection.x * speed;
    groupRef.current.position.z += input.moveDirection.z * speed;

    // Clamp to arena bounds (prevents walking off screen)
    const r = GAME_CONFIG.arenaRadius - 0.5;
    const px = groupRef.current.position.x;
    const pz = groupRef.current.position.z;
    const dist = Math.sqrt(px * px + pz * pz);
    if (dist > r) {
      const clampScale = r / dist;
      groupRef.current.position.x = px * clampScale;
      groupRef.current.position.z = pz * clampScale;
    }
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

              {avatarType === 'classic' ? (
                <MechaEntity
                  color={color}
                  scaleHead={segmentScales.head}
                  scaleTorso={segmentScales.torso}
                  scaleArms={segmentScales.arms}
                  scaleLegs={segmentScales.legs}
                  isWalking={input.moveDirection.lengthSq() > 0.0001}
                  isSwinging={input.gesture === 'slash' || input.gesture === 'stab'}
                />
              ) : (
                <RiggedMechEntity
                  key={`player-rigged-${selectedPlayerMechId}`}
                  color={color}
                  mechIndex={selectedPlayerMechId}
                  scaleHead={segmentScales.head}
                  scaleTorso={segmentScales.torso}
                  scaleArms={segmentScales.arms}
                  scaleLegs={segmentScales.legs}
                  isWalking={input.moveDirection.lengthSq() > 0.0001}
                  isSwinging={input.gesture === 'slash' || input.gesture === 'stab'}
                />
              )}

              {/* Hitbox visualization (only for opponent) */}
              {isOpponent && <OpponentHitbox />}
            </RigidBody>

            {/* 3D debuff status effects (electric arcs / frost crystals) */}
            <DebuffVFX target={playerId} />

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
