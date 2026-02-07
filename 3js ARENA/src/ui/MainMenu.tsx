// =============================================================================
// MainMenu.tsx — Start screen with multiplayer mode selection
// =============================================================================

import { useGameStore } from '../game/GameState';
import { useNetwork } from '../networking/NetworkProvider';
import { ARENA_THEMES } from '../arena/arenaThemes';
import { randomPick } from '../utils/random';

export function MainMenu() {
  const phase = useGameStore((s) => s.phase);
  const goToLobby = useGameStore((s) => s.goToLobby);
  const startGame = useGameStore((s) => s.startGame);
  const { connect } = useNetwork();

  if (phase !== 'menu') return null;

  const handleLocalPlay = () => {
    const theme = randomPick(ARENA_THEMES);
    startGame(theme.id);
  };

  const handleOnlinePlay = () => {
    connect();
    goToLobby();
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at center, rgba(20,0,40,0.95) 0%, rgba(0,0,0,0.98) 100%)',
        zIndex: 200,
      }}
    >
      {/* Title */}
      <h1
        style={{
          color: '#ffffff',
          fontSize: '48px',
          fontWeight: '900',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '6px',
          textShadow:
            '0 0 30px rgba(255,0,100,0.6), 0 0 60px rgba(100,0,255,0.3)',
          marginBottom: '8px',
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        SUPERMECHAFIGHTER
        <br />
        <span style={{ fontSize: '28px', letterSpacing: '10px', color: '#ff4488' }}>
          ULTRAREALITY 3600
        </span>
        <br />
        <span style={{ fontSize: '20px', letterSpacing: '12px', color: '#aa44ff' }}>
          OF DOOM
        </span>
      </h1>

      <div style={{ height: '40px' }} />

      {/* Online 1v1 */}
      <MenuButton onClick={handleOnlinePlay} primary>
        ONLINE 1v1
      </MenuButton>

      <div style={{ height: '12px' }} />

      {/* Local play */}
      <MenuButton onClick={handleLocalPlay}>
        LOCAL PRACTICE
      </MenuButton>

      <div style={{ height: '12px' }} />

      {/* 2v2 — coming soon */}
      <MenuButton onClick={() => {}} disabled>
        2v2 (COMING SOON)
      </MenuButton>

      <div style={{ height: '24px' }} />

      {/* Controls hint */}
      <div
        style={{
          color: '#666666',
          fontSize: '13px',
          textAlign: 'center',
          lineHeight: 1.6,
          fontFamily: 'monospace',
        }}
      >
        <div>WASD move | Mouse look | Click to swing</div>
        <div style={{ marginTop: '8px', color: '#444' }}>ESC to pause</div>
      </div>
    </div>
  );
}

function MenuButton({
  onClick,
  children,
  primary,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        padding: '14px 56px',
        fontSize: '20px',
        fontWeight: 'bold',
        fontFamily: "'Impact', 'Arial Black', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '4px',
        color: disabled ? '#555' : '#ffffff',
        background: disabled
          ? '#222'
          : primary
            ? 'linear-gradient(180deg, #ff2266, #cc0044)'
            : 'rgba(255, 255, 255, 0.08)',
        border: disabled
          ? '1px solid #333'
          : primary
            ? '2px solid #ff4488'
            : '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '4px',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: primary
          ? '0 0 30px rgba(255,0,80,0.4), 0 4px 15px rgba(0,0,0,0.5)'
          : 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        minWidth: '280px',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'scale(1.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}
