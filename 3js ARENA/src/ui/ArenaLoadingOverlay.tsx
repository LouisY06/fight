// =============================================================================
// ArenaLoadingOverlay.tsx — Loading screen during arena load
// Modern UI: Orbitron font, minimal loading bar
// =============================================================================

import { useGameStore } from '../game/GameState';

const FONT_HEADING = "'Orbitron', 'Rajdhani', sans-serif";

export function ArenaLoadingOverlay() {
  const phase = useGameStore((s) => s.phase);

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
        background: 'rgba(0, 0, 0, 0.95)',
        zIndex: 180,
        gap: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: FONT_HEADING,
          textTransform: 'uppercase',
          letterSpacing: '8px',
        }}
      >
        LOADING ARENA
      </div>
      <div
        style={{
          width: '180px',
          height: '2px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '1px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            borderRadius: '1px',
            animation: 'loadingBar 1.2s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}
