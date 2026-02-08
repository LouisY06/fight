// =============================================================================
// WebcamView.tsx — Small PiP webcam feed
// Camera is flipped 180° in FirstPersonCamera so no calibration is needed.
// =============================================================================

import { useEffect, useRef, useCallback } from 'react';
import { useCVContext } from './CVProvider';
import { useGameStore } from '../game/GameState';
import { poseTracker } from './PoseTracker';

const FONT_HEADING = "'Orbitron', 'Rajdhani', sans-serif";

const PIP_WIDTH = 160;
const PIP_HEIGHT = 120;

export function WebcamView() {
  const { cvEnabled, isTracking } = useCVContext();
  const phase = useGameStore((s) => s.phase);
  const videoRef = useRef<HTMLVideoElement>(null);

  const attachStream = useCallback(() => {
    if (!videoRef.current) return false;
    const trackerVideo = poseTracker.getVideoElement();
    const srcObj = trackerVideo?.srcObject as MediaStream | null;
    if (!srcObj || srcObj.getTracks().length === 0) return false;

    videoRef.current.srcObject = new MediaStream(srcObj.getTracks());
    videoRef.current.play().catch(() => {});
    return true;
  }, []);

  useEffect(() => {
    if (!isTracking) return;

    if (attachStream()) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (attachStream() || attempts > 10) {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isTracking, attachStream, phase]);

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
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: `${PIP_WIDTH}px`,
          height: `${PIP_HEIGHT}px`,
          borderRadius: '6px',
          overflow: 'hidden',
          border: `1px solid ${isTracking ? 'rgba(68, 204, 102, 0.3)' : 'rgba(204, 68, 68, 0.3)'}`,
          position: 'relative',
          background: '#0a0a0a',
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
            borderRadius: '6px',
          }}
        />

        {/* Status dot */}
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <div
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: isTracking ? '#44cc66' : '#cc4444',
              boxShadow: isTracking ? '0 0 4px #44cc66' : '0 0 4px #cc4444',
            }}
          />
          <span
            style={{
              fontSize: '8px',
              fontFamily: FONT_HEADING,
              fontWeight: 600,
              color: isTracking ? 'rgba(68,204,102,0.7)' : 'rgba(204,68,68,0.7)',
              letterSpacing: '1px',
            }}
          >
            {isTracking ? 'CV' : 'NO POSE'}
          </span>
        </div>
      </div>
    </div>
  );
}
