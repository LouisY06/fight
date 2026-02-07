// =============================================================================
// HitEffect.tsx — Spark burst on hit (particle emitter)
// =============================================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HitEffectProps {
  position: [number, number, number];
  color?: string;
  onComplete?: () => void;
}

const PARTICLE_COUNT = 30;
const LIFETIME = 0.6; // seconds

/**
 * Burst of spark particles at hit location. Auto-removes after lifetime.
 */
export function HitEffect({
  position,
  color = '#ffaa00',
  onComplete,
}: HitEffectProps) {
  const pointsRef = useRef<THREE.Points>(null!);
  const elapsed = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      // Random outward velocity
      velocities[i * 3] = (Math.random() - 0.5) * 4;
      velocities[i * 3 + 1] = Math.random() * 3 + 1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return { positions, velocities };
  }, []);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current > LIFETIME) {
      onComplete?.();
      return;
    }

    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const progress = elapsed.current / LIFETIME;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] += velocities[i * 3] * delta;
      arr[i * 3 + 1] += velocities[i * 3 + 1] * delta - 4.9 * delta * delta; // gravity
      arr[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    posAttr.needsUpdate = true;

    // Fade out
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = 1 - progress;
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={PARTICLE_COUNT}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.08}
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
