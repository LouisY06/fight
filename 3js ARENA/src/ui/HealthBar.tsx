// =============================================================================
// HealthBar.tsx — Animated health bar with damage flash, ghost bar, low-health pulse
// =============================================================================

import { useMemo, useRef, useEffect, useState } from 'react';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';

interface HealthBarProps {
  health: number;
  side: 'left' | 'right';
  playerName: string;
  playerKey: 'player1' | 'player2';
}

const DAMAGE_FLASH_MS = 400;
const GHOST_DELAY_MS = 300;

export function HealthBar({ health, side, playerName, playerKey }: HealthBarProps) {
  const percentage = (health / GAME_CONFIG.maxHealth) * 100;
  const lastDamagedPlayer = useGameStore((s) => s.lastDamagedPlayer);
  const lastDamageTime = useGameStore((s) => s.lastDamageTime);
  const prevHealthRef = useRef(health);
  const [ghostPercentage, setGhostPercentage] = useState(percentage);

  // Damage flash: show when this player just took damage
  const showDamageFlash =
    lastDamagedPlayer === playerKey && Date.now() - lastDamageTime < DAMAGE_FLASH_MS;

  // Ghost bar: delayed trailing bar when health drops
  useEffect(() => {
    if (health < prevHealthRef.current) {
      const timer = setTimeout(() => {
        setGhostPercentage((health / GAME_CONFIG.maxHealth) * 100);
        prevHealthRef.current = health;
      }, GHOST_DELAY_MS);
      return () => clearTimeout(timer);
    } else {
      prevHealthRef.current = health;
      setGhostPercentage((health / GAME_CONFIG.maxHealth) * 100);
    }
  }, [health]);

  const barColor = useMemo(() => {
    if (percentage > 60) return '#22cc44';
    if (percentage > 30) return '#ccaa22';
    return '#cc2222';
  }, [percentage]);

  const isLowHealth = percentage <= 30;

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
          animation: isLowHealth ? 'lowHealthPulse 1.2s ease-in-out infinite' : 'none',
        }}
      >
        {/* Damage flash overlay */}
        {showDamageFlash && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 50, 50, 0.5)',
              borderRadius: '2px',
              animation: 'damageFlash 0.4s ease-out forwards',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Ghost bar (delayed trailing) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            [side === 'left' ? 'left' : 'right']: 0,
            width: `${ghostPercentage}%`,
            height: '100%',
            background: 'rgba(200, 200, 255, 0.35)',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

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
