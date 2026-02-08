// =============================================================================
// CombatCommentator.tsx — Gemini → ElevenLabs dynamic commentary pipeline
// Gemini generates context-aware lines; ElevenLabs speaks them aloud.
// Falls back to pre-baked ElevenLabs lines if Gemini is unavailable.
// =============================================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { ElevenLabs, Priority } from '../audio/ElevenLabsService';
import { GeminiCommentary, type CommentaryContext, type CommentaryEvent } from '../ai/GeminiCommentaryService';
import { resetStun } from '../combat/ClashEvent';

/** Try Gemini first; fall back to a static ElevenLabs call. */
async function commentate(
  event: CommentaryEvent,
  ctx: Omit<CommentaryContext, 'event'>,
  fallback: () => Promise<void>
): Promise<void> {
  if (!GeminiCommentary.isAvailable()) {
    return fallback();
  }

  const line = await GeminiCommentary.generateLine({ event, ...ctx });
  if (line) {
    // Gemini produced a line — speak it via ElevenLabs
    await ElevenLabs.speakDynamic(line, Priority.HIGH);
  } else {
    // Gemini unavailable or on cooldown — use static line
    return fallback();
  }
}

function buildContext(overrides?: Partial<CommentaryContext>): Omit<CommentaryContext, 'event'> {
  const store = useGameStore.getState();
  return {
    playerHealth: store.player1.health,
    opponentHealth: store.player2.health,
    round: store.currentRound,
    totalRounds: 5,
    timeRemaining: store.roundTimeRemaining,
    playerScore: store.player1.roundsWon,
    opponentScore: store.player2.roundsWon,
    ...overrides,
  };
}

export function CombatCommentator() {
  const phase = useGameStore((s) => s.phase);
  const p1Health = useGameStore((s) => s.player1.health);
  const p2Health = useGameStore((s) => s.player2.health);
  const timeRemaining = useGameStore((s) => s.roundTimeRemaining);

  const hitCount = useRef(0);
  const lastP1Health = useRef(100);
  const lastP2Health = useRef(100);
  const firstBloodDone = useRef(false);
  const lowHealthOpponentDone = useRef(false);
  const lowHealthPlayerDone = useRef(false);
  const timeWarningDone = useRef(false);
  const comboDone = useRef(false);
  const comebackTriggered = useRef(false);

  // Reset per round
  useEffect(() => {
    if (phase === 'countdown') {
      hitCount.current = 0;
      lastP1Health.current = 100;
      lastP2Health.current = 100;
      firstBloodDone.current = false;
      lowHealthOpponentDone.current = false;
      lowHealthPlayerDone.current = false;
      timeWarningDone.current = false;
      comboDone.current = false;
      comebackTriggered.current = false;
      resetStun();
    }
  }, [phase]);

  // Track hits and trigger commentary
  useEffect(() => {
    if (phase !== 'playing') return;

    // Player landed a hit on opponent
    if (p2Health < lastP2Health.current) {
      hitCount.current++;

      // First blood (once per round)
      if (!firstBloodDone.current) {
        firstBloodDone.current = true;
        commentate('first_blood', buildContext(), () => ElevenLabs.announceFirstBlood());
      }

      // Combo at 5+ hits (once per round)
      if (hitCount.current >= 5 && !comboDone.current) {
        comboDone.current = true;
        commentate('combo', buildContext({ comboCount: hitCount.current }), () =>
          ElevenLabs.announceCombo(5)
        );
      }

      // Comeback: player was low (<30) but is now landing hits
      if (p1Health <= 30 && !comebackTriggered.current) {
        comebackTriggered.current = true;
        commentate('comeback', buildContext(), async () => {
          await ElevenLabs.announceFlavorLine('What a comeback!');
        });
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
    if (p2Health <= 20 && p2Health > 0 && !lowHealthOpponentDone.current) {
      lowHealthOpponentDone.current = true;
      commentate('low_health_opponent', buildContext(), () => ElevenLabs.announceLowHealth());
    }
  }, [p2Health, phase]);

  // Player low health — danger!
  useEffect(() => {
    if (phase !== 'playing') return;
    if (p1Health <= 20 && p1Health > 0 && !lowHealthPlayerDone.current) {
      lowHealthPlayerDone.current = true;
      commentate('low_health_player', buildContext(), async () => {
        await ElevenLabs.announceFlavorLine('Critical damage!');
      });
    }
  }, [p1Health, phase]);

  // Time warning at 15s
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeRemaining <= 15 && timeRemaining > 0 && !timeWarningDone.current) {
      timeWarningDone.current = true;
      commentate('time_warning', buildContext(), () => ElevenLabs.announceTimeWarning());
    }
  }, [timeRemaining, phase]);

  return null;
}
