// =============================================================================
// MapSelector.tsx — Map selection UI with military aesthetic
// Practice: pick a map. Online: veto until one remains.
// =============================================================================

import { useState, useEffect } from 'react';
import { useGameStore } from '../game/GameState';
import { ARENA_THEMES, type ArenaTheme } from '../arena/arenaThemes';
import { COLORS, FONTS, CLIP, PANEL_STYLE } from './theme';
import { MechButton } from './MainMenu';

// Map theme icons/colors for visual identification
const THEME_ACCENTS: Record<string, { color: string; icon: string }> = {
  castle: { color: '#b8860b', icon: 'FORT' },
  cyberpunk: { color: '#00ccff', icon: 'NEON' },
  graveyard: { color: '#556b2f', icon: 'DEAD' },
  hangar: { color: '#708090', icon: 'DOCK' },
  medieval: { color: '#8b4513', icon: 'KEEP' },
  'space-station': { color: '#4169e1', icon: 'VOID' },
};

interface MapSelectorProps {
  mode: 'practice' | 'online';
  onSelect: (themeId: string) => void;
  onCancel: () => void;
}

export function MapSelector({ mode, onSelect, onCancel }: MapSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [vetoedMaps, setVetoedMaps] = useState<Set<string>>(new Set());

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onCancel]);

  const availableMaps = ARENA_THEMES.filter((t) => !vetoedMaps.has(t.id));

  const handleVeto = (themeId: string) => {
    const newVetoed = new Set(vetoedMaps);
    newVetoed.add(themeId);
    setVetoedMaps(newVetoed);

    const remaining = ARENA_THEMES.filter((t) => !newVetoed.has(t.id));
    if (remaining.length === 1) {
      setTimeout(() => onSelect(remaining[0].id), 500);
    }
  };

  const handleConfirm = () => {
    if (selectedTheme) {
      onSelect(selectedTheme);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 12, 16, 0.95)',
        zIndex: 300,
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          ...PANEL_STYLE,
          padding: '32px',
          overflowY: 'auto',
        }}
      >
        {/* Title */}
        <h2
          style={{
            color: COLORS.amber,
            fontSize: '28px',
            fontWeight: '700',
            fontFamily: FONTS.heading,
            textTransform: 'uppercase',
            letterSpacing: '6px',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          {mode === 'practice' ? 'SELECT ARENA' : 'VETO MAPS'}
        </h2>

        <p
          style={{
            color: COLORS.textDim,
            fontSize: '12px',
            textAlign: 'center',
            marginBottom: '28px',
            fontFamily: FONTS.mono,
            letterSpacing: '2px',
          }}
        >
          {mode === 'practice'
            ? '// CHOOSE YOUR BATTLEFIELD'
            : `// BAN MAPS UNTIL ONE REMAINS | ${vetoedMaps.size}/${ARENA_THEMES.length - 1} VETOED`}
        </p>

        {/* Map Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          {ARENA_THEMES.map((theme) => {
            const isVetoed = vetoedMaps.has(theme.id);
            const isSelected = selectedTheme === theme.id;
            const canSelect = mode === 'practice' || !isVetoed;
            const accent = THEME_ACCENTS[theme.id] || { color: COLORS.textDim, icon: 'MAP' };

            return (
              <div
                key={theme.id}
                onClick={() => {
                  if (!canSelect) return;
                  if (mode === 'practice') {
                    setSelectedTheme(theme.id);
                  } else {
                    handleVeto(theme.id);
                  }
                }}
                style={{
                  position: 'relative',
                  background: isSelected
                    ? 'rgba(255, 140, 0, 0.08)'
                    : isVetoed
                      ? 'rgba(0, 0, 0, 0.5)'
                      : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected
                    ? `2px solid ${COLORS.amber}`
                    : isVetoed
                      ? `1px solid ${COLORS.redDim}`
                      : `1px solid ${COLORS.borderFaint}`,
                  clipPath: CLIP.button,
                  padding: '16px',
                  cursor: canSelect ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: isVetoed ? 0.35 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!canSelect) return;
                  e.currentTarget.style.borderColor = COLORS.amber;
                  e.currentTarget.style.background = 'rgba(255, 140, 0, 0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!canSelect) return;
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = COLORS.borderFaint;
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  }
                }}
              >
                {/* Theme color bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: isVetoed ? COLORS.textDim : accent.color,
                    transition: 'background 0.2s ease',
                  }}
                />

                {/* Map header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3
                    style={{
                      color: isVetoed ? COLORS.textDim : COLORS.textPrimary,
                      fontSize: '16px',
                      fontWeight: '600',
                      fontFamily: FONTS.heading,
                      textTransform: 'uppercase',
                      letterSpacing: '3px',
                    }}
                  >
                    {theme.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: FONTS.mono,
                      color: isVetoed ? COLORS.textDim : accent.color,
                      letterSpacing: '1px',
                      padding: '2px 6px',
                      border: `1px solid ${isVetoed ? COLORS.borderFaint : accent.color}33`,
                    }}
                  >
                    {accent.icon}
                  </span>
                </div>

                {/* Map details */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '11px',
                    fontFamily: FONTS.mono,
                    color: isVetoed ? COLORS.textDim : COLORS.textSecondary,
                    letterSpacing: '1px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', background: theme.ambientLight.color, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                    <span>AMB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', background: theme.particleColor, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                    <span>FX</span>
                  </div>
                  <span>SPOTS: {theme.spotLights.length}</span>
                </div>

                {/* Status badge */}
                {isVetoed && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: COLORS.red,
                      fontSize: '24px',
                      fontFamily: FONTS.heading,
                      fontWeight: 700,
                      letterSpacing: '6px',
                      opacity: 0.6,
                      textShadow: `0 0 10px ${COLORS.redDim}`,
                    }}
                  >
                    VETOED
                  </div>
                )}

                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: COLORS.amber,
                      color: COLORS.bgDeep,
                      fontSize: '9px',
                      fontWeight: 700,
                      fontFamily: FONTS.mono,
                      padding: '3px 8px',
                      clipPath: CLIP.button,
                      letterSpacing: '2px',
                    }}
                  >
                    SELECTED
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <MechButton onClick={onCancel} variant="secondary">
            CANCEL
          </MechButton>

          {mode === 'practice' && (
            <MechButton
              onClick={handleConfirm}
              variant="primary"
              disabled={!selectedTheme}
            >
              DEPLOY
            </MechButton>
          )}
        </div>

        {/* Veto instructions */}
        {mode === 'online' && availableMaps.length > 1 && (
          <p
            style={{
              marginTop: '16px',
              textAlign: 'center',
              color: COLORS.amber,
              fontSize: '11px',
              fontFamily: FONTS.mono,
              letterSpacing: '2px',
            }}
          >
            // CLICK A MAP TO VETO | LAST REMAINING IS SELECTED
          </p>
        )}
      </div>
    </div>
  );
}
