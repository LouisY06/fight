// =============================================================================
// RoundTimer.tsx — Countdown timer with military HUD styling
// =============================================================================

import { useGameStore } from '../game/GameState';
import { COLORS, FONTS } from './theme';

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
        padding: '6px 16px',
        background: 'rgba(10, 12, 16, 0.6)',
        border: `1px solid ${isLow ? COLORS.redDim : COLORS.borderFaint}`,
        clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
      }}
    >
      {/* Round label */}
      <span
        style={{
          color: COLORS.textDim,
          fontSize: '9px',
          fontWeight: 600,
          fontFamily: FONTS.mono,
          textTransform: 'uppercase',
          letterSpacing: '3px',
        }}
      >
        RD-{String(currentRound).padStart(2, '0')}
      </span>

      {/* Timer */}
      <span
        style={{
          color: isLow ? COLORS.red : COLORS.textPrimary,
          fontSize: '28px',
          fontWeight: 700,
          fontFamily: FONTS.mono,
          letterSpacing: '3px',
          textShadow: isLow
            ? `0 0 20px ${COLORS.redDim}`
            : 'none',
          animation: isLow ? 'amberPulse 0.5s ease-in-out infinite alternate' : 'none',
          transition: 'color 0.2s ease, text-shadow 0.2s ease',
          lineHeight: 1,
        }}
      >
        {timeStr}
      </span>

      {/* Warning label */}
      {isLow && (
        <span
          style={{
            fontSize: '8px',
            fontFamily: FONTS.mono,
            color: COLORS.red,
            letterSpacing: '3px',
            animation: 'dataFlicker 1s infinite',
          }}
        >
          WARNING
        </span>
      )}
    </div>
  );
}
