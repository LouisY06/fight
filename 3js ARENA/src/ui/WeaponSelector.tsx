// =============================================================================
// WeaponSelector.tsx — Bottom-center HUD: sword slot (click to open customizer)
// Military mech HUD aesthetic.
// =============================================================================

import { useSwordStore } from '../game/SwordSelection';
import { COLORS, FONTS, CLIP } from './theme';

// ---------------------------------------------------------------------------
// SVG Icon
// ---------------------------------------------------------------------------

const SwordSVG = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={color} strokeWidth="1.5">
    <path d="M14.5 3L21 9.5 9.5 21 3 14.5 14.5 3z" />
    <path d="M14.5 3L21 9.5" strokeWidth="2" />
    <path d="M6 15l3 3M8 13l3 3" strokeOpacity="0.5" />
  </svg>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WeaponSelector() {
  const openSelector = useSwordStore((s) => s.openSelector);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          background: 'rgba(10, 12, 16, 0.7)',
          border: `1px solid ${COLORS.borderFaint}`,
          clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
        }}
      >
        <div
          onClick={openSelector}
          style={{
            position: 'relative',
            width: '68px',
            height: '64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            background: `rgba(255, 140, 0, 0.1)`,
            border: `1px solid ${COLORS.amber}`,
            clipPath: CLIP.button,
            transition: 'all 0.2s ease',
            boxShadow: `0 0 12px rgba(255, 140, 0, 0.15), inset 0 0 8px rgba(255, 140, 0, 0.1)`,
          }}
        >
          {/* Key number badge */}
          <div
            style={{
              position: 'absolute',
              top: '3px',
              left: '6px',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: FONTS.mono,
              color: COLORS.amber,
              lineHeight: 1,
            }}
          >
            1
          </div>

          {/* Weapon icon */}
          <div style={{ marginTop: '2px' }}>
            <SwordSVG color={COLORS.amber} />
          </div>

          {/* Weapon name */}
          <div
            style={{
              fontSize: '8px',
              fontWeight: 600,
              fontFamily: FONTS.mono,
              letterSpacing: '0.08em',
              color: COLORS.amber,
              marginTop: '2px',
            }}
          >
            SWORD
          </div>

          {/* Active indicator bar */}
          <div
            style={{
              position: 'absolute',
              bottom: '0px',
              left: '20%',
              right: '20%',
              height: '2px',
              background: COLORS.amber,
              boxShadow: `0 0 6px ${COLORS.amber}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
