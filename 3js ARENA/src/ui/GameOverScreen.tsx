// =============================================================================
// GameOverScreen.tsx — Winner display with confetti, score count-up, animations
// =============================================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { ARENA_THEMES } from '../arena/arenaThemes';
import { randomPick } from '../utils/random';
import { ElevenLabs } from '../audio/ElevenLabsService';

const CONFETTI_COUNT = 60;
const CONFETTI_COLORS = ['#ff4488', '#44ccff', '#ffcc00', '#44ff88', '#ff8844', '#aa44ff'];

function Confetti() {
  const pieces = useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1.5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-out forwards`,
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0.9,
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
      const eased = 1 - Math.pow(1 - progress, 2); // ease-out quad
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

  // Announce win/lose when game over screen appears
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
  
  // Determine winner name based on which player won more rounds
  let winnerName = player1Won ? 'Player 1' : 'Player 2';
  
  // Use actual names if available
  if (playerSlot === 'player1') {
    winnerName = player1Won ? username : opponentName;
  } else if (playerSlot === 'player2') {
    winnerName = player1Won ? opponentName : username;
  }
  
  const winnerColor = player1Won ? '#4488ff' : '#ff4444';

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
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        gap: '12px',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <Confetti />

      <h2
        style={{
          color: winnerColor,
          fontSize: '56px',
          fontWeight: '900',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '6px',
          textShadow: `0 0 40px ${winnerColor}88`,
          marginBottom: '8px',
          animation: 'scaleInBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {winnerName} WINS!
      </h2>

      <div
        style={{
          color: '#888888',
          fontSize: '18px',
          fontFamily: 'monospace',
          marginBottom: '32px',
          animation: 'countUp 0.5s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <CountUpNumber value={p1Wins} /> — <CountUpNumber value={p2Wins} />
      </div>

      <button
        onClick={handleRematch}
        style={{
          padding: '14px 56px',
          fontSize: '20px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '3px',
          color: '#ffffff',
          background: 'linear-gradient(180deg, #ff2266, #cc0044)',
          border: '2px solid #ff4488',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 0 25px rgba(255,0,80,0.4)',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.96)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 0 35px rgba(255,0,80,0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 0 25px rgba(255,0,80,0.4)';
        }}
      >
        REMATCH
      </button>

      <button
        onClick={resetToMenu}
        style={{
          padding: '10px 40px',
          fontSize: '14px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: '#888888',
          background: 'transparent',
          border: '1px solid #444444',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          marginTop: '8px',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.borderColor = '#666666';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#888888';
          e.currentTarget.style.borderColor = '#444444';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        Main Menu
      </button>
    </div>
  );
}
