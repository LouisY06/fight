// =============================================================================
// CVDrivenAvatarModel.tsx — Robot GLB with skeleton driven by CV world landmarks
// Maps MediaPipe pose (worldLandmarksRef) to the biped_robot.glb skeleton.
// =============================================================================

import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { cvBridge } from '../cv/cvBridge';
import { AVATAR_GLB_URL } from './AvatarModel';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

const TARGET_HEIGHT = 2;
const SLERP_FACTOR = 0.35;

// MediaPipe Pose landmark indices
const R_SHOULDER = 12;
const R_ELBOW = 14;
const R_WRIST = 16;
const L_SHOULDER = 11;
const L_ELBOW = 13;
const L_WRIST = 15;

/** Possible bone names per limb (try in order; biped_robot may use different naming). */
const BONE_NAMES: Record<string, string[]> = {
  upperArmR: ['UpperArm_R', 'Arm_R', 'Shoulder_R', 'upper_arm_r'],
  forearmR: ['Forearm_R', 'LowerArm_R', 'forearm_r', 'Arm_R_1'],
  upperArmL: ['UpperArm_L', 'Arm_L', 'Shoulder_L', 'upper_arm_l'],
  forearmL: ['Forearm_L', 'LowerArm_L', 'forearm_l', 'Arm_L_1'],
};

function getBoneByName(skeleton: THREE.Skeleton, names: string[]): THREE.Bone | null {
  for (const name of names) {
    const bone = skeleton.bones.find((b) => b.name === name);
    if (bone) return bone;
  }
  return null;
}

/** Rotate a bone so it points from startLM toward endLM. Rest axis = default bone direction in the rig. */
function syncBoneToLandmarks(
  bone: THREE.Bone | null,
  startLM: NormalizedLandmark,
  endLM: NormalizedLandmark,
  restAxis: THREE.Vector3,
  slerpFactor: number
) {
  if (!bone) return;

  const direction = new THREE.Vector3(
    endLM.x - startLM.x,
    -(endLM.y - startLM.y),
    endLM.z - startLM.z
  ).normalize();

  if (direction.lengthSq() < 0.001) return;

  const targetQuat = new THREE.Quaternion().setFromUnitVectors(restAxis, direction);
  bone.quaternion.slerp(targetQuat, slerpFactor);
}

/** Get skeleton from a loaded GLTF scene (first SkinnedMesh found). */
function getSkeletonFromScene(scene: THREE.Group): THREE.Skeleton | null {
  let skinned: THREE.SkinnedMesh | null = null;
  scene.traverse((node) => {
    if (!skinned && (node as THREE.SkinnedMesh).isSkinnedMesh) {
      skinned = node as THREE.SkinnedMesh;
    }
  });
  if (!skinned) return null;
  return (skinned as THREE.SkinnedMesh).skeleton;
}

/** Clone the scene and give the clone its own skeleton so bone updates don't affect other instances. */
function cloneSceneWithOwnSkeleton(scene: THREE.Group): THREE.Group {
  const clone = scene.clone();
  const originalSkeleton = getSkeletonFromScene(scene);
  if (!originalSkeleton) return clone;

  const bonesByName: Record<string, THREE.Bone> = {};
  clone.traverse((node) => {
    if ((node as THREE.Bone).isBone) {
      bonesByName[(node as THREE.Bone).name] = node as THREE.Bone;
    }
  });

  const clonedBones: THREE.Bone[] = [];
  for (const origBone of originalSkeleton.bones) {
    const b = bonesByName[origBone.name];
    if (b) clonedBones.push(b);
  }

  if (clonedBones.length === 0) return clone;

  const newSkeleton = new THREE.Skeleton(clonedBones, originalSkeleton.boneInverses);
  let assigned = false;
  clone.traverse((node) => {
    if (!assigned && (node as THREE.SkinnedMesh).isSkinnedMesh) {
      (node as THREE.SkinnedMesh).skeleton = newSkeleton;
      assigned = true;
    }
  });

  return clone;
}

function fitAndCenter(group: THREE.Group) {
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  group.position.sub(center);
  const scale = TARGET_HEIGHT / Math.max(size.y, 0.001);
  group.scale.setScalar(scale);
}

// Many GLB rigs have upper arm pointing down (0, -1, 0) or forward (0, 0, 1). Tweak if limbs point wrong.
const REST_AXIS_UPPER = new THREE.Vector3(0, -1, 0);
const REST_AXIS_FOREARM = new THREE.Vector3(0, -1, 0);

function CVDrivenAvatarModelInner() {
  const { scene } = useGLTF(AVATAR_GLB_URL);
  const worldLandmarksRef = cvBridge.worldLandmarksRef;
  const cvInputRef = cvBridge.cvInputRef;
  const isTracking = cvBridge.isTracking;

  const groupRef = useRef<THREE.Group>(null!);
  const skeletonRef = useRef<THREE.Skeleton | null>(null);
  const loggedBones = useRef(false);

  const cloned = useMemo(() => {
    const c = cloneSceneWithOwnSkeleton(scene);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        (node as THREE.Mesh).castShadow = true;
        (node as THREE.Mesh).receiveShadow = true;
      }
    });
    fitAndCenter(c);
    const skel = getSkeletonFromScene(c);
    skeletonRef.current = skel;
    if (skel && !loggedBones.current) {
      console.log('[CVDrivenAvatarModel] Bone names in biped_robot.glb:', skel.bones.map((b) => b.name));
      loggedBones.current = true;
    }
    return c;
  }, [scene]);

  useFrame(() => {
    const group = groupRef.current;
    const skeleton = skeletonRef.current;
    if (!group || !skeleton) return;

    const landmarks = worldLandmarksRef.current;
    const cvInput = cvInputRef.current;

    if (cvInput) {
      group.position.set(cvInput.posOffsetX, 0, cvInput.posOffsetZ);
    }

    if (!landmarks || landmarks.length < 17 || !isTracking) return;

    const upperArmR = getBoneByName(skeleton, BONE_NAMES.upperArmR);
    const forearmR = getBoneByName(skeleton, BONE_NAMES.forearmR);
    const upperArmL = getBoneByName(skeleton, BONE_NAMES.upperArmL);
    const forearmL = getBoneByName(skeleton, BONE_NAMES.forearmL);

    syncBoneToLandmarks(upperArmR, landmarks[R_SHOULDER], landmarks[R_ELBOW], REST_AXIS_UPPER, SLERP_FACTOR);
    syncBoneToLandmarks(forearmR, landmarks[R_ELBOW], landmarks[R_WRIST], REST_AXIS_FOREARM, SLERP_FACTOR);
    syncBoneToLandmarks(upperArmL, landmarks[L_SHOULDER], landmarks[L_ELBOW], REST_AXIS_UPPER, SLERP_FACTOR);
    syncBoneToLandmarks(forearmL, landmarks[L_ELBOW], landmarks[L_WRIST], REST_AXIS_FOREARM, SLERP_FACTOR);
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

/** Fallback when GLB fails or no skeleton. */
function FallbackCapsule() {
  return (
    <group>
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial color="#4488cc" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#4488cc" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

export function CVDrivenAvatarModel() {
  return (
    <Suspense fallback={<FallbackCapsule />}>
      <CVDrivenAvatarModelInner />
    </Suspense>
  );
}
