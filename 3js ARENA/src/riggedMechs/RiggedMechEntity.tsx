// =============================================================================
// RiggedMechEntity.tsx — Procedural mech entity (replaces GLB pack)
// Renders one of 5 high-poly procedural mech designs with walk/swing/idle
// animations via quaternion slerp on pivot groups.
// =============================================================================

import { type MutableRefObject } from 'react';
import * as THREE from 'three';
import { getProceduralMech, PROCEDURAL_MECH_COUNT } from './ProceduralMechPack';

/**
 * Default Y-rotation offset for procedural pack models.
 * Set to 0 because procedural models face +Z by default (like MechaEntity).
 * Exported so consumers can import if needed.
 */
export const RIGGED_MECH_FACING_OFFSET = 0;

// =============================================================================
// Component
// =============================================================================

export interface RiggedMechEntityProps {
  color?: string;
  mechIndex?: number;
  isSwinging?: boolean;
  isWalking?: boolean;
  isWalkingRef?: MutableRefObject<boolean>;
  swordRef?: MutableRefObject<THREE.Group | null>;
  rotationYOffset?: number;
  scaleHead?: number;
  scaleTorso?: number;
  scaleArms?: number;
  scaleLegs?: number;
}

export function RiggedMechEntity(props: RiggedMechEntityProps) {
  const {
    color,
    mechIndex = 0,
    isSwinging = false,
    isWalking = false,
    isWalkingRef,
    swordRef,
    rotationYOffset = RIGGED_MECH_FACING_OFFSET,
    scaleHead = 1,
    scaleTorso = 1,
    scaleArms = 1,
    scaleLegs = 1,
  } = props;

  const MechComponent = getProceduralMech(mechIndex);

  return (
    <group rotation={[0, rotationYOffset, 0]}>
      <MechComponent
        color={color}
        scaleHead={scaleHead}
        scaleTorso={scaleTorso}
        scaleArms={scaleArms}
        scaleLegs={scaleLegs}
        isSwinging={isSwinging}
        isWalking={isWalking}
        isWalkingRef={isWalkingRef}
        swordRef={swordRef}
      />
    </group>
  );
}

export function preloadRiggedMechPack() {
  // No-op: procedural models don't need preloading (no GLB to fetch)
}

export { PROCEDURAL_MECH_COUNT };
