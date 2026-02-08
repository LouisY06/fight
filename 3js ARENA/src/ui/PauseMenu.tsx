// =============================================================================
// PauseMenu.tsx — ESC menu with military mech aesthetic
// =============================================================================

import { useEffect, useState } from 'react';
import { useGameStore, type GamePhase } from '../game/GameState';
import { SettingsPanel } from './SettingsPanel';
import { MechButton } from './MainMenu';
import { COLORS, FONTS, CLIP } from './theme';

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
  const [showSettings, setShowSettings] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

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
    const showCursorPhases: GamePhase[] = ['menu', 'lobby', 'waiting', 'paused', 'arenaLoading'];

    if (showCursorPhases.includes(phase)) {
      document.body.style.cursor = 'default';
    } else {
      document.body.style.cursor = 'none';
    }

    return () => {
      document.body.style.cursor = 'default';
    };
  }, [phase]);

  if (phase !== 'paused') return null;

  const handleQuitGame = () => {
    if (window.electronAPI) {
      window.electronAPI.quit?.();
    } else {
      window.close();
    }
  };

  const isFromGameOver = prePausePhase === 'gameOver';
  const title = isFromGameOver ? 'MISSION COMPLETE' : 'PAUSED';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 12, 16, 0.88)',
        backdropFilter: 'blur(6px)',
        zIndex: 250,
        gap: '10px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Scan line effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
          pointerEvents: 'none',
        }}
      />

      {/* Title */}
      <h2
        style={{
          color: COLORS.textPrimary,
          fontSize: '44px',
          fontWeight: '700',
          fontFamily: FONTS.heading,
          textTransform: 'uppercase',
          letterSpacing: '8px',
          marginBottom: '24px',
          textShadow: `0 0 30px ${COLORS.amberGlow}`,
          animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
        }}
      >
        {title}
      </h2>

      {/* Warning stripe */}
      <div
        style={{
          width: '280px',
          height: '3px',
          background: `repeating-linear-gradient(-45deg, ${COLORS.amber}, ${COLORS.amber} 4px, transparent 4px, transparent 8px)`,
          marginBottom: '20px',
          opacity: 0.4,
        }}
      />

      {/* Resume */}
      {!isFromGameOver && (
        <MechButton onClick={resumeGame} variant="primary">RESUME</MechButton>
      )}

      {/* Settings */}
      <MechButton onClick={() => setShowSettings(true)} variant="secondary">
        SETTINGS
      </MechButton>

      {/* Return to menu */}
      <MechButton onClick={resetToMenu} variant="secondary">
        RETURN TO MENU
      </MechButton>

      {/* Quit Game */}
      {!showQuitConfirm ? (
        <MechButton onClick={() => setShowQuitConfirm(true)} variant="danger">
          QUIT GAME
        </MechButton>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: COLORS.redDim,
            border: `1px solid ${COLORS.red}`,
            clipPath: CLIP.button,
          }}
        >
          <span style={{ color: COLORS.red, fontSize: '12px', fontFamily: FONTS.mono, letterSpacing: '2px' }}>
            CONFIRM QUIT?
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <MechButton onClick={handleQuitGame} variant="danger" style={{ minWidth: '100px', padding: '8px 20px' }}>
              YES
            </MechButton>
            <MechButton onClick={() => setShowQuitConfirm(false)} variant="secondary" style={{ minWidth: '100px', padding: '8px 20px' }}>
              NO
            </MechButton>
          </div>
        </div>
      )}

      <p
        style={{
          color: COLORS.textDim,
          fontSize: '11px',
          fontFamily: FONTS.mono,
          marginTop: '20px',
          letterSpacing: '2px',
        }}
      >
        ESC &gt; {isFromGameOver ? 'CLOSE' : 'RESUME'}
      </p>

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
