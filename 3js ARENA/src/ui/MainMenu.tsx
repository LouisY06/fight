// =============================================================================
// MainMenu.tsx — Start screen with military mech aesthetic
// =============================================================================

import { useState } from 'react';
import { useGameStore } from '../game/GameState';
import { useNetwork } from '../networking/NetworkProvider';
import { useCVContext } from '../cv/CVProvider';
import { useSwordStore } from '../game/SwordSelection';
import { MenuCharacterPreview } from './MenuCharacterPreview';
import { CustomizationPanel } from './CustomizationPanel';
import { MapSelector } from './MapSelector';
import { SettingsPanel } from './SettingsPanel';
import { AI_DIFFICULTY, type AIDifficulty } from '../game/GameConfig';
import { preloadRiggedMechPack } from '../riggedMechs/RiggedMechEntity';
import { COLORS, FONTS, CLIP, cornerBracketStyle } from './theme';

function PreloadCustomPack() {
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
  const [showSettings, setShowSettings] = useState(false);
  const openSwordSelector = useSwordStore((s) => s.openSelector);

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
      <PreloadCustomPack />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          background: `linear-gradient(180deg, ${COLORS.bgDeep} 0%, ${COLORS.bgDark} 50%, ${COLORS.bgDeep} 100%)`,
          zIndex: 200,
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

        {/* Scan lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
            pointerEvents: 'none',
          }}
        />

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
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Warning stripe bar */}
          <div
            style={{
              width: '320px',
              height: '3px',
              background: `repeating-linear-gradient(-45deg, ${COLORS.amber}, ${COLORS.amber} 4px, transparent 4px, transparent 8px)`,
              marginBottom: '16px',
              animation: 'fadeInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          />

          {/* Title */}
          <h1
            style={{
              color: COLORS.textPrimary,
              fontSize: '44px',
              fontWeight: '700',
              fontFamily: FONTS.heading,
              textTransform: 'uppercase',
              letterSpacing: '8px',
              textShadow: `0 0 30px ${COLORS.amberGlow}, 0 0 60px rgba(255, 140, 0, 0.1)`,
              marginBottom: '4px',
              textAlign: 'center',
              lineHeight: 1.0,
              animation: 'fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            SUPERMECHAFIGHTER
            <br />
            <span style={{ fontSize: '24px', letterSpacing: '12px', color: COLORS.amber }}>
              ULTRAREALITY 3600
            </span>
            <br />
            <span style={{ fontSize: '16px', letterSpacing: '14px', color: COLORS.textDim }}>
              OF DOOM
            </span>
          </h1>

          {/* Warning stripe bar */}
          <div
            style={{
              width: '320px',
              height: '3px',
              background: `repeating-linear-gradient(-45deg, ${COLORS.amber}, ${COLORS.amber} 4px, transparent 4px, transparent 8px)`,
              marginTop: '12px',
              marginBottom: '28px',
              animation: 'fadeInUp 0.5s 0.1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              opacity: 1,
            }}
          />

          {/* Callsign input */}
          <div
            style={{
              width: '280px',
              marginBottom: '24px',
              animation: 'fadeInUp 0.5s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              opacity: 1,
            }}
          >
            <label
              style={{
                display: 'block',
                color: COLORS.textSecondary,
                fontSize: '10px',
                fontFamily: FONTS.mono,
                textTransform: 'uppercase',
                letterSpacing: '3px',
                marginBottom: '6px',
                textAlign: 'center',
              }}
            >
              // CALLSIGN
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.slice(0, 16))}
              placeholder="ENTER CALLSIGN"
              maxLength={16}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '18px',
                fontWeight: '600',
                fontFamily: FONTS.mono,
                textTransform: 'uppercase',
                letterSpacing: '3px',
                textAlign: 'center',
                color: COLORS.textPrimary,
                background: 'rgba(255, 140, 0, 0.04)',
                border: `1px solid ${COLORS.borderDefault}`,
                clipPath: CLIP.button,
                outline: 'none',
                caretColor: COLORS.amber,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.amber;
                e.currentTarget.style.boxShadow = `0 0 16px ${COLORS.amberGlow}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.borderDefault;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Online 1v1 */}
          <div style={{ animation: 'fadeInUp 0.5s 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards', opacity: 1 }}>
            <MechButton onClick={handleOnlinePlay} variant="primary">
              ONLINE 1v1
            </MechButton>
          </div>

          <div style={{ height: '10px' }} />

          {/* Practice */}
          <div style={{ animation: 'fadeInUp 0.5s 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards', opacity: 1 }}>
            <MechButton onClick={handleLocalPlay}>
              PRACTICE VS AI
            </MechButton>
          </div>

          <div style={{ height: '10px' }} />

          {/* Settings */}
          <div style={{ animation: 'fadeInUp 0.5s 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards', opacity: 1 }}>
            <MechButton onClick={() => setShowSettings(true)} variant="secondary">
              SETTINGS
            </MechButton>
          </div>

          <div style={{ height: '20px' }} />

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
                ? 'rgba(0, 204, 102, 0.06)'
                : 'rgba(255, 255, 255, 0.02)',
              border: cvEnabled
                ? `1px solid ${COLORS.greenDim}`
                : `1px solid ${COLORS.borderFaint}`,
              clipPath: CLIP.button,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setCvEnabled(!cvEnabled)}
          >
            {/* Indicator light */}
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: cvEnabled ? COLORS.green : COLORS.red,
                boxShadow: cvEnabled
                  ? `0 0 8px ${COLORS.green}`
                  : `0 0 8px ${COLORS.red}`,
                transition: 'all 0.3s ease',
              }}
            />
            <span
              style={{
                color: cvEnabled ? COLORS.green : COLORS.textDim,
                fontSize: '12px',
                fontFamily: FONTS.mono,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              {cvEnabled ? 'SYSTEM: CV ACTIVE' : 'SYSTEM: CV OFFLINE'}
            </span>
          </div>

          <div style={{ height: '16px' }} />

          {/* Controls brief */}
          <div
            style={{
              padding: '10px 16px',
              border: `1px solid ${COLORS.borderFaint}`,
              clipPath: CLIP.button,
              animation: 'fadeInUp 0.5s 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              opacity: 1,
            }}
          >
            <div
              style={{
                color: COLORS.textDim,
                fontSize: '10px',
                fontFamily: FONTS.mono,
                letterSpacing: '2px',
                marginBottom: '4px',
                textTransform: 'uppercase',
              }}
            >
              // CONTROLS BRIEF
            </div>
            <div
              style={{
                color: COLORS.textSecondary,
                fontSize: '12px',
                fontFamily: FONTS.mono,
                lineHeight: 1.6,
              }}
            >
              {cvEnabled ? (
                <>
                  <div>BODY &gt; MOVE | R.ARM &gt; ATTACK</div>
                  <div>L.ARM &gt; BLOCK | MOUSE &gt; LOOK</div>
                </>
              ) : (
                <div>WASD &gt; MOVE | MOUSE &gt; LOOK | CLICK &gt; SWING</div>
              )}
              <div style={{ marginTop: '4px', color: COLORS.textDim }}>ESC &gt; PAUSE</div>
            </div>
          </div>
        </div>

        {/* Right: character preview */}
        <div
          style={{
            position: 'absolute',
            right: 24,
            top: 24,
            bottom: 24,
            width: '42%',
            minWidth: 320,
            maxWidth: 480,
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingBottom: '48px',
            background: 'rgba(13, 15, 19, 0.6)',
            border: `1px solid ${COLORS.borderDefault}`,
            clipPath: CLIP.panelLarge,
            boxShadow: `0 0 40px ${COLORS.amberGlow}`,
          }}
        >
          {/* Corner brackets */}
          <div style={cornerBracketStyle('tl', 20)} />
          <div style={cornerBracketStyle('tr', 20)} />
          <div style={cornerBracketStyle('bl', 20)} />
          <div style={cornerBracketStyle('br', 20)} />

          {/* Label */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '24px',
              color: COLORS.textDim,
              fontSize: '10px',
              fontFamily: FONTS.mono,
              letterSpacing: '3px',
              textTransform: 'uppercase',
            }}
          >
            // UNIT PREVIEW
          </div>

          <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: 0 }}>
            <MenuCharacterPreview />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <MechButton onClick={() => setShowCustomize(true)} variant="secondary" style={{ minWidth: '140px', padding: '12px 24px' }}>
              CONFIGURE UNIT
            </MechButton>
            <MechButton onClick={openSwordSelector} variant="secondary" style={{ minWidth: '140px', padding: '12px 24px' }}>
              SELECT BLADE
            </MechButton>
          </div>
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

        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
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
  trueai: '#aa44ff',
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
                : 'rgba(255, 255, 255, 0.03)',
              border: isActive
                ? `2px solid ${color}`
                : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isActive
                ? `0 0 20px ${color}33, inset 0 0 20px ${color}08`
                : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${color}33`;
              e.currentTarget.style.borderColor = color;
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = `0 0 25px ${color}44, inset 0 0 20px ${color}08`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isActive ? `${color}22` : 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = isActive ? color : 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = isActive
                ? `0 0 20px ${color}33, inset 0 0 20px ${color}08`
                : 'none';
            }}
          >
            <span style={{
              color,
              textShadow: `0 0 10px ${color}88`,
            }}>
              {cfg.label}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#888',
                letterSpacing: '1px',
                fontFamily: 'monospace',
                fontWeight: 'normal',
                textTransform: 'none',
                fontStyle: 'italic',
              }}
            >
              {cfg.description}
            </span>
          </button>
        );
      })}

      {/* TRUE AI — special separated option */}
      <div style={{ width: '300px', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
      {(() => {
        const d: AIDifficulty = 'trueai';
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
                : 'rgba(170, 68, 255, 0.06)',
              border: isActive
                ? `2px solid ${color}`
                : '1px solid rgba(170, 68, 255, 0.25)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isActive
                ? `0 0 20px rgba(170, 68, 255, 0.3), inset 0 0 20px rgba(170, 68, 255, 0.05)`
                : '0 0 10px rgba(170, 68, 255, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${color}33`;
              e.currentTarget.style.borderColor = color;
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = `0 0 25px rgba(170, 68, 255, 0.4), inset 0 0 20px rgba(170, 68, 255, 0.08)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isActive ? `${color}22` : 'rgba(170, 68, 255, 0.06)';
              e.currentTarget.style.borderColor = isActive ? color : 'rgba(170, 68, 255, 0.25)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = isActive
                ? `0 0 20px rgba(170, 68, 255, 0.3), inset 0 0 20px rgba(170, 68, 255, 0.05)`
                : '0 0 10px rgba(170, 68, 255, 0.1)';
            }}
          >
            <span style={{
              color,
              textShadow: `0 0 10px rgba(170, 68, 255, 0.6)`,
            }}>
              {cfg.label}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#aa88cc',
                letterSpacing: '1px',
                fontFamily: 'monospace',
                fontWeight: 'normal',
                textTransform: 'none',
                fontStyle: 'italic',
              }}
            >
              {cfg.description}
            </span>
          </button>
        );
      })()}

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

// ---------------------------------------------------------------------------
// MechButton — shared button component with military mech styling
// ---------------------------------------------------------------------------

export function MechButton({
  onClick,
  children,
  variant = 'default',
  disabled,
  style: extraStyle,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'default' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const getBg = () => {
    if (disabled) return COLORS.bgSurface;
    switch (variant) {
      case 'primary': return `linear-gradient(180deg, ${COLORS.amber}, #cc6600)`;
      case 'danger': return `linear-gradient(180deg, ${COLORS.red}, #880000)`;
      case 'secondary': return 'rgba(255, 140, 0, 0.06)';
      default: return 'rgba(255, 140, 0, 0.08)';
    }
  };

  const getBorder = () => {
    if (disabled) return `1px solid ${COLORS.borderFaint}`;
    switch (variant) {
      case 'primary': return `2px solid ${COLORS.amberBright}`;
      case 'danger': return `1px solid ${COLORS.red}`;
      case 'secondary': return `1px solid ${COLORS.borderDefault}`;
      default: return `1px solid ${COLORS.borderDefault}`;
    }
  };

  const getColor = () => {
    if (disabled) return COLORS.textDim;
    switch (variant) {
      case 'primary': return '#000000';
      case 'danger': return '#ff8888';
      default: return COLORS.textPrimary;
    }
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        padding: '12px 48px',
        fontSize: '16px',
        fontWeight: '600',
        fontFamily: FONTS.heading,
        textTransform: 'uppercase',
        letterSpacing: '4px',
        color: getColor(),
        background: getBg(),
        border: getBorder(),
        clipPath: CLIP.button,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        minWidth: '260px',
        opacity: disabled ? 0.4 : 1,
        boxShadow: variant === 'primary' ? `0 0 20px rgba(255, 140, 0, 0.3)` : 'none',
        ...extraStyle,
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
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = `0 0 24px ${COLORS.amberGlow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = variant === 'primary' ? `0 0 20px rgba(255, 140, 0, 0.3)` : 'none';
      }}
    >
      {children}
    </button>
  );
}
