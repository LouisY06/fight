// =============================================================================
// useAIInput.ts — Hook that drives AI opponent via Vultr Serverless Inference
// Polls the LLM every ~1.5s for strategic decisions, interpolates actions
// between polls to produce smooth 60fps PlayerInput.
// =============================================================================

import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlayerInput } from '../game/InputManager';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG, AI_DIFFICULTY } from '../game/GameConfig';
import { VultrAI, type AICombatDecision, type GameStateSnapshot } from './VultrAIService';

// ---------------------------------------------------------------------------
// Constants (defaults — overridden by difficulty config)
// ---------------------------------------------------------------------------

const ATTACK_DURATION_MS = 400;     // How long an attack "swing" lasts
const BLOCK_DURATION_MS = 600;      // How long a block hold lasts
const DELAYED_ACTION_MS = 500;      // Extra delay for "delayed" timing
const CAUTIOUS_ACTION_MS = 900;     // Extra delay for "cautious" timing

// ---------------------------------------------------------------------------
// State machine for the AI
// ---------------------------------------------------------------------------

interface AIState {
  currentDecision: AICombatDecision;
  decisionTimestamp: number;
  isAttacking: boolean;
  attackStartTime: number;
  isBlocking: boolean;
  blockStartTime: number;
  actionScheduled: boolean;
  actionScheduleTime: number;
  recentActions: string[];
  opponentRecentActions: string[];
  lastOpponentHealth: number;
  /** AI's current world position (tracked manually since Player.tsx moves the group) */
  position: THREE.Vector3;
}

function createInitialState(): AIState {
  return {
    currentDecision: { move: 'hold', action: 'idle', timing: 'immediate' },
    decisionTimestamp: 0,
    isAttacking: false,
    attackStartTime: 0,
    isBlocking: false,
    blockStartTime: 0,
    actionScheduled: false,
    actionScheduleTime: 0,
    recentActions: [],
    opponentRecentActions: [],
    lastOpponentHealth: 100,
    position: new THREE.Vector3(0, 0, GAME_CONFIG.playerSpawnDistance / 2),
  };
}

// Reusable vectors to avoid per-frame allocation
const _toPlayer = new THREE.Vector3();
const _perpendicular = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAIInput(): PlayerInput {
  const { camera } = useThree();

  const input = useRef<PlayerInput>({
    moveDirection: new THREE.Vector3(),
    weaponPosition: new THREE.Vector3(2, 1, 0),
    weaponRotation: new THREE.Euler(),
    attack: false,
    block: false,
    jump: false,
    gesture: 'idle',
  });

  const aiState = useRef<AIState>(createInitialState());
  const decisionLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetching = useRef(false);

  // Get player (camera) position for direction calculations
  const getPlayerPos = useCallback((): THREE.Vector3 => {
    return camera.position;
  }, [camera]);

  // Read game state for decision-making
  const getSnapshot = useCallback((): GameStateSnapshot => {
    const store = useGameStore.getState();
    const playerPos = getPlayerPos();
    const aiPos = aiState.current.position;
    const dist = Math.sqrt(
      (playerPos.x - aiPos.x) ** 2 + (playerPos.z - aiPos.z) ** 2
    );

    return {
      myHealth: store.player2.health,
      opponentHealth: store.player1.health,
      distance: dist,
      roundNumber: store.currentRound,
      timeRemaining: store.roundTimeRemaining,
      opponentRecentActions: aiState.current.opponentRecentActions.slice(-3),
      myRecentActions: aiState.current.recentActions.slice(-3),
      amBlocking: aiState.current.isBlocking,
      opponentBlocking: store.player1.isBlocking,
    };
  }, [getPlayerPos]);

  // Track opponent actions by watching health changes
  const trackOpponentActions = useCallback(() => {
    const store = useGameStore.getState();
    const p2Health = store.player2.health;
    const prev = aiState.current.lastOpponentHealth;
    if (p2Health < prev) {
      aiState.current.opponentRecentActions.push('attack');
      if (aiState.current.opponentRecentActions.length > 6) {
        aiState.current.opponentRecentActions.shift();
      }
    }
    aiState.current.lastOpponentHealth = p2Health;
  }, []);

  // Request a new decision from Vultr LLM
  const fetchDecision = useCallback(async () => {
    const store = useGameStore.getState();
    if (store.phase !== 'playing') return;
    if (isFetching.current) return;

    isFetching.current = true;
    try {
      const snapshot = getSnapshot();
      const difficulty = store.aiDifficulty;
      const decision = await VultrAI.getDecision(snapshot, difficulty);
      aiState.current.currentDecision = decision;
      aiState.current.decisionTimestamp = Date.now();
      aiState.current.actionScheduled = false;
    } finally {
      isFetching.current = false;
    }
  }, [getSnapshot]);

  // Execute actions based on current decision (runs every 16ms ~ 60fps)
  const executeFrame = useCallback(() => {
    const store = useGameStore.getState();
    if (store.phase !== 'playing') {
      input.current.moveDirection.set(0, 0, 0);
      input.current.attack = false;
      input.current.block = false;
      input.current.gesture = 'idle';
      return;
    }

    trackOpponentActions();

    const now = Date.now();
    const state = aiState.current;
    const decision = state.currentDecision;

    // --- Compute direction vectors relative to player position ---
    const playerPos = getPlayerPos();
    const aiPos = state.position;

    // Vector from AI toward the player (XZ only)
    _toPlayer.set(
      playerPos.x - aiPos.x,
      0,
      playerPos.z - aiPos.z
    );
    const distToPlayer = _toPlayer.length();
    if (distToPlayer > 0.001) {
      _toPlayer.divideScalar(distToPlayer); // normalize
    }

    // Perpendicular vector (for strafing)
    _perpendicular.set(-_toPlayer.z, 0, _toPlayer.x);

    // --- Movement based on decision, relative to player ---
    const dir = new THREE.Vector3();
    switch (decision.move) {
      case 'advance':
        // Move toward the player
        dir.copy(_toPlayer);
        // Stop advancing if very close to avoid clipping
        if (distToPlayer < 1.2) dir.set(0, 0, 0);
        break;
      case 'retreat':
        // Move away from the player
        dir.copy(_toPlayer).negate();
        break;
      case 'strafe_left':
        dir.copy(_perpendicular);
        break;
      case 'strafe_right':
        dir.copy(_perpendicular).negate();
        break;
      case 'hold':
      default:
        break;
    }
    if (dir.lengthSq() > 0) dir.normalize();

    // --- Arena boundary clamping (predict next position) ---
    const speed = 0.05;
    const nextX = aiPos.x + dir.x * speed;
    const nextZ = aiPos.z + dir.z * speed;
    const nextDist = Math.sqrt(nextX * nextX + nextZ * nextZ);
    const arenaLimit = GAME_CONFIG.arenaRadius - 0.5;

    if (nextDist > arenaLimit) {
      // Would go out of bounds — stop or redirect toward center
      dir.set(-aiPos.x, 0, -aiPos.z).normalize();
    }

    // Track AI position (Player.tsx applies moveDirection * 0.05 per frame)
    state.position.x += dir.x * speed;
    state.position.z += dir.z * speed;

    // Clamp position to arena
    const posDist = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
    if (posDist > arenaLimit) {
      const clampScale = arenaLimit / posDist;
      state.position.x *= clampScale;
      state.position.z *= clampScale;
    }

    input.current.moveDirection.copy(dir);

    // --- Action timing ---
    const timeSinceDecision = now - state.decisionTimestamp;
    let actionDelay = 0;
    if (decision.timing === 'delayed') actionDelay = DELAYED_ACTION_MS;
    if (decision.timing === 'cautious') actionDelay = CAUTIOUS_ACTION_MS;

    // Schedule action after delay
    if (!state.actionScheduled && timeSinceDecision >= actionDelay) {
      state.actionScheduled = true;
      state.actionScheduleTime = now;

      if (decision.action === 'attack' && !state.isAttacking && distToPlayer < 2.5) {
        // Only attack if close enough to the player
        state.isAttacking = true;
        state.attackStartTime = now;
        state.recentActions.push('attack');
        if (state.recentActions.length > 6) state.recentActions.shift();
      } else if (decision.action === 'block' && !state.isBlocking) {
        state.isBlocking = true;
        state.blockStartTime = now;
        state.recentActions.push('block');
        if (state.recentActions.length > 6) state.recentActions.shift();
      }
    }

    // --- Attack state ---
    if (state.isAttacking) {
      const elapsed = now - state.attackStartTime;
      if (elapsed > ATTACK_DURATION_MS) {
        state.isAttacking = false;
      }
    }

    // --- Block state ---
    if (state.isBlocking) {
      const elapsed = now - state.blockStartTime;
      if (elapsed > BLOCK_DURATION_MS) {
        state.isBlocking = false;
      }
    }

    // --- Set input ---
    input.current.attack = state.isAttacking;
    input.current.block = state.isBlocking;

    // Weapon position/rotation for attack animation
    const swingProgress = state.isAttacking
      ? (now - state.attackStartTime) / ATTACK_DURATION_MS
      : 0;

    input.current.weaponPosition.set(2, 1, 0);
    input.current.weaponRotation.set(
      0,
      0,
      state.isAttacking ? Math.PI / 3 * Math.sin(swingProgress * Math.PI) : 0
    );

    // Gesture
    if (state.isBlocking) {
      input.current.gesture = 'block';
    } else if (state.isAttacking) {
      input.current.gesture = 'slash';
    } else {
      input.current.gesture = 'idle';
    }
  }, [trackOpponentActions, getPlayerPos]);

  // Decision loop — poll LLM on interval (interval depends on difficulty)
  useEffect(() => {
    const difficulty = useGameStore.getState().aiDifficulty;
    const intervalMs = AI_DIFFICULTY[difficulty].decisionIntervalMs;

    decisionLoopRef.current = setInterval(() => {
      fetchDecision();
    }, intervalMs);

    // Fetch first decision immediately
    fetchDecision();

    return () => {
      if (decisionLoopRef.current) clearInterval(decisionLoopRef.current);
    };
  }, [fetchDecision]);

  // Action loop — run every frame via R3F useFrame (synced with render)
  const frameCallback = useRef(executeFrame);
  frameCallback.current = executeFrame;

  // We import useFrame at the top already via useThree, but we need the hook directly
  // Use a manual RAF loop since we're already in R3F context
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      frameCallback.current();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Reset AI state when round changes
  const phase = useGameStore((s) => s.phase);
  useEffect(() => {
    if (phase === 'countdown') {
      aiState.current = createInitialState();
    }
  }, [phase]);

  return input.current;
}

