// =============================================================================
// CVSync.tsx — Bridge component: runs pose detection inside R3F's useFrame
// This is what makes tracking smooth — detection + processing happen in the
// same frame as rendering, just like the Mecha-Mime friend system.
// Must be placed inside the <Canvas>.
// =============================================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { cvBridge } from './cvBridge';
import { poseTracker } from './PoseTracker';
import { detectRedStick } from './RedStickTracker';

/**
 * Synchronous CV detection bridge.
 * Throttled to ~20fps (every ~50ms) to reduce MediaPipe overhead.
 * Pose data is written to refs — no React state, no re-renders.
 */
const CV_INTERVAL_MS = 50; // ~20fps for pose detection (was 60fps)

export function CVSync() {
  const lastDetectTime = useRef(0);

  useFrame(() => {
    if (!cvBridge.cvEnabled || !cvBridge.mapperRef) return;

    const now = performance.now();
    if (now - lastDetectTime.current < CV_INTERVAL_MS) return;
    lastDetectTime.current = now;

    const data = poseTracker.detect();
    if (data) {
      cvBridge.cvInputRef.current = cvBridge.mapperRef.current.process(
        data.landmarks,
        data.worldLandmarks,
        data.timestamp
      );
      cvBridge.worldLandmarksRef.current = data.worldLandmarks;
      cvBridge.landmarksRef.current = data.landmarks;
    }

    // Red stick color detection (runs on its own skip-frame schedule)
    detectRedStick();
  });

  return null;
}
