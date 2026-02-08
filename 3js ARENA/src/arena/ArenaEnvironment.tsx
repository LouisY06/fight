// =============================================================================
// ArenaEnvironment.tsx — Procedural sky system for all arena themes
//
// Since no skybox images exist, every map uses procedural skies:
//   - Daytime outdoor themes → drei Sky (physically-based sun/atmosphere)
//   - Night outdoor themes   → rich gradient dome + stars
//   - Indoor themes          → dark ceiling gradient, no stars
// =============================================================================

import { useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface ArenaEnvironmentProps {
  skyboxPath: string;
  fogColor?: string;
  /** Top color for gradient sky */
  skyTop?: string;
  /** Bottom/horizon color for gradient sky */
  skyBottom?: string;
  /** Show stars (good for night/space themes) */
  stars?: boolean;
  /** Use physically-based daytime sky (drei Sky component) */
  daySky?: boolean;
  /** Sun elevation angle in degrees (0 = horizon, 90 = noon). Only used when daySky=true */
  sunElevation?: number;
  /** Sun azimuth in degrees. Only used when daySky=true */
  sunAzimuth?: number;
}

export function ArenaEnvironment({
  fogColor = '#0a0a0a',
  skyTop,
  skyBottom,
  stars = false,
  daySky = false,
  sunElevation = 25,
  sunAzimuth = 180,
}: ArenaEnvironmentProps) {
  // Daytime sky — physically-based atmosphere
  if (daySky) {
    const phi = THREE.MathUtils.degToRad(90 - sunElevation);
    const theta = THREE.MathUtils.degToRad(sunAzimuth);
    const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    return (
      <>
        <Sky
          sunPosition={sunPosition}
          turbidity={8}
          rayleigh={2}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
        {stars && <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />}
      </>
    );
  }

  // Night / indoor sky — gradient dome
  return (
    <GradientSky
      topColor={skyTop || fogColor}
      bottomColor={skyBottom || fogColor}
      stars={stars}
    />
  );
}

/**
 * Procedural gradient sky dome + optional stars.
 * Uses a high-res gradient canvas for smooth transitions.
 */
function GradientSky({
  topColor,
  bottomColor,
  stars = false,
}: {
  topColor: string;
  bottomColor: string;
  stars?: boolean;
}) {
  const { scene } = useThree();

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(0.35, topColor);
    gradient.addColorStop(0.65, bottomColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }, [topColor, bottomColor]);

  useEffect(() => {
    scene.background = texture;
    return () => {
      scene.background = null;
    };
  }, [scene, texture]);

  return stars ? <Stars radius={100} depth={50} count={4000} factor={4} fade speed={1} /> : null;
}
