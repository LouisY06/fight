// =============================================================================
// CVProvider.tsx — Context provider for CV pose tracking data
// High-frequency data (cvInput, worldLandmarks) stored in REFS for smooth
// access from R3F useFrame — no React re-render overhead.
// =============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type MutableRefObject,
} from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { poseTracker } from './PoseTracker';
import { CVInputMapper, type CVGameInput } from './CVInputMapper';

// ---- Default input ----

const defaultCvInput: CVGameInput = {
  lookYaw: 0,
  lookPitch: 0,
  posOffsetX: 0,
  posOffsetZ: 0,
  swordOffsetX: 0,
  swordOffsetY: 0,
  swordRotX: 0,
  swordRotY: 0.3,
  swordRotZ: 0.4,
  isSwinging: false,
  isBlocking: false,
  isTracking: false,
};

// ---- Context type ----

interface CVContextType {
  /** Whether CV mode is enabled by the user */
  cvEnabled: boolean;
  /** Toggle CV mode on/off */
  setCvEnabled: (enabled: boolean) => void;
  /** Whether PoseTracker is running */
  isTracking: boolean;

  /**
   * Ref to latest CV input — read from useFrame for zero-latency.
   * Updated synchronously each frame by CVSync.
   */
  cvInputRef: MutableRefObject<CVGameInput>;

  /**
   * Ref to latest world landmarks — read from useFrame for zero-latency.
   * Updated synchronously each frame by CVSync.
   */
  worldLandmarksRef: MutableRefObject<NormalizedLandmark[] | null>;

  /** CVInputMapper instance ref (for sync bridge) */
  mapperRef: MutableRefObject<CVInputMapper>;

  /** The raw video element for PiP display */
  videoElement: HTMLVideoElement | null;

  /** Re-calibrate neutral position (resets head facing to center) */
  calibrate: () => void;
}

const CVContext = createContext<CVContextType>({
  cvEnabled: false,
  setCvEnabled: () => {},
  isTracking: false,
  cvInputRef: { current: defaultCvInput },
  worldLandmarksRef: { current: null },
  mapperRef: { current: new CVInputMapper() },
  videoElement: null,
  calibrate: () => {},
});

// ---- Provider ----

export function CVProvider({ children }: { children: ReactNode }) {
  const [cvEnabled, setCvEnabled] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // High-frequency data stored in refs (no re-renders)
  const cvInputRef = useRef<CVGameInput>(defaultCvInput);
  const worldLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const mapperRef = useRef(new CVInputMapper());

  // Start/stop PoseTracker when cvEnabled changes
  useEffect(() => {
    if (cvEnabled) {
      poseTracker
        .start()
        .then(() => {
          setIsTracking(true);
          setVideoElement(poseTracker.getVideoElement());
          mapperRef.current.calibrate();
        })
        .catch((err) => {
          console.error('[CVProvider] Failed to start tracking:', err);
          setCvEnabled(false);
        });
    } else {
      poseTracker.stop();
      setIsTracking(false);
      setVideoElement(null);
      cvInputRef.current = defaultCvInput;
      worldLandmarksRef.current = null;
    }

    return () => {
      poseTracker.stop();
    };
  }, [cvEnabled]);

  const calibrate = useCallback(() => {
    mapperRef.current.calibrate();
  }, []);

  return (
    <CVContext.Provider
      value={{
        cvEnabled,
        setCvEnabled,
        isTracking,
        cvInputRef,
        worldLandmarksRef,
        mapperRef,
        videoElement,
        calibrate,
      }}
    >
      {children}
    </CVContext.Provider>
  );
}

export function useCVContext() {
  return useContext(CVContext);
}
