// =============================================================================
// WeaponSelector.tsx — Bottom-center HUD showing weapon slots (1=Shield, 2=Sword, 3=Gun)
// =============================================================================

import { useWeaponStore, type ActiveWeapon } from '../game/WeaponState';

const WEAPONS: { key: string; name: string; id: ActiveWeapon; icon: string }[] = [
  { key: '1', name: 'SHIELD', id: 'shield', icon: '🛡' },
  { key: '2', name: 'SWORD', id: 'sword', icon: '⚔' },
  { key: '3', name: 'GUN', id: 'gun', icon: '🔫' },
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
        gap: '6px',
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
              width: '68px',
              height: '68px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              background: isActive
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(0, 0, 0, 0.45)',
              border: isActive
                ? '2px solid rgba(255, 255, 255, 0.7)'
                : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
              boxShadow: isActive
                ? '0 0 16px rgba(255, 255, 255, 0.15), inset 0 0 12px rgba(255, 255, 255, 0.05)'
                : 'none',
            }}
          >
            {/* Key number badge */}
            <div
              style={{
                position: 'absolute',
                top: '3px',
                left: '5px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                lineHeight: 1,
              }}
            >
              {w.key}
            </div>

            {/* Weapon icon */}
            <div
              style={{
                fontSize: '22px',
                lineHeight: 1,
                filter: isActive ? 'none' : 'grayscale(0.6) opacity(0.6)',
                transition: 'filter 0.15s ease',
              }}
            >
              {w.icon}
            </div>

            {/* Weapon name */}
            <div
              style={{
                fontSize: '9px',
                fontWeight: 600,
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                letterSpacing: '0.08em',
                color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                marginTop: '3px',
                transition: 'color 0.15s ease',
              }}
            >
              {w.name}
            </div>

            {/* Active indicator bar */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: '20%',
                  right: '20%',
                  height: '2px',
                  background: 'white',
                  borderRadius: '1px',
                  boxShadow: '0 0 6px rgba(255,255,255,0.5)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
