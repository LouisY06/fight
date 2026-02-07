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
  gesture: 'idle' | 'slash' | 'stab' | 'shoot' | 'block' | 'none';
}

const defaultInput = (): PlayerInput => ({
  moveDirection: new THREE.Vector3(),
  weaponPosition: new THREE.Vector3(),
  weaponRotation: new THREE.Euler(),
  attack: false,
  block: false,
  gesture: 'idle',
});

/**
 * Hook for Player 1 keyboard input: WASD + Space (attack) + Shift (block)
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

      input.current = {
        moveDirection: dir,
        weaponPosition: new THREE.Vector3(-2, 1, 0),
        weaponRotation: new THREE.Euler(0, 0, k.has(' ') ? -Math.PI / 3 : 0),
        attack: k.has(' '),
        block: k.has('shift'),
        gesture: k.has('shift') ? 'block' : k.has(' ') ? 'slash' : 'idle',
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
 * Hook for Player 2 keyboard input: Arrow Keys + Enter (attack) + RShift (block)
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

      input.current = {
        moveDirection: dir,
        weaponPosition: new THREE.Vector3(2, 1, 0),
        weaponRotation: new THREE.Euler(0, 0, k.has('Enter') ? Math.PI / 3 : 0),
        attack: k.has('Enter'),
        block: k.has('Shift'),
        gesture: k.has('Shift') ? 'block' : k.has('Enter') ? 'slash' : 'idle',
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
