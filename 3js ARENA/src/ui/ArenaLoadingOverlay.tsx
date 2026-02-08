// =============================================================================
// ArenaLoadingOverlay.tsx — Military boot-up loading sequence
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { COLORS, FONTS } from './theme';

const BOOT_LINES = [
  'INITIALIZING COMBAT SYSTEMS...',
  'LOADING TERRAIN DATA...',
  'CALIBRATING WEAPON ARRAYS...',
  'SYNCING MECH PARAMETERS...',
  'ESTABLISHING ARENA PERIMETER...',
  'DEPLOYING UNIT...',
];

const TIPS = [
  'TIP: Sword clashes stun both pilots momentarily',
  'TIP: Watch the ghost bar — it shows recent damage taken',
  'TIP: Say "mechabot fireball" to cast spells',
  'TIP: Raise your left arm to activate the dash spell',
];

export function ArenaLoadingOverlay() {
  const phase = useGameStore((s) => s.phase);
  const [visibleLines, setVisibleLines] = useState(0);
  const tipRef = useRef(TIPS[Math.floor(Math.random() * TIPS.length)]);

  useEffect(() => {
    if (phase !== 'arenaLoading') {
      setVisibleLines(0);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= BOOT_LINES.length) clearInterval(interval);
    }, 400);

    return () => clearInterval(interval);
  }, [phase]);

  if (phase !== 'arenaLoading') return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: COLORS.bgDeep,
        zIndex: 180,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Noise overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          background: 'repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%) 0 0 / 3px 3px',
          pointerEvents: 'none',
        }}
      />

      {/* Boot-up text panel */}
      <div
        style={{
          width: '380px',
          padding: '24px',
          background: 'rgba(255, 140, 0, 0.02)',
          border: `1px solid ${COLORS.borderDefault}`,
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        }}
      >
        {/* Header */}
        <div
          style={{
            color: COLORS.amber,
            fontSize: '14px',
            fontFamily: FONTS.mono,
            letterSpacing: '4px',
            marginBottom: '16px',
            textTransform: 'uppercase',
          }}
        >
          // SYSTEM BOOT
        </div>

        {/* Boot lines */}
        {BOOT_LINES.map((line, i) => (
          <div
            key={i}
            style={{
              color: i < visibleLines ? COLORS.textSecondary : 'transparent',
              fontSize: '12px',
              fontFamily: FONTS.mono,
              letterSpacing: '1px',
              marginBottom: '6px',
              animation: i < visibleLines ? 'bootLine 0.3s ease-out' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ color: i < visibleLines ? COLORS.green : 'transparent', fontSize: '10px' }}>
              {i < visibleLines - 1 ? '[OK]' : i === visibleLines - 1 ? '[..]' : '    '}
            </span>
            {line}
          </div>
        ))}

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '2px',
            background: 'rgba(255, 140, 0, 0.1)',
            marginTop: '16px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '40%',
              background: `linear-gradient(90deg, transparent, ${COLORS.amber}, transparent)`,
              animation: 'loadingBar 1.2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* Tip */}
      <div
        style={{
          marginTop: '24px',
          color: COLORS.textDim,
          fontSize: '11px',
          fontFamily: FONTS.mono,
          letterSpacing: '1px',
          animation: 'fadeIn 1s ease',
        }}
      >
        {tipRef.current}
      </div>
    </div>
  );
}
