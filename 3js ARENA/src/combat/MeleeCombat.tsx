// =============================================================================
// MeleeCombat.tsx — Raycasts from camera center on sword swing to detect hits
// Deals damage to enemies in range when the blade crosses the crosshair.
// =============================================================================

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { GAME_CONFIG } from '../game/GameConfig';
import { onSwordSwing } from '../entities/ViewmodelSword';

const HIT_RANGE = 3.0; // max distance a sword swing can reach

/**
 * MeleeCombat runs inside the R3F Canvas.
 * When the sword swing hits the midpoint, it raycasts from the camera
 * forward to see if the opponent is in front of us and within range.
 */
export function MeleeCombat() {
  const { camera, scene } = useThree();
  const lastHitTime = useRef(0);

  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    const unsub = onSwordSwing(() => {
      if (phase !== 'playing') return;

      // Cooldown check
      const now = Date.now();
      if (now - lastHitTime.current < GAME_CONFIG.attackCooldownMs) return;

      // Raycast from screen center (where the crosshair is)
      const raycaster = new THREE.Raycaster();
      raycaster.set(camera.position, new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
      raycaster.far = HIT_RANGE;

      // Find all intersections with meshes in the scene
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        // Walk up the parent chain to find if this belongs to an opponent
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          // We tag opponent groups with userData.isOpponent
          if (obj.userData?.isOpponent) {
            lastHitTime.current = now;
            const { dealDamage } = useGameStore.getState();
            dealDamage('player2', GAME_CONFIG.damage.swordSlash);
            return; // Only hit once per swing
          }
          obj = obj.parent;
        }
      }
    });

    return unsub;
  }, [camera, scene, phase]);

  return null;
}
