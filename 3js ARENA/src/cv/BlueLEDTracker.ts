// =============================================================================
// BlueLEDTracker.ts — Detects a blue LED via webcam color tracking
//
// When blue is detected, MechaArms auto-fires the gun.
// Full-frame scan (no ROI) for maximum sensitivity.
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

import { poseTracker } from './PoseTracker';
import { getCv } from './opencvLoader';

export interface BlueLEDData {
  detected: boolean;
  centerX: number;
  centerY: number;
  pixelCount: number;
}

const PROCESS_W = 160;
const PROCESS_H = 120;

// OpenCV HSV thresholds for blue (H: 0-180, S: 0-255, V: 0-255)
// Widened range to catch LEDs that appear cyan-ish or slightly purple.
// Lowered saturation/value minimums — bright LEDs often saturate the camera
// sensor, appearing whitish-blue with low saturation.
const CV_HUE_LOW = 85;
const CV_HUE_HIGH = 135;
const CV_SAT_MIN = 15;
const CV_VAL_MIN = 15;

// Manual HSV thresholds (H: 0-360, S: 0-1, V: 0-1)
// Widened to match OpenCV sensitivity.
const BLUE_HUE_LOW = 170;
const BLUE_HUE_HIGH = 270;
const BLUE_SAT_MIN = 0.06;
const BLUE_VAL_MIN = 0.06;

// 20% of frame area — blue must cover at least 20% of the frame to count as detected.
// Prevents false positives from ambient blue in the scene.
const BLUE_AREA_THRESHOLD = 0.20;
const MIN_BLUE_PIXELS = Math.floor(PROCESS_W * PROCESS_H * BLUE_AREA_THRESHOLD);
const MIN_CONTOUR_AREA = Math.floor(PROCESS_W * PROCESS_H * BLUE_AREA_THRESHOLD);

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

let lastResult: BlueLEDData = {
  detected: false,
  centerX: 0.5,
  centerY: 0.5,
  pixelCount: 0,
};

let frameCounter = 0;
let debugLogTimer = 0;

// Temporal hold: keep reporting detected=true for N frames after last real detection.
// Prevents single-frame dropouts from killing tracking on a small LED.
const HOLD_FRAMES = 4; // ~130ms at 30fps (processed every 2nd frame)
let holdCounter = 0;

export function getBlueLEDData(): BlueLEDData {
  return lastResult;
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

let cvSrc: any = null;
let cvHsv: any = null;
let cvMask: any = null;
let cvMorphKernel: any = null;
let cvContours: any = null;
let cvHierarchy: any = null;

function initCvMats(cv: any) {
  cvSrc = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC4);
  cvHsv = new cv.Mat();
  cvMask = new cv.Mat();
  cvMorphKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
  cvContours = new cv.MatVector();
  cvHierarchy = new cv.Mat();
}

function detectWithOpenCV(imageData: ImageData): BlueLEDData {
  const cv = getCv();
  if (!cvSrc) initCvMats(cv);

  cvSrc.data.set(imageData.data);
  cv.cvtColor(cvSrc, cvHsv, cv.COLOR_RGBA2RGB);
  cv.cvtColor(cvHsv, cvHsv, cv.COLOR_RGB2HSV);

  const low = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC3, new cv.Scalar(CV_HUE_LOW, CV_SAT_MIN, CV_VAL_MIN, 0));
  const high = new cv.Mat(PROCESS_H, PROCESS_W, cv.CV_8UC3, new cv.Scalar(CV_HUE_HIGH, 255, 255, 0));

  cv.inRange(cvHsv, low, high, cvMask);
  // CLOSE only (fills small gaps). OPEN is intentionally omitted:
  // it erodes small blobs, which destroys a tiny LED that's only
  // a few pixels wide at 160×120.
  cv.morphologyEx(cvMask, cvMask, cv.MORPH_CLOSE, cvMorphKernel);

  cvContours.delete();
  cvHierarchy.delete();
  cvContours = new cv.MatVector();
  cvHierarchy = new cv.Mat();
  cv.findContours(cvMask, cvContours, cvHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  low.delete();
  high.delete();

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

  // Debug
  const now = performance.now();
  if (now - debugLogTimer > 2000) {
    debugLogTimer = now;
    const pct = ((pixelCount / (PROCESS_W * PROCESS_H)) * 100).toFixed(1);
    console.log(`[BlueLED/CV] pixels=${pixelCount} (${pct}%) contours=${cvContours.size()} largest=${maxArea.toFixed(0)} threshold=${MIN_BLUE_PIXELS}`);
  }

  if (maxIdx < 0 || maxArea < MIN_CONTOUR_AREA) {
    return { detected: false, centerX: 0.5, centerY: 0.5, pixelCount: 0 };
  }

  const moments = cv.moments(cvContours.get(maxIdx));
  const centerX = moments.m10 / moments.m00 / PROCESS_W;
  const centerY = moments.m01 / moments.m00 / PROCESS_H;

  return { detected: true, centerX, centerY, pixelCount };
}

// ============================================================================
// Manual fallback backend
// ============================================================================

function detectManual(pixels: Uint8ClampedArray): BlueLEDData {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const pixelIdx = i / 4;
    const px = pixelIdx % PROCESS_W;
    const py = Math.floor(pixelIdx / PROCESS_W);

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const [h, s, v] = rgbToHsv(r, g, b);

    if (h >= BLUE_HUE_LOW && h <= BLUE_HUE_HIGH && s >= BLUE_SAT_MIN && v >= BLUE_VAL_MIN) {
      sumX += px;
      sumY += py;
      count++;
    }
  }

  // Debug
  const now = performance.now();
  if (now - debugLogTimer > 2000) {
    debugLogTimer = now;
    const pct = ((count / (PROCESS_W * PROCESS_H)) * 100).toFixed(1);
    console.log(`[BlueLED/Manual] blue pixels: ${count} (${pct}%) threshold=${MIN_BLUE_PIXELS}`);
  }

  if (count < MIN_BLUE_PIXELS) {
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

export function detectBlueLED(): BlueLEDData {
  frameCounter++;
  if (frameCounter % 2 !== 0) return lastResult;

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

  let frameResult: BlueLEDData;
  const cv = getCv();
  if (cv) {
    try {
      frameResult = detectWithOpenCV(imageData);
    } catch (err) {
      console.warn('[BlueLED] OpenCV error, falling back to manual:', err);
      frameResult = detectManual(imageData.data);
    }
  } else {
    frameResult = detectManual(imageData.data);
  }

  // Temporal hold: if blue was detected this frame, update lastResult and
  // reset the hold counter. If NOT detected, keep reporting the previous
  // good detection for up to HOLD_FRAMES frames before giving up.
  // This prevents single-frame dropouts from flickering the detection.
  if (frameResult.detected) {
    lastResult = frameResult;
    holdCounter = HOLD_FRAMES;
  } else if (holdCounter > 0) {
    // Keep the previous good detection alive
    holdCounter--;
    // lastResult stays as-is (previous good detection)
  } else {
    // Hold expired — truly lost the blue LED
    lastResult = frameResult;
  }

  return lastResult;
}
