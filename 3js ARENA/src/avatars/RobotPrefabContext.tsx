// =============================================================================
// RobotPrefabContext.tsx — Load robot GLB once; provide as prefab for spawning
// Arena contains only scenery; game spawns entities (playerRobot, enemyRobot) from this prefab.
// =============================================================================

import { createContext, useContext, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AVATAR_GLB_URL } from '../entities/AvatarModel';

/** Prefab root = the loaded GLB scene. Clone with SkeletonUtils.clone() per entity. */
const RobotPrefabContext = createContext<THREE.Group | null>(null);

export function useRobotPrefab(): THREE.Group | null {
  return useContext(RobotPrefabContext);
}

interface RobotPrefabProviderProps {
  children: ReactNode;
}

/** Loads the robot GLB once; children can use useRobotPrefab() and SkeletonUtils.clone(prefab). */
export function RobotPrefabProvider({ children }: RobotPrefabProviderProps) {
  const { scene } = useGLTF(AVATAR_GLB_URL);
  return (
    <RobotPrefabContext.Provider value={scene}>
      {children}
    </RobotPrefabContext.Provider>
  );
}
