// =============================================================================
// HitEffectManager.tsx — Spawns spark particles and plays sounds on hit
// Lives inside the R3F Canvas. Subscribes to HitEvent.
// =============================================================================

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { onHitEvent, type HitEventData } from './HitEvent';
import { onClashEvent } from './ClashEvent';
import { playSwordHit, playSwordBlock, playSwordClash } from '../audio/SoundManager';
import { useDamageIndicatorStore } from '../ui/DamageIndicator';
import { ElevenLabs } from '../audio/ElevenLabsService';

// ---- Spark config ----
const SPARK_COUNT = 24;
let hitCounter = 0; // Track hits for occasional ElevenLabs SFX
const SPARK_LIFETIME = 0.45; // seconds
const SPARK_SPEED = 5.0;
const GRAVITY = 9.8;

interface SparkBurst {
  id: number;
  position: THREE.Vector3;
  elapsed: number;
  velocities: Float32Array;
  offsets: Float32Array;
}

let nextBurstId = 0;

/**
 * Manages spark particle bursts at hit locations.
 * Each hit spawns a burst of bright sparks that fly outward and fade.
 */
export function HitEffectManager() {
  const [bursts, setBursts] = useState<SparkBurst[]>([]);

  // Clash event listener — plays clash SFX + announcer
  useEffect(() => {
    const unsubClash = onClashEvent(() => {
      // Procedural clash sound (always plays)
      playSwordClash();
      // ElevenLabs announcer voice line
      ElevenLabs.announceSwordClash();
    });
    return unsubClash;
  }, []);

  useEffect(() => {
    const unsub = onHitEvent((data: HitEventData) => {
      // Play hit or block SFX
      if (data.isBlocked) {
        playSwordBlock();
      } else {
        playSwordHit();
      }

      // Floating damage number (center screen)
      useDamageIndicatorStore.getState().addDamageNumber(
        data.amount,
        50,
        false,
        data.isBlocked ?? false
      );

      // Every 3rd hit, layer an ElevenLabs sword clash SFX for richness
      hitCounter++;
      if (hitCounter % 3 === 0) {
        ElevenLabs.playSwordClash();
      }

      // Spawn spark burst
      const velocities = new Float32Array(SPARK_COUNT * 3);
      const offsets = new Float32Array(SPARK_COUNT * 3);
      for (let i = 0; i < SPARK_COUNT; i++) {
        // Random outward velocity (hemisphere toward camera)
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.6; // hemisphere
        const speed = SPARK_SPEED * (0.5 + Math.random() * 0.5);
        velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[i * 3 + 1] = Math.cos(phi) * speed * 0.8 + 1.5; // upward bias
        velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
        offsets[i * 3] = 0;
        offsets[i * 3 + 1] = 0;
        offsets[i * 3 + 2] = 0;
      }

      const burst: SparkBurst = {
        id: nextBurstId++,
        position: data.point.clone(),
        elapsed: 0,
        velocities,
        offsets,
      };

      setBursts((prev) => [...prev, burst]);
    });

    return unsub;
  }, []);

  // Remove expired bursts
  const removeBurst = useCallback((id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <>
      {bursts.map((burst) => (
        <SparkBurstRenderer
          key={burst.id}
          burst={burst}
          onComplete={() => removeBurst(burst.id)}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Individual spark burst renderer
// ---------------------------------------------------------------------------

function SparkBurstRenderer({
  burst,
  onComplete,
}: {
  burst: SparkBurst;
  onComplete: () => void;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const elapsed = useRef(0);
  const completeCalled = useRef(false);

  // Create buffer from burst offsets
  const positions = useMemo(() => new Float32Array(SPARK_COUNT * 3), []);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current > SPARK_LIFETIME) {
      if (!completeCalled.current) {
        completeCalled.current = true;
        onComplete();
      }
      return;
    }

    if (!pointsRef.current) return;

    const progress = elapsed.current / SPARK_LIFETIME;
    const dt = delta;
    const vels = burst.velocities;

    for (let i = 0; i < SPARK_COUNT; i++) {
      const idx = i * 3;
      // Integrate position
      positions[idx] += vels[idx] * dt;
      positions[idx + 1] += vels[idx + 1] * dt - GRAVITY * dt * elapsed.current;
      positions[idx + 2] += vels[idx + 2] * dt;

      // Drag: slow down over time
      vels[idx] *= 0.97;
      vels[idx + 1] *= 0.97;
      vels[idx + 2] *= 0.97;
    }

    const posAttr = pointsRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    (posAttr.array as Float32Array).set(positions);
    posAttr.needsUpdate = true;

    // Fade out + shrink
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = 1 - progress * progress;
    mat.size = 0.06 * (1 - progress * 0.5);
  });

  return (
    <points ref={pointsRef} position={burst.position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={SPARK_COUNT}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffcc44"
        size={0.06}
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
