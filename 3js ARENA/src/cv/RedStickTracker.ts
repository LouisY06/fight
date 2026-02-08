// =============================================================================
// RedStickTracker.ts — Detects a physical red stick/rod via webcam color tracking
//
// Only searches for red within a region around the player's hand (using pose
// landmarks from MediaPipe). This prevents false positives from red clothing,
// lips, or background objects.
//
// Two backends:
//   1. OpenCV.js (preferred) — HSV inRange + morphology + findContours + minAreaRect
//   2. Manual fallback — JS-level HSV thresholding + PCA
//
// OpenCV is loaded async; manual runs until it's ready. Module-level singleton.
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

import { poseTracker } from './PoseTracker';
import { loadOpenCV, getCv } from './opencvLoader';
import { cvBridge } from './cvBridge';

export interface RedStickData {
  /** Whether a red stick was detected this frame */
  detected: boolean;
  /** Centroid X in normalized coords (0=left, 1=right) */
  centerX: number;
  /** Centroid Y in normalized coords (0=top, 1=bottom) */
  centerY: number;
  /** Angle of the stick in radians (0=horizontal, PI/2=vertical) */
  angle: number;
  /** Approximate length of the stick in normalized units */
  length: number;
}

// Processing canvas (downscaled for performance)
const PROCESS_W = 160;
const PROCESS_H = 120;

// Hand ROI: pose landmark indices
const RIGHT_WRIST = 16;
const RIGHT_INDEX = 20;
const RIGHT_PINKY = 18;
const RIGHT_ELBOW = 14;
// ROI expansion: how much to extend beyond hand landmarks (normalized 0-1)
const ROI_MARGIN = 0.15;

// HSV thresholds for red detection (manual fallback)
const RED_HUE_LOW1 = 0;
const RED_HUE_HIGH1 = 15;
const RED_HUE_LOW2 = 345;
const RED_HUE_HIGH2 = 360;
const RED_SAT_MIN = 0.30;
const RED_VAL_MIN = 0.20;

// OpenCV HSV thresholds (OpenCV uses H: 0-180, S: 0-255, V: 0-255)
const CV_HUE_LOW1 = 0;
const CV_HUE_HIGH1 = 8;     // ~15° / 2
const CV_HUE_LOW2 = 172;    // ~345° / 2
const CV_HUE_HIGH2 = 180;
const CV_SAT_MIN = 77;      // ~30% of 255
const CV_VAL_MIN = 51;      // ~20% of 255

const MIN_RED_PIXELS = 30;
const MIN_CONTOUR_AREA = 50; // OpenCV: minimum contour area to consider

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

// Persistent result
let lastResult: RedStickData = {
  detected: false,
  centerX: 0.5,
  centerY: 0.5,
  angle: 0,
  length: 0,
};

// Skip frames for performance (process every 2nd frame)
let frameCounter = 0;
let debugLogTimer = 0;

// OpenCV state: pre-allocated Mats (reuse across frames to avoid GC)
let cvReady = false;
let cvSrc: any = null;
let cvHsv: any = null;
let cvMask1: any = null;
let cvMask2: any = null;
let cvMask: any = null;
let cvRoiMask: any = null;
let cvMorphKernel: any = null;
let cvContours: any = null;
let cvHierarchy: any = null;

// Kick off OpenCV loading immediately (non-blocking)
loadOpenCV()
  .then(() => {
    cvReady = true;
    console.log('[RedStick] OpenCV backend ready');
  })
  .catch(() => {
    console.log('[RedStick] Using manual HSV backend');
  });

export function getRedStickData(): RedStickData {
  return lastResult;
}

// ============================================================================
// Hand ROI from pose landmarks
// ============================================================================

interface ROI {
  x1: number; // pixel coords in PROCESS_W x PROCESS_H
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Compute a bounding box around the right hand using pose landmarks.
 * Returns null if no landmarks are available (falls back to full-frame scan).
 */
function getHandROI(): ROI | null {
  const landmarks = cvBridge.landmarksRef.current;
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[RIGHT_WRIST];
  const index = landmarks[RIGHT_INDEX];
  const pinky = landmarks[RIGHT_PINKY];
  const elbow = landmarks[RIGHT_ELBOW];

  if (!wrist || !index) return null;

  // Use hand span (wrist to fingertip) to scale the ROI
  const handSpan = Math.hypot(index.x - wrist.x, index.y - wrist.y);
  // The stick extends beyond the hand, so use a generous margin
  const margin = Math.max(ROI_MARGIN, handSpan * 1.5);

  // Find bounding box of all hand landmarks + elbow (stick could extend toward elbow)
  let minX = Math.min(wrist.x, index.x);
  let maxX = Math.max(wrist.x, index.x);
  let minY = Math.min(wrist.y, index.y);
  let maxY = Math.max(wrist.y, index.y);

  if (pinky) {
    minX = Math.min(minX, pinky.x);
    maxX = Math.max(maxX, pinky.x);
    minY = Math.min(minY, pinky.y);
    maxY = Math.max(maxY, pinky.y);
  }
  if (elbow) {
    // Include area between hand and elbow (stick extends in this direction)
    minX = Math.min(minX, elbow.x);
    maxX = Math.max(maxX, elbow.x);
    minY = Math.min(minY, elbow.y);
    maxY = Math.max(maxY, elbow.y);
  }

  // Expand by margin and clamp to frame
  const x1 = Math.max(0, Math.floor((minX - margin) * PROCESS_W));
  const y1 = Math.max(0, Math.floor((minY - margin) * PROCESS_H));
  const x2 = Math.min(PROCESS_W - 1, Math.ceil((maxX + margin) * PROCESS_W));
  const y2 = Math.min(PROCESS_H - 1, Math.ceil((maxY + margin) * PROCESS_H));

  if (x2 <= x1 || y2 <= y1) return null;

  return { x1, y1, x2, y2 };
}

/** Convert RGB (0-255) to HSV (h: 0-360, s: 0-1, v: 0-1) */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / d) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / d + 2);
    } else {
      h = 60 * ((rn - gn) / d + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

// ============================================================================
// OpenCV backend
// ============================================================================

function initCvMats(cv: any) {
  cvSrc = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC4);
  cvHsv = new cv.Mat();
  cvMask1 = new cv.Mat();
  cvMask2 = new cv.Mat();
  cvMask = new cv.Mat();
  cvRoiMask = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC1, new cv.Scalar(0));
  cvMorphKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
  cvContours = new cv.MatVector();
  cvHierarchy = new cv.Mat();
}

function detectWithOpenCV(imageData: ImageData, roi: ROI | null): RedStickData {
  const cv = getCv();
  if (!cvSrc) initCvMats(cv);

  // Load image data into OpenCV Mat
  cvSrc.data.set(imageData.data);

  // Convert RGBA → HSV
  cv.cvtColor(cvSrc, cvHsv, cv.COLOR_RGBA2RGB);
  cv.cvtColor(cvHsv, cvHsv, cv.COLOR_RGB2HSV);

  // Red mask: two ranges (red wraps around hue 0/180)
  const low1 = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC3, new cv.Scalar(CV_HUE_LOW1, CV_SAT_MIN, CV_VAL_MIN, 0));
  const high1 = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC3, new cv.Scalar(CV_HUE_HIGH1, 255, 255, 0));
  const low2 = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC3, new cv.Scalar(CV_HUE_LOW2, CV_SAT_MIN, CV_VAL_MIN, 0));
  const high2 = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC3, new cv.Scalar(CV_HUE_HIGH2, 255, 255, 0));

  cv.inRange(cvHsv, low1, high1, cvMask1);
  cv.inRange(cvHsv, low2, high2, cvMask2);
  cv.bitwise_or(cvMask1, cvMask2, cvMask);

  // Apply hand ROI mask: zero out everything outside the hand region
  if (roi) {
    cvRoiMask.setTo(new cv.Scalar(0));
    cv.rectangle(
      cvRoiMask,
      new cv.Point(roi.x1, roi.y1),
      new cv.Point(roi.x2, roi.y2),
      new cv.Scalar(255),
      -1 // filled
    );
    cv.bitwise_and(cvMask, cvRoiMask, cvMask);
  }

  // Morphological cleanup: remove noise, fill gaps
  cv.morphologyEx(cvMask, cvMask, cv.MORPH_OPEN, cvMorphKernel);
  cv.morphologyEx(cvMask, cvMask, cv.MORPH_CLOSE, cvMorphKernel);

  // Find contours
  cvContours.delete();
  cvHierarchy.delete();
  cvContours = new cv.MatVector();
  cvHierarchy = new cv.Mat();
  cv.findContours(cvMask, cvContours, cvHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  // Free threshold mats
  low1.delete();
  high1.delete();
  low2.delete();
  high2.delete();

  // Find the largest contour
  let maxArea = 0;
  let maxIdx = -1;
  for (let i = 0; i < cvContours.size(); i++) {
    const area = cv.contourArea(cvContours.get(i));
    if (area > maxArea) {
      maxArea = area;
      maxIdx = i;
    }
  }

  if (maxIdx < 0 || maxArea < MIN_CONTOUR_AREA) {
    return { detected: false, centerX: 0.5, centerY: 0.5, angle: 0, length: 0 };
  }

  // Get oriented bounding rectangle of the largest contour
  const rect = cv.minAreaRect(cvContours.get(maxIdx));
  const center = rect.center;
  const size = rect.size;
  let angle = rect.angle;

  let length: number;
  if (size.width < size.height) {
    length = size.height;
  } else {
    length = size.width;
    angle = angle + 90;
  }

  const angleRad = (angle * Math.PI) / 180;

  const centerX = center.x / PROCESS_W;
  const centerY = center.y / PROCESS_H;
  const lengthNorm = length / PROCESS_W;

  // Debug
  const now = performance.now();
  if (now - debugLogTimer > 2000) {
    debugLogTimer = now;
    const pixelCount = cv.countNonZero(cvMask);
    console.log(`[RedStick/CV] pixels=${pixelCount} contours=${cvContours.size()} largest=${maxArea.toFixed(0)} roi=${roi ? `${roi.x1},${roi.y1}-${roi.x2},${roi.y2}` : 'full'}`);
  }

  return {
    detected: true,
    centerX,
    centerY,
    angle: angleRad,
    length: lengthNorm,
  };
}

// ============================================================================
// Manual fallback backend
// ============================================================================

function detectManual(pixels: Uint8ClampedArray, roi: ROI | null): RedStickData {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  const redXs: number[] = [];
  const redYs: number[] = [];

  for (let i = 0; i < pixels.length; i += 4) {
    const pixelIdx = i / 4;
    const px = pixelIdx % PROCESS_W;
    const py = Math.floor(pixelIdx / PROCESS_W);

    // Skip pixels outside hand ROI
    if (roi && (px < roi.x1 || px > roi.x2 || py < roi.y1 || py > roi.y2)) {
      continue;
    }

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const [h, s, v] = rgbToHsv(r, g, b);

    const isRedHue = (h >= RED_HUE_LOW1 && h <= RED_HUE_HIGH1) ||
                     (h >= RED_HUE_LOW2 && h <= RED_HUE_HIGH2);

    if (isRedHue && s >= RED_SAT_MIN && v >= RED_VAL_MIN) {
      sumX += px;
      sumY += py;
      count++;
      redXs.push(px);
      redYs.push(py);
    }
  }

  // Debug
  const now = performance.now();
  if (now - debugLogTimer > 2000) {
    debugLogTimer = now;
    console.log(`[RedStick/Manual] red pixels: ${count} roi=${roi ? `${roi.x1},${roi.y1}-${roi.x2},${roi.y2}` : 'full'}`);
  }

  if (count < MIN_RED_PIXELS) {
    return { detected: false, centerX: 0.5, centerY: 0.5, angle: 0, length: 0 };
  }

  const meanX = sumX / count;
  const meanY = sumY / count;

  // PCA for stick angle
  let covXX = 0;
  let covXY = 0;
  let covYY = 0;

  for (let i = 0; i < count; i++) {
    const dx = redXs[i] - meanX;
    const dy = redYs[i] - meanY;
    covXX += dx * dx;
    covXY += dx * dy;
    covYY += dy * dy;
  }

  const angle = 0.5 * Math.atan2(2 * covXY, covXX - covYY);

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  let minProj = Infinity;
  let maxProj = -Infinity;

  for (let i = 0; i < count; i++) {
    const dx = redXs[i] - meanX;
    const dy = redYs[i] - meanY;
    const proj = dx * cosA + dy * sinA;
    if (proj < minProj) minProj = proj;
    if (proj > maxProj) maxProj = proj;
  }

  const lengthPx = maxProj - minProj;
  const lengthNorm = lengthPx / PROCESS_W;

  return {
    detected: true,
    centerX: meanX / PROCESS_W,
    centerY: meanY / PROCESS_H,
    angle,
    length: lengthNorm,
  };
}

// ============================================================================
// Main entry point
// ============================================================================

/**
 * Process the current webcam frame to detect a red stick.
 * Call once per frame from CVSync.
 */
export function detectRedStick(): RedStickData {
  frameCounter++;
  if (frameCounter % 2 !== 0) return lastResult; // skip every other frame

  const video = poseTracker.getVideoElement();
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return lastResult;
  }

  // Lazy-init canvas
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = PROCESS_W;
    canvas.height = PROCESS_H;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!ctx) return lastResult;

  // Draw downscaled video frame
  ctx.drawImage(video, 0, 0, PROCESS_W, PROCESS_H);
  const imageData = ctx.getImageData(0, 0, PROCESS_W, PROCESS_H);

  // Get hand region from pose landmarks
  const roi = getHandROI();

  // Use OpenCV if available, otherwise manual fallback
  if (cvReady && getCv()) {
    try {
      lastResult = detectWithOpenCV(imageData, roi);
    } catch (err) {
      console.warn('[RedStick] OpenCV error, falling back to manual:', err);
      cvReady = false;
      lastResult = detectManual(imageData.data, roi);
    }
  } else {
    lastResult = detectManual(imageData.data, roi);
  }

  return lastResult;
}
