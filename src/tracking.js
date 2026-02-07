/**
 * MediaPipe Pose tracking — local files for speed.
 * Uses dynamic import to load vision_bundle.mjs from public/mediapipe/
 * so path resolution works in both Vite dev and Electron production.
 */

let PoseLandmarker, FilesetResolver;
let poseLandmarker = null;
let lastTimestamp = -1;

let _onProgress = null;
export function setProgressCallback(fn) {
  _onProgress = fn;
}

function log(msg) {
  console.log('[tracking]', msg);
  if (_onProgress) _onProgress(msg);
}

function assetUrl(p) {
  return new URL(p, window.location.href).href;
}

export async function startWebcam(videoEl) {
  log('Requesting webcam...');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  log('Webcam active');
}

export async function initTracking() {
  log('Loading MediaPipe module...');
  const module = await import(/* @vite-ignore */ assetUrl('mediapipe/vision_bundle.mjs'));
  PoseLandmarker = module.PoseLandmarker;
  FilesetResolver = module.FilesetResolver;
  log('Module loaded');

  log('Loading WASM runtime...');
  const vision = await FilesetResolver.forVisionTasks(assetUrl('mediapipe/wasm'));
  log('WASM loaded');

  log('Creating pose landmarker...');
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: assetUrl('mediapipe/pose_landmarker_lite.task'),
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  log('Pose landmarker ready');
}

export function detectPose(videoEl) {
  if (!poseLandmarker || !videoEl.videoWidth) return null;

  const ts = performance.now();
  if (ts === lastTimestamp) return null;
  lastTimestamp = ts;

  const result = poseLandmarker.detectForVideo(videoEl, ts);

  if (result.landmarks && result.landmarks.length > 0) {
    return {
      landmarks: result.landmarks[0],
      worldLandmarks: result.worldLandmarks[0],
    };
  }
  return null;
}
