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
  const roundTimeRemaining = useGameStore((s) => s.roundTimeRemaining);
  const setRoundTime = useGameStore((s) => s.setRoundTime);
  const endRound = useGameStore((s) => s.endRound);
  const player1 = useGameStore((s) => s.player1);
  const player2 = useGameStore((s) => s.player2);

  const countdownTimer = useRef(GAME_CONFIG.countdownDuration);

  // Handle countdown → playing transition
  useEffect(() => {
    if (phase === 'countdown') {
      countdownTimer.current = GAME_CONFIG.countdownDuration;
    }
  }, [phase]);

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
      // Tick down round timer
      const newTime = roundTimeRemaining - delta;
      if (newTime <= 0) {
        // Time's up — whoever has more health wins
        const winner =
          player1.health > player2.health
            ? 'player1'
            : player2.health > player1.health
              ? 'player2'
              : 'draw';
        endRound(winner);
      } else {
        setRoundTime(newTime);
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
