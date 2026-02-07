// =============================================================================
// HealthBar.tsx — Animated health bar with color transitions
// =============================================================================

import { useMemo } from 'react';
import { GAME_CONFIG } from '../game/GameConfig';

interface HealthBarProps {
  health: number;
  side: 'left' | 'right';
  playerName: string;
}

export function HealthBar({ health, side, playerName }: HealthBarProps) {
  const percentage = (health / GAME_CONFIG.maxHealth) * 100;

  const barColor = useMemo(() => {
    if (percentage > 60) return '#22cc44';
    if (percentage > 30) return '#ccaa22';
    return '#cc2222';
  }, [percentage]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
        gap: '4px',
        minWidth: '280px',
      }}
    >
      {/* Player name */}
      <span
        style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: '0 0 10px rgba(0,0,0,0.8)',
        }}
      >
        {playerName}
      </span>

      {/* Health bar container */}
      <div
        style={{
          width: '100%',
          height: '24px',
          background: 'rgba(0, 0, 0, 0.6)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Health fill */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            [side === 'left' ? 'left' : 'right']: 0,
            width: `${percentage}%`,
            height: '100%',
            background: `linear-gradient(180deg, ${barColor}, ${barColor}88)`,
            transition: 'width 0.3s ease-out, background 0.3s ease',
            boxShadow: `0 0 10px ${barColor}66`,
          }}
        />

        {/* HP number */}
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
            zIndex: 1,
          }}
        >
          {Math.ceil(health)} / {GAME_CONFIG.maxHealth}
        </span>
      </div>
    </div>
  );
}
