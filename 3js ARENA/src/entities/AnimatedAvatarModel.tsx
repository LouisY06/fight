// =============================================================================
// AnimatedAvatarModel.tsx — Robot GLB with procedural walk + sword swing
// Drives skeleton bones for walk cycle and swing; works even if GLB has no clips.
// =============================================================================

import { useRef, useMemo, Suspense, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AVATAR_GLB_URL, normalizeToHeight } from './AvatarModel';
import type { AvatarModelProps } from './AvatarModel';

const DEFAULT_TARGET_HEIGHT = 2;
const WALK_SPEED = 5;
const WALK_LEG_AMPLITUDE = 0.45;
const WALK_ARM_AMPLITUDE = 0.35;
const SWING_DURATION = 0.35;
const SWING_ARM_PITCH = -1.1; // rad: arm forward/down for slash

/** Try multiple possible bone names (rig-dependent). */
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
  if (!skinned) return null;
  return (skinned as THREE.SkinnedMesh).skeleton;
}

function cloneSceneWithOwnSkeleton(scene: THREE.Group): THREE.Group {
  const clone = scene.clone();
  const orig = getSkeletonFromScene(scene);
  if (!orig) return clone;

  const byName: Record<string, THREE.Bone> = {};
  clone.traverse((node) => {
    if ((node as THREE.Bone).isBone) byName[(node as THREE.Bone).name] = node as THREE.Bone;
  });
  const bones = orig.bones.map((b) => byName[b.name]).filter(Boolean) as THREE.Bone[];
  if (bones.length === 0) return clone;

  const skel = new THREE.Skeleton(bones, orig.boneInverses);
  let done = false;
  clone.traverse((node) => {
    if (!done && (node as THREE.SkinnedMesh).isSkinnedMesh) {
      (node as THREE.SkinnedMesh).skeleton = skel;
      done = true;
    }
  });
  return clone;
}


// Rest rotations for limbs (so we can blend back from walk/swing)
const _restQuat = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();

function applyWalk(
  skeleton: THREE.Skeleton,
  t: number,
  lerpFactor: number
) {
  const phase = t * WALK_SPEED;
  const legL = getBone(skeleton, BONE_ALIASES.upperLegL);
  const legR = getBone(skeleton, BONE_ALIASES.upperLegR);
  const armL = getBone(skeleton, BONE_ALIASES.upperArmL);
  const armR = getBone(skeleton, BONE_ALIASES.upperArmR);

  const legAngle = Math.sin(phase) * WALK_LEG_AMPLITUDE;
  const armAngle = Math.sin(phase) * WALK_ARM_AMPLITUDE; // arms opposite to legs if phase + PI

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

function applySwing(
  skeleton: THREE.Skeleton,
  swingT: number,
  lerpFactor: number
) {
  const upperR = getBone(skeleton, BONE_ALIASES.upperArmR);
  const lowerR = getBone(skeleton, BONE_ALIASES.lowerArmR);
  // swingT 0 = rest, 1 = full slash
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

function AnimatedAvatarModelInner(props: AnimatedAvatarModelProps) {
  const { scene } = useGLTF(AVATAR_GLB_URL);
  const targetHeight = props.targetHeight ?? DEFAULT_TARGET_HEIGHT;
  const scaleProp = props.scale;
  const { isWalking = false, isSwinging, isWalkingRef } = props;

  const cloneRef = useRef<THREE.Group | null>(null);
  const walkTime = useRef(0);
  const swingTime = useRef(0);
  const wasSwinging = useRef(false);

  const loggedBones = useRef(false);
  const accentColor = props.color;
  const cloned = useMemo(() => {
    const c = cloneSceneWithOwnSkeleton(scene);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (accentColor && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const result = mats.map((m) => {
            if (!(m as THREE.MeshStandardMaterial).isMeshStandardMaterial) return m;
            const mat = (m as THREE.MeshStandardMaterial).clone();
            mat.emissive.set(accentColor);
            mat.emissiveIntensity = 0.12;
            return mat as THREE.Material;
          });
          mesh.material = result.length === 1 ? result[0] : result;
        }
      }
    });
    normalizeToHeight(c, targetHeight);
    cloneRef.current = c;
    const skel = getSkeletonFromScene(c);
    if (skel && !loggedBones.current) {
      console.log('[AnimatedAvatarModel] Bone names:', skel.bones.map((b) => b.name));
      loggedBones.current = true;
    }
    return c;
  }, [scene, targetHeight, accentColor]);

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

  return (
    <group position={[0, 0, 0]} scale={scaleProp ?? [1, 1, 1]}>
      <primitive object={cloned} />
    </group>
  );
}

export interface AnimatedAvatarModelProps extends AvatarModelProps {
  isWalking?: boolean;
  isSwinging: boolean;
  /** When provided, read walking state from ref each frame (e.g. for network opponent). */
  isWalkingRef?: MutableRefObject<boolean>;
}

export function AnimatedAvatarModel(props: AnimatedAvatarModelProps) {
  return (
    <Suspense fallback={<FallbackCapsule color={props.color} />}>
      <AnimatedAvatarModelInner {...props} />
    </Suspense>
  );
}
