// =============================================================================
// MainMenu.tsx — Start screen with multiplayer mode selection + CV toggle
// =============================================================================

import { useState } from 'react';
import { useGameStore } from '../game/GameState';
import { useNetwork } from '../networking/NetworkProvider';
import { useCVContext } from '../cv/CVProvider';
import { MenuCharacterPreview } from './MenuCharacterPreview';
import { CustomizationPanel } from './CustomizationPanel';
import { MapSelector } from './MapSelector';
import { AI_DIFFICULTY, type AIDifficulty } from '../game/GameConfig';
import { preloadRiggedMechPack } from '../riggedMechs/RiggedMechEntity';

function PreloadRiggedPack() {
  preloadRiggedMechPack();
  return null;
}

export function MainMenu() {
  const phase = useGameStore((s) => s.phase);
  const goToLobby = useGameStore((s) => s.goToLobby);
  const startGame = useGameStore((s) => s.startGame);
  const username = useGameStore((s) => s.username);
  const setUsername = useGameStore((s) => s.setUsername);
  const { connect } = useNetwork();
  const aiDifficulty = useGameStore((s) => s.aiDifficulty);
  const setAIDifficulty = useGameStore((s) => s.setAIDifficulty);
  const { cvEnabled, setCvEnabled } = useCVContext();
  const [showCustomize, setShowCustomize] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);

  if (phase !== 'menu') return null;

  const handleLocalPlay = () => {
    setShowDifficultyPicker(true);
  };

  const handleDifficultySelected = (d: AIDifficulty) => {
    setAIDifficulty(d);
    setShowDifficultyPicker(false);
    setShowMapSelector(true);
  };

  const handleOnlinePlay = () => {
    connect();
    goToLobby();
  };

  const handleMapSelected = (themeId: string) => {
    setShowMapSelector(false);
    startGame(themeId);
  };

  return (
    <>
      <PreloadRiggedPack />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        background:
          'radial-gradient(ellipse at center, rgba(20,0,40,0.75) 0%, rgba(0,0,0,0.85) 100%)',
        zIndex: 200,
      }}
    >
      {/* Left: menu content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0,
          paddingRight: 'min(42%, 400px)',
        }}
      >
      {/* Title — staggered entrance */}
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
          animation: 'fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          opacity: 1,
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
      <div
        style={{
          position: 'relative',
          width: '280px',
          marginBottom: '24px',
          animation: 'fadeInUp 0.5s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          opacity: 1,
        }}
      >
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
      <div style={{ animation: 'fadeInUp 0.5s 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards', opacity: 1 }}>
        <MenuButton onClick={handleOnlinePlay} primary>
          ONLINE 1v1
        </MenuButton>
      </div>

      <div style={{ height: '12px' }} />

      {/* Local play */}
      <div style={{ animation: 'fadeInUp 0.5s 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards', opacity: 1 }}>
        <MenuButton onClick={handleLocalPlay}>
          PRACTICE AGAINST AI
        </MenuButton>
      </div>

      <div style={{ height: '24px' }} />

      {/* CV Toggle */}
      <div
        style={{
          display: 'flex',
          animation: 'fadeInUp 0.5s 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          opacity: 1,
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

      {/* Right: character preview in a transparent box integrated with the background */}
      <div
        style={{
          position: 'absolute',
          right: 24,
          top: 24,
          bottom: 24,
          width: '42%',
          minWidth: 320,
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: '48px',
          background: 'rgba(20, 0, 40, 0.4)',
          border: '1px solid rgba(255, 68, 136, 0.2)',
          borderRadius: 16,
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3), 0 0 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: 0 }}>
          <MenuCharacterPreview />
        </div>
        <button
          onClick={() => setShowCustomize(true)}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            fontFamily: "'Impact', 'Arial Black', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '3px',
            color: '#fff',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 68, 136, 0.5)',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 20px rgba(255, 68, 136, 0.2)',
          }}
        >
          Customize
        </button>
      </div>

      {showCustomize && (
        <CustomizationPanel onClose={() => setShowCustomize(false)} />
      )}

      {showDifficultyPicker && (
        <DifficultyPicker
          current={aiDifficulty}
          onSelect={handleDifficultySelected}
          onCancel={() => setShowDifficultyPicker(false)}
        />
      )}

      {showMapSelector && (
        <MapSelector
          mode="practice"
          onSelect={handleMapSelected}
          onCancel={() => setShowMapSelector(false)}
        />
      )}
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Difficulty picker overlay
// ---------------------------------------------------------------------------

const DIFF_COLORS: Record<AIDifficulty, string> = {
  easy: '#44cc66',
  medium: '#ffaa33',
  hard: '#ff3355',
};

function DifficultyPicker({
  current,
  onSelect,
  onCancel,
}: {
  current: AIDifficulty;
  onSelect: (d: AIDifficulty) => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 300,
        gap: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <h2
        style={{
          color: '#ffffff',
          fontSize: '36px',
          fontWeight: '900',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '6px',
          marginBottom: '8px',
          textShadow: '0 0 20px rgba(255,255,255,0.1)',
        }}
      >
        SELECT DIFFICULTY
      </h2>

      {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => {
        const cfg = AI_DIFFICULTY[d];
        const color = DIFF_COLORS[d];
        const isActive = d === current;
        return (
          <button
            key={d}
            onClick={() => onSelect(d)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '16px 48px',
              minWidth: '300px',
              fontSize: '22px',
              fontWeight: 'bold',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '4px',
              color: '#ffffff',
              background: isActive
                ? `${color}22`
                : 'rgba(255, 255, 255, 0.05)',
              border: isActive
                ? `2px solid ${color}`
                : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${color}33`;
              e.currentTarget.style.borderColor = color;
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isActive ? `${color}22` : 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = isActive ? color : 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span style={{ color }}>{cfg.label}</span>
            <span
              style={{
                fontSize: '11px',
                color: '#888',
                letterSpacing: '1px',
                fontFamily: 'monospace',
                fontWeight: 'normal',
                textTransform: 'none',
              }}
            >
              {cfg.description}
            </span>
          </button>
        );
      })}

      <button
        onClick={onCancel}
        style={{
          marginTop: '12px',
          padding: '10px 32px',
          fontSize: '14px',
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: '#888',
          background: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        BACK
      </button>
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
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
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
