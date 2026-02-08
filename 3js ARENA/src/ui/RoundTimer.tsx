// =============================================================================
// RoundTimer.tsx — Countdown timer + round label
// Modern UI: Orbitron font, clean minimal design
// =============================================================================

import { useGameStore } from '../game/GameState';

const FONT_HEADING = "'Orbitron', 'Rajdhani', sans-serif";

export function RoundTimer() {
  const roundTimeRemaining = useGameStore((s) => s.roundTimeRemaining);
  const currentRound = useGameStore((s) => s.currentRound);

  const minutes = Math.floor(Math.max(0, roundTimeRemaining) / 60);
  const seconds = Math.floor(Math.max(0, roundTimeRemaining) % 60);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isLow = roundTimeRemaining <= 10;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        minWidth: '100px',
      }}
    >
      {/* Round label */}
      <span
        style={{
          color: 'rgba(255, 255, 255, 0.35)',
          fontSize: '9px',
          fontWeight: 600,
          fontFamily: FONT_HEADING,
          textTransform: 'uppercase',
          letterSpacing: '4px',
        }}
      >
        ROUND {currentRound}
      </span>

      {/* Timer */}
      <span
        style={{
          color: isLow ? '#ff3333' : 'rgba(255, 255, 255, 0.9)',
          fontSize: '28px',
          fontWeight: 700,
          fontFamily: FONT_HEADING,
          letterSpacing: '2px',
          textShadow: isLow
            ? '0 0 20px rgba(255,0,0,0.5)'
            : 'none',
          animation: isLow ? 'pulse 0.4s ease-in-out infinite alternate' : 'none',
          transition: 'color 0.2s ease, text-shadow 0.2s ease',
          lineHeight: 1,
        }}
      >
        {timeStr}
      </span>
    </div>
  );
}
