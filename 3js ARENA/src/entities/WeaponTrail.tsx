// =============================================================================
// WeaponTrail.tsx — Sword swing trail / muzzle flash particle effect
// =============================================================================

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WeaponTrailProps {
  color: string;
  length?: number;
}

// Pre-allocated temp objects
const _worldPos = new THREE.Vector3();
const _up = new THREE.Vector3(0, 0.3, 0);

/**
 * Simple ribbon trail that follows the weapon during attacks.
 * Uses a dynamically updated PlaneGeometry.
 */
export function WeaponTrail({ color, length = 10 }: WeaponTrailProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const positionsRef = useRef<THREE.Vector3[]>([]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array(length * 2 * 3);
    const uvs = new Float32Array(length * 2 * 2);
    const indices: number[] = [];

    for (let i = 0; i < length; i++) {
      uvs[i * 4] = i / (length - 1);
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = i / (length - 1);
      uvs[i * 4 + 3] = 1;
    }

    for (let i = 0; i < length - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, c, b, b, c, d);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }, [length]);

  // Dispose geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(() => {
    if (!meshRef.current) return;

    meshRef.current.parent?.getWorldPosition(_worldPos);

    positionsRef.current.unshift(_worldPos.clone());
    if (positionsRef.current.length > length) {
      positionsRef.current.length = length;
    }

    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;

    for (let i = 0; i < length; i++) {
      const pos = positionsRef.current[i] ?? positionsRef.current[positionsRef.current.length - 1];
      if (!pos) continue;
      arr[i * 6] = pos.x - _up.x;
      arr[i * 6 + 1] = pos.y - _up.y;
      arr[i * 6 + 2] = pos.z - _up.z;
      arr[i * 6 + 3] = pos.x + _up.x;
      arr[i * 6 + 4] = pos.y + _up.y;
      arr[i * 6 + 5] = pos.z + _up.z;
    }
    positions.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
