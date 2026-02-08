// =============================================================================
// BotOpponent.tsx — AI bot for local practice: moves toward player, attacks
// Uses RiggedMechEntity (rigged_mechs_pack_2.glb) with walk + sword animations.
// =============================================================================

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { DeathEffect } from './DeathEffect';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG, AI_DIFFICULTY } from '../game/GameConfig';
import { getDebuff } from '../combat/SpellSystem';
import { DebuffVFX } from '../combat/DebuffVFX';
import { OpponentHitbox } from './OpponentHitbox';
import { RiggedMechEntity } from '../riggedMechs/RiggedMechEntity';
import { MECH_PACK_COUNT } from '../riggedMechs/riggedMechPackConstants';
import { setBotSwordState } from '../combat/OpponentSwordState';

const SWORD_BLADE_LENGTH = 0.7; // world-space blade length (scaled)

interface BotOpponentProps {
  color?: string;
}

export function BotOpponent({ color = '#ff4444' }: BotOpponentProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const aiDifficulty = useGameStore((s) => s.aiDifficulty);
  const diffConfig = useMemo(() => AI_DIFFICULTY[aiDifficulty], [aiDifficulty]);
  const randomEnemyMechIndex = useMemo(
    () => Math.floor(Math.random() * Math.max(1, MECH_PACK_COUNT)),
    []
  );

  const phase = useGameStore((s) => s.phase);
  const player2 = useGameStore((s) => s.player2);

  const [isDead, setIsDead] = useState(false);
  const [deathPosition, setDeathPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [isSwinging, setIsSwinging] = useState(false);
  const previousHealthRef = useRef(player2.health);

  const isMovingRef = useRef(false);
  const swingProgressRef = useRef(0);
  const lastAttackTimeRef = useRef(0);
  const swordGroupRef = useRef<THREE.Group | null>(null);

  const _dirToPlayer = new THREE.Vector3();
  const _playerPos = new THREE.Vector3();
  const _swordHilt = new THREE.Vector3();
  const _swordTipLocal = new THREE.Vector3();
  const _swordQuat = new THREE.Quaternion();

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

    // --- Debuff checks ---
    const debuff = getDebuff('player2');
    const isStunned = debuff === 'stun';
    const isSlowed = debuff === 'slow';
    const speedMultiplier = isSlowed ? 0.35 : 1;

    // Stun-lock: can't move or attack at all
    if (isStunned) {
      isMovingRef.current = false;
      // Still update sword state for visuals
      if (swordGroupRef.current) {
        swordGroupRef.current.getWorldPosition(_swordHilt);
        swordGroupRef.current.getWorldQuaternion(_swordQuat);
        _swordTipLocal.set(0, SWORD_BLADE_LENGTH, 0);
        _swordTipLocal.applyQuaternion(_swordQuat).add(_swordHilt);
        setBotSwordState(_swordHilt.clone(), _swordTipLocal.clone(), false);
      }
      return; // Skip all movement and attack logic
    }

    // Attack logic — swing when in range and cooldown elapsed (difficulty-aware)
    const inAttackRange = distXZ < diffConfig.attackRange;
    const cooldownElapsed = now - lastAttackTimeRef.current > diffConfig.attackCooldown;

    if (inAttackRange && cooldownElapsed && swingProgressRef.current <= 0) {
      swingProgressRef.current = 0.001;
      setIsSwinging(true);
      lastAttackTimeRef.current = now;
    }

    if (swingProgressRef.current > 0) {
      swingProgressRef.current += delta / diffConfig.swingDuration;
      if (swingProgressRef.current >= 1) {
        swingProgressRef.current = 0;
        setIsSwinging(false);
      }
    }

    // Movement — approach player when not in attack range (difficulty-aware speed, slowed if debuffed)
    if (!inAttackRange && distXZ > 0.3) {
      _dirToPlayer.normalize();
      const move = diffConfig.moveSpeed * speedMultiplier * delta;
      groupRef.current.position.x += _dirToPlayer.x * move;
      groupRef.current.position.z += _dirToPlayer.z * move;
      isMovingRef.current = true;
    } else {
      isMovingRef.current = false;
    }

    // Face player (MechaEntity model faces +Z, so use atan2(x, z) directly)
    if (distXZ > 0.01) {
      _dirToPlayer.normalize();
      const targetYaw = Math.atan2(_dirToPlayer.x, _dirToPlayer.z);
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

    // Publish sword world-space segment for hit detection
    // Must updateWorldMatrix first since the sword is attached imperatively to the hierarchy
    if (swordGroupRef.current) {
      swordGroupRef.current.updateWorldMatrix(true, false);
      swordGroupRef.current.getWorldPosition(_swordHilt);
      swordGroupRef.current.getWorldQuaternion(_swordQuat);
      _swordTipLocal.set(0, SWORD_BLADE_LENGTH, 0);
      _swordTipLocal.applyQuaternion(_swordQuat).add(_swordHilt);
      setBotSwordState(_swordHilt.clone(), _swordTipLocal.clone(), isSwinging);
    }
    // Even if swordGroupRef is not set yet, still publish active state so damage can register
    // once the sword position becomes available next frame
    if (!swordGroupRef.current && isSwinging) {
      // Fallback: use bot position as approximate sword position
      const bx = groupRef.current.position.x;
      const bz = groupRef.current.position.z;
      _swordHilt.set(bx, 1.2, bz);
      _swordTipLocal.set(bx + Math.sin(groupRef.current.rotation.y) * 0.8, 1.5, bz + Math.cos(groupRef.current.rotation.y) * 0.8);
      setBotSwordState(_swordHilt.clone(), _swordTipLocal.clone(), true);
    }
  });

  return (
    <>
      <group ref={groupRef} position={GAME_CONFIG.spawnP2} userData={{ isOpponent: true }}>
        {!isDead && (
          <>
            <RigidBody type="kinematicPosition" colliders={false}>
              <CapsuleCollider args={[0.5, 0.3]} position={[0, 1, 0]} />

              <RiggedMechEntity
                key={`bot-mech-${randomEnemyMechIndex}`}
                color={color}
                mechIndex={randomEnemyMechIndex}
                isSwinging={isSwinging}
                isWalkingRef={isMovingRef}
                swordRef={swordGroupRef}
              />

              <OpponentHitbox />
            </RigidBody>

            {/* 3D debuff status effects (electric arcs / frost crystals) */}
            <DebuffVFX target="player2" />
          </>
        )}
      </group>

      {isDead && (
        <DeathEffect position={deathPosition} color={color} />
      )}
    </>
  );
}
