// =============================================================================
// HealthBar.tsx — Animated health bar with damage flash, ghost bar, low-health pulse
// Modern UI: Orbitron/Rajdhani fonts, slim profile, gradient fills
// =============================================================================

import { useMemo, useRef, useEffect, useState } from 'react';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';

const FONT_HEADING = "'Orbitron', 'Rajdhani', sans-serif";
const FONT_BODY = "'Rajdhani', 'Segoe UI', system-ui, sans-serif";

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

  const showDamageFlash =
    lastDamagedPlayer === playerKey && Date.now() - lastDamageTime < DAMAGE_FLASH_MS;

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
    if (percentage > 60) return { main: '#22cc44', dark: '#189934', glow: 'rgba(34,204,68,0.3)' };
    if (percentage > 30) return { main: '#e8b818', dark: '#b8920e', glow: 'rgba(232,184,24,0.3)' };
    return { main: '#e83030', dark: '#b82020', glow: 'rgba(232,48,48,0.4)' };
  }, [percentage]);

  const isLowHealth = percentage <= 30;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
        gap: '5px',
        minWidth: '280px',
      }}
    >
      {/* Player name + HP number inline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          flexDirection: side === 'right' ? 'row-reverse' : 'row',
          width: '100%',
          justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: FONT_HEADING,
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          {playerName}
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: FONT_BODY,
            letterSpacing: '0.5px',
          }}
        >
          {Math.ceil(health)}/{GAME_CONFIG.maxHealth}
        </span>
      </div>

      {/* Health bar container */}
      <div
        style={{
          width: '100%',
          height: '16px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '2px',
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
              background: 'rgba(255, 50, 50, 0.4)',
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
            background: 'rgba(255, 255, 255, 0.12)',
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
            background: `linear-gradient(180deg, ${barColor.main}, ${barColor.dark})`,
            transition: 'width 0.3s ease-out, background 0.3s ease',
            boxShadow: `0 0 8px ${barColor.glow}`,
          }}
        />

        {/* Subtle top highlight */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
      </div>
    </div>
  );
}
