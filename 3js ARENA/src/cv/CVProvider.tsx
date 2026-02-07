// =============================================================================
// cv/CVProvider.tsx — Context provider stub for CV data
// =============================================================================

import { createContext, useContext, type ReactNode } from 'react';
import type { CVInputData } from './types';
import * as THREE from 'three';

interface CVContextType {
  player1Input: CVInputData;
  player2Input: CVInputData;
  isReady: boolean;
}

const defaultCVInput: CVInputData = {
  weaponPosition: new THREE.Vector3(),
  weaponRotation: new THREE.Euler(),
  weaponVelocity: new THREE.Vector3(),
  gesture: 'none',
  gestureConfidence: 0,
  handPosition: new THREE.Vector3(),
  handedness: 'right',
  isTracking: false,
  fps: 0,
};

const CVContext = createContext<CVContextType>({
  player1Input: defaultCVInput,
  player2Input: defaultCVInput,
  isReady: false,
});

/**
 * PLACEHOLDER context provider.
 * Will be replaced with actual MediaPipe webcam processing.
 */
export function CVProvider({ children }: { children: ReactNode }) {
  // TODO: Initialize MediaPipe, process webcam frames, update state
  const value: CVContextType = {
    player1Input: defaultCVInput,
    player2Input: defaultCVInput,
    isReady: false,
  };

  return <CVContext.Provider value={value}>{children}</CVContext.Provider>;
}

export function useCVContext() {
  return useContext(CVContext);
}
