// =============================================================================
// MainMenu.tsx — Start screen with multiplayer mode selection + CV toggle
// =============================================================================

import { useGameStore } from '../game/GameState';
import { useNetwork } from '../networking/NetworkProvider';
import { useCVContext } from '../cv/CVProvider';
import { ARENA_THEMES } from '../arena/arenaThemes';
import { randomPick } from '../utils/random';

export function MainMenu() {
  const phase = useGameStore((s) => s.phase);
  const goToLobby = useGameStore((s) => s.goToLobby);
  const startGame = useGameStore((s) => s.startGame);
  const username = useGameStore((s) => s.username);
  const setUsername = useGameStore((s) => s.setUsername);
  const { connect } = useNetwork();
  const { cvEnabled, setCvEnabled } = useCVContext();

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

      <div style={{ height: '32px' }} />

      {/* Username input */}
      <div style={{ position: 'relative', width: '280px', marginBottom: '24px' }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.slice(0, 16))}
          placeholder="ENTER NAME"
          maxLength={16}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: "'Impact', 'Arial Black', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '3px',
            textAlign: 'center',
            color: '#ffffff',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            outline: 'none',
            caretColor: '#ff4488',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 68, 136, 0.5)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
        />
      </div>

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

      {/* CV Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 20px',
          background: cvEnabled
            ? 'rgba(68, 204, 102, 0.1)'
            : 'rgba(255, 255, 255, 0.03)',
          border: cvEnabled
            ? '1px solid rgba(68, 204, 102, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onClick={() => setCvEnabled(!cvEnabled)}
      >
        {/* Toggle switch */}
        <div
          style={{
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            background: cvEnabled ? '#44cc66' : '#333',
            position: 'relative',
            transition: 'background 0.2s ease',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: cvEnabled ? '18px' : '2px',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </div>
        <span
          style={{
            color: cvEnabled ? '#44cc66' : '#666',
            fontSize: '14px',
            fontFamily: "'Impact', 'Arial Black', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          {cvEnabled ? 'CV MODE ON' : 'CV MODE OFF'}
        </span>
      </div>

      <div style={{ height: '16px' }} />

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
        {cvEnabled ? (
          <>
            <div>Move your body to move | Swing right arm to attack</div>
            <div>Raise left arm to block | Mouse to look</div>
          </>
        ) : (
          <div>WASD move | Mouse look | Click to swing</div>
        )}
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
