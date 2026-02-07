// =============================================================================
// PoseTracker.ts — Singleton: webcam capture + MediaPipe PoseLandmarker
// Uses LOCAL MediaPipe files from public/mediapipe/ for speed (no CDN).
// Detection is driven by R3F's useFrame (via detect()) for zero-latency.
// Run `bash scripts/setup-mediapipe.sh` after npm install to set them up.
// =============================================================================

import {
  PoseLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

export interface PoseLandmarkData {
  /** 33 normalized landmarks (x, y in 0..1, z is depth). */
  landmarks: NormalizedLandmark[];
  /** 33 world landmarks (real-world 3D coordinates in meters). */
  worldLandmarks: NormalizedLandmark[];
  /** Timestamp of this frame. */
  timestamp: number;
}

/** Resolve a path relative to the page origin (works in both Vite dev and Electron). */
function assetUrl(p: string): string {
  return new URL(p, window.location.href).href;
}

class PoseTracker {
  private landmarker: PoseLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private _isRunning = false;
  private lastTimestamp = -1;

  get isRunning() {
    return this._isRunning;
  }

  /**
   * Initialize MediaPipe PoseLandmarker and start webcam.
   * Loads WASM + model from local public/mediapipe/ files.
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    try {
      console.log('[PoseTracker] Loading WASM runtime (local)...');
      const vision = await FilesetResolver.forVisionTasks(
        assetUrl('mediapipe/wasm')
      );

      console.log('[PoseTracker] Creating pose landmarker (local model)...');
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: assetUrl('mediapipe/pose_landmarker_lite.task'),
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // Open webcam
      console.log('[PoseTracker] Requesting webcam...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });

      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.playsInline = true;
      this.video.muted = true;

      await new Promise<void>((resolve) => {
        this.video!.onloadeddata = () => resolve();
      });

      this._isRunning = true;
      this.lastTimestamp = -1;
      console.log('[PoseTracker] Started (local assets)');
    } catch (err) {
      console.error('[PoseTracker] Failed to start:', err);
      this.stop();
      throw err;
    }
  }

  /**
   * Synchronous per-frame detection — call from R3F useFrame.
   * Returns null if no new pose available (same frame, no video data, etc).
   */
  detect(): PoseLandmarkData | null {
    if (!this._isRunning || !this.landmarker || !this.video) return null;
    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

    const ts = performance.now();
    if (ts === this.lastTimestamp) return null;
    this.lastTimestamp = ts;

    try {
      const result = this.landmarker.detectForVideo(this.video, ts);
      if (result.landmarks && result.landmarks.length > 0) {
        return {
          landmarks: result.landmarks[0],
          worldLandmarks: result.worldLandmarks[0],
          timestamp: ts,
        };
      }
    } catch {
      // Detection can occasionally fail — skip this frame
    }

    return null;
  }

  /**
   * Stop tracking and release resources.
   */
  stop(): void {
    this._isRunning = false;

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }

    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }

    console.log('[PoseTracker] Stopped');
  }

  /**
   * Get the raw video element (for rendering webcam PiP).
   */
  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }
}

// Singleton
export const poseTracker = new PoseTracker();
