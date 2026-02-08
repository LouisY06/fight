// =============================================================================
// CVSync.tsx — Bridge component: runs pose detection inside R3F's useFrame
// This is what makes tracking smooth — detection + processing happen in the
// same frame as rendering, just like the Mecha-Mime friend system.
// Must be placed inside the <Canvas>.
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { cvBridge } from './cvBridge';
import { poseTracker } from './PoseTracker';
import { detectRedStick } from './RedStickTracker';
import { detectGreenGun } from './GreenGunTracker';
import { detectBlueLED } from './BlueLEDTracker';

/**
 * Synchronous CV detection bridge.
 * Runs every frame for responsive head tracking — throttling adds
 * noticeable input latency. Pose data is written to refs — no React
 * state, no re-renders.
 */
export function CVSync() {
  useFrame(() => {
    if (!cvBridge.cvEnabled) return;

    // Pose detection (requires mapper to be registered by CVProvider)
    if (cvBridge.mapperRef) {
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
    }

    // Color detection runs independently of pose tracking —
    // only needs the webcam video element (each tracker checks internally).
    detectRedStick();
    detectGreenGun();
    detectBlueLED();
  });

  return null;
}
