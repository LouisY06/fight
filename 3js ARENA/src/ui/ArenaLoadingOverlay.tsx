// =============================================================================
// ArenaLoadingOverlay.tsx — Loading screen during arena load
// =============================================================================

import { useGameStore } from '../game/GameState';

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
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 180,
        gap: '24px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          color: '#ff4488',
          fontSize: '24px',
          fontWeight: 'bold',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '6px',
          textShadow: '0 0 20px rgba(255,68,136,0.5)',
        }}
      >
        Loading arena...
      </div>
      <div
        style={{
          width: '200px',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '40%',
            background: 'linear-gradient(90deg, #ff4488, #ff0066)',
            borderRadius: '2px',
            animation: 'loadingBar 1.2s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}
