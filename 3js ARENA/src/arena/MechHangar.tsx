// =============================================================================
// MechHangar.tsx — Mech hangar GLB for arena side + menu background
// =============================================================================

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const HANGAR_GLB_URL = '/assets/worlds/hangar/mech_hangar.glb';

export interface MechHangarProps {
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
}

function MechHangarInner({ position = [0, 0, 0], scale = 1, rotation }: MechHangarProps) {
  const { scene } = useGLTF(HANGAR_GLB_URL);
  const cloned = useMemo(() => {
    const c = scene.clone();
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        (node as THREE.Mesh).castShadow = true;
        (node as THREE.Mesh).receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  const scaleVec = Array.isArray(scale) ? scale : [scale, scale, scale];

  return (
    <group position={position} scale={scaleVec as [number, number, number]} rotation={rotation ?? [0, 0, 0]}>
      <primitive object={cloned} />
    </group>
  );
}

export function MechHangar(props: MechHangarProps) {
  return <MechHangarInner {...props} />;
}

export function preloadMechHangar() {
  useGLTF.preload(HANGAR_GLB_URL);
}
