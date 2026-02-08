// =============================================================================
// WeaponSelector.tsx — Bottom-center weapon bar (1=Shield, 2=Sword, 3=Gun)
// Modern UI: SVG icons, Orbitron/Rajdhani fonts, glass-panel cards
// =============================================================================

import { useWeaponStore, type ActiveWeapon } from '../game/WeaponState';

const FONT_HEADING = "'Orbitron', 'Rajdhani', sans-serif";
const FONT_BODY = "'Rajdhani', 'Segoe UI', system-ui, sans-serif";

// ---------------------------------------------------------------------------
// SVG weapon icons
// ---------------------------------------------------------------------------

function ShieldIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.4 4.6-1.25 8-6.15 8-11.4V6l-8-4Zm0 2.18L18 7.6v3.4c0 4.15-2.7 8.1-6 9.36-3.3-1.26-6-5.21-6-9.36V7.6l6-3.42Z"
        fill={color}
        opacity={0.85}
      />
    </svg>
  );
}

function SwordIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M19.07 2.93L6.34 15.66l-2.12-.71L2 17.17l2.83 2.83L7.05 17.78l-.71-2.12L19.07 2.93Zm-2.83 1.42l1.41 1.41L8.51 14.9l-1.41-1.41L16.24 4.35ZM4.24 17.17l1.41-1.41.71.71-1.42 1.41-.7-.71Z"
        fill={color}
        opacity={0.85}
      />
    </svg>
  );
}

function GunIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 7h-7V5h7v2Zm-2 4h-5v-2h5v2Zm-8 0V9H3v6h2v4h4v-4h2v-4h0Zm-4 4H7v-4h2v4h-2Z"
        fill={color}
        opacity={0.85}
      />
    </svg>
  );
}

const WEAPONS: {
  key: string;
  name: string;
  id: ActiveWeapon;
  Icon: (props: { color: string }) => JSX.Element;
  accent: string;
}[] = [
  { key: '1', name: 'SHIELD', id: 'shield', Icon: ShieldIcon, accent: '#44aaff' },
  { key: '2', name: 'SWORD', id: 'sword', Icon: SwordIcon, accent: '#ff4488' },
  { key: '3', name: 'GUN', id: 'gun', Icon: GunIcon, accent: '#44ff88' },
];

export function WeaponSelector() {
  const activeWeapon = useWeaponStore((s) => s.activeWeapon);
  const setActiveWeapon = useWeaponStore((s) => s.setActiveWeapon);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '4px',
        pointerEvents: 'auto',
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
              width: '60px',
              height: '60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              background: isActive
                ? `linear-gradient(135deg, ${w.accent}15, ${w.accent}08)`
                : 'rgba(255, 255, 255, 0.02)',
              border: isActive
                ? `1.5px solid ${w.accent}60`
                : '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '6px',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Key number badge */}
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '6px',
                fontSize: '8px',
                fontWeight: 700,
                fontFamily: FONT_HEADING,
                color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                lineHeight: 1,
              }}
            >
              {w.key}
            </div>

            {/* Weapon icon */}
            <div
              style={{
                opacity: isActive ? 1 : 0.35,
                transition: 'opacity 0.15s ease',
              }}
            >
              <w.Icon color={isActive ? w.accent : '#888'} />
            </div>

            {/* Weapon name */}
            <div
              style={{
                fontSize: '8px',
                fontWeight: 600,
                fontFamily: FONT_BODY,
                letterSpacing: '1.5px',
                color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                marginTop: '2px',
                transition: 'color 0.15s ease',
              }}
            >
              {w.name}
            </div>

            {/* Active indicator line */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '0px',
                  left: '25%',
                  right: '25%',
                  height: '1.5px',
                  background: w.accent,
                  borderRadius: '1px',
                  boxShadow: `0 0 6px ${w.accent}80`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
