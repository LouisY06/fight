// =============================================================================
// WeaponSelector.tsx — Bottom-center HUD: weapon slots with SVG icons
// Military mech HUD aesthetic
// =============================================================================

import { useWeaponStore, type ActiveWeapon } from '../game/WeaponState';
import { COLORS, FONTS, CLIP } from './theme';

// SVG weapon silhouettes (inline path data for cross-platform consistency)
const ShieldSVG = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={COLORS.steel} strokeWidth="1.5">
    <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
    <path d="M12 6l-5 3v3c0 3.33 2.13 6.44 5 7.5" strokeOpacity="0.4" />
  </svg>
);

const SwordSVG = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={COLORS.amber} strokeWidth="1.5">
    <path d="M14.5 3L21 9.5 9.5 21 3 14.5 14.5 3z" />
    <path d="M14.5 3L21 9.5" strokeWidth="2" />
    <path d="M6 15l3 3M8 13l3 3" strokeOpacity="0.5" />
  </svg>
);

const GunSVG = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={COLORS.textSecondary} strokeWidth="1.5">
    <path d="M2 12h16l2-3h2v6h-2l-2-3H2z" />
    <path d="M10 12v5h3v-5" strokeOpacity="0.6" />
    <circle cx="20" cy="12" r="1" fill={COLORS.textSecondary} fillOpacity="0.5" />
  </svg>
);

const WEAPONS: { key: string; name: string; id: ActiveWeapon; Icon: React.FC }[] = [
  { key: '1', name: 'SHIELD', id: 'shield', Icon: ShieldSVG },
  { key: '2', name: 'SWORD', id: 'sword', Icon: SwordSVG },
  { key: '3', name: 'GUN', id: 'gun', Icon: GunSVG },
];

export function WeaponSelector() {
  const activeWeapon = useWeaponStore((s) => s.activeWeapon);
  const setActiveWeapon = useWeaponStore((s) => s.setActiveWeapon);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '4px',
        pointerEvents: 'auto',
        padding: '4px',
        background: 'rgba(10, 12, 16, 0.7)',
        border: `1px solid ${COLORS.borderFaint}`,
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      }}
    >
      {WEAPONS.map((w) => {
        const isActive = activeWeapon === w.id;
        return (
          <div
            key={w.id}
            onClick={() => setActiveWeapon(w.id)}
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
              background: isActive
                ? 'rgba(255, 140, 0, 0.1)'
                : 'rgba(0, 0, 0, 0.3)',
              border: isActive
                ? `1px solid ${COLORS.amber}`
                : `1px dashed ${COLORS.borderFaint}`,
              clipPath: CLIP.button,
              transition: 'all 0.15s ease',
              boxShadow: isActive
                ? `0 0 12px ${COLORS.amberGlow}, inset 0 0 8px ${COLORS.amberGlow}`
                : 'none',
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
                color: isActive ? COLORS.amber : COLORS.textDim,
                lineHeight: 1,
              }}
            >
              {w.key}
            </div>

            {/* Weapon icon */}
            <div
              style={{
                opacity: isActive ? 1 : 0.4,
                transition: 'opacity 0.15s ease',
                marginTop: '2px',
              }}
            >
              <w.Icon />
            </div>

            {/* Weapon name / ARMED label */}
            <div
              style={{
                fontSize: '8px',
                fontWeight: 600,
                fontFamily: FONTS.mono,
                letterSpacing: '0.08em',
                color: isActive ? COLORS.amber : COLORS.textDim,
                marginTop: '2px',
                transition: 'color 0.15s ease',
              }}
            >
              {isActive ? 'ARMED' : w.name}
            </div>

            {/* Active indicator bar */}
            {isActive && (
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
            )}
          </div>
        );
      })}
    </div>
  );
}
