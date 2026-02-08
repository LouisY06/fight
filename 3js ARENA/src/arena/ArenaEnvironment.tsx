// =============================================================================
// ArenaEnvironment.tsx — Skybox / environment map from pre-generated images
// Falls back to a procedural color sky if the image file doesn't exist yet.
// =============================================================================

import { useState, useEffect, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

interface ArenaEnvironmentProps {
  skyboxPath: string;
  fogColor?: string;
}

export function ArenaEnvironment({ skyboxPath, fogColor = '#0a0a0a' }: ArenaEnvironmentProps) {
  const [imageExists, setImageExists] = useState<boolean | null>(null);

  // Check if the skybox image actually exists before trying to load it
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageExists(true);
    img.onerror = () => setImageExists(false);
    img.src = skyboxPath;
  }, [skyboxPath]);

  // Still checking
  if (imageExists === null) return <FallbackSky color={fogColor} />;

  // Image exists — use it
  if (imageExists) {
    return (
      <Environment
        files={skyboxPath}
        background
        backgroundBlurriness={0.05}
      />
    );
  }

  // Image doesn't exist — use procedural fallback (no remote HDR; avoids CSP/fetch errors)
  return <FallbackSky color={fogColor} />;
}

/**
 * Procedural gradient sky fallback when no skybox image is available.
 */
function FallbackSky({ color }: { color: string }) {
  const { scene } = useThree();

  useLayoutEffect(() => {
    scene.background = new THREE.Color(color);
    return () => {
      scene.background = null;
    };
  }, [scene, color]);

  return null;
}
