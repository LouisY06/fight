// =============================================================================
// WorldAssets.tsx — Reusable GLB model loader for arena world building
// =============================================================================

import { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface WorldModelProps {
  path: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * Load and render a single GLB model with shadow settings.
 * Must be wrapped in <Suspense> by a parent — useGLTF throws a Promise
 * while loading (React Suspense pattern). Do NOT try/catch it.
 */
export function WorldModel({
  path,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  castShadow = true,
  receiveShadow = true,
}: WorldModelProps) {
  useEffect(() => {
    console.log(`[WorldModel] Loading: ${path}`);
  }, [path]);

  // useGLTF throws a Promise while loading (Suspense). Let it propagate.
  const { scene } = useGLTF(path);

  const cloned = useMemo(() => {
    const c = scene.clone();
    let meshCount = 0;
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        meshCount++;
      }
    });
    console.log(`[WorldModel] Loaded ${path} — ${meshCount} meshes`);
    return c;
  }, [scene, path, castShadow, receiveShadow]);

  const scaleVec = Array.isArray(scale) ? scale : [scale, scale, scale];

  return (
    <group position={position} rotation={rotation} scale={scaleVec as [number, number, number]}>
      <primitive object={cloned} />
    </group>
  );
}

/**
 * Simple placeholder cube for debugging when models don't load.
 */
export function DebugCube({
  position = [0, 0, 0],
  color = '#ff0000',
  size = [1, 2, 1],
}: {
  position?: [number, number, number];
  color?: string;
  size?: [number, number, number];
}) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
