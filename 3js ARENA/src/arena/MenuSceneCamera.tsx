// =============================================================================
// MenuSceneCamera.tsx — Fixed camera for menu 3D background (hangar view)
// =============================================================================

import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';

export function MenuSceneCamera() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0, 2.5, 10);
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}
