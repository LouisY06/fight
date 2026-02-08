// =============================================================================
// GreenGunTracker.ts — Detects a physical green object via webcam color tracking
//
// Same architecture as RedStickTracker: searches for green within a hand ROI,
// uses OpenCV.js (preferred) or manual JS fallback.
// When detected, MechaArms switches to the gun weapon.
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

import { poseTracker } from './PoseTracker';
import { getCv } from './opencvLoader';
import { cvBridge } from './cvBridge';

export interface GreenGunData {
  /** Whether a green object was detected this frame */
  detected: boolean;
  /** Centroid X in normalized coords (0=left, 1=right) */
  centerX: number;
  /** Centroid Y in normalized coords (0=top, 1=bottom) */
  centerY: number;
  /** Pixel count of green detection */
  pixelCount: number;
}

/** Delta tracking for KrunkerStyle camera steering
 *  (ported from leaning_control_system.py KrunkerStyleMouseController) */
export interface GreenGunDelta {
  /** Change in centerX since last detection (normalized) */
  deltaX: number;
  /** Change in centerY since last detection (normalized) */
  deltaY: number;
  /** Whether this delta is usable (false on first frame, after discontinuation, or skipped frames) */
  isValid: boolean;
}

// Processing canvas — 320x240 gives 4× more pixels for centroid precision.
// 160x120 was losing sub-pixel gun movements entirely.
const PROCESS_W = 320;
const PROCESS_H = 240;

// Hand ROI: pose landmark indices
const RIGHT_WRIST = 16;
const RIGHT_INDEX = 20;
const RIGHT_PINKY = 18;
const RIGHT_ELBOW = 14;
const ROI_MARGIN = 0.15;

// OpenCV HSV thresholds for green (H: 0-180, S: 0-255, V: 0-255)
// Upper bound 80 avoids overlap with blue (starts at 90)
const CV_HUE_LOW = 25;
const CV_HUE_HIGH = 80;
const CV_SAT_MIN = 30;
const CV_VAL_MIN = 30;

// Manual HSV thresholds (H: 0-360, S: 0-1, V: 0-1)
// Upper bound 160° avoids overlap with blue (starts at 180°)
const GREEN_HUE_LOW = 50;
const GREEN_HUE_HIGH = 160;
const GREEN_SAT_MIN = 0.12;
const GREEN_VAL_MIN = 0.12;

const MIN_GREEN_PIXELS = 200;  // at 320x240, a real green object is ~300+ pixels (4× old threshold)
const MIN_CONTOUR_AREA = 150;  // minimum blob area to avoid noise (scaled for 320x240)

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

// Persistent result
let lastResult: GreenGunData = {
  detected: false,
  centerX: 0.5,
  centerY: 0.5,
  pixelCount: 0,
};

// No frame skipping — every frame matters for gun aiming responsiveness.
// The old skip-every-2nd-frame approach invalidated deltas on skipped frames,
// halving effective tracking rate and triggering constant discontinuations.
let debugLogTimer = 0;

// EMA (exponential moving average) smoothing to kill microjitter at the source.
// Applied to the raw centroid BEFORE computing deltas, so tiny pixel-level
// fluctuations never become camera movement.
// Alpha = 0 means full smoothing (never moves), 1 = no smoothing (raw input).
// 0.35 gives a good balance: responsive to real movement, kills tremor.
const EMA_ALPHA = 0.35;
let emaCenterX: number | null = null;
let emaCenterY: number | null = null;

// Delta tracking state for KrunkerStyle camera steering
// (ported from leaning_control_system.py KrunkerStyleMouseController)
let prevDeltaCenterX: number | null = null;
let prevDeltaCenterY: number | null = null;
let prevDeltaTime = 0;
const DELTA_DISCONTINUATION_MS = 250; // reset baseline after 250ms gap (relaxed from 100ms — too aggressive)

let lastDelta: GreenGunDelta = { deltaX: 0, deltaY: 0, isValid: false };

export function getGreenGunDelta(): GreenGunDelta {
  return lastDelta;
}

// OpenCV state: pre-allocated Mats
let cvSrc: any = null;
let cvHsv: any = null;
let cvMask: any = null;
let cvRoiMask: any = null;
let cvMorphKernel: any = null;
let cvContours: any = null;
let cvHierarchy: any = null;

export function getGreenGunData(): GreenGunData {
  return lastResult;
}

// ============================================================================
// Hand ROI from pose landmarks
// ============================================================================

interface ROI {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function getHandROI(): ROI | null {
  const landmarks = cvBridge.landmarksRef.current;
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[RIGHT_WRIST];
  const index = landmarks[RIGHT_INDEX];
  const pinky = landmarks[RIGHT_PINKY];
  const elbow = landmarks[RIGHT_ELBOW];

  if (!wrist || !index) return null;

  const handSpan = Math.hypot(index.x - wrist.x, index.y - wrist.y);
  const margin = Math.max(ROI_MARGIN, handSpan * 1.5);

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
    minX = Math.min(minX, elbow.x);
    maxX = Math.max(maxX, elbow.x);
    minY = Math.min(minY, elbow.y);
    maxY = Math.max(maxY, elbow.y);
  }

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
  cvMask = new cv.Mat();
  cvRoiMask = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC1, new cv.Scalar(0));
  cvMorphKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
  cvContours = new cv.MatVector();
  cvHierarchy = new cv.Mat();
}

function detectWithOpenCV(imageData: ImageData, roi: ROI | null): GreenGunData {
  const cv = getCv();
  if (!cvSrc) initCvMats(cv);

  cvSrc.data.set(imageData.data);

  cv.cvtColor(cvSrc, cvHsv, cv.COLOR_RGBA2RGB);
  cv.cvtColor(cvHsv, cvHsv, cv.COLOR_RGB2HSV);

  // Green: single hue range (no wrapping needed)
  const low = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC3, new cv.Scalar(CV_HUE_LOW, CV_SAT_MIN, CV_VAL_MIN, 0));
  const high = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC3, new cv.Scalar(CV_HUE_HIGH, 255, 255, 0));

  cv.inRange(cvHsv, low, high, cvMask);

  // Apply hand ROI mask
  if (roi) {
    cvRoiMask.setTo(new cv.Scalar(0));
    cv.rectangle(
      cvRoiMask,
      new cv.Point(roi.x1, roi.y1),
      new cv.Point(roi.x2, roi.y2),
      new cv.Scalar(255),
      -1,
    );
    cv.bitwise_and(cvMask, cvRoiMask, cvMask);
  }

  // Morphological cleanup
  cv.morphologyEx(cvMask, cvMask, cv.MORPH_OPEN, cvMorphKernel);
  cv.morphologyEx(cvMask, cvMask, cv.MORPH_CLOSE, cvMorphKernel);

  // Find contours
  cvContours.delete();
  cvHierarchy.delete();
  cvContours = new cv.MatVector();
  cvHierarchy = new cv.Mat();
  cv.findContours(cvMask, cvContours, cvHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  low.delete();
  high.delete();

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

  const pixelCount = cv.countNonZero(cvMask);

  if (maxIdx < 0 || maxArea < MIN_CONTOUR_AREA) {
    return { detected: false, centerX: 0.5, centerY: 0.5, pixelCount: 0 };
  }

  // Get centroid of the largest contour
  const moments = cv.moments(cvContours.get(maxIdx));
  const centerX = moments.m10 / moments.m00 / PROCESS_W;
  const centerY = moments.m01 / moments.m00 / PROCESS_H;

  // Debug
  const now = performance.now();
  if (now - debugLogTimer > 2000) {
    debugLogTimer = now;
    console.log(`[GreenGun/CV] pixels=${pixelCount} contours=${cvContours.size()} largest=${maxArea.toFixed(0)} roi=${roi ? `${roi.x1},${roi.y1}-${roi.x2},${roi.y2}` : 'full'}`);
  }

  return {
    detected: true,
    centerX,
    centerY,
    pixelCount,
  };
}

// ============================================================================
// Manual fallback backend
// ============================================================================

function detectManual(pixels: Uint8ClampedArray, roi: ROI | null): GreenGunData {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const pixelIdx = i / 4;
    const px = pixelIdx % PROCESS_W;
    const py = Math.floor(pixelIdx / PROCESS_W);

    if (roi && (px < roi.x1 || px > roi.x2 || py < roi.y1 || py > roi.y2)) {
      continue;
    }

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const [h, s, v] = rgbToHsv(r, g, b);

    if (h >= GREEN_HUE_LOW && h <= GREEN_HUE_HIGH && s >= GREEN_SAT_MIN && v >= GREEN_VAL_MIN) {
      sumX += px;
      sumY += py;
      count++;
    }
  }

  // Debug
  const now = performance.now();
  if (now - debugLogTimer > 2000) {
    debugLogTimer = now;
    console.log(`[GreenGun/Manual] green pixels: ${count} roi=${roi ? `${roi.x1},${roi.y1}-${roi.x2},${roi.y2}` : 'full'}`);
  }

  if (count < MIN_GREEN_PIXELS) {
    return { detected: false, centerX: 0.5, centerY: 0.5, pixelCount: 0 };
  }

  return {
    detected: true,
    centerX: sumX / count / PROCESS_W,
    centerY: sumY / count / PROCESS_H,
    pixelCount: count,
  };
}

// ============================================================================
// Main entry point
// ============================================================================

/**
 * Process the current webcam frame to detect a green object (gun indicator).
 * Call once per frame from CVSync.
 */
export function detectGreenGun(): GreenGunData {
  const video = poseTracker.getVideoElement();
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return lastResult;
  }

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = PROCESS_W;
    canvas.height = PROCESS_H;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!ctx) return lastResult;

  ctx.drawImage(video, 0, 0, PROCESS_W, PROCESS_H);
  const imageData = ctx.getImageData(0, 0, PROCESS_W, PROCESS_H);

  // Scan full frame (no ROI restriction) for maximum sensitivity
  const cv = getCv();
  if (cv) {
    try {
      lastResult = detectWithOpenCV(imageData, null);
    } catch (err) {
      console.warn('[GreenGun] OpenCV error, falling back to manual:', err);
      lastResult = detectManual(imageData.data, null);
    }
  } else {
    lastResult = detectManual(imageData.data, null);
  }

  // ---- EMA smooth the centroid to kill microjitter ----
  // Raw centroid jumps ~1-3 pixels per frame from color noise. At sensitivity 18,
  // that's 0.003 * 18 = 0.05 rad (~3°) of unwanted camera shake per frame.
  // EMA filters this out while preserving intentional movement.
  if (lastResult.detected) {
    if (emaCenterX === null || emaCenterY === null) {
      // First detection — seed the EMA
      emaCenterX = lastResult.centerX;
      emaCenterY = lastResult.centerY;
    } else {
      emaCenterX = EMA_ALPHA * lastResult.centerX + (1 - EMA_ALPHA) * emaCenterX;
      emaCenterY = EMA_ALPHA * lastResult.centerY + (1 - EMA_ALPHA) * emaCenterY;
    }
    // Overwrite raw centroid with smoothed version
    lastResult = { ...lastResult, centerX: emaCenterX, centerY: emaCenterY };
  } else {
    // Lost tracking — reset EMA so it re-seeds on next detection
    emaCenterX = null;
    emaCenterY = null;
  }

  // ---- Compute delta for KrunkerStyle camera steering ----
  // Mirrors KrunkerStyleMouseController.update() logic from leaning_control_system.py:
  // - Track frame-to-frame position change (delta)
  // - Detect discontinuations (gap > 100ms) to prevent snapping
  //
  // NOTE: This delta drives camera steering directly inside the browser.
  // No OS mouse events (pyautogui/Quartz) are involved — the camera euler
  // angles are set in FirstPersonCamera.tsx's useFrame callback.
  const deltaTime = performance.now();
  if (lastResult.detected) {
    const gapMs = deltaTime - prevDeltaTime;
    const isDiscontinuation = prevDeltaCenterX === null || prevDeltaCenterY === null ||
      gapMs > DELTA_DISCONTINUATION_MS;

    if (!isDiscontinuation) {
      lastDelta = {
        deltaX: lastResult.centerX - prevDeltaCenterX!,
        deltaY: lastResult.centerY - prevDeltaCenterY!,
        isValid: true,
      };
    } else {
      // Discontinuation: set baseline without applying delta (prevents snap)
      lastDelta = { deltaX: 0, deltaY: 0, isValid: false };
      // Log discontinuation reason to help diagnose stuck camera
      const now = performance.now();
      if (now - debugLogTimer > 2000) {
        debugLogTimer = now;
        console.log(
          `[GreenGun/Delta] DISCONTINUATION — prevX=${prevDeltaCenterX}` +
          ` prevY=${prevDeltaCenterY} gapMs=${gapMs.toFixed(0)}` +
          ` threshold=${DELTA_DISCONTINUATION_MS}ms`
        );
      }
    }
    prevDeltaCenterX = lastResult.centerX;
    prevDeltaCenterY = lastResult.centerY;
    prevDeltaTime = deltaTime;
  } else {
    // Lost tracking — clear baseline so next detection is treated as discontinuation
    lastDelta = { deltaX: 0, deltaY: 0, isValid: false };
    prevDeltaCenterX = null;
    prevDeltaCenterY = null;
  }

  return lastResult;
}
