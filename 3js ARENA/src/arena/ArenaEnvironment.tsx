// =============================================================================
// ArenaEnvironment.tsx — Skybox / environment map + procedural sky fallback
// =============================================================================

import { useState, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface ArenaEnvironmentProps {
  skyboxPath: string;
  fogColor?: string;
  /** Top color for gradient sky when no skybox image exists */
  skyTop?: string;
  /** Bottom/horizon color for gradient sky */
  skyBottom?: string;
  /** Show stars (good for night/space themes) */
  stars?: boolean;
}

export function ArenaEnvironment({
  skyboxPath,
  fogColor = '#0a0a0a',
  skyTop,
  skyBottom,
  stars = false,
}: ArenaEnvironmentProps) {
  const [imageExists, setImageExists] = useState<boolean | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageExists(true);
    img.onerror = () => setImageExists(false);
    img.src = skyboxPath;
  }, [skyboxPath]);

  // Still checking
  if (imageExists === null) {
    return <GradientSky topColor={skyTop || fogColor} bottomColor={skyBottom || fogColor} stars={stars} />;
  }

  // Image exists — use it
  if (imageExists) {
    return (
      <>
        <Environment files={skyboxPath} background backgroundBlurriness={0.05} />
        {stars && <Stars radius={80} depth={50} count={2000} factor={4} fade speed={1} />}
      </>
    );
  }

  // No skybox image — procedural gradient sky
  return <GradientSky topColor={skyTop || fogColor} bottomColor={skyBottom || fogColor} stars={stars} />;
}

/**
 * Procedural gradient sky dome + optional stars.
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

  // Create a gradient texture for the sky
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(0.5, bottomColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
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

  return stars ? <Stars radius={80} depth={50} count={3000} factor={4} fade speed={1} /> : null;
}
