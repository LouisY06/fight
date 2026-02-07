// =============================================================================
// RoundTimer.tsx — Countdown timer display
// =============================================================================

import { useGameStore } from '../game/GameState';

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
        gap: '2px',
      }}
    >
      {/* Round label */}
      <span
        style={{
          color: '#aaaaaa',
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '3px',
        }}
      >
        Round {currentRound}
      </span>

      {/* Timer */}
      <span
        style={{
          color: isLow ? '#ff3333' : '#ffffff',
          fontSize: '32px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          textShadow: isLow
            ? '0 0 20px rgba(255,0,0,0.6), 0 0 40px rgba(255,0,0,0.3)'
            : '0 0 10px rgba(0,0,0,0.5)',
          animation: isLow ? 'pulse 0.4s ease-in-out infinite alternate' : 'none',
          transition: 'color 0.2s ease, text-shadow 0.2s ease',
        }}
      >
        {timeStr}
      </span>
    </div>
  );
}
