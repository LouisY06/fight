// =============================================================================
// GameEngine.tsx — Core game loop component
// =============================================================================

import { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from './GameState';
import { GAME_CONFIG } from './GameConfig';

/**
 * GameEngine runs inside the R3F Canvas. It handles:
 * - Round timer countdown
 * - Countdown sequence (3..2..1..FIGHT!)
 * - Checking for round-end conditions
 */
export function GameEngine() {
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const startRound = useGameStore((s) => s.startRound);
  const setRoundTime = useGameStore((s) => s.setRoundTime);
  const endRound = useGameStore((s) => s.endRound);

  const countdownTimer = useRef(GAME_CONFIG.countdownDuration);
  // Track time in a ref to avoid 60fps Zustand updates; only push to store ~1Hz
  const timeRef = useRef(GAME_CONFIG.roundTime);
  const lastPushedSecond = useRef(-1);

  // Handle countdown → playing transition (useFrame + safety timeout)
  useEffect(() => {
    if (phase === 'countdown') {
      countdownTimer.current = GAME_CONFIG.countdownDuration;
      timeRef.current = useGameStore.getState().roundTimeRemaining;
      lastPushedSecond.current = -1;
      // Safety: ensure we transition to playing even if useFrame is throttled (e.g. tab background)
      const safety = setTimeout(() => {
        if (useGameStore.getState().phase === 'countdown') {
          setPhase('playing');
        }
      }, (GAME_CONFIG.countdownDuration + 0.5) * 1000);
      return () => clearTimeout(safety);
    }
  }, [phase, setPhase]);

  // Handle roundEnd → next round transition after delay
  useEffect(() => {
    if (phase === 'roundEnd') {
      const timer = setTimeout(() => {
        startRound();
      }, GAME_CONFIG.roundEndDelay);

      return () => clearTimeout(timer);
    }
  }, [phase, startRound]);

  // Main game loop (runs every frame inside R3F)
  useFrame((_, delta) => {
    if (phase === 'countdown') {
      countdownTimer.current -= delta;
      if (countdownTimer.current <= 0) {
        setPhase('playing');
      }
    }

    if (phase === 'playing') {
      // Tick down round timer using ref (avoids 60fps Zustand updates)
      timeRef.current -= delta;
      if (timeRef.current <= 0) {
        // Time's up — whoever has more health wins
        const { player1, player2 } = useGameStore.getState();
        const winner =
          player1.health > player2.health
            ? 'player1'
            : player2.health > player1.health
              ? 'player2'
              : 'draw';
        endRound(winner);
      } else {
        // Only push to Zustand store when the displayed second changes (~1Hz)
        const sec = Math.ceil(timeRef.current);
        if (sec !== lastPushedSecond.current) {
          lastPushedSecond.current = sec;
          setRoundTime(timeRef.current);
        }
      }
    }
  });

  return null; // Pure logic component — no visual output
}

/**
 * Hook to handle arena loading → countdown transition.
 * Called from the Arena component once assets are loaded.
 */
export function useArenaReady() {
  const phase = useGameStore((s) => s.phase);
  const startRound = useGameStore((s) => s.startRound);

  const onArenaReady = useCallback(() => {
    if (phase === 'arenaLoading') {
      startRound();
    }
  }, [phase, startRound]);

  return onArenaReady;
}
