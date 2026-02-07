// =============================================================================
// BotOpponent.tsx — AI bot for local practice: moves toward player, attacks
// Uses SimpleCharacterModel (procedural, no GLB). Can deal damage to the player.
// =============================================================================

import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { DeathEffect } from './DeathEffect';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { OpponentHitbox } from './OpponentHitbox';
import { SimpleCharacterModel } from './SimpleCharacterModel';
import { Weapon } from './Weapon';
import { setBotSwordState } from '../combat/OpponentSwordState';

const BOT_MOVE_SPEED = 2.5;
const ATTACK_RANGE = 2.2;
const ATTACK_COOLDOWN = 1.2;
const SWING_DURATION = 0.4;

interface BotOpponentProps {
  color?: string;
}

export function BotOpponent({ color = '#ff4444' }: BotOpponentProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);

  const phase = useGameStore((s) => s.phase);
  const player2 = useGameStore((s) => s.player2);

  const [isDead, setIsDead] = useState(false);
  const [deathPosition, setDeathPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [isSwinging, setIsSwinging] = useState(false);
  const previousHealthRef = useRef(player2.health);

  const isMovingRef = useRef(false);
  const swingProgressRef = useRef(0);
  const lastAttackTimeRef = useRef(0);

  const weaponPosRef = useRef(new THREE.Vector3(0.4, 1.2, 0.3));
  const weaponRotRef = useRef(new THREE.Euler(0, 0, 0.2));

  const _dirToPlayer = new THREE.Vector3();
  const _playerPos = new THREE.Vector3();

  // Detect when bot dies
  useEffect(() => {
    if (previousHealthRef.current > 0 && player2.health <= 0) {
      setIsDead(true);
      if (groupRef.current) {
        setDeathPosition([
          groupRef.current.position.x,
          groupRef.current.position.y,
          groupRef.current.position.z,
        ]);
      }
      setBotSwordState(_playerPos, _playerPos, false);
    } else if (player2.health > 0 && isDead) {
      setIsDead(false);
    }
    previousHealthRef.current = player2.health;
  }, [player2.health, isDead]);

  const handlePublishSword = (hilt: THREE.Vector3, tip: THREE.Vector3, active: boolean) => {
    setBotSwordState(hilt, tip, active);
  };

  useFrame((_, delta) => {
    if (!groupRef.current || isDead) return;

    const isGameplay =
      phase === 'playing' || phase === 'countdown' || phase === 'roundEnd';
    if (!isGameplay) return;

    camera.getWorldPosition(_playerPos);
    const botPos = groupRef.current.position;

    _dirToPlayer.set(_playerPos.x - botPos.x, 0, _playerPos.z - botPos.z);
    const distXZ = _dirToPlayer.length();
    const now = performance.now() / 1000;

    // Attack logic — swing when in range and cooldown elapsed
    const inAttackRange = distXZ < ATTACK_RANGE;
    const cooldownElapsed = now - lastAttackTimeRef.current > ATTACK_COOLDOWN;

    if (inAttackRange && cooldownElapsed && swingProgressRef.current <= 0) {
      swingProgressRef.current = 0.001;
      setIsSwinging(true);
      lastAttackTimeRef.current = now;
    }

    if (swingProgressRef.current > 0) {
      swingProgressRef.current += delta / SWING_DURATION;
      if (swingProgressRef.current >= 1) {
        swingProgressRef.current = 0;
        setIsSwinging(false);
      }
    }

    // Movement — approach player when not in attack range
    if (!inAttackRange && distXZ > 0.3) {
      _dirToPlayer.normalize();
      const move = BOT_MOVE_SPEED * delta;
      groupRef.current.position.x += _dirToPlayer.x * move;
      groupRef.current.position.z += _dirToPlayer.z * move;
      isMovingRef.current = true;
    } else {
      isMovingRef.current = false;
    }

    // Face player
    if (distXZ > 0.01) {
      _dirToPlayer.normalize();
      const targetYaw = Math.atan2(-_dirToPlayer.x, -_dirToPlayer.z);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetYaw,
        delta * 8
      );
    }

    // Clamp to arena bounds
    const r = GAME_CONFIG.arenaRadius - 0.5;
    const dx = groupRef.current.position.x;
    const dz = groupRef.current.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > r) {
      const scale = r / dist;
      groupRef.current.position.x = dx * scale;
      groupRef.current.position.z = dz * scale;
    }

    // Weapon pose — swing animation
    const swingT = swingProgressRef.current;
    const swingAngle = swingT > 0 && swingT < 1 ? Math.sin(swingT * Math.PI) * -1.2 : 0;
    weaponPosRef.current.set(0.4, 1.2, 0.3);
    weaponRotRef.current.set(swingAngle * 0.5, 0, 0.2);
  });

  return (
    <>
      <group ref={groupRef} position={GAME_CONFIG.spawnP2} userData={{ isOpponent: true }}>
        {!isDead && (
          <>
            <RigidBody type="kinematicPosition" colliders={false}>
              <CapsuleCollider args={[0.5, 0.3]} position={[0, 1, 0]} />

              {/* Procedural character model (no GLB) */}
              <SimpleCharacterModel
                color={color}
                targetHeight={2}
                isWalkingRef={isMovingRef}
                isSwinging={isSwinging || swingProgressRef.current < 0.9}
              />

              <OpponentHitbox />
            </RigidBody>

            {/* Bot's sword */}
            <Weapon
              playerId="player2"
              position={weaponPosRef.current}
              rotation={weaponRotRef.current}
              gesture={isSwinging ? 'slash' : 'idle'}
              accentColor={color}
              positionRef={weaponPosRef}
              rotationRef={weaponRotRef}
              publishSwordSegment={handlePublishSword}
            />
          </>
        )}
      </group>

      {isDead && (
        <DeathEffect position={deathPosition} color={color} />
      )}
    </>
  );
}
