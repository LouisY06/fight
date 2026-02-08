// =============================================================================
// RiggedMechEntity.tsx — Rigged mech from rigged_mechs_pack_2.glb
// This pack uses parent-child Object3D hierarchy (NOT SkinnedMesh).
// Walk + swing + idle via quaternion slerp on hierarchy nodes.
// =============================================================================

import { useRef, useMemo, Suspense, useEffect, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { normalizeToHeight } from '../entities/AvatarModel';
import { makeSword } from '../avatars/MechaGeometry';
import { RIGGED_MECHS_PACK_GLB_URL } from './riggedMechPackConstants';

const DEFAULT_TARGET_HEIGHT = 2;

// ---- Walk animation constants ----
const WALK_SPEED = 5;
const WALK_LEG_AMPLITUDE = 0.45;
const WALK_ARM_AMPLITUDE = 0.35;
const WALK_KNEE_AMP = 0.30;
const WALK_ELBOW_AMP = 0.15;
const WALK_TORSO_TWIST = 0.025;
const WALK_BOB = 0.015;

// ---- Swing animation constants (multi-axis dramatic slash) ----
const SWING_DURATION = 0.35;
const SWING_SHOULDER_PITCH = -1.4;
const SWING_SHOULDER_YAW = -0.6;
const SWING_SHOULDER_ROLL = 0.3;
const SWING_FOREARM_PITCH = -0.8;
const SWING_FOREARM_ROLL = -0.4;

/**
 * Default Y-rotation offset for rigged pack models.
 * Exported so consumers can import if needed.
 */
export const RIGGED_MECH_FACING_OFFSET = Math.PI / 4 + Math.PI;

// ---- Temp math objects (reused per frame) ----
const _targetQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();

// =============================================================================
// Node-based body part discovery
// The pack uses Bone.XXX naming with .R/.L suffixes for sides.
// Each mech has a different numbering scheme, so we detect by hierarchy position.
// =============================================================================

/** Cached body-part references for one mech instance. */
interface MechParts {
  root: THREE.Object3D;        // The armature root bone (first child of mech)
  spine: THREE.Object3D | null;     // Second bone in chain (torso)
  torso: THREE.Object3D | null;     // Third bone (upper torso)
  head: THREE.Object3D | null;      // Head bone chain
  upperArmR: THREE.Object3D | null;
  lowerArmR: THREE.Object3D | null;
  handR: THREE.Object3D | null;     // Deepest arm bone (for sword)
  upperArmL: THREE.Object3D | null;
  lowerArmL: THREE.Object3D | null;
  upperLegR: THREE.Object3D | null;
  lowerLegR: THREE.Object3D | null;
  upperLegL: THREE.Object3D | null;
  lowerLegL: THREE.Object3D | null;
}

/** Find a node by name substring match within a scene graph. */
function findNode(root: THREE.Object3D, test: (name: string) => boolean): THREE.Object3D | null {
  let result: THREE.Object3D | null = null;
  root.traverse((node) => {
    if (!result && node !== root && test(node.name)) result = node;
  });
  return result;
}

/** Find all Bone/Object3D children (not meshes) of a node. */
function getBoneChildren(node: THREE.Object3D): THREE.Object3D[] {
  return node.children.filter(
    (c) => !((c as THREE.Mesh).isMesh) && c.children.length > 0
  );
}

/**
 * Discover body parts from the hierarchy.
 * Strategy: The armature root has a single root bone, which has children:
 *   - A spine chain (Bone.002 -> Bone.003 -> ...)
 *   - Leg bones with .R / .L suffix (Bone.021.R, Bone.021.L)
 * Arms branch off the torso with .R / .L suffix (Bone.006.R, Bone.006.L)
 */
function discoverMechParts(mechRoot: THREE.Object3D): MechParts {
  // Find the armature root bone (first non-mesh child)
  let rootBone: THREE.Object3D | null = null;
  mechRoot.traverse((node) => {
    if (!rootBone && node !== mechRoot && node.name.startsWith('Bone') && getBoneChildren(node).length > 0) {
      rootBone = node;
    }
  });
  if (!rootBone) rootBone = mechRoot;

  const parts: MechParts = {
    root: rootBone,
    spine: null, torso: null, head: null,
    upperArmR: null, lowerArmR: null, handR: null,
    upperArmL: null, lowerArmL: null,
    upperLegR: null, lowerLegR: null,
    upperLegL: null, lowerLegL: null,
  };

  // Categorize rootBone's children by suffix
  const rootChildren = getBoneChildren(rootBone);
  let spineCandidate: THREE.Object3D | null = null;

  for (const child of rootChildren) {
    const name = child.name;
    if (name.includes('.R') && !name.includes('Plane') && !name.includes('Cube') && !name.includes('Cylinder')) {
      // Right side limb -- could be leg
      parts.upperLegR = child;
    } else if (name.includes('.L') && !name.includes('Plane') && !name.includes('Cube') && !name.includes('Cylinder')) {
      // Left side limb -- could be leg
      parts.upperLegL = child;
    } else if (name.startsWith('Bone') && !name.includes('.R') && !name.includes('.L')) {
      // Center bone -- spine candidate
      if (!spineCandidate) spineCandidate = child;
    }
  }

  // Traverse spine chain
  if (spineCandidate) {
    parts.spine = spineCandidate;
    const spineChildren = getBoneChildren(spineCandidate);

    // The torso is the first non-sided child bone of spine
    for (const sc of spineChildren) {
      if (sc.name.startsWith('Bone') && !sc.name.includes('.R') && !sc.name.includes('.L')) {
        parts.torso = sc;
        break;
      }
    }

    // Look for arms (R/L suffixed bones) in spine or torso
    const searchIn = parts.torso || spineCandidate;
    const torsoChildren = getBoneChildren(searchIn);
    for (const tc of torsoChildren) {
      const name = tc.name;
      if (name.includes('.R') && name.startsWith('Bone') && !name.includes('Plane')) {
        if (!parts.upperArmR) parts.upperArmR = tc;
      } else if (name.includes('.L') && name.startsWith('Bone') && !name.includes('Plane')) {
        if (!parts.upperArmL) parts.upperArmL = tc;
      } else if (name.startsWith('Bone') && !name.includes('.R') && !name.includes('.L')) {
        // Could be head chain
        if (!parts.head) parts.head = tc;
      }
    }
  }

  // Drill into limbs to find lower segments
  function findLowerLimb(upper: THREE.Object3D | null): THREE.Object3D | null {
    if (!upper) return null;
    const bc = getBoneChildren(upper);
    for (const c of bc) {
      if (c.name.startsWith('Bone')) return c;
    }
    return bc.length > 0 ? bc[0] : null;
  }

  function findHandBone(forearm: THREE.Object3D | null): THREE.Object3D | null {
    if (!forearm) return null;
    const bc = getBoneChildren(forearm);
    for (const c of bc) {
      if (c.name.startsWith('Bone')) {
        // Go one deeper if available
        const deeper = getBoneChildren(c);
        for (const d of deeper) {
          if (d.name.startsWith('Bone')) return d;
        }
        return c;
      }
    }
    return bc.length > 0 ? bc[0] : null;
  }

  parts.lowerLegR = findLowerLimb(parts.upperLegR);
  parts.lowerLegL = findLowerLimb(parts.upperLegL);
  parts.lowerArmR = findLowerLimb(parts.upperArmR);
  parts.lowerArmL = findLowerLimb(parts.upperArmL);
  parts.handR = findHandBone(parts.lowerArmR);

  return parts;
}

// =============================================================================
// Animation functions (operate on Object3D nodes, not Skeleton)
// =============================================================================

function applyWalkToHierarchy(parts: MechParts, t: number, lerpFactor: number) {
  const phase = t * WALK_SPEED;
  const sinP = Math.sin(phase);

  const legAngle = sinP * WALK_LEG_AMPLITUDE;
  const armAngle = sinP * WALK_ARM_AMPLITUDE;

  // Upper legs
  if (parts.upperLegL) {
    _euler.set(legAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    parts.upperLegL.quaternion.slerp(_targetQuat, lerpFactor);
  }
  if (parts.upperLegR) {
    _euler.set(-legAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    parts.upperLegR.quaternion.slerp(_targetQuat, lerpFactor);
  }

  // Lower legs (knees)
  const kneeAngleL = Math.max(0, sinP) * WALK_KNEE_AMP;
  const kneeAngleR = Math.max(0, -sinP) * WALK_KNEE_AMP;

  if (parts.lowerLegL) {
    _euler.set(kneeAngleL, 0, 0);
    _targetQuat.setFromEuler(_euler);
    parts.lowerLegL.quaternion.slerp(_targetQuat, lerpFactor);
  }
  if (parts.lowerLegR) {
    _euler.set(kneeAngleR, 0, 0);
    _targetQuat.setFromEuler(_euler);
    parts.lowerLegR.quaternion.slerp(_targetQuat, lerpFactor);
  }

  // Upper arms (counter-swing)
  if (parts.upperArmL) {
    _euler.set(-armAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    parts.upperArmL.quaternion.slerp(_targetQuat, lerpFactor);
  }
  if (parts.upperArmR) {
    _euler.set(armAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    parts.upperArmR.quaternion.slerp(_targetQuat, lerpFactor);
  }

  // Lower arms (elbows)
  const elbowAngle = Math.abs(sinP) * WALK_ELBOW_AMP;
  if (parts.lowerArmL) {
    _euler.set(-elbowAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    parts.lowerArmL.quaternion.slerp(_targetQuat, lerpFactor);
  }
  if (parts.lowerArmR) {
    _euler.set(-elbowAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    parts.lowerArmR.quaternion.slerp(_targetQuat, lerpFactor);
  }

  // Torso twist
  if (parts.torso || parts.spine) {
    const torsoBone = parts.torso || parts.spine;
    _euler.set(0, sinP * WALK_TORSO_TWIST, 0);
    _targetQuat.setFromEuler(_euler);
    torsoBone!.quaternion.slerp(_targetQuat, lerpFactor);
  }

  // Hips bob
  if (parts.root) {
    const bobAmount = Math.abs(Math.cos(phase)) * WALK_BOB;
    parts.root.position.y += bobAmount;
  }
}

function applySwingToHierarchy(parts: MechParts, swingT: number, lerpFactor: number) {
  const ease = swingT < 0.5
    ? 2 * swingT * swingT
    : 1 - Math.pow(-2 * swingT + 2, 2) / 2;

  // Right upper arm: 3-axis
  if (parts.upperArmR) {
    _euler.set(ease * SWING_SHOULDER_PITCH, ease * SWING_SHOULDER_YAW, ease * SWING_SHOULDER_ROLL);
    _targetQuat.setFromEuler(_euler);
    parts.upperArmR.quaternion.slerp(_targetQuat, lerpFactor);
  }

  // Right forearm: 2-axis
  if (parts.lowerArmR) {
    _euler.set(ease * SWING_FOREARM_PITCH, 0, ease * SWING_FOREARM_ROLL);
    _targetQuat.setFromEuler(_euler);
    parts.lowerArmR.quaternion.slerp(_targetQuat, lerpFactor);
  }

  // Left arm: counter-pose
  if (parts.upperArmL) {
    _euler.set(ease * 0.3, ease * 0.15, 0);
    _targetQuat.setFromEuler(_euler);
    parts.upperArmL.quaternion.slerp(_targetQuat, lerpFactor);
  }

  // Torso twist into swing
  if (parts.torso || parts.spine) {
    const torsoBone = parts.torso || parts.spine;
    _euler.set(0, ease * 0.15, ease * -0.05);
    _targetQuat.setFromEuler(_euler);
    torsoBone!.quaternion.slerp(_targetQuat, lerpFactor);
  }
}

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

function findMechCandidates(node: THREE.Object3D): THREE.Object3D[] {
  const children = node.children;
  if (children.length > 1) return children;
  if (children.length === 1) return findMechCandidates(children[0]);
  return [node];
}

function FallbackCapsule({ color = '#cc4444' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

function RiggedMechEntityInner(props: RiggedMechEntityProps) {
  const { scene } = useGLTF(RIGGED_MECHS_PACK_GLB_URL);
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

  const cloneRef = useRef<THREE.Group | null>(null);
  const partsRef = useRef<MechParts | null>(null);
  const walkTime = useRef(0);
  const swingTime = useRef(0);
  const wasSwinging = useRef(false);
  const loggedRef = useRef(false);


  // Pick one mech from the pack
  const source = useMemo(() => {
    const roots = scene.children;
    if (roots.length === 0) return scene as unknown as THREE.Group;
    const candidates = roots.length > 1 ? roots : findMechCandidates(roots[0]);
    const count = Math.max(1, candidates.length);
    const index = Math.max(0, mechIndex % count);
    return candidates[index] as THREE.Group;
  }, [scene, mechIndex]);

  const cloned = useMemo(() => {
    const c = source.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (color && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const result = mats.map((m) => {
            if (!(m as THREE.MeshStandardMaterial).isMeshStandardMaterial) return m;
            const mat = (m as THREE.MeshStandardMaterial).clone();
            mat.emissive.setStyle?.(color) ?? mat.emissive.set(color);
            mat.emissiveIntensity = 0.12;
            return mat as THREE.Material;
          });
          mesh.material = result.length === 1 ? result[0] : result;
        }
      }
    });
    normalizeToHeight(c, DEFAULT_TARGET_HEIGHT);
    cloneRef.current = c;

    // Discover body parts from hierarchy
    const parts = discoverMechParts(c);
    partsRef.current = parts;

    // Apply segment scales immediately on the discovered parts
    if (parts.head) parts.head.scale.set(scaleHead, scaleHead, scaleHead);
    if (parts.torso || parts.spine) {
      const tb = (parts.torso || parts.spine)!;
      tb.scale.set(scaleTorso, scaleTorso, scaleTorso);
    }
    if (parts.upperArmL) parts.upperArmL.scale.set(scaleArms, scaleArms, scaleArms);
    if (parts.upperArmR) parts.upperArmR.scale.set(scaleArms, scaleArms, scaleArms);
    if (parts.lowerArmL) parts.lowerArmL.scale.set(scaleArms, scaleArms, scaleArms);
    if (parts.lowerArmR) parts.lowerArmR.scale.set(scaleArms, scaleArms, scaleArms);
    if (parts.upperLegL) parts.upperLegL.scale.set(scaleLegs, scaleLegs, scaleLegs);
    if (parts.upperLegR) parts.upperLegR.scale.set(scaleLegs, scaleLegs, scaleLegs);
    if (parts.lowerLegL) parts.lowerLegL.scale.set(scaleLegs, scaleLegs, scaleLegs);
    if (parts.lowerLegR) parts.lowerLegR.scale.set(scaleLegs, scaleLegs, scaleLegs);
    // Fallback
    if (!parts.head && !parts.torso && !parts.spine && !parts.upperArmL && !parts.upperLegL) {
      const avg = (scaleHead + scaleTorso + scaleArms + scaleLegs) / 4;
      c.scale.multiplyScalar(avg);
    }

    return c;
    // Re-create clone when scale values change so the model rebuilds with new proportions
  }, [source, scene, color, scaleHead, scaleTorso, scaleArms, scaleLegs]);

  const swordGroup = useMemo(() => makeSword(), []);
  const idleTime = useRef(0);
  const debugFrameCount = useRef(0);

  useFrame((_, delta) => {
    const root = cloneRef.current;
    const parts = partsRef.current;
    if (!root || !parts) return;

    const walking = isWalkingRef ? isWalkingRef.current : isWalking;
    const lerpFactor = Math.min(1, delta * 8);
    idleTime.current += delta;

    // #region agent log
    debugFrameCount.current++;
    // #endregion

    // ---- Idle micro-motion ----
    if (!walking && !isSwinging && !wasSwinging.current) {
      const t = idleTime.current;
      if (parts.root) {
        parts.root.position.y += Math.sin(t * 1.5) * 0.015;
      }
      if (parts.torso || parts.spine) {
        const tb = parts.torso || parts.spine;
        _euler.set(0, Math.sin(t * 0.8) * 0.012, 0);
        _targetQuat.setFromEuler(_euler);
        tb!.quaternion.slerp(_targetQuat, 0.08);
      }
    }

    // ---- Walk ----
    if (walking) {
      walkTime.current += delta;
      applyWalkToHierarchy(parts, walkTime.current, lerpFactor);
    } else {
      walkTime.current *= 0.92;
      applyWalkToHierarchy(parts, walkTime.current, 0.1);
    }

    // ---- Swing ----
    if (isSwinging) {
      wasSwinging.current = true;
      swingTime.current = Math.min(1, swingTime.current + delta / SWING_DURATION);
      applySwingToHierarchy(parts, swingTime.current, lerpFactor);
    } else {
      if (wasSwinging.current) {
        swingTime.current = Math.max(0, swingTime.current - delta / SWING_DURATION);
        applySwingToHierarchy(parts, swingTime.current, lerpFactor);
        if (swingTime.current <= 0) wasSwinging.current = false;
      }
    }

    // Segment scaling is applied in useMemo when clone is created (rebuilds on scale change)

    // ---- Update sword world matrix so BotOpponent can read its world position ----
    if (swordRef?.current) {
      swordRef.current.updateWorldMatrix(true, false);
    }
  });

  // Attach sword to hand bone (or best available arm bone)
  useEffect(() => {
    const parts = partsRef.current;
    if (!swordRef || !parts) return;

    // Find deepest bone in the right arm chain for sword attachment
    const handBone = parts.handR || parts.lowerArmR || parts.upperArmR;
    if (!handBone) {
      // Fallback: attach sword directly to the mech root so it's at least present
      if (cloneRef.current) {
        cloneRef.current.add(swordGroup);
        swordGroup.position.set(0.3, 1.2, 0);
        swordRef.current = swordGroup;
        return () => {
          cloneRef.current?.remove(swordGroup);
          swordRef.current = null;
        };
      }
      return;
    }

    // Scale sword down since the model is normalized to 2 units
    swordGroup.scale.setScalar(0.3);
    handBone.add(swordGroup);
    swordRef.current = swordGroup;
    return () => {
      handBone.remove(swordGroup);
      swordRef.current = null;
    };
  }, [swordRef, cloned, swordGroup]);

  return (
    <group rotation={[0, rotationYOffset, 0]}>
      <primitive object={cloned} />
    </group>
  );
}

export function RiggedMechEntity(props: RiggedMechEntityProps) {
  return (
    <Suspense fallback={<FallbackCapsule color={props.color} />}>
      <RiggedMechEntityInner {...props} />
    </Suspense>
  );
}

export function preloadRiggedMechPack() {
  useGLTF.preload(RIGGED_MECHS_PACK_GLB_URL);
}
