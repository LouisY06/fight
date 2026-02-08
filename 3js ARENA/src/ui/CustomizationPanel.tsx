// =============================================================================
// CustomizationPanel.tsx — Color + segment size sliders + avatar type for mech customization
// =============================================================================

import { useMechaCustomizationStore } from '../game/MechaCustomizationStore';
import { MECH_PACK_COUNT } from '../riggedMechs/riggedMechPackConstants';

const PRESET_COLORS = [
  '#CC00FF', '#ff4488', '#00ffcc', '#ffcc00', '#ff6600',
  '#00aaff', '#aa00ff', '#00ff66', '#ff0066', '#0066ff',
];

export function CustomizationPanel({
  onClose,
}: {
  onClose: () => void;
}) {
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
  } = useMechaCustomizationStore();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
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
          background: 'linear-gradient(180deg, #1a0a2e 0%, #0d0515 100%)',
          border: '1px solid rgba(255, 68, 136, 0.3)',
          borderRadius: '12px',
          padding: '28px 32px',
          minWidth: 360,
          maxWidth: 420,
          boxShadow: '0 0 60px rgba(255,0,100,0.15), 0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
              color: '#fff',
              fontSize: '22px',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '4px',
            }}
          >
            Customize Mech
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Avatar type: Classic mech vs Rigged mechs pack */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              color: '#aaa',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '10px',
            }}
          >
            Avatar
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setAvatarType('classic')}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontFamily: "'Impact', 'Arial Black', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: avatarType === 'classic' ? '#fff' : '#888',
                background: avatarType === 'classic' ? 'rgba(255,68,136,0.35)' : 'rgba(255,255,255,0.06)',
                border: avatarType === 'classic' ? '2px solid #ff4488' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Classic Mech
            </button>
            <button
              onClick={() => setAvatarType('riggedPack')}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontFamily: "'Impact', 'Arial Black', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: avatarType === 'riggedPack' ? '#fff' : '#888',
                background: avatarType === 'riggedPack' ? 'rgba(255,68,136,0.35)' : 'rgba(255,255,255,0.06)',
                border: avatarType === 'riggedPack' ? '2px solid #ff4488' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Rigged Mechs Pack
            </button>
          </div>
          {avatarType === 'riggedPack' && MECH_PACK_COUNT > 0 && (
            <div style={{ marginTop: '12px' }}>
              <label
                style={{
                  display: 'block',
                  color: '#888',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: '8px',
                }}
              >
                Choose your mech
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Array.from({ length: MECH_PACK_COUNT }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPlayerMechId(i)}
                    style={{
                      minWidth: 44,
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: selectedPlayerMechId === i ? '#fff' : '#aaa',
                      background: selectedPlayerMechId === i ? accentColor : 'rgba(255,255,255,0.08)',
                      border: selectedPlayerMechId === i ? `2px solid ${accentColor}` : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Accent color */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              color: '#aaa',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '10px',
            }}
          >
            Accent Color
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setAccentColor(c)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: c,
                  border: accentColor === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  boxShadow: accentColor === c ? `0 0 20px ${c}` : 'none',
                }}
              />
            ))}
            <label style={{ cursor: 'pointer' }}>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
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
          <label
            style={{
              display: 'block',
              color: '#aaa',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '14px',
            }}
          >
            Segment Size
          </label>
          {(['head', 'torso', 'arms', 'legs'] as const).map((seg) => (
            <div key={seg} style={{ marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: '#ccc', fontSize: '14px', textTransform: 'capitalize' }}>
                  {seg}
                </span>
                <span style={{ color: '#ff4488', fontFamily: 'monospace', fontSize: '13px' }}>
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
                style={{
                  width: '100%',
                  height: 6,
                  accentColor: accentColor,
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={resetScales}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#888',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Reset Sizes
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#fff',
              background: `linear-gradient(180deg, ${accentColor}, #880044)`,
              border: `1px solid ${accentColor}`,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
