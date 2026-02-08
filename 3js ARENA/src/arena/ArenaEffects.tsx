// =============================================================================
// ArenaEffects.tsx — Fog, ambient particles, post-processing
// Bloom intensity spikes during countdown for impact; MotionBlur not in package.
// =============================================================================

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useGameStore } from '../game/GameState';
import type { ArenaTheme } from './arenaThemes';

interface ArenaEffectsProps {
  theme: ArenaTheme;
}

export function ArenaEffects({ theme }: ArenaEffectsProps) {
  return (
    <>
      <AmbientParticles color={theme.particleColor} />
      <FogSetup
        color={theme.fog.color}
        near={theme.fog.near}
        far={theme.fog.far}
      />
      <PostProcessing />
    </>
  );
}

// ---------------------------------------------------------------------------
// Ambient floating particles (dust / embers)
// ---------------------------------------------------------------------------

function AmbientParticles({ color, count = 200 }: { color: string; count?: number }) {
  const meshRef = useRef<THREE.Points>(null!);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = Math.random() * 0.005 + 0.002;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    return { positions, velocities };
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;
    const posAttr = meshRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 3];
      arr[i * 3 + 1] += velocities[i * 3 + 1];
      arr[i * 3 + 2] += velocities[i * 3 + 2];

      // Reset particles that go too high
      if (arr[i * 3 + 1] > 12) {
        arr[i * 3] = (Math.random() - 0.5) * 20;
        arr[i * 3 + 1] = -1;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.05}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Scene fog setup
// ---------------------------------------------------------------------------

function FogSetup({
  color,
  near,
  far,
}: {
  color: string;
  near: number;
  far: number;
}) {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.Fog(color, near, far);
    return () => {
      scene.fog = null;
    };
  }, [scene, color, near, far]);

  return null;
}

// ---------------------------------------------------------------------------
// Post-processing: Bloom + Vignette (Bloom spikes during intro/countdown)
// ---------------------------------------------------------------------------

function PostProcessing() {
  const phase = useGameStore((s) => s.phase);
  const isIntroOrCountdown = phase === 'intro' || phase === 'countdown';
  const bloomIntensity = isIntroOrCountdown ? 1.5 : 0.7;
  const luminanceThreshold = isIntroOrCountdown ? 1 : 0.4;

  return (
    <EffectComposer>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={luminanceThreshold}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.1} darkness={0.8} />
    </EffectComposer>
  );
}
