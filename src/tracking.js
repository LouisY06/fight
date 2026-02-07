/**
 * MediaPipe Pose tracking via @mediapipe/tasks-vision (CDN).
 * Loads the PoseLandmarker and provides per-frame pose detection.
 */

let poseLandmarker = null;
let lastTimestamp = -1;

export async function initTracking(videoEl) {
  // Dynamic import from CDN to avoid bundler issues with WASM
  const vision = await import(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
  );

  const { PoseLandmarker, FilesetResolver, DrawingUtils } = vision;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });

  // Start webcam
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();

  return { PoseLandmarker, DrawingUtils };
}

/**
 * Detect pose for the current video frame.
 * Returns { landmarks, worldLandmarks } or null if no pose detected.
 */
export function detectPose(videoEl) {
  if (!poseLandmarker || !videoEl.videoWidth) return null;

  const ts = performance.now();
  if (ts === lastTimestamp) return null;
  lastTimestamp = ts;

  const result = poseLandmarker.detectForVideo(videoEl, ts);

  if (result.landmarks && result.landmarks.length > 0) {
    return {
      landmarks: result.landmarks[0],          // 2D normalized
      worldLandmarks: result.worldLandmarks[0], // 3D world coords
    };
  }
  return null;
}
