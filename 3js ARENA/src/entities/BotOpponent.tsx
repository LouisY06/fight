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
import { getDebuff, useSpellStore, fireSpellCast, SPELL_CONFIGS, type SpellType } from '../combat/SpellSystem';
import { DebuffVFX } from '../combat/DebuffVFX';
import { OpponentHitbox } from './OpponentHitbox';
import { RiggedMechEntity } from '../riggedMechs/RiggedMechEntity';
import { MECH_PACK_COUNT } from '../riggedMechs/riggedMechPackConstants';
import { setBotSwordState } from '../combat/OpponentSwordState';
import { cvBridge } from '../cv/cvBridge';

// Bot spell-casting interval per difficulty (ms between spell attempts)
const BOT_SPELL_INTERVAL: Record<string, number> = {
  easy: 12000,
  medium: 8000,
  hard: 5000,
  trueai: 6000,
};

const SPELL_TYPES: SpellType[] = ['fireball', 'laser', 'ice_blast'];

// Blade in MechaGeometry: BoxGeometry height=2.0, position.y=1.08 → top at ~2.08.
// Sword group in MechaEntity: scale=[0.3,0.3,0.3], rotation=[PI,0,0].
// We use getWorldScale to compute the actual world blade length.
const SWORD_BLADE_LENGTH = 2.1; // local-space blade extent (pre-scale)

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
  const lastSpellTimeRef = useRef(0);

  const _dirToPlayer = new THREE.Vector3();
  const _playerPos = new THREE.Vector3();
  const _swordHilt = new THREE.Vector3();
  const _swordTipLocal = new THREE.Vector3();
  const _swordQuat = new THREE.Quaternion();

  // Reset position on round start (countdown phase)
  useEffect(() => {
    if (phase === 'countdown' && groupRef.current) {
      const [sx, sy, sz] = GAME_CONFIG.spawnP2;
      groupRef.current.position.set(sx, sy, sz);
      groupRef.current.rotation.set(0, 0, 0);
      setIsDead(false);
      swingProgressRef.current = 0;
      setIsSwinging(false);
      lastAttackTimeRef.current = 0;
      // Update cvBridge with spawn position
      cvBridge.setOpponentPosition(sx, sy, sz);
    }
  }, [phase]);

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

    // --- Lock movement and attacks during countdown ---
    if (phase === 'countdown') {
      isMovingRef.current = false;
      // Update sword state but don't attack
      if (swordGroupRef.current) {
        swordGroupRef.current.getWorldPosition(_swordHilt);
        swordGroupRef.current.getWorldQuaternion(_swordQuat);
        const worldScale = new THREE.Vector3();
        swordGroupRef.current.getWorldScale(worldScale);
        const bladeWorldLen = SWORD_BLADE_LENGTH * worldScale.y;
        _swordTipLocal.set(0, bladeWorldLen, 0);
        _swordTipLocal.applyQuaternion(_swordQuat).add(_swordHilt);
        setBotSwordState(_swordHilt.clone(), _swordTipLocal.clone(), false);
      }
      // Still face player during countdown
      if (distXZ > 0.01) {
        _dirToPlayer.normalize();
        const targetYaw = Math.atan2(_dirToPlayer.x, _dirToPlayer.z);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          targetYaw,
          delta * 8
        );
      }
      cvBridge.setOpponentPosition(botPos.x, botPos.y, botPos.z);
      return;
    }

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
        const worldScale = new THREE.Vector3();
        swordGroupRef.current.getWorldScale(worldScale);
        const bladeWorldLen = SWORD_BLADE_LENGTH * worldScale.y;
        _swordTipLocal.set(0, bladeWorldLen, 0);
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

    // --- Bot spell casting ---
    const nowMs = performance.now();
    const spellInterval = BOT_SPELL_INTERVAL[aiDifficulty] ?? 8000;
    if (nowMs - lastSpellTimeRef.current > spellInterval && distXZ < 15) {
      lastSpellTimeRef.current = nowMs;
      // Pick a random spell
      const spellType = SPELL_TYPES[Math.floor(Math.random() * SPELL_TYPES.length)];
      // Aim at player from bot position
      const origin = new THREE.Vector3(botPos.x, botPos.y + 1.2, botPos.z);
      const direction = new THREE.Vector3(
        _playerPos.x - origin.x,
        _playerPos.y - origin.y,
        _playerPos.z - origin.z
      ).normalize();
      const spell = useSpellStore.getState().castSpell(spellType, 'player2', origin, direction);
      if (spell) {
        fireSpellCast(spell);
        console.log(`[Bot] Cast ${spellType}!`);
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

    // Publish opponent position
    cvBridge.setOpponentPosition(groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z);

    // Publish sword world-space segment for hit detection
    // Must updateWorldMatrix first since the sword is attached imperatively to the hierarchy
    if (swordGroupRef.current) {
      swordGroupRef.current.updateWorldMatrix(true, false);
      swordGroupRef.current.getWorldPosition(_swordHilt);
      swordGroupRef.current.getWorldQuaternion(_swordQuat);

      // Get the world scale of the sword group to compute proper blade length
      const worldScale = new THREE.Vector3();
      swordGroupRef.current.getWorldScale(worldScale);
      const bladeWorldLen = SWORD_BLADE_LENGTH * worldScale.y;

      _swordTipLocal.set(0, bladeWorldLen, 0);
      _swordTipLocal.applyQuaternion(_swordQuat).add(_swordHilt);
      setBotSwordState(_swordHilt.clone(), _swordTipLocal.clone(), isSwinging);
    } else {
      // Fallback: if swordRef is not populated yet, place sword at bot position
      const bp = groupRef.current.position;
      setBotSwordState(
        new THREE.Vector3(bp.x, bp.y + 1.2, bp.z),
        new THREE.Vector3(bp.x, bp.y + 2.0, bp.z),
        isSwinging
      );
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
