// =============================================================================
// CombatCommentator.tsx — Minimal reactive commentary during gameplay
// Tracks: first blood, combos (5+), opponent low health, time warning.
// All lines go through ElevenLabs priority queue — no overlap possible.
// =============================================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { ElevenLabs } from '../audio/ElevenLabsService';
import { resetStun } from '../combat/ClashEvent';

export function CombatCommentator() {
  const phase = useGameStore((s) => s.phase);
  const p1Health = useGameStore((s) => s.player1.health);
  const p2Health = useGameStore((s) => s.player2.health);
  const timeRemaining = useGameStore((s) => s.roundTimeRemaining);

  const hitCount = useRef(0);
  const lastP1Health = useRef(100);
  const lastP2Health = useRef(100);
  const firstBloodDone = useRef(false);
  const lowHealthDone = useRef(false);
  const timeWarningDone = useRef(false);
  const comboDone = useRef(false);

  // Reset per round
  useEffect(() => {
    if (phase === 'countdown') {
      hitCount.current = 0;
      lastP1Health.current = 100;
      lastP2Health.current = 100;
      firstBloodDone.current = false;
      lowHealthDone.current = false;
      timeWarningDone.current = false;
      comboDone.current = false;
      resetStun();
    }
  }, [phase]);

  // Track hits
  useEffect(() => {
    if (phase !== 'playing') return;

    // Player landed a hit on opponent
    if (p2Health < lastP2Health.current) {
      hitCount.current++;

      // First blood (once per round)
      if (!firstBloodDone.current) {
        firstBloodDone.current = true;
        ElevenLabs.announceFirstBlood();
      }

      // Combo at 5+ hits (once per round)
      if (hitCount.current >= 5 && !comboDone.current) {
        comboDone.current = true;
        ElevenLabs.announceCombo(5);
      }
    }

    // Player got hit — reset combo
    if (p1Health < lastP1Health.current) {
      hitCount.current = 0;
      comboDone.current = false;
    }

    lastP1Health.current = p1Health;
    lastP2Health.current = p2Health;
  }, [p1Health, p2Health, phase]);

  // Opponent low health — "FINISH THEM!"
  useEffect(() => {
    if (phase !== 'playing') return;
    if (p2Health <= 20 && p2Health > 0 && !lowHealthDone.current) {
      lowHealthDone.current = true;
      ElevenLabs.announceLowHealth();
    }
  }, [p2Health, phase]);

  // Time warning at 15s
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeRemaining <= 15 && timeRemaining > 0 && !timeWarningDone.current) {
      timeWarningDone.current = true;
      ElevenLabs.announceTimeWarning();
    }
  }, [timeRemaining, phase]);

  return null;
}
