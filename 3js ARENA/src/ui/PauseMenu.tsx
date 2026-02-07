// =============================================================================
// PauseMenu.tsx — Universal ESC menu for all game phases
// Shows cursor and provides Resume, Quit to Menu, and Quit Game options
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

  // Show/hide cursor based on game phase
  useEffect(() => {
    // Show cursor during menu, lobby, paused, and other UI phases
    const showCursorPhases: GamePhase[] = ['menu', 'lobby', 'waiting', 'paused', 'arenaLoading'];
    
    if (showCursorPhases.includes(phase)) {
      document.body.style.cursor = 'default';
    } else {
      // Hide cursor during gameplay (playing, countdown, roundEnd, gameOver)
      document.body.style.cursor = 'none';
    }
    
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [phase]);

  if (phase !== 'paused') return null;

  // Quit game function (closes Electron app or browser tab)
  const handleQuitGame = () => {
    // Check if running in Electron
    if (window.electronAPI) {
      window.electronAPI.quit?.();
    } else {
      // In browser, close the tab/window
      window.close();
    }
  };

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
        animation: 'fadeIn 0.2s ease-out',
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
          animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {title}
      </h2>

      {/* Resume (not shown if paused from gameOver) */}
      {!isFromGameOver && (
        <MenuButton onClick={resumeGame}>Resume</MenuButton>
      )}

      <MenuButton onClick={resetToMenu} variant="secondary">
        Return to Main Menu
      </MenuButton>

      <MenuButton onClick={handleQuitGame} variant="danger">
        Quit Game
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
  variant?: 'default' | 'secondary' | 'danger';
}) {
  // Style based on variant
  let bgDefault, bgHover, border;
  
  switch (variant) {
    case 'danger':
      bgDefault = 'rgba(255, 40, 60, 0.15)';
      bgHover = 'rgba(255, 40, 60, 0.35)';
      border = '1px solid rgba(255, 40, 60, 0.4)';
      break;
    case 'secondary':
      bgDefault = 'rgba(200, 200, 200, 0.08)';
      bgHover = 'rgba(200, 200, 200, 0.15)';
      border = '1px solid rgba(200, 200, 200, 0.2)';
      break;
    default:
      bgDefault = 'rgba(100, 200, 255, 0.12)';
      bgHover = 'rgba(100, 200, 255, 0.25)';
      border = '1px solid rgba(100, 200, 255, 0.3)';
  }

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
        transition: 'all 0.15s ease',
        fontFamily: "'Impact', 'Arial Black', sans-serif",
        minWidth: '280px',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = '';
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = bgHover;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bgDefault;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </button>
  );
}
