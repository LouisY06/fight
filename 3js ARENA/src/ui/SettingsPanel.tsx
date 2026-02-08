// =============================================================================
// SettingsPanel.tsx — Centralized settings panel (Audio, Controls, Display)
// =============================================================================

import { useState, useEffect } from 'react';
import { useSettingsStore } from '../game/SettingsStore';
import { COLORS, FONTS, CLIP, PANEL_STYLE, LABEL_STYLE } from './theme';

type Tab = 'audio' | 'controls' | 'display';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('audio');
  const settings = useSettingsStore();

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
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 400,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          ...PANEL_STYLE,
          padding: '28px 32px',
          minWidth: 420,
          maxWidth: 500,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2
            style={{
              color: COLORS.textPrimary,
              fontSize: '22px',
              fontFamily: FONTS.heading,
              textTransform: 'uppercase',
              letterSpacing: '4px',
            }}
          >
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.textDim,
              fontSize: '22px',
              cursor: 'pointer',
              padding: '4px 8px',
              fontFamily: FONTS.mono,
            }}
          >
            [X]
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {(['audio', 'controls', 'display'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '12px',
                fontFamily: FONTS.mono,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: tab === t ? COLORS.amber : COLORS.textDim,
                background: tab === t ? 'rgba(255, 140, 0, 0.1)' : 'transparent',
                border: tab === t ? `1px solid ${COLORS.borderActive}` : `1px solid ${COLORS.borderFaint}`,
                clipPath: CLIP.button,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'audio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SliderSetting
              label="MASTER VOLUME"
              value={settings.masterVolume}
              onChange={settings.setMasterVolume}
              min={0} max={1} step={0.05}
              display={`${Math.round(settings.masterVolume * 100)}%`}
            />
            <SliderSetting
              label="SFX VOLUME"
              value={settings.sfxVolume}
              onChange={settings.setSfxVolume}
              min={0} max={1} step={0.05}
              display={`${Math.round(settings.sfxVolume * 100)}%`}
            />
            <ToggleSetting
              label="AI COMMENTARY"
              value={settings.commentaryEnabled}
              onChange={settings.setCommentaryEnabled}
            />
          </div>
        )}

        {tab === 'controls' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SliderSetting
              label="HEAD SENSITIVITY"
              value={settings.headSensitivity}
              onChange={settings.setHeadSensitivity}
              min={0.3} max={2.5} step={0.1}
              display={`${Math.round(settings.headSensitivity * 100)}%`}
            />
            <SliderSetting
              label="MOUSE SENSITIVITY"
              value={settings.mouseSensitivity}
              onChange={settings.setMouseSensitivity}
              min={0.3} max={3.0} step={0.1}
              display={`${Math.round(settings.mouseSensitivity * 100)}%`}
            />
            <ToggleSetting
              label="INVERT Y AXIS"
              value={settings.invertY}
              onChange={settings.setInvertY}
            />
          </div>
        )}

        {tab === 'display' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SliderSetting
              label="SCREEN SHAKE"
              value={settings.screenShakeIntensity}
              onChange={settings.setScreenShakeIntensity}
              min={0} max={1} step={0.1}
              display={`${Math.round(settings.screenShakeIntensity * 100)}%`}
            />
            <ToggleSetting
              label="DAMAGE NUMBERS"
              value={settings.damageNumbersEnabled}
              onChange={settings.setDamageNumbersEnabled}
            />
            <ToggleSetting
              label="POST-PROCESSING"
              value={settings.postProcessingEnabled}
              onChange={settings.setPostProcessingEnabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slider setting row
// ---------------------------------------------------------------------------
function SliderSetting({
  label, value, onChange, min, max, step, display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={LABEL_STYLE}>{label}</span>
        <span style={{ ...LABEL_STYLE, color: COLORS.amber }}>{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', cursor: 'pointer' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle setting row
// ---------------------------------------------------------------------------
function ToggleSetting({
  label, value, onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '6px 0',
      }}
      onClick={() => onChange(!value)}
    >
      <span style={LABEL_STYLE}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...LABEL_STYLE, color: value ? COLORS.green : COLORS.textDim, fontSize: '10px' }}>
          {value ? 'ON' : 'OFF'}
        </span>
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: value ? COLORS.green : COLORS.red,
            boxShadow: value ? `0 0 6px ${COLORS.green}` : `0 0 6px ${COLORS.red}`,
            transition: 'all 0.2s ease',
          }}
        />
      </div>
    </div>
  );
}
