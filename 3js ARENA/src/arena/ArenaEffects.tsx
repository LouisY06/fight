// =============================================================================
// ArenaEffects.tsx — Fog, ambient particles, post-processing
// Bloom intensity spikes during countdown for impact and during sword swings.
// =============================================================================

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useGameStore } from '../game/GameState';
import { isGlobalSwingActive } from '../combat/SwingState';
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
// NOTE: We do NOT pass a `ref` to <Bloom> because React 19 treats `ref` as a
// regular prop. The library's `wrapEffect` helper calls JSON.stringify(props)
// for memoisation, and the BloomEffect instance has circular internal refs
// (KawaseBlurPass → Resolution → resizable → KawaseBlurPass) which crash
// JSON.stringify.  Instead we grab the EffectComposer instance via its own
// forwardRef and locate the BloomEffect through its pass list.
// ---------------------------------------------------------------------------

function PostProcessing() {
  const phase = useGameStore((s) => s.phase);
  const isIntroOrCountdown = phase === 'intro' || phase === 'countdown';

  // Ref to the raw postprocessing EffectComposer (exposed via forwardRef)
  const composerRef = useRef<any>(null);
  // Cached BloomEffect — found once, reused every frame
  const bloomCache = useRef<any>(null);
  const smoothBloom = useRef(0.7);
  const smoothThreshold = useRef(0.4);

  useFrame((_, delta) => {
    // Lazily locate the BloomEffect inside the composer's passes
    if (!bloomCache.current && composerRef.current) {
      for (const pass of composerRef.current.passes) {
        if (pass.effects) {
          for (const effect of pass.effects) {
            if (effect.name === 'BloomEffect') {
              bloomCache.current = effect;
              break;
            }
          }
        }
        if (bloomCache.current) break;
      }
    }

    if (!bloomCache.current) return;
    const bloom = bloomCache.current;

    const swinging = isGlobalSwingActive();
    let targetIntensity: number;
    let targetThreshold: number;

    if (isIntroOrCountdown) {
      targetIntensity = 1.5;
      targetThreshold = 1.0;
    } else if (swinging) {
      // Bloom spike during sword swing — makes the neon glow pop
      targetIntensity = 1.8;
      targetThreshold = 0.25;
    } else {
      targetIntensity = 0.7;
      targetThreshold = 0.4;
    }

    // Smooth transition (fast attack, slower release)
    const speed = targetIntensity > smoothBloom.current ? 12 : 4;
    smoothBloom.current += (targetIntensity - smoothBloom.current) * Math.min(1, delta * speed);
    smoothThreshold.current += (targetThreshold - smoothThreshold.current) * Math.min(1, delta * speed);

    // Write directly to the effect's uniforms / material
    bloom.intensity = smoothBloom.current;
    if (bloom.luminanceMaterial) {
      bloom.luminanceMaterial.threshold = smoothThreshold.current;
    }
  });

  return (
    <EffectComposer ref={composerRef}>
      <Bloom
        intensity={0.7}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.1} darkness={0.8} />
    </EffectComposer>
  );
}
