// =============================================================================
// GameOverScreen.tsx — Winner display with metal debris effect, stats panel
// Military mech aesthetic
// =============================================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { ARENA_THEMES } from '../arena/arenaThemes';
import { randomPick } from '../utils/random';
import { ElevenLabs } from '../audio/ElevenLabsService';
import { COLORS, FONTS, CLIP } from './theme';
import { MechButton } from './MainMenu';

const DEBRIS_COUNT = 40;

function MetalDebris() {
  const pieces = useMemo(() => {
    return Array.from({ length: DEBRIS_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2 + Math.random() * 2,
      color: Math.random() > 0.5
        ? `rgba(255, 140, 0, ${0.4 + Math.random() * 0.5})`
        : `rgba(180, 180, 200, ${0.3 + Math.random() * 0.4})`,
      size: 3 + Math.random() * 6,
      rotation: Math.random() * 360,
      isRect: Math.random() > 0.4,
    }));
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-20px',
            width: p.isRect ? `${p.size * 1.5}px` : `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: p.isRect ? '1px' : '50%',
            animation: `metalDebrisFall ${p.duration}s ${p.delay}s ease-out forwards`,
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0,
            boxShadow: p.color.includes('255, 140') ? `0 0 4px ${p.color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function CountUpNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    setDisplay(0);
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value, duration]);

  return <span>{display}</span>;
}

export function GameOverScreen() {
  const phase = useGameStore((s) => s.phase);
  const player1 = useGameStore((s) => s.player1);
  const player2 = useGameStore((s) => s.player2);
  const username = useGameStore((s) => s.username);
  const opponentName = useGameStore((s) => s.opponentName);
  const playerSlot = useGameStore((s) => s.playerSlot);
  const startGame = useGameStore((s) => s.startGame);
  const resetToMenu = useGameStore((s) => s.resetToMenu);
  const announcedRef = useRef(false);

  const isGameOver = phase === 'gameOver';
  const playerWon = player1.roundsWon > player2.roundsWon;

  useEffect(() => {
    if (isGameOver && !announcedRef.current) {
      announcedRef.current = true;
      if (playerWon) {
        ElevenLabs.announceYouWin();
      } else {
        ElevenLabs.announceYouLose();
      }
    }
    if (!isGameOver) {
      announcedRef.current = false;
    }
  }, [isGameOver, playerWon]);

  if (!isGameOver) return null;

  const p1Wins = player1.roundsWon;
  const p2Wins = player2.roundsWon;
  const player1Won = p1Wins > p2Wins;

  let winnerName = player1Won ? 'PILOT-1' : 'PILOT-2';
  if (playerSlot === 'player1') {
    winnerName = player1Won ? username : opponentName;
  } else if (playerSlot === 'player2') {
    winnerName = player1Won ? opponentName : username;
  }

  const handleRematch = () => {
    const theme = randomPick(ARENA_THEMES);
    startGame(theme.id);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 12, 16, 0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        gap: '12px',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <MetalDebris />

      {/* Warning stripe */}
      <div
        style={{
          width: '350px',
          height: '4px',
          background: `repeating-linear-gradient(-45deg, ${COLORS.amber}, ${COLORS.amber} 4px, transparent 4px, transparent 8px)`,
          marginBottom: '8px',
          opacity: 0.5,
        }}
      />

      {/* Victor label */}
      <div
        style={{
          color: COLORS.textDim,
          fontSize: '12px',
          fontFamily: FONTS.mono,
          letterSpacing: '4px',
          animation: 'fadeInUp 0.4s 0.1s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        // VICTOR
      </div>

      <h2
        style={{
          color: COLORS.amber,
          fontSize: '48px',
          fontWeight: '700',
          fontFamily: FONTS.heading,
          textTransform: 'uppercase',
          letterSpacing: '8px',
          textShadow: `0 0 40px ${COLORS.amberGlow}`,
          marginBottom: '4px',
          animation: 'scaleInBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {winnerName}
      </h2>

      {/* Score */}
      <div
        style={{
          color: COLORS.textSecondary,
          fontSize: '22px',
          fontFamily: FONTS.mono,
          letterSpacing: '4px',
          marginBottom: '8px',
          animation: 'countUp 0.5s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <CountUpNumber value={p1Wins} /> — <CountUpNumber value={p2Wins} />
      </div>

      {/* Warning stripe */}
      <div
        style={{
          width: '350px',
          height: '4px',
          background: `repeating-linear-gradient(-45deg, ${COLORS.amber}, ${COLORS.amber} 4px, transparent 4px, transparent 8px)`,
          marginBottom: '20px',
          opacity: 0.5,
        }}
      />

      {/* Action buttons */}
      <MechButton onClick={handleRematch} variant="primary">
        REMATCH
      </MechButton>

      <MechButton onClick={resetToMenu} variant="secondary">
        MAIN MENU
      </MechButton>
    </div>
  );
}
