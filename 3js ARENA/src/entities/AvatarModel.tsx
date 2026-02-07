// =============================================================================
// AvatarModel.tsx — GLB character mesh for Player / NetworkOpponent
// Expects GLB at public/assets/characters/biped_robot.glb
// =============================================================================

import { Component, type ReactNode } from 'react';
import { useMemo, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/** Default target height in world units (matches collider). Override with targetHeight prop. */
const DEFAULT_TARGET_HEIGHT = 2;

/** GLB path — ensure biped_robot.glb (or your model) is in public/assets/characters/. */
export const AVATAR_GLB_URL = '/assets/characters/biped_robot.glb';

export interface AvatarModelProps {
  /** Optional tint for fallback capsule (e.g. enemy color). */
  color?: string;
  /**
   * Target height in world units. The model is scaled so its bounding box height equals this.
   * Use a smaller value (e.g. 1.2) if the robot looks too big; default is 2.
   */
  targetHeight?: number;
  /**
   * Optional extra scale applied after fitAndCenter (e.g. [0.5, 0.5, 0.5] for half size).
   * Useful when the GLB has a large internal scale or odd origin.
   */
  scale?: [number, number, number];
}

/**
 * Compute a robust bounding box by reading geometry vertex positions directly.
 * Works reliably for SkinnedMesh / complex GLB hierarchies where Box3.setFromObject
 * can return incorrect results due to stale world matrices or skinning.
 */
function robustBoundingBox(root: THREE.Object3D): THREE.Box3 {
  root.updateWorldMatrix(true, true);

  const box = new THREE.Box3();
  const _pos = new THREE.Vector3();
  let hasPoints = false;

  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!posAttr) return;

    mesh.updateWorldMatrix(true, false);
    for (let i = 0, l = posAttr.count; i < l; i++) {
      _pos.fromBufferAttribute(posAttr, i);
      _pos.applyMatrix4(mesh.matrixWorld);
      if (!hasPoints) {
        box.set(_pos, _pos.clone());
        hasPoints = true;
      } else {
        box.expandByPoint(_pos);
      }
    }
  });

  if (!hasPoints) {
    // Fallback to standard approach
    box.setFromObject(root);
  }
  return box;
}

/**
 * Use THREE.Box3 to normalize GLB: scale to targetHeight (default 2 units) and ground feet at y=0.
 * Centers the model on x/z. Use after loading; ensures correct size for hitboxes and arena.
 */
export function normalizeToHeight(root: THREE.Object3D, targetHeight: number = 2): void {
  const box = robustBoundingBox(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log('[normalizeToHeight] Raw model bounds:', {
    x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2),
    minY: box.min.y.toFixed(2), maxY: box.max.y.toFixed(2),
  });
  const currentHeight = size.y || 1;
  const s = targetHeight / currentHeight;
  // No clamping — trust the vertex-level measurement
  root.scale.setScalar(s);

  const box2 = robustBoundingBox(root);
  root.position.y -= box2.min.y;
  const center = new THREE.Vector3();
  box2.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
}

function AvatarModelInner({ color, targetHeight = DEFAULT_TARGET_HEIGHT, scale: scaleProp }: AvatarModelProps) {
  const { scene } = useGLTF(AVATAR_GLB_URL);
  const cloned = useMemo(() => {
    const c = scene.clone();
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        (node as THREE.Mesh).castShadow = true;
        (node as THREE.Mesh).receiveShadow = true;
      }
    });
    normalizeToHeight(c, targetHeight);
    return c;
  }, [scene, targetHeight]);

  return (
    <group position={[0, 0, 0]} scale={scaleProp ?? [1, 1, 1]}>
      <primitive object={cloned} />
    </group>
  );
}

/** Fallback when the GLB fails to load (e.g. 404). */
function FallbackAvatar({ color = '#4488cc' }: { color?: string }) {
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

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AvatarErrorBoundary extends Component<
  { color?: string; children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[AvatarModel] GLB failed to load. Use fallback. Check that public/assets/characters/biped_robot.glb exists.', error);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackAvatar color={this.props.color} />;
    }
    return this.props.children;
  }
}

export function AvatarModel(props: AvatarModelProps) {
  return (
    <AvatarErrorBoundary color={props.color}>
      <Suspense fallback={<FallbackAvatar color={props.color} />}>
        <AvatarModelInner {...props} />
      </Suspense>
    </AvatarErrorBoundary>
  );
}

/** Preload the avatar so it is ready when entering the game. */
export function preloadAvatar() {
  useGLTF.preload(AVATAR_GLB_URL);
}
