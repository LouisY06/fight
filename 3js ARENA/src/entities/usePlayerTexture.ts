// =============================================================================
// usePlayerTexture.ts — Player armor texture for ProceduralMechaModel / MechaEntity
// Loads player.png or player.jpg; falls back to procedural canvas texture.
// (Three.js does not support .tdx — use PNG/JPG)
// =============================================================================

import { useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const PLAYER_TEXTURE_PATH = '/assets/characters/player.png';

/** Procedural armor plate texture when no image file exists.
 * Bright enough to show over dark material colors (map * color). */
function createFallbackTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#a0a0b0');
  grad.addColorStop(0.5, '#b0b0c0');
  grad.addColorStop(1, '#9090a0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#404050';
  ctx.lineWidth = 2;
  const step = 32;
  for (let x = 0; x <= size; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#606070';
  for (let x = step; x < size; x += step) {
    for (let y = step; y < size; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function usePlayerTexture(): THREE.Texture {
  const fallback = useMemo(createFallbackTexture, []);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const loadedRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      PLAYER_TEXTURE_PATH,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        tex.colorSpace = THREE.SRGBColorSpace;
        loadedRef.current = tex;
        setTexture(tex);
      },
      undefined,
      () => {}
    );
    return () => {
      loadedRef.current?.dispose();
      loadedRef.current = null;
    };
  }, []);

  return texture ?? fallback;
}
