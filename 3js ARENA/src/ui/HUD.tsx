// =============================================================================
// HUD.tsx — In-game overlay: health bars, timer, round counter, win tracker
// =============================================================================

import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { HealthBar } from './HealthBar';
import { RoundTimer } from './RoundTimer';
import { RoundAnnouncer } from './RoundAnnouncer';
import { DamageIndicator, useDamageIndicators } from './DamageIndicator';

export function HUD() {
  const phase = useGameStore((s) => s.phase);
  const player1 = useGameStore((s) => s.player1);
  const player2 = useGameStore((s) => s.player2);
  const { numbers } = useDamageIndicators();

  // Only show HUD during gameplay phases
  const showHUD =
    phase === 'playing' ||
    phase === 'countdown' ||
    phase === 'paused' ||
    phase === 'roundEnd';

  if (!showHUD) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* Top bar: health bars + timer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '16px 24px',
          gap: '20px',
        }}
      >
        <div style={{ flex: 1 }}>
          <HealthBar
            health={player1.health}
            side="left"
            playerName="Player 1"
          />
          <WinTracker wins={player1.roundsWon} side="left" />
        </div>

        <RoundTimer />

        <div style={{ flex: 1 }}>
          <HealthBar
            health={player2.health}
            side="right"
            playerName="Player 2"
          />
          <WinTracker wins={player2.roundsWon} side="right" />
        </div>
      </div>

      {/* Damage numbers */}
      <DamageIndicator numbers={numbers} />

      {/* Round announcer */}
      <RoundAnnouncer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Win tracker dots
// ---------------------------------------------------------------------------

function WinTracker({
  wins,
  side,
}: {
  wins: number;
  side: 'left' | 'right';
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        marginTop: '6px',
        justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
      }}
    >
      {Array.from({ length: GAME_CONFIG.roundsToWin }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background:
              i < wins ? '#ffcc00' : 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow:
              i < wins ? '0 0 8px rgba(255, 200, 0, 0.6)' : 'none',
          }}
        />
      ))}
    </div>
  );
}
