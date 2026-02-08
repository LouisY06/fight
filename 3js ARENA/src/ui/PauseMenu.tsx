// =============================================================================
// PauseMenu.tsx — Universal ESC menu for all game phases
// Modern UI: Orbitron/Rajdhani fonts, glass-panel buttons
// =============================================================================

import { useEffect, useState } from 'react';
import { useGameStore, type GamePhase } from '../game/GameState';
import { headSensitivityConfig } from '../cv/CVInputMapper';

const FONT_HEADING = "'Orbitron', 'Rajdhani', sans-serif";
const FONT_BODY = "'Rajdhani', 'Segoe UI', system-ui, sans-serif";

const PAUSABLE_PHASES: GamePhase[] = ['playing', 'countdown', 'roundEnd', 'gameOver'];
const BACK_TO_MENU_PHASES: GamePhase[] = ['lobby', 'waiting'];

export function PauseMenu() {
  const phase = useGameStore((s) => s.phase);
  const prePausePhase = useGameStore((s) => s.prePausePhase);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const resetToMenu = useGameStore((s) => s.resetToMenu);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const roomId = useGameStore((s) => s.roomId);

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
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 250,
        gap: '10px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <h2
        style={{
          color: 'rgba(255,255,255,0.9)',
          fontSize: '36px',
          fontWeight: 800,
          fontFamily: FONT_HEADING,
          textTransform: 'uppercase',
          letterSpacing: '10px',
          marginBottom: '24px',
          animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {title}
      </h2>

      {/* Online room code */}
      {isMultiplayer && roomId && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px',
            padding: '12px 28px',
            background: 'rgba(255, 68, 136, 0.06)',
            border: '1px solid rgba(255, 68, 136, 0.15)',
            borderRadius: '4px',
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '9px',
              fontFamily: FONT_HEADING,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '3px',
            }}
          >
            Room Code
          </span>
          <span
            style={{
              color: '#ff4488',
              fontSize: '28px',
              fontWeight: 700,
              fontFamily: FONT_HEADING,
              letterSpacing: '10px',
              textShadow: '0 0 20px rgba(255,0,80,0.3)',
              userSelect: 'all',
            }}
          >
            {roomId}
          </span>
        </div>
      )}

      {!isFromGameOver && (
        <MenuButton onClick={resumeGame}>Resume</MenuButton>
      )}

      <MenuButton onClick={resetToMenu} variant="secondary">
        Main Menu
      </MenuButton>

      <MenuButton onClick={handleQuitGame} variant="danger">
        Quit Game
      </MenuButton>

      <SensitivitySlider />

      <p
        style={{
          color: 'rgba(255,255,255,0.2)',
          fontSize: '10px',
          fontFamily: FONT_BODY,
          fontWeight: 500,
          marginTop: '20px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
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
  let bgDefault: string, bgHover: string, borderColor: string, textColor: string;
  
  switch (variant) {
    case 'danger':
      bgDefault = 'rgba(255, 40, 60, 0.08)';
      bgHover = 'rgba(255, 40, 60, 0.2)';
      borderColor = 'rgba(255, 40, 60, 0.2)';
      textColor = 'rgba(255, 120, 130, 0.8)';
      break;
    case 'secondary':
      bgDefault = 'rgba(255, 255, 255, 0.03)';
      bgHover = 'rgba(255, 255, 255, 0.08)';
      borderColor = 'rgba(255, 255, 255, 0.08)';
      textColor = 'rgba(255, 255, 255, 0.5)';
      break;
    default:
      bgDefault = 'rgba(100, 200, 255, 0.08)';
      bgHover = 'rgba(100, 200, 255, 0.18)';
      borderColor = 'rgba(100, 200, 255, 0.2)';
      textColor = 'rgba(255, 255, 255, 0.85)';
  }

  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 48px',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '4px',
        color: textColor,
        background: bgDefault,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: FONT_HEADING,
        minWidth: '260px',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = '';
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = bgHover;
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bgDefault;
        e.currentTarget.style.color = textColor;
      }}
    >
      {children}
    </button>
  );
}

function SensitivitySlider() {
  const [value, setValue] = useState(headSensitivityConfig.multiplier);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setValue(v);
    headSensitivityConfig.multiplier = v;
  };

  const pct = Math.round(value * 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        marginTop: '16px',
        padding: '12px 24px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '4px',
        minWidth: '260px',
      }}
    >
      <label
        style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '9px',
          fontFamily: FONT_HEADING,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '2px',
        }}
      >
        Head Sensitivity: {pct}%
      </label>
      <input
        type="range"
        min="0.3"
        max="2.5"
        step="0.1"
        value={value}
        onChange={handleChange}
        style={{
          width: '220px',
          accentColor: '#4488ff',
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '220px',
          color: 'rgba(255,255,255,0.2)',
          fontSize: '8px',
          fontFamily: FONT_BODY,
          fontWeight: 500,
          letterSpacing: '1px',
        }}
      >
        <span>LOW</span>
        <span>HIGH</span>
      </div>
    </div>
  );
}
