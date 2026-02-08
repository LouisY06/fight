// =============================================================================
// theme.ts — Armored Core / Military Mech design system
// =============================================================================

import React from 'react';

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------
export const COLORS = {
  // Backgrounds
  bgDeep: '#0a0c10',
  bgDark: '#0d0f13',
  bgSurface: '#1a1d23',
  bgSurfaceLight: '#22262e',
  bgPanel: 'rgba(13, 15, 19, 0.92)',

  // Accent / warnings
  amber: '#ff8c00',
  amberDim: 'rgba(255, 140, 0, 0.3)',
  amberGlow: 'rgba(255, 140, 0, 0.15)',
  amberBright: '#ffaa33',

  // Status
  green: '#00cc66',
  greenDim: 'rgba(0, 204, 102, 0.3)',
  red: '#cc2222',
  redBright: '#ff3333',
  redDim: 'rgba(204, 34, 34, 0.3)',

  // Steel / blue
  steel: '#4a8fbf',
  steelDim: 'rgba(74, 143, 191, 0.3)',
  steelBright: '#6ab0e0',

  // Text
  textPrimary: '#e8e8e8',
  textSecondary: '#999999',
  textDim: '#555555',
  textAmber: '#ff8c00',

  // Borders
  borderDefault: 'rgba(255, 140, 0, 0.2)',
  borderActive: 'rgba(255, 140, 0, 0.5)',
  borderFaint: 'rgba(255, 255, 255, 0.08)',
  borderSteel: 'rgba(74, 143, 191, 0.3)',
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
export const FONTS = {
  heading: "'Rajdhani', 'Share Tech Mono', 'Impact', sans-serif",
  mono: "'Share Tech Mono', 'Courier New', monospace",
  body: "'Rajdhani', system-ui, sans-serif",
} as const;

// ---------------------------------------------------------------------------
// Clip paths
// ---------------------------------------------------------------------------
export const CLIP = {
  panel: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
  panelLarge: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
  button: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
  healthLeft: 'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
  healthRight: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%)',
} as const;

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
export const PANEL_STYLE: React.CSSProperties = {
  background: `linear-gradient(180deg, ${COLORS.bgSurface} 0%, ${COLORS.bgDark} 100%)`,
  border: `1px solid ${COLORS.borderDefault}`,
  clipPath: CLIP.panel,
  boxShadow: `0 0 30px ${COLORS.amberGlow}, inset 0 1px 0 rgba(255,255,255,0.03)`,
};

export const LABEL_STYLE: React.CSSProperties = {
  color: COLORS.textSecondary,
  fontSize: '11px',
  fontFamily: FONTS.mono,
  textTransform: 'uppercase',
  letterSpacing: '2px',
};

export const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '16px',
  fontFamily: FONTS.mono,
  textTransform: 'uppercase',
  letterSpacing: '2px',
  textAlign: 'center',
  color: COLORS.textPrimary,
  background: 'rgba(255, 140, 0, 0.04)',
  border: `1px solid ${COLORS.borderDefault}`,
  clipPath: CLIP.button,
  outline: 'none',
  caretColor: COLORS.amber,
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

// ---------------------------------------------------------------------------
// Corner bracket accents (for overlaying on panels)
// ---------------------------------------------------------------------------
export function cornerBracketStyle(
  corner: 'tl' | 'tr' | 'bl' | 'br',
  size = 16,
  color = COLORS.amber,
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    pointerEvents: 'none',
  };
  const borderWidth = '2px';
  switch (corner) {
    case 'tl':
      return { ...base, top: 0, left: 0, borderTop: `${borderWidth} solid ${color}`, borderLeft: `${borderWidth} solid ${color}` };
    case 'tr':
      return { ...base, top: 0, right: 0, borderTop: `${borderWidth} solid ${color}`, borderRight: `${borderWidth} solid ${color}` };
    case 'bl':
      return { ...base, bottom: 0, left: 0, borderBottom: `${borderWidth} solid ${color}`, borderLeft: `${borderWidth} solid ${color}` };
    case 'br':
      return { ...base, bottom: 0, right: 0, borderBottom: `${borderWidth} solid ${color}`, borderRight: `${borderWidth} solid ${color}` };
  }
}
