/**
 * Multi-color detection for weapon switching.
 * Only scans a cropped region around the right hand (from MediaPipe landmarks)
 * so clothing / background colors are ignored.
 */

let trackCanvas = null;
let trackCtx = null;
const SAMPLE_W = 120;
const SAMPLE_H = 90;
const MIN_PIXELS = 12;

// How much padding (in normalised coords) around the hand to scan
const HAND_RADIUS = 0.18;

const COLORS = {
  red:   { hLow: 345, hHigh: 15, label: 'gun' },
  yellow: { hLow: 40,  hHigh: 70, label: 'shield' },
  blue:  { hLow: 190, hHigh: 260, label: 'sword' },
};

const SAT_MIN = 120;
const VAL_MIN = 100;

let frameCount = 0;
const SKIP = 2;
let lastResult = null;
let missCount = 0;
const MISS_CLEAR = 2; // clear weapon after 2 consecutive scan misses

function ensureCanvas() {
  if (!trackCanvas) {
    trackCanvas = document.createElement('canvas');
    trackCanvas.width = SAMPLE_W;
    trackCanvas.height = SAMPLE_H;
    trackCtx = trackCanvas.getContext('2d', { willReadFrequently: true });
  }
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h, s, v;
  v = max;
  s = max === 0 ? 0 : d / max;

  if (d === 0) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / d + 6) % 6;
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  h *= 60;

  return [h, s * 255, v * 255];
}

function hueMatch(h, low, high) {
  return low > high ? (h >= low || h <= high) : (h >= low && h <= high);
}

/**
 * Detect colored props near the right hand only.
 * @param {HTMLVideoElement} videoEl
 * @param {Array} landmarks2d — MediaPipe normalised 2D landmarks (0-1)
 * @returns {{ weapon, color, cx, cy, angle, pixelCount } | null}
 */
export function detectColorRegion(videoEl, landmarks2d) {
  if (!videoEl.videoWidth) return lastResult;

  frameCount++;
  if (frameCount % (SKIP + 1) !== 0) return lastResult;

  // Need the right wrist (16) and right index (20) to locate the hand
  if (!landmarks2d || landmarks2d.length < 21) {
    lastResult = null;
    return null;
  }

  // Hand center = midpoint of wrist and index tip
  const wrist = landmarks2d[16];
  const index = landmarks2d[20];
  const handCx = (wrist.x + index.x) / 2;
  const handCy = (wrist.y + index.y) / 2;

  // Crop bounds in normalised coords
  const x0n = Math.max(0, handCx - HAND_RADIUS);
  const y0n = Math.max(0, handCy - HAND_RADIUS);
  const x1n = Math.min(1, handCx + HAND_RADIUS);
  const y1n = Math.min(1, handCy + HAND_RADIUS);

  // Convert to sample-canvas pixel coords
  const x0 = Math.floor(x0n * SAMPLE_W);
  const y0 = Math.floor(y0n * SAMPLE_H);
  const x1 = Math.ceil(x1n * SAMPLE_W);
  const y1 = Math.ceil(y1n * SAMPLE_H);

  if (x1 <= x0 || y1 <= y0) {
    lastResult = null;
    return null;
  }

  ensureCanvas();
  trackCtx.drawImage(videoEl, 0, 0, SAMPLE_W, SAMPLE_H);
  const imageData = trackCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
  const px = imageData.data;

  const acc = {};
  for (const key of Object.keys(COLORS)) {
    acc[key] = { m00: 0, m10: 0, m01: 0, m20: 0, m02: 0, m11: 0 };
  }

  // Only scan the cropped hand region
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * SAMPLE_W + x) * 4;
      const [h, s, v] = rgbToHsv(px[i], px[i + 1], px[i + 2]);
      if (s < SAT_MIN || v < VAL_MIN) continue;

      for (const [key, col] of Object.entries(COLORS)) {
        if (hueMatch(h, col.hLow, col.hHigh)) {
          const a = acc[key];
          a.m00++;
          a.m10 += x;
          a.m01 += y;
          a.m20 += x * x;
          a.m02 += y * y;
          a.m11 += x * y;
          break;
        }
      }
    }
  }

  let best = null;
  let bestCount = MIN_PIXELS;
  for (const [key, a] of Object.entries(acc)) {
    if (a.m00 > bestCount) {
      bestCount = a.m00;
      best = key;
    }
  }

  if (!best) {
    missCount++;
    if (missCount >= MISS_CLEAR) lastResult = null;
    return lastResult;
  }
  missCount = 0;

  const a = acc[best];
  const cx = a.m10 / a.m00 / SAMPLE_W;
  const cy = a.m01 / a.m00 / SAMPLE_H;

  const mu20 = a.m20 / a.m00 - (a.m10 / a.m00) ** 2;
  const mu02 = a.m02 / a.m00 - (a.m01 / a.m00) ** 2;
  const mu11 = a.m11 / a.m00 - (a.m10 / a.m00) * (a.m01 / a.m00);
  const angle = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);

  lastResult = {
    weapon: COLORS[best].label,
    color: best,
    cx, cy, angle,
    pixelCount: a.m00,
  };

  return lastResult;
}
