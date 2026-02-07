// =============================================================================
// SceneBackground.tsx — Sets scene.background for menu/lobby when no Arena
// Prevents pure black screen before arena loads.
// =============================================================================

import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const MENU_BG = new THREE.Color(0x0a0015);

export function SceneBackground() {
  const { scene } = useThree();

  useLayoutEffect(() => {
    scene.background = MENU_BG;
    return () => {
      scene.background = null;
    };
  }, [scene]);

  return null;
}
