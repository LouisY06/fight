// =============================================================================
// CockpitOverlay.tsx — CSS cockpit frame overlay for mech first-person view
// Thick angular visor frame, scan lines, side instrument panels, bottom dashboard
// Matches gunmetal + orange energy accent aesthetic from MechaGeometry
// =============================================================================

import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../game/GameState';
import { COLORS, FONTS } from './theme';

// Colors matching MechaGeometry palette
const COCKPIT = {
  frame: '#1a1d23',
  frameDark: '#0a0c10',
  frameEdge: '#2a2d33',
  metalLight: '#4a4e55',
  panelBg: 'rgba(10, 12, 16, 0.85)',
  accentOrange: '#ff6600',
  accentGlow: 'rgba(255, 102, 0, 0.4)',
  accentDim: 'rgba(255, 102, 0, 0.12)',
  scanLine: 'rgba(255, 140, 0, 0.03)',
  visorTint: 'rgba(255, 102, 0, 0.02)',
  textDim: '#555',
  textGlow: '#ff8c00',
  chrome: '#8a8d94',
} as const;

export function CockpitOverlay() {
  const phase = useGameStore((s) => s.phase);
  const p1Health = useGameStore((s) => s.player1.health);
  const [bootPhase, setBootPhase] = useState(0);
  const frameTime = useRef(0);

  const showCockpit =
    phase === 'playing' ||
    phase === 'countdown' ||
    phase === 'paused' ||
    phase === 'roundEnd';

  // Boot-up animation when cockpit first appears
  useEffect(() => {
    if (showCockpit && bootPhase === 0) {
      setBootPhase(1);
      const t1 = setTimeout(() => setBootPhase(2), 300);
      const t2 = setTimeout(() => setBootPhase(3), 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (!showCockpit) setBootPhase(0);
  }, [showCockpit]);

  if (!showCockpit) return null;

  const opacity = bootPhase >= 2 ? 1 : bootPhase === 1 ? 0.5 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
        opacity,
        transition: 'opacity 0.6s ease-out',
      }}
    >
      {/* ---- Visor glass tint + vignette ---- */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0.7) 100%),
            linear-gradient(180deg, ${COCKPIT.visorTint} 0%, transparent 20%, transparent 80%, ${COCKPIT.visorTint} 100%)
          `,
        }}
      />

      {/* ---- Scan lines ---- */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            ${COCKPIT.scanLine} 2px,
            ${COCKPIT.scanLine} 4px
          )`,
          opacity: 0.5,
        }}
      />

      {/* ---- Top cockpit frame ---- */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '28px',
          background: `linear-gradient(180deg, ${COCKPIT.frameDark} 0%, ${COCKPIT.frame} 60%, transparent 100%)`,
          borderBottom: `1px solid ${COCKPIT.accentDim}`,
        }}
      >
        {/* Top frame rivets */}
        <div style={{ position: 'absolute', top: '8px', left: '15%', width: '4px', height: '4px', borderRadius: '50%', background: COCKPIT.chrome, boxShadow: `0 0 3px ${COCKPIT.chrome}` }} />
        <div style={{ position: 'absolute', top: '8px', right: '15%', width: '4px', height: '4px', borderRadius: '50%', background: COCKPIT.chrome, boxShadow: `0 0 3px ${COCKPIT.chrome}` }} />
        <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: COCKPIT.accentOrange, boxShadow: `0 0 6px ${COCKPIT.accentGlow}` }} />
      </div>

      {/* ---- Left cockpit frame ---- */}
      <CockpitFrameSide side="left" health={p1Health} bootPhase={bootPhase} />

      {/* ---- Right cockpit frame ---- */}
      <CockpitFrameSide side="right" health={p1Health} bootPhase={bootPhase} />

      {/* ---- Bottom cockpit dashboard ---- */}
      <CockpitDashboard bootPhase={bootPhase} />

      {/* ---- Corner brackets (structural bolts) ---- */}
      <CornerBracket corner="tl" />
      <CornerBracket corner="tr" />
      <CornerBracket corner="bl" />
      <CornerBracket corner="br" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side frame panels — instrument clusters
// ---------------------------------------------------------------------------

function CockpitFrameSide({ side, health, bootPhase }: { side: 'left' | 'right'; health: number; bootPhase: number }) {
  const isLeft = side === 'left';

  return (
    <div
      style={{
        position: 'absolute',
        top: '28px',
        bottom: '80px',
        [side]: 0,
        width: '52px',
        background: `linear-gradient(${isLeft ? '90deg' : '270deg'}, ${COCKPIT.frameDark} 0%, ${COCKPIT.frame} 70%, transparent 100%)`,
        borderRight: isLeft ? `1px solid ${COCKPIT.accentDim}` : 'none',
        borderLeft: !isLeft ? `1px solid ${COCKPIT.accentDim}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '40px',
        gap: '8px',
      }}
    >
      {/* Orange accent strip */}
      <div
        style={{
          position: 'absolute',
          top: '30px',
          [isLeft ? 'right' : 'left']: '8px',
          width: '2px',
          height: '120px',
          background: `linear-gradient(180deg, ${COCKPIT.accentOrange}, transparent)`,
          opacity: 0.6,
          boxShadow: `0 0 4px ${COCKPIT.accentGlow}`,
        }}
      />

      {/* Vent slits */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: '18px',
            height: '2px',
            background: i < 3 ? COCKPIT.accentOrange : COCKPIT.frameEdge,
            opacity: i < 3 ? 0.5 : 0.3,
            boxShadow: i < 3 ? `0 0 4px ${COCKPIT.accentGlow}` : 'none',
            marginTop: i === 0 ? '60px' : '6px',
          }}
        />
      ))}

      {/* Side label */}
      <div
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontFamily: FONTS.mono,
          fontSize: '8px',
          letterSpacing: '3px',
          color: COCKPIT.textDim,
          marginTop: '16px',
          opacity: bootPhase >= 3 ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        {isLeft ? 'L-FRAME' : 'R-FRAME'}
      </div>

      {/* Chrome bolts */}
      <div style={{ position: 'absolute', bottom: '40px', width: '6px', height: '6px', borderRadius: '50%', background: COCKPIT.chrome, boxShadow: `inset 0 1px 2px rgba(0,0,0,0.5)` }} />
      <div style={{ position: 'absolute', bottom: '120px', width: '6px', height: '6px', borderRadius: '50%', background: COCKPIT.chrome, boxShadow: `inset 0 1px 2px rgba(0,0,0,0.5)` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bottom dashboard — system status bar
// ---------------------------------------------------------------------------

function CockpitDashboard({ bootPhase }: { bootPhase: number }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const visible = bootPhase >= 3;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: `linear-gradient(0deg, ${COCKPIT.frameDark} 0%, ${COCKPIT.frame} 60%, transparent 100%)`,
        borderTop: `1px solid ${COCKPIT.accentDim}`,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '0 60px 10px',
      }}
    >
      {/* Left instrument cluster */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      >
        <DashLabel label="SYS" value="ONLINE" color={COCKPIT.accentOrange} />
        <DashLabel label="THRM" value={`${42 + (tick % 8)}°C`} color={COCKPIT.chrome} />
        <DashLabel label="PWR" value="98%" color={COCKPIT.accentOrange} />
      </div>

      {/* Center — angular cockpit rim decoration */}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${COCKPIT.accentDim}, ${COCKPIT.accentOrange}40, ${COCKPIT.accentDim}, transparent)`,
        }}
      />

      {/* Right instrument cluster */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      >
        <DashLabel label="HDG" value={`${(tick * 3) % 360}°`} color={COCKPIT.chrome} />
        <DashLabel label="ALT" value="1.7M" color={COCKPIT.chrome} />
        <DashLabel label="RCT" value="ACTV" color={COCKPIT.accentOrange} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard label (tiny instrument readout)
// ---------------------------------------------------------------------------

function DashLabel({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: '7px',
          letterSpacing: '1px',
          color: COCKPIT.textDim,
          marginBottom: '1px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: '10px',
          letterSpacing: '1px',
          color,
          textShadow: color === COCKPIT.accentOrange ? `0 0 6px ${COCKPIT.accentGlow}` : 'none',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Corner brackets — structural accent corners
// ---------------------------------------------------------------------------

function CornerBracket({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const size = 32;
  const thickness = 3;
  const color = COCKPIT.frameEdge;
  const glowColor = COCKPIT.accentDim;

  const isTop = corner === 'tl' || corner === 'tr';
  const isLeft = corner === 'tl' || corner === 'bl';

  return (
    <div
      style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        top: isTop ? '4px' : undefined,
        bottom: !isTop ? '4px' : undefined,
        left: isLeft ? '4px' : undefined,
        right: !isLeft ? '4px' : undefined,
      }}
    >
      {/* Horizontal bar */}
      <div
        style={{
          position: 'absolute',
          [isTop ? 'top' : 'bottom']: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: `${size}px`,
          height: `${thickness}px`,
          background: color,
          boxShadow: `0 0 4px ${glowColor}`,
        }}
      />
      {/* Vertical bar */}
      <div
        style={{
          position: 'absolute',
          [isTop ? 'top' : 'bottom']: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: `${thickness}px`,
          height: `${size}px`,
          background: color,
          boxShadow: `0 0 4px ${glowColor}`,
        }}
      />
      {/* Corner rivet */}
      <div
        style={{
          position: 'absolute',
          [isTop ? 'top' : 'bottom']: `${thickness + 2}px`,
          [isLeft ? 'left' : 'right']: `${thickness + 2}px`,
          width: '3px',
          height: '3px',
          borderRadius: '50%',
          background: COCKPIT.accentOrange,
          boxShadow: `0 0 4px ${COCKPIT.accentGlow}`,
        }}
      />
    </div>
  );
}
