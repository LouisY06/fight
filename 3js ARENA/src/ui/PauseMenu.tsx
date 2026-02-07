// =============================================================================
// PauseMenu.tsx — Pause overlay
// =============================================================================

import { useEffect } from 'react';
import { useGameStore } from '../game/GameState';

export function PauseMenu() {
  const phase = useGameStore((s) => s.phase);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const resetToMenu = useGameStore((s) => s.resetToMenu);
  const pauseGame = useGameStore((s) => s.pauseGame);

  // ESC key toggles pause
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'playing') pauseGame();
        else if (phase === 'paused') resumeGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, pauseGame, resumeGame]);

  if (phase !== 'paused') return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 150,
        gap: '16px',
      }}
    >
      <h2
        style={{
          color: '#ffffff',
          fontSize: '48px',
          fontWeight: '900',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '6px',
          marginBottom: '24px',
        }}
      >
        PAUSED
      </h2>

      <MenuButton onClick={resumeGame}>Resume</MenuButton>
      <MenuButton onClick={resetToMenu}>Quit to Menu</MenuButton>
    </div>
  );
}

function MenuButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 48px',
        fontSize: '18px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '3px',
        color: '#ffffff',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        fontFamily: "'Impact', 'Arial Black', sans-serif",
        minWidth: '200px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
      }}
    >
      {children}
    </button>
  );
}
