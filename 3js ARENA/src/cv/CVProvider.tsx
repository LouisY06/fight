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
import { cvBridge } from './cvBridge';

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

/** Minimum seconds between calibrations (prevents spam). */
const CALIBRATE_COOLDOWN = 1.5;

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

  /** Re-calibrate neutral position + reset camera facing (with cooldown). */
  calibrate: () => void;

  /**
   * Register a callback to run when calibrate fires (e.g. reset camera yaw).
   * Returns unsubscribe function.
   */
  onCalibrate: (cb: () => void) => () => void;
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
  onCalibrate: () => () => {},
});

// ---- Provider ----

export function CVProvider({ children }: { children: ReactNode }) {
  const [cvEnabled, setCvEnabled] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // High-frequency data stored in refs (no re-renders)
  const cvInputRef = useRef<CVGameInput>(defaultCvInput);
  const worldLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const mapperRef = useRef(new CVInputMapper());

  // Register refs with bridge so R3F components (different React tree) can read without useContext
  useEffect(() => {
    cvBridge.register({
      cvInputRef,
      worldLandmarksRef,
      mapperRef,
    });
    cvBridge.cvEnabled = cvEnabled;
  });

  useEffect(() => {
    cvBridge.cvEnabled = cvEnabled;
    cvBridge.isTracking = isTracking;
  }, [cvEnabled, isTracking]);

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

  // Calibrate with cooldown + notify listeners (e.g. camera reset)
  const lastCalibrateTime = useRef(0);
  const calibrateListeners = useRef(new Set<() => void>());

  const calibrate = useCallback(() => {
    const now = Date.now() / 1000;
    if (now - lastCalibrateTime.current < CALIBRATE_COOLDOWN) return; // cooldown
    lastCalibrateTime.current = now;

    // Pause CV input so pose data doesn't interfere during calibration
    cvBridge.cvPaused = true;

    // Wait for the player to settle, then recalibrate
    setTimeout(() => {
      mapperRef.current.calibrate();
      // Notify listeners (camera facing reset, etc.)
      for (const cb of calibrateListeners.current) cb();
      cvBridge.triggerCalibrate();

      // Resume CV input after a short delay
      setTimeout(() => {
        cvBridge.cvPaused = false;
      }, 200);
    }, 300);
  }, []);

  const onCalibrate = useCallback((cb: () => void) => {
    calibrateListeners.current.add(cb);
    return () => { calibrateListeners.current.delete(cb); };
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
        onCalibrate,
      }}
    >
      {children}
    </CVContext.Provider>
  );
}

export function useCVContext() {
  return useContext(CVContext);
}
