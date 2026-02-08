// =============================================================================
// WebcamView.tsx — Small PiP webcam feed + calibrate button
// Press C to calibrate (resets head tracking center + faces opponent).
// =============================================================================

import { useEffect, useRef } from 'react';
import { useCVContext } from './CVProvider';
import { useGameStore } from '../game/GameState';

const PIP_WIDTH = 200;
const PIP_HEIGHT = 150;

export function WebcamView() {
  const { cvEnabled, isTracking, videoElement, calibrate } = useCVContext();
  const phase = useGameStore((s) => s.phase);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pipe the tracker's stream into our visible <video>
  // Include `phase` so the effect re-runs when the <video> first mounts
  // (CV may start in the menu before the PiP element exists).
  useEffect(() => {
    if (!videoRef.current || !videoElement?.srcObject) return;
    videoRef.current.srcObject = videoElement.srcObject;
    videoRef.current.play().catch(() => {});
  }, [videoElement, isTracking, phase]);

  // Keyboard shortcut: C to calibrate
  useEffect(() => {
    if (!cvEnabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyC' && !e.repeat) {
        calibrate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cvEnabled, calibrate]);

  const inGame =
    phase === 'playing' ||
    phase === 'countdown' ||
    phase === 'paused' ||
    phase === 'roundEnd' ||
    phase === 'gameOver';

  if (!cvEnabled || !inGame) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        width: `${PIP_WIDTH}px`,
        zIndex: 300,
        pointerEvents: 'auto',
      }}
    >
      {/* Webcam feed */}
      <div
        style={{
          width: `${PIP_WIDTH}px`,
          height: `${PIP_HEIGHT}px`,
          borderRadius: '8px',
          overflow: 'hidden',
          border: isTracking
            ? '2px solid rgba(68, 204, 102, 0.6)'
            : '2px solid rgba(204, 68, 68, 0.6)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            borderRadius: '8px',
            background: '#111',
          }}
        />

        {/* Status overlay */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '6px',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: isTracking ? '#44cc66' : '#cc4444',
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
          }}
        >
          {isTracking ? 'TRACKING' : 'NO POSE'}
        </div>
      </div>

      {/* Calibrate button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          calibrate();
        }}
        style={{
          display: 'block',
          width: '100%',
          marginTop: '6px',
          padding: '8px 0',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: "'Impact', 'Arial Black', monospace",
          letterSpacing: '2px',
          textTransform: 'uppercase',
          background: 'rgba(0, 255, 255, 0.15)',
          color: '#0ff',
          border: '1px solid rgba(0, 255, 255, 0.4)',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 255, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 255, 255, 0.15)';
        }}
      >
        CALIBRATE [C]
      </button>
    </div>
  );
}
