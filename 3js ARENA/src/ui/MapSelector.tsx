// =============================================================================
// MapSelector.tsx — Map selection UI (practice: pick, online: veto)
// =============================================================================

import { useState } from 'react';
import { useGameStore } from '../game/GameState';
import { ARENA_THEMES, type ArenaTheme } from '../arena/arenaThemes';

interface MapSelectorProps {
  mode: 'practice' | 'online';
  onSelect: (themeId: string) => void;
  onCancel: () => void;
}

export function MapSelector({ mode, onSelect, onCancel }: MapSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [vetoedMaps, setVetoedMaps] = useState<Set<string>>(new Set());

  const availableMaps = ARENA_THEMES.filter((t) => !vetoedMaps.has(t.id));

  const handleVeto = (themeId: string) => {
    const newVetoed = new Set(vetoedMaps);
    newVetoed.add(themeId);
    setVetoedMaps(newVetoed);

    // If only one map remains, auto-select it
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
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 300,
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          background: 'rgba(20, 0, 40, 0.95)',
          border: '2px solid rgba(255, 68, 136, 0.3)',
          borderRadius: '12px',
          padding: '32px',
          overflowY: 'auto',
        }}
      >
        {/* Title */}
        <h2
          style={{
            color: '#ff4488',
            fontSize: '32px',
            fontWeight: 'bold',
            fontFamily: "'Impact', 'Arial Black', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '4px',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          {mode === 'practice' ? 'SELECT ARENA' : 'VETO MAPS'}
        </h2>

        <p
          style={{
            color: '#888',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '32px',
            fontFamily: 'monospace',
          }}
        >
          {mode === 'practice'
            ? 'Choose your battlefield'
            : `Ban maps until one remains • ${vetoedMaps.size}/${ARENA_THEMES.length - 1} vetoed`}
        </p>

        {/* Map Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {ARENA_THEMES.map((theme) => {
            const isVetoed = vetoedMaps.has(theme.id);
            const isSelected = selectedTheme === theme.id;
            const canSelect = mode === 'practice' || !isVetoed;

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
                    ? 'rgba(255, 68, 136, 0.2)'
                    : isVetoed
                      ? 'rgba(0, 0, 0, 0.6)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected
                    ? '2px solid #ff4488'
                    : isVetoed
                      ? '2px solid #660000'
                      : '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: canSelect ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: isVetoed ? 0.4 : 1,
                  filter: isVetoed ? 'grayscale(100%)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!canSelect) return;
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.borderColor = '#ff4488';
                }}
                onMouseLeave={(e) => {
                  if (!canSelect) return;
                  e.currentTarget.style.transform = 'scale(1)';
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                {/* Map name */}
                <h3
                  style={{
                    color: isVetoed ? '#666' : '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    fontFamily: "'Impact', 'Arial Black', sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    marginBottom: '8px',
                  }}
                >
                  {theme.name}
                </h3>

                {/* Map details */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: isVetoed ? '#444' : '#888',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: theme.ambientLight.color,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                      }}
                    />
                    <span>Ambient: {theme.ambientLight.color}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: theme.particleColor,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                      }}
                    />
                    <span>Accent: {theme.particleColor}</span>
                  </div>
                  <div>Lights: {theme.spotLights.length}</div>
                </div>

                {/* Status overlay */}
                {isVetoed && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#660000',
                      color: '#ff4444',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
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
                      background: '#ff4488',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
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
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 'bold',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#ffffff',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Cancel
          </button>

          {mode === 'practice' && (
            <button
              onClick={handleConfirm}
              disabled={!selectedTheme}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 'bold',
                fontFamily: "'Impact', 'Arial Black', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: '#ffffff',
                background: selectedTheme
                  ? 'linear-gradient(180deg, #ff2266, #cc0044)'
                  : '#333',
                border: selectedTheme ? '2px solid #ff4488' : '1px solid #444',
                borderRadius: '4px',
                cursor: selectedTheme ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: selectedTheme ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (selectedTheme) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Start Fight
            </button>
          )}
        </div>

        {/* Online mode: show remaining time/status */}
        {mode === 'online' && availableMaps.length > 1 && (
          <p
            style={{
              marginTop: '16px',
              textAlign: 'center',
              color: '#ff4488',
              fontSize: '14px',
              fontFamily: 'monospace',
            }}
          >
            Click a map to veto • Last map remaining will be selected
          </p>
        )}
      </div>
    </div>
  );
}
