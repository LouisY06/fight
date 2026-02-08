// =============================================================================
// HealthBar.tsx — Angled health bar with damage flash, ghost bar, tick marks
// Military mech HUD aesthetic
// =============================================================================

import { useMemo, useRef, useEffect, useState } from 'react';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { COLORS, FONTS } from './theme';

interface HealthBarProps {
  health: number;
  side: 'left' | 'right';
  playerName: string;
  playerKey: 'player1' | 'player2';
}

const DAMAGE_FLASH_MS = 400;
const GHOST_DELAY_MS = 300;

function healthColor(pct: number): string {
  if (pct > 60) return COLORS.steel;
  if (pct > 30) return COLORS.amber;
  return COLORS.red;
}

export function HealthBar({ health, side, playerName, playerKey }: HealthBarProps) {
  const percentage = (health / GAME_CONFIG.maxHealth) * 100;
  const lastDamagedPlayer = useGameStore((s) => s.lastDamagedPlayer);
  const lastDamageTime = useGameStore((s) => s.lastDamageTime);
  const isBlocking = useGameStore((s) => s[playerKey].isBlocking);
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

  const barColor = useMemo(() => healthColor(percentage), [percentage]);
  const isLowHealth = percentage <= 30;

  const clipPath = side === 'left'
    ? 'polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)'
    : 'polygon(14px 0, 100% 0, 100% 100%, 0 100%)';

  const hpStr = `${String(Math.ceil(health)).padStart(3, '0')}/${GAME_CONFIG.maxHealth}`;

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
      {/* Player name + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {side === 'right' && isBlocking && <ShieldIcon />}
        <span
          style={{
            color: COLORS.textPrimary,
            fontSize: '13px',
            fontWeight: '600',
            fontFamily: FONTS.heading,
            textTransform: 'uppercase',
            letterSpacing: '3px',
            textShadow: '0 0 10px rgba(0,0,0,0.8)',
          }}
        >
          {playerName}
        </span>
        {side === 'left' && isBlocking && <ShieldIcon />}
      </div>

      {/* Health bar container */}
      <div
        style={{
          width: '100%',
          height: '22px',
          background: 'rgba(0, 0, 0, 0.7)',
          border: `1px solid ${isLowHealth ? COLORS.redDim : COLORS.borderFaint}`,
          clipPath,
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
              animation: 'damageFlash 0.4s ease-out forwards',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Ghost bar (red afterimage) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            [side === 'left' ? 'left' : 'right']: 0,
            width: `${ghostPercentage}%`,
            height: '100%',
            background: 'rgba(204, 34, 34, 0.4)',
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
            boxShadow: `0 0 8px ${barColor}44`,
          }}
        />

        {/* Tick marks every 10% */}
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${(i + 1) * 10}%`,
              width: '1px',
              height: '100%',
              background: 'rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* HP number */}
        <span
          style={{
            position: 'absolute',
            top: '50%',
            [side === 'left' ? 'right' : 'left']: '8px',
            transform: 'translateY(-50%)',
            color: COLORS.textPrimary,
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: FONTS.mono,
            textShadow: '0 0 4px rgba(0,0,0,0.9)',
            zIndex: 1,
            letterSpacing: '1px',
          }}
        >
          {hpStr}
        </span>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '12px',
        height: '14px',
        background: COLORS.steel,
        clipPath: 'polygon(50% 0%, 100% 15%, 100% 60%, 50% 100%, 0% 60%, 0% 15%)',
        opacity: 0.8,
        animation: 'borderPulse 1.5s ease-in-out infinite',
      }}
    />
  );
}
