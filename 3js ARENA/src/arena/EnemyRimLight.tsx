// =============================================================================
// EnemyRimLight.tsx — Rim light behind enemy relative to camera
// Makes enemy silhouette pop. Positioned each frame behind opponent from camera POV.
// =============================================================================

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const RIM_DISTANCE = 3;
const RIM_INTENSITY = 2;
const RIM_COLOR = '#ffffff';

export function EnemyRimLight() {
  const lightRef = useRef<THREE.DirectionalLight>(null!);
  const _dir = new THREE.Vector3();
  const _oppPos = new THREE.Vector3(0, 1, 0);

  useFrame((state) => {
    if (!lightRef.current) return;

    // Find opponent (userData.isOpponent)
    state.scene.traverse((obj) => {
      if (obj.userData?.isOpponent && obj instanceof THREE.Object3D) {
        obj.getWorldPosition(_oppPos);
      }
    });

    // Camera → opponent direction, flattened to XZ for "behind"
    state.camera.getWorldPosition(_dir);
    _dir.sub(_oppPos);
    _dir.y = 0;
    _dir.normalize();

    // Place light behind opponent (opposite of camera direction)
    lightRef.current.position.copy(_oppPos).addScaledVector(_dir, -RIM_DISTANCE);
    lightRef.current.position.y = _oppPos.y + 1.5;
    lightRef.current.target.position.set(_oppPos.x, _oppPos.y + 1, _oppPos.z);
  });

  return (
    <directionalLight
      ref={lightRef}
      color={RIM_COLOR}
      intensity={RIM_INTENSITY}
      position={[0, 5, 5]}
      castShadow={false}
    />
  );
}
