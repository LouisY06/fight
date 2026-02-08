// =============================================================================
// HUD.tsx — In-game overlay: health bars, timer, round counter, win tracker
// Military mech HUD aesthetic
// =============================================================================

import { useEffect, useState } from 'react';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { HealthBar } from './HealthBar';
import { RoundTimer } from './RoundTimer';
// RoundAnnouncer is rendered directly in App.tsx (needs to be visible during intro phase too)
import { CombatCommentator } from './CombatCommentator';
import { DamageIndicator } from './DamageIndicator';
import { WeaponSelector } from './WeaponSelector';
import { StunOverlay } from './StunOverlay';
import { onHitEvent } from '../combat/HitEvent';
import { COLORS, FONTS } from './theme';

export function HUD() {
  const phase = useGameStore((s) => s.phase);
  // Granular selectors — only re-render when the specific value changes
  const p1Health = useGameStore((s) => s.player1.health);
  const p2Health = useGameStore((s) => s.player2.health);
  const p1RoundsWon = useGameStore((s) => s.player1.roundsWon);
  const p2RoundsWon = useGameStore((s) => s.player2.roundsWon);
  const username = useGameStore((s) => s.username);
  const opponentName = useGameStore((s) => s.opponentName);
  const playerSlot = useGameStore((s) => s.playerSlot);

  const showHUD =
    phase === 'playing' ||
    phase === 'countdown' ||
    phase === 'paused' ||
    phase === 'roundEnd';

  if (!showHUD) return null;

  const isPlayer1 = playerSlot === 'player1' || playerSlot === null;
  const leftName = isPlayer1
    ? (username || 'PILOT-1')
    : (opponentName || 'PILOT-1');
  const rightName = isPlayer1
    ? (opponentName || 'PILOT-2')
    : (username || 'PILOT-2');

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        animation: 'fadeIn 0.4s ease-out',
      }}
    >
      {/* Top bar: health bars + timer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '14px 20px',
          gap: '16px',
        }}
      >
        <div style={{ flex: 1 }}>
          <HealthBar
            health={p1Health}
            side="left"
            playerName={leftName}
            playerKey="player1"
          />
          <WinTracker wins={p1RoundsWon} side="left" />
        </div>

        <RoundTimer />

        <div style={{ flex: 1 }}>
          <HealthBar
            health={p2Health}
            side="right"
            playerName={rightName}
            playerKey="player2"
          />
          <WinTracker wins={p2RoundsWon} side="right" />
        </div>
      </div>

      {/* Thin scan line separator */}
      <div
        style={{
          width: '100%',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${COLORS.borderFaint}, ${COLORS.borderDefault}, ${COLORS.borderFaint}, transparent)`,
        }}
      />

      {/* Crosshair */}
      <Crosshair />

      {/* Damage numbers */}
      <DamageIndicator />

      {/* AI combat commentator (pure logic, no visuals) */}
      <CombatCommentator />

      {/* Weapon selector */}
      <WeaponSelector />

      {/* Sword clash / stun overlay */}
      <StunOverlay />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crosshair — angular targeting brackets, amber flash on hit
// ---------------------------------------------------------------------------

function Crosshair() {
  const [isHitFlash, setIsHitFlash] = useState(false);

  useEffect(() => {
    const unsub = onHitEvent(() => {
      setIsHitFlash(true);
      setTimeout(() => setIsHitFlash(false), 150);
    });
    return unsub;
  }, []);

  const bracketColor = isHitFlash ? COLORS.amber : 'rgba(255, 255, 255, 0.5)';
  const bracketSize = isHitFlash ? 8 : 10;
  const bracketWidth = '1.5px';
  const bracketLen = '6px';
  const gapFromCenter = `${bracketSize}px`;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '24px',
        height: '24px',
        pointerEvents: 'none',
        transition: 'all 0.1s ease',
      }}
    >
      {/* Center dot */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '2px',
          height: '2px',
          background: isHitFlash ? COLORS.amber : 'rgba(255,255,255,0.8)',
          boxShadow: isHitFlash
            ? `0 0 8px ${COLORS.amber}`
            : '0 0 3px rgba(0,0,0,0.8)',
          transition: 'all 0.1s ease',
        }}
      />

      {/* Top-left bracket */}
      <div style={{ position: 'absolute', top: 0, left: 0 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: bracketLen, height: bracketWidth, background: bracketColor, transition: 'background 0.1s' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: bracketWidth, height: bracketLen, background: bracketColor, transition: 'background 0.1s' }} />
      </div>

      {/* Top-right bracket */}
      <div style={{ position: 'absolute', top: 0, right: 0 }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: bracketLen, height: bracketWidth, background: bracketColor, transition: 'background 0.1s' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: bracketWidth, height: bracketLen, background: bracketColor, transition: 'background 0.1s' }} />
      </div>

      {/* Bottom-left bracket */}
      <div style={{ position: 'absolute', bottom: 0, left: 0 }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: bracketLen, height: bracketWidth, background: bracketColor, transition: 'background 0.1s' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: bracketWidth, height: bracketLen, background: bracketColor, transition: 'background 0.1s' }} />
      </div>

      {/* Bottom-right bracket */}
      <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: bracketLen, height: bracketWidth, background: bracketColor, transition: 'background 0.1s' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: bracketWidth, height: bracketLen, background: bracketColor, transition: 'background 0.1s' }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Win tracker — angular diamond shapes
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
        alignItems: 'center',
        justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
      }}
    >
      <span
        style={{
          fontSize: '9px',
          fontFamily: FONTS.mono,
          color: COLORS.textDim,
          letterSpacing: '2px',
          marginRight: side === 'left' ? '4px' : '0',
          marginLeft: side === 'right' ? '4px' : '0',
          order: side === 'right' ? 1 : 0,
        }}
      >
        RND
      </span>
      {Array.from({ length: GAME_CONFIG.roundsToWin }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '14px',
            height: '14px',
            background: i < wins ? COLORS.amber : 'rgba(255, 255, 255, 0.08)',
            border: `1px solid ${i < wins ? COLORS.amber : COLORS.borderFaint}`,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            boxShadow: i < wins ? `0 0 8px ${COLORS.amberGlow}` : 'none',
            animation: i < wins ? 'winDotPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}
