// =============================================================================
// InputManager.ts — Keyboard/mouse input abstraction (placeholder for CV)
// =============================================================================

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface PlayerInput {
  moveDirection: THREE.Vector3;
  weaponPosition: THREE.Vector3;
  weaponRotation: THREE.Euler;
  attack: boolean;
  block: boolean;
  jump: boolean;
  gesture: 'idle' | 'slash' | 'stab' | 'block' | 'none';
}

const defaultInput = (): PlayerInput => ({
  moveDirection: new THREE.Vector3(),
  weaponPosition: new THREE.Vector3(),
  weaponRotation: new THREE.Euler(),
  attack: false,
  block: false,
  jump: false,
  gesture: 'idle',
});

/**
 * Hook for Player 1 keyboard input: WASD + E (attack) + Shift (block) + Space (jump)
 */
export function usePlayer1Input(): PlayerInput {
  const input = useRef<PlayerInput>(defaultInput());
  const keys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const interval = setInterval(() => {
      const k = keys.current;
      const dir = new THREE.Vector3();
      if (k.has('w')) dir.z -= 1;
      if (k.has('s')) dir.z += 1;
      if (k.has('a')) dir.x -= 1;
      if (k.has('d')) dir.x += 1;
      dir.normalize();

      const isAttacking = k.has('e');
      const isBlocking = k.has('shift');
      const isJumping = k.has(' ');

      input.current = {
        moveDirection: dir,
        weaponPosition: new THREE.Vector3(-2, 1, 0),
        weaponRotation: new THREE.Euler(0, 0, isAttacking ? -Math.PI / 3 : 0),
        attack: isAttacking,
        block: isBlocking,
        jump: isJumping,
        gesture: isBlocking ? 'block' : isAttacking ? 'slash' : 'idle',
      };
    }, 16); // ~60fps polling

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(interval);
    };
  }, []);

  return input.current;
}

/**
 * Hook for Player 2 keyboard input: Arrow Keys + RCtrl (attack) + RShift (block) + Enter (jump)
 */
export function usePlayer2Input(): PlayerInput {
  const input = useRef<PlayerInput>(defaultInput());
  const keys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const interval = setInterval(() => {
      const k = keys.current;
      const dir = new THREE.Vector3();
      if (k.has('ArrowUp')) dir.z -= 1;
      if (k.has('ArrowDown')) dir.z += 1;
      if (k.has('ArrowLeft')) dir.x -= 1;
      if (k.has('ArrowRight')) dir.x += 1;
      dir.normalize();

      const isAttacking = k.has('Control');
      const isBlocking = k.has('Shift');
      const isJumping = k.has('Enter');

      input.current = {
        moveDirection: dir,
        weaponPosition: new THREE.Vector3(2, 1, 0),
        weaponRotation: new THREE.Euler(0, 0, isAttacking ? Math.PI / 3 : 0),
        attack: isAttacking,
        block: isBlocking,
        jump: isJumping,
        gesture: isBlocking ? 'block' : isAttacking ? 'slash' : 'idle',
      };
    }, 16);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(interval);
    };
  }, []);

  return input.current;
}
