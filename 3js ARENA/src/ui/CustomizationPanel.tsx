// =============================================================================
// CustomizationPanel.tsx — Mech customization with military aesthetic
// =============================================================================

import { useEffect } from 'react';
import { useMechaCustomizationStore } from '../game/MechaCustomizationStore';
import { MECH_PACK_COUNT } from '../riggedMechs/riggedMechPackConstants';
import { COLORS, FONTS, CLIP, PANEL_STYLE, LABEL_STYLE } from './theme';

const PRESET_COLORS = [
  '#ff8c00', '#cc2222', '#00cc66', '#4a8fbf', '#CC00FF',
  '#ff4488', '#00ffcc', '#ffcc00', '#0066ff', '#aa44ff',
];

const MECH_NAMES = ['VANGUARD', 'SENTINEL', 'ENFORCER', 'SPECTRE', 'WARDEN'];

export function CustomizationPanel({ onClose }: { onClose: () => void }) {
  const {
    accentColor,
    segmentScales,
    avatarType,
    selectedPlayerMechId,
    setAccentColor,
    setSegmentScale,
    resetScales,
    setAvatarType,
    setSelectedPlayerMechId,
    resetAll,
  } = useMechaCustomizationStore();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          ...PANEL_STYLE,
          padding: '28px 32px',
          minWidth: 380,
          maxWidth: 440,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              color: COLORS.textPrimary,
              fontSize: '20px',
              fontFamily: FONTS.heading,
              textTransform: 'uppercase',
              letterSpacing: '4px',
            }}
          >
            UNIT CONFIGURATION
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.textDim,
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              fontFamily: FONTS.mono,
            }}
          >
            [X]
          </button>
        </div>

        {/* Avatar type selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...LABEL_STYLE, display: 'block', marginBottom: '10px' }}>
            // CHASSIS TYPE
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <ChassisButton
              active={avatarType === 'classic'}
              onClick={() => setAvatarType('classic')}
              label="CLASSIC"
            />
            <ChassisButton
              active={avatarType === 'riggedPack'}
              onClick={() => setAvatarType('riggedPack')}
              label="RIGGED PACK"
            />
          </div>

          {/* Mech selection for rigged pack */}
          {avatarType === 'riggedPack' && MECH_PACK_COUNT > 0 && (
            <div style={{ marginTop: '12px' }}>
              <label style={{ ...LABEL_STYLE, display: 'block', marginBottom: '8px', fontSize: '10px' }}>
                // SELECT UNIT
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Array.from({ length: MECH_PACK_COUNT }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPlayerMechId(i)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '11px',
                      fontFamily: FONTS.mono,
                      color: selectedPlayerMechId === i ? COLORS.amber : COLORS.textDim,
                      background: selectedPlayerMechId === i ? 'rgba(255, 140, 0, 0.12)' : 'rgba(255,255,255,0.03)',
                      border: selectedPlayerMechId === i
                        ? `1px solid ${COLORS.amber}`
                        : `1px solid ${COLORS.borderFaint}`,
                      clipPath: CLIP.button,
                      cursor: 'pointer',
                      letterSpacing: '1px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {MECH_NAMES[i] || `UNIT-${String(i + 1).padStart(2, '0')}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Accent color */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...LABEL_STYLE, display: 'block', marginBottom: '10px' }}>
            // ACCENT COLOR
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {PRESET_COLORS.map((c) => {
              const isActive = accentColor === c;
              return (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    background: c,
                    border: isActive ? '2px solid #fff' : `1px solid ${COLORS.borderFaint}`,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    cursor: 'pointer',
                    boxShadow: isActive ? `0 0 16px ${c}` : 'none',
                    transition: 'all 0.15s ease',
                    padding: 0,
                  }}
                />
              );
            })}
            <label style={{ cursor: 'pointer' }}>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  background: 'transparent',
                }}
              />
            </label>
          </div>
        </div>

        {/* Segment size sliders */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...LABEL_STYLE, display: 'block', marginBottom: '12px' }}>
            // SEGMENT SCALE
          </label>
          {(['head', 'torso', 'arms', 'legs'] as const).map((seg) => (
            <div key={seg} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: COLORS.textSecondary, fontSize: '13px', fontFamily: FONTS.heading, textTransform: 'uppercase', letterSpacing: '2px' }}>
                  {seg}
                </span>
                <span style={{ color: COLORS.amber, fontFamily: FONTS.mono, fontSize: '12px' }}>
                  {(segmentScales[seg] * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={segmentScales[seg]}
                onChange={(e) => setSegmentScale(seg, parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={resetAll}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontFamily: FONTS.heading,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: COLORS.textDim,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${COLORS.borderFaint}`,
              clipPath: CLIP.button,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            RESET ALL
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontFamily: FONTS.heading,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: COLORS.bgDeep,
              background: `linear-gradient(180deg, ${COLORS.amber}, #cc6600)`,
              border: `1px solid ${COLORS.amberBright}`,
              clipPath: CLIP.button,
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}

function ChassisButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        fontSize: '12px',
        fontFamily: FONTS.heading,
        textTransform: 'uppercase',
        letterSpacing: '2px',
        color: active ? COLORS.amber : COLORS.textDim,
        background: active ? 'rgba(255, 140, 0, 0.1)' : 'rgba(255,255,255,0.03)',
        border: active ? `1px solid ${COLORS.amber}` : `1px solid ${COLORS.borderFaint}`,
        clipPath: CLIP.button,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}
