// =============================================================================
// themeExtractor.ts — Analyze generated image → suggest theme config
// =============================================================================

import type { ArenaTheme } from '../../arena/arenaThemes';

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Extract a theme configuration from a generated arena image.
 * Samples pixels from different regions to determine lighting, fog, and particle colors.
 */
export async function extractThemeFromImage(
  imageDataUrl: string
): Promise<Partial<ArenaTheme>> {
  const img = await loadImage(imageDataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Sample at a small resolution for speed
  const sampleWidth = 64;
  const sampleHeight = 32;
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);

  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const pixels = imageData.data;

  // Sample regions
  const skyColor = sampleRegion(pixels, sampleWidth, 0, 0, sampleWidth, 8); // top quarter
  const groundColor = sampleRegion(pixels, sampleWidth, 0, 24, sampleWidth, 8); // bottom quarter
  const overallColor = sampleRegion(pixels, sampleWidth, 0, 0, sampleWidth, sampleHeight);

  // Derive colors
  const dominantColor = rgbToHex(overallColor);
  const brightestColor = brighten(overallColor, 1.5);
  const accentColor = brighten(skyColor, 1.2);
  const fogColor = darken(overallColor, 0.3);
  const avgBrightness = (overallColor.r + overallColor.g + overallColor.b) / (3 * 255);

  return {
    ambientLight: {
      color: dominantColor,
      intensity: Math.max(0.15, avgBrightness * 0.5),
    },
    fog: {
      color: rgbToHex(fogColor),
      near: 10,
      far: 50,
    },
    particleColor: rgbToHex(accentColor),
    spotLights: [
      {
        color: rgbToHex(brightestColor),
        intensity: 2,
        position: [0, 15, 0] as [number, number, number],
      },
    ],
  };
}

// -- Helpers --

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function sampleRegion(
  pixels: Uint8ClampedArray,
  imgWidth: number,
  x: number,
  y: number,
  w: number,
  h: number
): RGB {
  let r = 0,
    g = 0,
    b = 0,
    count = 0;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const idx = (py * imgWidth + px) * 4;
      r += pixels[idx];
      g += pixels[idx + 1];
      b += pixels[idx + 2];
      count++;
    }
  }
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function rgbToHex(c: RGB): string {
  return (
    '#' +
    [c.r, c.g, c.b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function darken(c: RGB, factor: number): RGB {
  return {
    r: c.r * factor,
    g: c.g * factor,
    b: c.b * factor,
  };
}

function brighten(c: RGB, factor: number): RGB {
  return {
    r: Math.min(255, c.r * factor),
    g: Math.min(255, c.g * factor),
    b: Math.min(255, c.b * factor),
  };
}
