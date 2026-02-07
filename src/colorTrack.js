/**
 * Color-based tracking for physical props (e.g. sword with colored tape).
 * Runs HSV thresholding on downsampled webcam frames each tick.
 * Returns centroid, principal-axis angle, and length of the colored region.
 */

let trackCanvas = null;
let trackCtx = null;
const SAMPLE_W = 160;
const SAMPLE_H = 120;

// Default: neon-green tape (hue ≈ 90° in our 0-360 space)
let hueCenter = 90;
let hueRange = 30;
let satMin = 80;
let valMin = 80;

export function setTrackColor(hue, range = 30, minSat = 80, minVal = 80) {
  hueCenter = hue;
  hueRange = range;
  satMin = minSat;
  valMin = minVal;
}

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
  h *= 60; // 0-360

  return [h, s * 255, v * 255];
}

/**
 * Detect a colored region in the current video frame.
 * Returns { cx, cy, angle, length, pixelCount } or null.
 *   cx, cy   — centroid in normalised coords (0-1)
 *   angle    — principal-axis angle in radians (from image X-axis)
 *   length   — approximate normalised length of the region
 */
export function detectColorRegion(videoEl) {
  if (!videoEl.videoWidth) return null;
  ensureCanvas();

  trackCtx.drawImage(videoEl, 0, 0, SAMPLE_W, SAMPLE_H);
  const imageData = trackCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
  const px = imageData.data;

  const hLow  = ((hueCenter - hueRange) + 360) % 360;
  const hHigh = (hueCenter + hueRange) % 360;
  const wraps  = hLow > hHigh;

  let m00 = 0;
  let m10 = 0, m01 = 0;
  let m20 = 0, m02 = 0, m11 = 0;

  for (let y = 0; y < SAMPLE_H; y++) {
    for (let x = 0; x < SAMPLE_W; x++) {
      const i = (y * SAMPLE_W + x) * 4;
      const [h, s, v] = rgbToHsv(px[i], px[i + 1], px[i + 2]);

      const hueOk = wraps ? (h >= hLow || h <= hHigh) : (h >= hLow && h <= hHigh);
      if (hueOk && s >= satMin && v >= valMin) {
        m00++;
        m10 += x;
        m01 += y;
        m20 += x * x;
        m02 += y * y;
        m11 += x * y;
      }
    }
  }

  if (m00 < 15) return null; // too few matching pixels

  const cx = m10 / m00 / SAMPLE_W;
  const cy = m01 / m00 / SAMPLE_H;

  // Central moments → principal axis
  const mu20 = m20 / m00 - (m10 / m00) ** 2;
  const mu02 = m02 / m00 - (m01 / m00) ** 2;
  const mu11 = m11 / m00 - (m10 / m00) * (m01 / m00);
  const angle = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);

  // Length estimate from dominant eigenvalue
  const lambda = 0.5 * (mu20 + mu02 + Math.sqrt(4 * mu11 * mu11 + (mu20 - mu02) ** 2));
  const length = Math.sqrt(lambda) * 4 / SAMPLE_W;

  return { cx, cy, angle, length, pixelCount: m00 };
}
