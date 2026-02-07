// =============================================================================
// RobotEntity.tsx — Robot entity: SkeletonUtils clone of prefab + walk/swing
// Use with RobotPrefabProvider; GLB is loaded once, each entity is a clone.
// =============================================================================

import { useRef, useMemo, Suspense, type MutableRefObject, type ReactNode } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { useRobotPrefab } from './RobotPrefabContext';
import { normalizeToHeight } from '../entities/AvatarModel';
import type { AvatarModelProps } from '../entities/AvatarModel';

const DEFAULT_TARGET_HEIGHT = 2;
const WALK_SPEED = 5;
const WALK_LEG_AMPLITUDE = 0.45;
const WALK_ARM_AMPLITUDE = 0.35;
const SWING_DURATION = 0.35;
const SWING_ARM_PITCH = -1.1;

const BONE_ALIASES: Record<string, string[]> = {
  upperLegL: ['LeftUpperLeg', 'UpperLeg_L', 'upper_leg_l', 'Thigh_L'],
  upperLegR: ['RightUpperLeg', 'UpperLeg_R', 'upper_leg_r', 'Thigh_R'],
  lowerLegL: ['LeftLowerLeg', 'LowerLeg_L', 'lower_leg_l', 'Shin_L'],
  lowerLegR: ['RightLowerLeg', 'LowerLeg_R', 'lower_leg_r', 'Shin_R'],
  upperArmR: ['RightUpperArm', 'UpperArm_R', 'Arm_R', 'upper_arm_r'],
  lowerArmR: ['RightLowerArm', 'Forearm_R', 'LowerArm_R', 'forearm_r'],
  upperArmL: ['LeftUpperArm', 'UpperArm_L', 'Arm_L', 'upper_arm_l'],
};

function getBone(skeleton: THREE.Skeleton, aliases: string[]): THREE.Bone | null {
  for (const name of aliases) {
    const b = skeleton.bones.find((x) => x.name === name);
    if (b) return b;
  }
  return null;
}

function getSkeletonFromScene(scene: THREE.Group): THREE.Skeleton | null {
  let skinned: THREE.SkinnedMesh | null = null;
  scene.traverse((node) => {
    if (!skinned && (node as THREE.SkinnedMesh).isSkinnedMesh)
      skinned = node as THREE.SkinnedMesh;
  });
  return skinned ? (skinned as THREE.SkinnedMesh).skeleton : null;
}

const _restQuat = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();

function applyWalk(skeleton: THREE.Skeleton, t: number, lerpFactor: number) {
  const phase = t * WALK_SPEED;
  const legL = getBone(skeleton, BONE_ALIASES.upperLegL);
  const legR = getBone(skeleton, BONE_ALIASES.upperLegR);
  const armL = getBone(skeleton, BONE_ALIASES.upperArmL);
  const armR = getBone(skeleton, BONE_ALIASES.upperArmR);
  const legAngle = Math.sin(phase) * WALK_LEG_AMPLITUDE;
  const armAngle = Math.sin(phase) * WALK_ARM_AMPLITUDE;
  if (legL) {
    _euler.set(legAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    legL.quaternion.slerp(_targetQuat, lerpFactor);
  }
  if (legR) {
    _euler.set(-legAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    legR.quaternion.slerp(_targetQuat, lerpFactor);
  }
  if (armL) {
    _euler.set(-armAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    armL.quaternion.slerp(_targetQuat, lerpFactor);
  }
  if (armR) {
    _euler.set(armAngle, 0, 0);
    _targetQuat.setFromEuler(_euler);
    armR.quaternion.slerp(_targetQuat, lerpFactor);
  }
}

function applySwing(skeleton: THREE.Skeleton, swingT: number, lerpFactor: number) {
  const upperR = getBone(skeleton, BONE_ALIASES.upperArmR);
  const lowerR = getBone(skeleton, BONE_ALIASES.lowerArmR);
  const pitch = SWING_ARM_PITCH * swingT;
  if (upperR) {
    _euler.set(pitch * 0.7, 0, 0);
    _targetQuat.setFromEuler(_euler);
    upperR.quaternion.slerp(_targetQuat, lerpFactor);
  }
  if (lowerR) {
    _euler.set(pitch * 0.4, 0, 0);
    _targetQuat.setFromEuler(_euler);
    lowerR.quaternion.slerp(_targetQuat, lerpFactor);
  }
}

function FallbackCapsule({ color = '#cc4444' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

/** Graph of named nodes from the cloned GLB (from useGraph). Used to attach props e.g. sword to RightHand. */
export type RobotEntityGraph = {
  nodes: Record<string, THREE.Object3D>;
  materials: Record<string, THREE.Material>;
  meshes: Record<string, THREE.Mesh>;
};

export interface RobotEntityProps extends AvatarModelProps {
  isWalking?: boolean;
  isSwinging: boolean;
  isWalkingRef?: MutableRefObject<boolean>;
  /** Optional. Receives the clone's node graph so you can e.g. createPortal(sword, graph.nodes.RightHand). */
  children?: (graph: RobotEntityGraph) => ReactNode;
}

function RobotEntityInner(props: RobotEntityProps) {
  const prefab = useRobotPrefab();
  const targetHeight = props.targetHeight ?? DEFAULT_TARGET_HEIGHT;
  const scaleProp = props.scale;
  const { isWalking = false, isSwinging, isWalkingRef, children } = props;

  const cloneRef = useRef<THREE.Group | null>(null);
  const walkTime = useRef(0);
  const swingTime = useRef(0);
  const wasSwinging = useRef(false);
  const loggedBones = useRef(false);

  const cloned = useMemo(() => {
    if (!prefab) return null;
    const c = clone(prefab) as THREE.Group;

    // Remove flat base/platform meshes that come with the GLB export
    const toRemove: THREE.Object3D[] = [];
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Detect flat disc / platform: very small Y extent relative to X/Z
        const geo = mesh.geometry;
        if (geo) {
          geo.computeBoundingBox();
          const bb = geo.boundingBox;
          if (bb) {
            const sy = bb.max.y - bb.min.y;
            const sx = bb.max.x - bb.min.x;
            const sz = bb.max.z - bb.min.z;
            // If the mesh is very flat (height < 5% of width/depth) it's a base disc
            if (sy > 0 && sx > 0 && sz > 0 && sy / Math.max(sx, sz) < 0.05) {
              toRemove.push(mesh);
            }
          }
        }
      }
    });
    for (const obj of toRemove) {
      console.log('[RobotEntity] Removing base disc mesh:', obj.name);
      obj.removeFromParent();
    }

    normalizeToHeight(c, targetHeight);
    cloneRef.current = c;
    const skel = getSkeletonFromScene(c);
    if (skel && !loggedBones.current) {
      console.log('[RobotEntity] Bone names:', skel.bones.map((b) => b.name));
      loggedBones.current = true;
    }
    return c;
  }, [prefab, targetHeight]);

  useFrame((_, delta) => {
    const root = cloneRef.current;
    if (!root) return;
    const skeleton = getSkeletonFromScene(root);
    if (!skeleton) return;

    const walking = isWalkingRef ? isWalkingRef.current : isWalking;
    const lerpFactor = Math.min(1, delta * 8);

    if (walking) {
      walkTime.current += delta;
      applyWalk(skeleton, walkTime.current, lerpFactor);
    } else {
      walkTime.current *= 0.95;
      applyWalk(skeleton, walkTime.current, 0.12);
    }

    if (isSwinging) {
      wasSwinging.current = true;
      swingTime.current = Math.min(1, swingTime.current + delta / SWING_DURATION);
      applySwing(skeleton, swingTime.current, lerpFactor);
    } else {
      if (wasSwinging.current) {
        swingTime.current = Math.max(0, swingTime.current - delta / SWING_DURATION);
        applySwing(skeleton, swingTime.current, lerpFactor);
        if (swingTime.current <= 0) wasSwinging.current = false;
      }
    }
  });

  const graph = useGraph(cloned!);

  if (!cloned) return <FallbackCapsule color={props.color} />;
  return (
    <group position={[0, 0, 0]} scale={scaleProp ?? [1, 1, 1]}>
      <primitive object={cloned} />
      {typeof children === 'function' ? children(graph) : children}
    </group>
  );
}

export function RobotEntity(props: RobotEntityProps) {
  return (
    <Suspense fallback={<FallbackCapsule color={props.color} />}>
      <RobotEntityInner {...props} />
    </Suspense>
  );
}
