// =============================================================================
// CVSync.tsx — Bridge component: runs pose detection inside R3F's useFrame
// This is what makes tracking smooth — detection + processing happen in the
// same frame as rendering, just like the Mecha-Mime friend system.
// Must be placed inside the <Canvas>.
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useCVContext } from './CVProvider';
import { poseTracker } from './PoseTracker';

/**
 * Synchronous CV detection bridge.
 * Each render frame: detect pose → process through CVInputMapper → write to refs.
 * No React state, no re-renders, zero latency.
 */
export function CVSync() {
  const { cvEnabled, cvInputRef, worldLandmarksRef, mapperRef } = useCVContext();

  useFrame(() => {
    if (!cvEnabled) return;

    const data = poseTracker.detect();
    if (data) {
      cvInputRef.current = mapperRef.current.process(
        data.landmarks,
        data.worldLandmarks,
        data.timestamp
      );
      worldLandmarksRef.current = data.worldLandmarks;
    }
  });

  return null;
}
