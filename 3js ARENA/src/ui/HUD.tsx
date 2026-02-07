// =============================================================================
// HUD.tsx — In-game overlay: health bars, timer, round counter, win tracker
// =============================================================================

import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { HealthBar } from './HealthBar';
import { RoundTimer } from './RoundTimer';
import { RoundAnnouncer } from './RoundAnnouncer';
import { CombatCommentator } from './CombatCommentator';
import { DamageIndicator, useDamageIndicators } from './DamageIndicator';

export function HUD() {
  const phase = useGameStore((s) => s.phase);
  const player1 = useGameStore((s) => s.player1);
  const player2 = useGameStore((s) => s.player2);
  const username = useGameStore((s) => s.username);
  const opponentName = useGameStore((s) => s.opponentName);
  const playerSlot = useGameStore((s) => s.playerSlot);
  const { numbers } = useDamageIndicators();

  // Only show HUD during gameplay phases
  const showHUD =
    phase === 'playing' ||
    phase === 'countdown' ||
    phase === 'paused' ||
    phase === 'roundEnd';

  if (!showHUD) return null;

  // Determine which name goes on which side
  const isPlayer1 = playerSlot === 'player1' || playerSlot === null;
  const leftName = isPlayer1
    ? (username || 'PLAYER 1')
    : (opponentName || 'PLAYER 1');
  const rightName = isPlayer1
    ? (opponentName || 'PLAYER 2')
    : (username || 'PLAYER 2');

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
            playerName={leftName}
          />
          <WinTracker wins={player1.roundsWon} side="left" />
        </div>

        <RoundTimer />

        <div style={{ flex: 1 }}>
          <HealthBar
            health={player2.health}
            side="right"
            playerName={rightName}
          />
          <WinTracker wins={player2.roundsWon} side="right" />
        </div>
      </div>

      {/* Crosshair */}
      <Crosshair />

      {/* Damage numbers */}
      <DamageIndicator numbers={numbers} />

      {/* Round announcer */}
      <RoundAnnouncer />

      {/* AI combat commentator (pure logic, no visuals) */}
      <CombatCommentator />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Win tracker dots
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Crosshair — simple dot + thin lines
// ---------------------------------------------------------------------------

function Crosshair() {
  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    background: 'rgba(255, 255, 255, 0.7)',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '20px',
        height: '20px',
        pointerEvents: 'none',
      }}
    >
      {/* Center dot */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '3px',
          height: '3px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 0 4px rgba(0,0,0,0.8)',
        }}
      />
      {/* Top */}
      <div style={{ ...lineStyle, top: 0, left: '50%', transform: 'translateX(-50%)', width: '1.5px', height: '6px' }} />
      {/* Bottom */}
      <div style={{ ...lineStyle, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '1.5px', height: '6px' }} />
      {/* Left */}
      <div style={{ ...lineStyle, left: 0, top: '50%', transform: 'translateY(-50%)', width: '6px', height: '1.5px' }} />
      {/* Right */}
      <div style={{ ...lineStyle, right: 0, top: '50%', transform: 'translateY(-50%)', width: '6px', height: '1.5px' }} />
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
