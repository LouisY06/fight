// =============================================================================
// OpponentHitbox.tsx — Visible hitbox wireframe (debug only: F3 or ?debug=1)
// Shows the raycast target zone. Flashes bright green on successful hit.
// =============================================================================

import { useRef, useEffect, useCallback } from 'react';
import { useDebugStore } from '../game/DebugState';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { onHitEvent } from '../combat/HitEvent';

/** Disable raycasting on a mesh so it doesn't interfere with hit detection. */
const noRaycast = (mesh: THREE.Mesh) => {
  if (mesh) mesh.raycast = () => {};
};

// How long the green flash lasts (seconds)
const FLASH_DURATION = 0.35;

// Wireframe only prominent on hit; at idle barely visible so the robot GLB is the main visual
const IDLE_COLOR = new THREE.Color('#00ccff');
const HIT_COLOR = new THREE.Color('#00ff44');
const IDLE_WIREFRAME_OPACITY = 0.04;

/**
 * A visible hitbox around the opponent.
 * Renders a wireframe capsule-ish shape that matches the opponent's collider.
 * Flashes green when a hit lands.
 *
 * Place this as a CHILD of the opponent group (so it inherits position).
 */
export function OpponentHitbox() {
  const debug = useDebugStore((s) => s.debug);

  // Body hitbox (capsule approximated as cylinder + 2 hemispheres)
  const bodyWireRef = useRef<THREE.Mesh>(null!);
  const headWireRef = useRef<THREE.Mesh>(null!);
  // Hit flash overlay (solid body that pulses)
  const bodyFlashRef = useRef<THREE.Mesh>(null!);
  const headFlashRef = useRef<THREE.Mesh>(null!);

  const flashTimer = useRef(0);
  const isFlashing = useRef(false);

  // Disable raycasting on all hitbox meshes so they don't
  // expand the effective hit area beyond the opponent's actual body.
  const disableRaycast = useCallback((node: THREE.Mesh | null) => {
    if (node) noRaycast(node);
  }, []);

  // Subscribe to hit events
  useEffect(() => {
    const unsub = onHitEvent(() => {
      flashTimer.current = FLASH_DURATION;
      isFlashing.current = true;
    });
    return unsub;
  }, []);

  useFrame((_, delta) => {
    if (!bodyWireRef.current) return;

    if (isFlashing.current) {
      flashTimer.current -= delta;
      const progress = Math.max(0, flashTimer.current / FLASH_DURATION);

      // Pulse effect: bright at start, fade out
      const intensity = progress * progress; // quadratic ease-out

      // Wireframe turns green
      const wireMat = bodyWireRef.current.material as THREE.MeshBasicMaterial;
      wireMat.color.copy(HIT_COLOR);
      wireMat.opacity = 0.4 + intensity * 0.6;
      const headWireMat = headWireRef.current.material as THREE.MeshBasicMaterial;
      headWireMat.color.copy(HIT_COLOR);
      headWireMat.opacity = 0.4 + intensity * 0.6;

      // Flash overlay glows
      const bodyFlashMat = bodyFlashRef.current.material as THREE.MeshBasicMaterial;
      bodyFlashMat.opacity = intensity * 0.5;
      bodyFlashMat.visible = true;
      const headFlashMat = headFlashRef.current.material as THREE.MeshBasicMaterial;
      headFlashMat.opacity = intensity * 0.5;
      headFlashMat.visible = true;

      if (flashTimer.current <= 0) {
        isFlashing.current = false;
      }
    } else {
      // Idle: very subtle so the robot body is the main visual
      const wireMat = bodyWireRef.current.material as THREE.MeshBasicMaterial;
      wireMat.color.copy(IDLE_COLOR);
      wireMat.opacity = IDLE_WIREFRAME_OPACITY;
      const headWireMat = headWireRef.current.material as THREE.MeshBasicMaterial;
      headWireMat.color.copy(IDLE_COLOR);
      headWireMat.opacity = IDLE_WIREFRAME_OPACITY;

      // Hide flash overlays
      (bodyFlashRef.current.material as THREE.MeshBasicMaterial).visible = false;
      (headFlashRef.current.material as THREE.MeshBasicMaterial).visible = false;
    }
  });

  if (!debug) return null;

  return (
    <group>
      {/* ---- Wireframe outlines (always visible, non-raycastable) ---- */}

      {/* Body wireframe */}
      <mesh ref={(node) => { bodyWireRef.current = node!; disableRaycast(node); }} position={[0, 1, 0]}>
        <capsuleGeometry args={[0.35, 1.05, 4, 12]} />
        <meshBasicMaterial
          color={IDLE_COLOR}
          wireframe
          transparent
          opacity={IDLE_WIREFRAME_OPACITY}
          depthWrite={false}
        />
      </mesh>

      {/* Head wireframe */}
      <mesh ref={(node) => { headWireRef.current = node!; disableRaycast(node); }} position={[0, 1.9, 0]}>
        <sphereGeometry args={[0.25, 10, 10]} />
        <meshBasicMaterial
          color={IDLE_COLOR}
          wireframe
          transparent
          opacity={IDLE_WIREFRAME_OPACITY}
          depthWrite={false}
        />
      </mesh>

      {/* ---- Hit flash overlays (only visible during flash, non-raycastable) ---- */}

      {/* Body flash */}
      <mesh ref={(node) => { bodyFlashRef.current = node!; disableRaycast(node); }} position={[0, 1, 0]}>
        <capsuleGeometry args={[0.36, 1.06, 4, 12]} />
        <meshBasicMaterial
          color={HIT_COLOR}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          visible={false}
        />
      </mesh>

      {/* Head flash */}
      <mesh ref={(node) => { headFlashRef.current = node!; disableRaycast(node); }} position={[0, 1.9, 0]}>
        <sphereGeometry args={[0.26, 10, 10]} />
        <meshBasicMaterial
          color={HIT_COLOR}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          visible={false}
        />
      </mesh>
    </group>
  );
}
