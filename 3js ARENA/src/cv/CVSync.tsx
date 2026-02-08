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

/**
 * Synchronous CV detection bridge.
 * Each render frame: detect pose → process through CVInputMapper → write to refs.
 * No React state, no re-renders, zero latency.
 */
export function CVSync() {
  useFrame(() => {
    // Read bridge values every frame (not at mount) to avoid stale closures
    if (!cvBridge.cvEnabled || !cvBridge.mapperRef) return;

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
