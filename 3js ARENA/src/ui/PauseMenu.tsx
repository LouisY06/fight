// =============================================================================
// PauseMenu.tsx — Universal ESC menu for all game phases
// =============================================================================

import { useEffect } from 'react';
import { useGameStore, type GamePhase } from '../game/GameState';

/** Phases where ESC opens the pause overlay (gameplay) */
const PAUSABLE_PHASES: GamePhase[] = ['playing', 'countdown', 'roundEnd', 'gameOver'];

/** Phases where ESC goes straight back to the main menu */
const BACK_TO_MENU_PHASES: GamePhase[] = ['lobby', 'waiting'];

export function PauseMenu() {
  const phase = useGameStore((s) => s.phase);
  const prePausePhase = useGameStore((s) => s.prePausePhase);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const resetToMenu = useGameStore((s) => s.resetToMenu);
  const pauseGame = useGameStore((s) => s.pauseGame);

  // Global ESC key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (PAUSABLE_PHASES.includes(phase)) {
        pauseGame();
      } else if (phase === 'paused') {
        resumeGame();
      } else if (BACK_TO_MENU_PHASES.includes(phase)) {
        resetToMenu();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, pauseGame, resumeGame, resetToMenu]);

  if (phase !== 'paused') return null;

  // Determine which label to show based on what we paused from
  const isFromGameOver = prePausePhase === 'gameOver';
  const title = isFromGameOver ? 'GAME OVER' : 'PAUSED';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.80)',
        backdropFilter: 'blur(6px)',
        zIndex: 250,
        gap: '12px',
      }}
    >
      <h2
        style={{
          color: '#ffffff',
          fontSize: '52px',
          fontWeight: '900',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '6px',
          marginBottom: '28px',
          textShadow: '0 0 30px rgba(255,255,255,0.15)',
        }}
      >
        {title}
      </h2>

      {/* Resume (not shown if paused from gameOver) */}
      {!isFromGameOver && (
        <MenuButton onClick={resumeGame}>Resume</MenuButton>
      )}

      <MenuButton onClick={resetToMenu} variant="danger">
        Quit to Menu
      </MenuButton>

      <p
        style={{
          color: '#555555',
          fontSize: '12px',
          fontFamily: 'monospace',
          marginTop: '24px',
          letterSpacing: '1px',
        }}
      >
        Press ESC to {isFromGameOver ? 'close' : 'resume'}
      </p>
    </div>
  );
}

function MenuButton({
  onClick,
  children,
  variant = 'default',
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) {
  const isDanger = variant === 'danger';
  const bgDefault = isDanger
    ? 'rgba(255, 40, 60, 0.15)'
    : 'rgba(255, 255, 255, 0.1)';
  const bgHover = isDanger
    ? 'rgba(255, 40, 60, 0.3)'
    : 'rgba(255, 255, 255, 0.2)';
  const border = isDanger
    ? '1px solid rgba(255, 40, 60, 0.35)'
    : '1px solid rgba(255, 255, 255, 0.2)';

  return (
    <button
      onClick={onClick}
      style={{
        padding: '14px 52px',
        fontSize: '18px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '3px',
        color: '#ffffff',
        background: bgDefault,
        border,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        fontFamily: "'Impact', 'Arial Black', sans-serif",
        minWidth: '220px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = bgHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bgDefault;
      }}
    >
      {children}
    </button>
  );
}
