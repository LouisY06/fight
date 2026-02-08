// =============================================================================
// StunOverlay.tsx — Full-screen "SWORD CLASH!" text when swords collide
// Modern UI: Orbitron font, subtle flash + electric border
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { onClashEvent, STUN_DURATION_MS } from '../combat/ClashEvent';

const FONT_HEADING = "'Orbitron', 'Rajdhani', sans-serif";

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
            ? 'radial-gradient(ellipse at center, rgba(255,200,50,0.25) 0%, rgba(255,100,0,0.08) 50%, transparent 80%)'
            : 'transparent',
          transition: 'background 0.2s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Stun border glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow:
            phase !== 'fade'
              ? 'inset 0 0 60px rgba(255, 170, 0, 0.3), inset 0 0 120px rgba(255, 100, 0, 0.1)'
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
          gap: '8px',
        }}
      >
        <div
          style={{
            fontSize: '42px',
            fontWeight: 900,
            fontFamily: FONT_HEADING,
            color: '#ffcc00',
            textShadow:
              '0 0 20px rgba(255, 200, 0, 0.8), 0 0 60px rgba(255, 100, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.8)',
            letterSpacing: '8px',
            textTransform: 'uppercase',
            animation: phase === 'flash' ? 'clashTextPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          }}
        >
          SWORD CLASH
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: FONT_HEADING,
            color: 'rgba(255, 150, 0, 0.7)',
            textShadow: '0 0 12px rgba(255, 100, 0, 0.6)',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            opacity: phase === 'fade' ? 0 : 0.9,
            transition: 'opacity 0.3s ease-out',
          }}
        >
          BOTH STUNNED
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
