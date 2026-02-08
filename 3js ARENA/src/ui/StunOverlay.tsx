// =============================================================================
// StunOverlay.tsx — "IMPACT LOCK" overlay when swords collide
// Military mech aesthetic
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { onClashEvent, STUN_DURATION_MS } from '../combat/ClashEvent';
import { COLORS, FONTS } from './theme';

export function StunOverlay() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'flash' | 'hold' | 'fade'>('flash');

  const triggerClash = useCallback(() => {
    setVisible(true);
    setPhase('flash');

    setTimeout(() => setPhase('hold'), 150);
    setTimeout(() => setPhase('fade'), STUN_DURATION_MS - 300);
    setTimeout(() => setVisible(false), STUN_DURATION_MS + 200);
  }, []);

  useEffect(() => {
    const unsub = onClashEvent(() => triggerClash());
    return unsub;
  }, [triggerClash]);

  if (!visible) return null;

  const opacity =
    phase === 'flash' ? 1 :
    phase === 'hold' ? 0.95 :
    0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Flash overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: phase === 'flash'
            ? 'radial-gradient(ellipse at center, rgba(255,140,0,0.2) 0%, rgba(255,100,0,0.06) 50%, transparent 80%)'
            : 'transparent',
          transition: 'background 0.2s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Warning stripe bands top/bottom */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: `repeating-linear-gradient(-45deg, ${COLORS.amber}, ${COLORS.amber} 4px, transparent 4px, transparent 8px)`,
          opacity: phase === 'fade' ? 0 : 0.5,
          transition: 'opacity 0.3s ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: `repeating-linear-gradient(-45deg, ${COLORS.amber}, ${COLORS.amber} 4px, transparent 4px, transparent 8px)`,
          opacity: phase === 'fade' ? 0 : 0.5,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Stun border glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow:
            phase !== 'fade'
              ? `inset 0 0 40px ${COLORS.amberGlow}, inset 0 0 80px rgba(255, 100, 0, 0.05)`
              : 'inset 0 0 0px transparent',
          transition: 'box-shadow 0.3s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Main text */}
      <div
        style={{
          opacity,
          transition: phase === 'fade' ? 'opacity 0.5s ease-out' : 'opacity 0.1s ease-in',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <div
          style={{
            fontSize: '32px',
            fontWeight: 700,
            fontFamily: FONTS.heading,
            color: COLORS.amber,
            textShadow: `0 0 20px ${COLORS.amberGlow}, 0 0 40px rgba(255, 100, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.8)`,
            letterSpacing: '8px',
            textTransform: 'uppercase',
            animation: phase === 'flash' ? 'clashTextPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          }}
        >
          IMPACT LOCK
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: FONTS.mono,
            color: COLORS.textDim,
            letterSpacing: '4px',
            textTransform: 'uppercase',
            opacity: phase === 'fade' ? 0 : 0.7,
            transition: 'opacity 0.3s ease-out',
          }}
        >
          SYSTEMS LOCKED
        </div>
      </div>

      <style>{`
        @keyframes clashTextPop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1.0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
