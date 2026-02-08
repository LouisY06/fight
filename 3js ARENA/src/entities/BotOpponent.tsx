// =============================================================================
// BotOpponent.tsx — AI bot driven by Vultr Serverless Inference LLM
// Polls VultrAI for strategic decisions (movement, attacks, blocks, spells).
// Every decision is made by the LLM based on live game state + fight memory.
// =============================================================================

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
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
import { VultrAI, type AICombatDecision, type GameStateSnapshot } from '../ai/VultrAIService';
import { FightMemory } from '../ai/FightMemory';

// Blade in MechaGeometry: BoxGeometry height=2.0, position.y=1.08 → top at ~2.08.
// Sword group in MechaEntity: scale=[0.3,0.3,0.3], rotation=[PI,0,0].
// We use getWorldScale to compute the actual world blade length.
const SWORD_BLADE_LENGTH = 2.1; // local-space blade extent (pre-scale)

// All castable spell types
const ALL_SPELLS: SpellType[] = ['fireball', 'laser', 'ice_blast'];

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

  // --- Vultr AI decision state ---
  const currentDecision = useRef<AICombatDecision>({
    move: 'hold', action: 'idle', timing: 'immediate', spell: 'none',
  });
  const isFetching = useRef(false);
  const decisionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBlockingRef = useRef(false);
  const blockStartRef = useRef(0);
  const recentBotActions = useRef<string[]>([]);
  const recentPlayerActions = useRef<string[]>([]);
  const lastPlayerHealthRef = useRef(100);
  const roundStartTimeRef = useRef(Date.now());

  // Pre-allocated temp vectors to avoid per-frame allocation
  const _dirToPlayer = useRef(new THREE.Vector3()).current;
  const _playerPos = useRef(new THREE.Vector3()).current;
  const _swordHilt = useRef(new THREE.Vector3()).current;
  const _swordTipLocal = useRef(new THREE.Vector3()).current;
  const _swordQuat = useRef(new THREE.Quaternion()).current;
  const _worldScale = useRef(new THREE.Vector3()).current;
  const _spellOrigin = useRef(new THREE.Vector3()).current;
  const _spellDir = useRef(new THREE.Vector3()).current;
  const _perpendicular = useRef(new THREE.Vector3()).current;
  // Reusable vectors for sword state publishing (avoid .clone() in hot loop)
  const _hiltOut = useRef(new THREE.Vector3()).current;
  const _tipOut = useRef(new THREE.Vector3()).current;

  // ---- Compute spell availability for the LLM prompt ----
  const getSpellAvailability = useCallback((): { available: string[]; cooldowns: Record<string, number> } => {
    const now = Date.now();
    const spellStore = useSpellStore.getState();
    const available: string[] = [];
    const cooldowns: Record<string, number> = {};

    for (const spellType of ALL_SPELLS) {
      const config = SPELL_CONFIGS[spellType];
      const lastCast = spellStore.cooldowns[spellType] ?? 0;
      const elapsed = now - lastCast;
      if (elapsed >= config.cooldownMs) {
        available.push(spellType);
      } else {
        cooldowns[spellType] = (config.cooldownMs - elapsed) / 1000;
      }
    }
    return { available, cooldowns };
  }, []);

  // ---- Build game state snapshot for Vultr AI ----
  const buildSnapshot = useCallback((): GameStateSnapshot => {
    const store = useGameStore.getState();
    const playerPos = camera.position;
    const botPos = groupRef.current?.position ?? new THREE.Vector3();
    const dist = Math.sqrt(
      (playerPos.x - botPos.x) ** 2 + (playerPos.z - botPos.z) ** 2
    );
    const playerDebuff = getDebuff('player1');
    const { available, cooldowns } = getSpellAvailability();

    return {
      myHealth: store.player2.health,
      opponentHealth: store.player1.health,
      distance: dist,
      roundNumber: store.currentRound,
      timeRemaining: store.roundTimeRemaining,
      opponentRecentActions: recentPlayerActions.current.slice(-3),
      myRecentActions: recentBotActions.current.slice(-3),
      amBlocking: isBlockingRef.current,
      opponentBlocking: store.player1.isBlocking,
      availableSpells: available,
      spellCooldowns: cooldowns,
      opponentStunned: playerDebuff === 'stun',
      opponentSlowed: playerDebuff === 'slow',
    };
  }, [camera, getSpellAvailability]);

  // ---- Fetch decision from Vultr LLM ----
  const fetchDecision = useCallback(async () => {
    const store = useGameStore.getState();
    if (store.phase !== 'playing') return;
    if (isFetching.current) return;

    isFetching.current = true;
    try {
      const snapshot = buildSnapshot();
      const difficulty = store.aiDifficulty;
      const decision = await VultrAI.getDecision(snapshot, difficulty);
      currentDecision.current = decision;
    } finally {
      isFetching.current = false;
    }
  }, [buildSnapshot]);

  // ---- Start/stop LLM polling based on difficulty ----
  useEffect(() => {
    const intervalMs = AI_DIFFICULTY[aiDifficulty].decisionIntervalMs;

    // Fetch first decision immediately
    fetchDecision();

    decisionTimerRef.current = setInterval(() => {
      fetchDecision();
    }, intervalMs);

    return () => {
      if (decisionTimerRef.current) clearInterval(decisionTimerRef.current);
    };
  }, [aiDifficulty, fetchDecision]);

  // Reset position + AI state on round start (countdown phase)
  useEffect(() => {
    if (phase === 'countdown' && groupRef.current) {
      const [sx, sy, sz] = GAME_CONFIG.spawnP2;
      groupRef.current.position.set(sx, sy, sz);
      groupRef.current.rotation.set(0, 0, 0);
      setIsDead(false);
      swingProgressRef.current = 0;
      setIsSwinging(false);
      lastAttackTimeRef.current = 0;
      isBlockingRef.current = false;
      blockStartRef.current = 0;
      recentBotActions.current = [];
      recentPlayerActions.current = [];
      lastPlayerHealthRef.current = GAME_CONFIG.maxHealth;
      roundStartTimeRef.current = Date.now();
      currentDecision.current = { move: 'hold', action: 'idle', timing: 'immediate', spell: 'none' };
      VultrAI.resetConversation();
      // Update cvBridge with spawn position
      cvBridge.setOpponentPosition(sx, sy, sz);
    }
  }, [phase]);

  // Record match end for fight memory (TRUE AI)
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    const store = useGameStore.getState();
    const isTrueAI = store.aiDifficulty === 'trueai';

    if (phase === 'countdown' && prev === 'roundEnd' && isTrueAI) {
      const playerWonRound = store.player1.score > store.player2.score ||
        (store.player1.score === store.player2.score && store.player1.health > store.player2.health);
      FightMemory.recordRoundEnd(playerWonRound);
    }

    if (phase === 'gameOver' && prev !== 'gameOver') {
      if (isTrueAI) {
        const playerWon = store.player1.score >= GAME_CONFIG.roundsToWin;
        FightMemory.recordMatchEnd(playerWon, store.aiDifficulty);
      }
      VultrAI.resetConversation();
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
    const nowMs = performance.now();
    const store = useGameStore.getState();
    const isTrueAI = store.aiDifficulty === 'trueai';

    // --- Track opponent (player) actions by health changes ---
    const p1Health = store.player1.health;
    const p2Health = store.player2.health;

    // Player hit the bot (bot took damage)
    if (p2Health < lastPlayerHealthRef.current) {
      recentPlayerActions.current.push('attack');
      if (recentPlayerActions.current.length > 6) recentPlayerActions.current.shift();
      if (isTrueAI) {
        const t = Date.now() - roundStartTimeRef.current;
        FightMemory.recordEvent({ t, actor: 'player', type: 'hit_landed' });
        FightMemory.recordEvent({ t, actor: 'bot', type: 'hit_taken' });
        FightMemory.recordEvent({ t, actor: 'player', type: 'attack' });
      }
    }
    // Bot hit the player (player took damage)
    if (p1Health < lastPlayerHealthRef.current) {
      if (isTrueAI) {
        const t = Date.now() - roundStartTimeRef.current;
        FightMemory.recordEvent({ t, actor: 'bot', type: 'hit_landed' });
        FightMemory.recordEvent({ t, actor: 'player', type: 'hit_taken' });
      }
    }
    lastPlayerHealthRef.current = p2Health;

    // --- Lock movement and attacks during countdown ---
    if (phase === 'countdown') {
      isMovingRef.current = false;
      // Update sword state but don't attack
      if (swordGroupRef.current) {
        swordGroupRef.current.getWorldPosition(_swordHilt);
        swordGroupRef.current.getWorldQuaternion(_swordQuat);
        swordGroupRef.current.getWorldScale(_worldScale);
        const bladeWorldLen = SWORD_BLADE_LENGTH * _worldScale.y;
        _swordTipLocal.set(0, bladeWorldLen, 0);
        _swordTipLocal.applyQuaternion(_swordQuat).add(_swordHilt);
        setBotSwordState(_hiltOut.copy(_swordHilt), _tipOut.copy(_swordTipLocal), false);
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

    // --- Debuff checks (stun / slow from spells) ---
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
        swordGroupRef.current.getWorldScale(_worldScale);
        const bladeWorldLen = SWORD_BLADE_LENGTH * _worldScale.y;
        _swordTipLocal.set(0, bladeWorldLen, 0);
        _swordTipLocal.applyQuaternion(_swordQuat).add(_swordHilt);
        setBotSwordState(_hiltOut.copy(_swordHilt), _tipOut.copy(_swordTipLocal), false);
      }
      return; // Skip all movement and attack logic
    }

    // =========================================================================
    // LLM-DRIVEN BEHAVIOR — movement, attacks, blocks, spells all from VultrAI
    // =========================================================================
    const decision = currentDecision.current;

    // --- LLM-directed movement ---
    // Compute direction vectors relative to player
    if (distXZ > 0.001) {
      _dirToPlayer.normalize();
    }
    _perpendicular.set(-_dirToPlayer.z, 0, _dirToPlayer.x);

    const moveDir = new THREE.Vector3();
    switch (decision.move) {
      case 'advance':
        moveDir.copy(_dirToPlayer);
        // Stop advancing if very close to avoid clipping
        if (distXZ < 1.2) moveDir.set(0, 0, 0);
        break;
      case 'retreat':
        moveDir.copy(_dirToPlayer).negate();
        break;
      case 'strafe_left':
        moveDir.copy(_perpendicular);
        break;
      case 'strafe_right':
        moveDir.copy(_perpendicular).negate();
        break;
      case 'hold':
      default:
        break;
    }
    if (moveDir.lengthSq() > 0) moveDir.normalize();

    // Apply movement (difficulty-aware speed, debuff-aware)
    const move = diffConfig.moveSpeed * speedMultiplier * delta;
    if (moveDir.lengthSq() > 0) {
      groupRef.current.position.x += moveDir.x * move;
      groupRef.current.position.z += moveDir.z * move;
      isMovingRef.current = true;
    } else {
      isMovingRef.current = false;
    }

    // --- LLM-directed attack ---
    const inAttackRange = distXZ < diffConfig.attackRange;
    const cooldownElapsed = now - lastAttackTimeRef.current > diffConfig.attackCooldown;

    if (decision.action === 'attack' && inAttackRange && cooldownElapsed && swingProgressRef.current <= 0) {
      swingProgressRef.current = 0.001;
      setIsSwinging(true);
      lastAttackTimeRef.current = now;
      recentBotActions.current.push('attack');
      if (recentBotActions.current.length > 6) recentBotActions.current.shift();
      if (isTrueAI) {
        FightMemory.recordEvent({ t: Date.now() - roundStartTimeRef.current, actor: 'bot', type: 'attack' });
      }
    }

    if (swingProgressRef.current > 0) {
      swingProgressRef.current += delta / diffConfig.swingDuration;
      if (swingProgressRef.current >= 1) {
        swingProgressRef.current = 0;
        setIsSwinging(false);
      }
    }

    // --- LLM-directed blocking ---
    if (decision.action === 'block' && !isBlockingRef.current) {
      isBlockingRef.current = true;
      blockStartRef.current = nowMs;
      recentBotActions.current.push('block');
      if (recentBotActions.current.length > 6) recentBotActions.current.shift();
      if (isTrueAI) {
        FightMemory.recordEvent({ t: Date.now() - roundStartTimeRef.current, actor: 'bot', type: 'block' });
      }
      store.setPlayerBlocking('player2', true);
    }
    // Release block after 600ms or when AI changes action
    if (isBlockingRef.current) {
      if (decision.action !== 'block' || nowMs - blockStartRef.current > 600) {
        isBlockingRef.current = false;
        store.setPlayerBlocking('player2', false);
      }
    }

    // --- LLM-directed spell casting ---
    if (decision.spell !== 'none' && distXZ < 15) {
      const spellType = decision.spell as SpellType;
      _spellOrigin.set(botPos.x, botPos.y + 1.2, botPos.z);
      _spellDir.set(
        _playerPos.x - _spellOrigin.x,
        _playerPos.y - _spellOrigin.y,
        _playerPos.z - _spellOrigin.z
      ).normalize();
      const spell = useSpellStore.getState().castSpell(spellType, 'player2', _spellOrigin, _spellDir);
      if (spell) {
        fireSpellCast(spell);
        console.log(`[Bot/VultrAI] Cast ${spellType}!`);
        if (isTrueAI) {
          FightMemory.recordEvent({ t: Date.now() - roundStartTimeRef.current, actor: 'bot', type: 'spell', detail: spellType });
        }
        // Clear spell from decision so it doesn't re-cast every frame
        currentDecision.current = { ...decision, spell: 'none' };
      }
    }

    // Face player (MechaEntity model faces +Z, so use atan2(x, z) directly)
    if (distXZ > 0.01) {
      const normalizedDir = _dirToPlayer.clone().normalize();
      const targetYaw = Math.atan2(normalizedDir.x, normalizedDir.z);
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
      swordGroupRef.current.getWorldScale(_worldScale);
      const bladeWorldLen = SWORD_BLADE_LENGTH * _worldScale.y;

      _swordTipLocal.set(0, bladeWorldLen, 0);
      _swordTipLocal.applyQuaternion(_swordQuat).add(_swordHilt);
      setBotSwordState(_hiltOut.copy(_swordHilt), _tipOut.copy(_swordTipLocal), isSwinging);
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
