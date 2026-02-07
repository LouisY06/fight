/**
 * Vision module — OpenCV.js-based color detection and LED trigger.
 * Falls back to canvas-based detection if OpenCV isn't loaded yet.
 */

let cvReady = false;

// Check for OpenCV.js readiness
export function checkOpenCV() {
  if (typeof cv !== 'undefined' && cv.Mat) {
    cvReady = true;
  }
  return cvReady;
}

// HSV color ranges for weapon markers
const COLOR_RANGES = {
  green: { lower: [35, 50, 50], upper: [85, 255, 255], weapon: 'gun' },
  red1:  { lower: [0, 70, 50],  upper: [10, 255, 255], weapon: 'sword' },
  red2:  { lower: [170, 70, 50], upper: [180, 255, 255], weapon: 'sword' },
};

// Minimum pixel count to consider a color "detected"
const COLOR_THRESHOLD = 300;
// Minimum bright pixels for LED trigger
const LED_THRESHOLD = 50;

/**
 * Detect weapon color markers near the hand region.
 * @param {HTMLCanvasElement} canvas - The webcam canvas
 * @param {Object} handLandmark - 2D normalized landmark for the right wrist
 * @param {number} videoW - Video width
 * @param {number} videoH - Video height
 * @returns {string} 'gun', 'sword', or 'none'
 */
export function detectWeaponColor(canvas, handLandmark, videoW, videoH) {
  if (!handLandmark) return 'none';

  // Define ROI around the hand (larger area)
  const cx = Math.round(handLandmark.x * videoW);
  const cy = Math.round(handLandmark.y * videoH);
  const roiSize = 80;
  const x = Math.max(0, cx - roiSize);
  const y = Math.max(0, cy - roiSize);
  const w = Math.min(roiSize * 2, videoW - x);
  const h = Math.min(roiSize * 2, videoH - y);

  if (w <= 0 || h <= 0) return 'none';

  if (cvReady) {
    return detectColorOpenCV(canvas, x, y, w, h);
  }
  return detectColorCanvas(canvas, x, y, w, h);
}

function detectColorOpenCV(canvas, x, y, w, h) {
  try {
    const src = cv.imread(canvas);
    const roi = src.roi(new cv.Rect(x, y, w, h));
    const hsv = new cv.Mat();
    cv.cvtColor(roi, hsv, cv.COLOR_RGBA2RGB);
    const hsv2 = new cv.Mat();
    cv.cvtColor(hsv, hsv2, cv.COLOR_RGB2HSV);

    let result = 'none';

    for (const [name, range] of Object.entries(COLOR_RANGES)) {
      const lower = new cv.Mat(hsv2.rows, hsv2.cols, hsv2.type(), range.lower.concat(0));
      const upper = new cv.Mat(hsv2.rows, hsv2.cols, hsv2.type(), range.upper.concat(255));
      const mask = new cv.Mat();
      cv.inRange(hsv2, lower, upper, mask);
      const count = cv.countNonZero(mask);

      lower.delete();
      upper.delete();
      mask.delete();

      if (count > COLOR_THRESHOLD) {
        result = range.weapon;
        break;
      }
    }

    src.delete();
    roi.delete();
    hsv.delete();
    hsv2.delete();
    return result;
  } catch {
    return 'none';
  }
}

/**
 * Fallback: simple canvas-based color detection (RGB thresholding).
 */
function detectColorCanvas(canvas, x, y, w, h) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let imageData;
  try {
    imageData = ctx.getImageData(x, y, w, h);
  } catch {
    return 'none';
  }
  const data = imageData.data;
  let greenCount = 0;
  let redCount = 0;

  for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for speed
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Simple green detection
    if (g > 100 && g > r * 1.4 && g > b * 1.4) greenCount++;
    // Simple red detection
    if (r > 120 && r > g * 1.6 && r > b * 1.6) redCount++;
  }

  if (greenCount > 30) return 'gun';
  if (redCount > 30) return 'sword';
  return 'none';
}

/**
 * Detect bright LED in a small region around the fingertip.
 * @param {HTMLCanvasElement} canvas - The webcam canvas
 * @param {Object} fingerLandmark - 2D normalized landmark for right index fingertip
 * @param {number} videoW
 * @param {number} videoH
 * @returns {boolean} true if LED detected
 */
export function detectLED(canvas, fingerLandmark, videoW, videoH) {
  if (!fingerLandmark) return false;

  const cx = Math.round(fingerLandmark.x * videoW);
  const cy = Math.round(fingerLandmark.y * videoH);
  const roiSize = 50;
  const x = Math.max(0, cx - roiSize);
  const y = Math.max(0, cy - roiSize);
  const w = Math.min(roiSize * 2, videoW - x);
  const h = Math.min(roiSize * 2, videoH - y);

  if (w <= 0 || h <= 0) return false;

  if (cvReady) {
    return detectLEDOpenCV(canvas, x, y, w, h);
  }
  return detectLEDCanvas(canvas, x, y, w, h);
}

function detectLEDOpenCV(canvas, x, y, w, h) {
  try {
    const src = cv.imread(canvas);
    const roi = src.roi(new cv.Rect(x, y, w, h));
    const gray = new cv.Mat();
    cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY);
    const binary = new cv.Mat();
    cv.threshold(gray, binary, 240, 255, cv.THRESH_BINARY);
    const count = cv.countNonZero(binary);

    src.delete();
    roi.delete();
    gray.delete();
    binary.delete();

    return count > LED_THRESHOLD;
  } catch {
    return false;
  }
}

/**
 * Fallback: canvas-based LED detection.
 */
function detectLEDCanvas(canvas, x, y, w, h) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let imageData;
  try {
    imageData = ctx.getImageData(x, y, w, h);
  } catch {
    return false;
  }
  const data = imageData.data;
  let brightCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Very bright white = LED
    if (r > 240 && g > 240 && b > 240) brightCount++;
  }

  return brightCount > LED_THRESHOLD;
}
