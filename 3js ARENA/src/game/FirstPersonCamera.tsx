// =============================================================================
// FirstPersonCamera.tsx — Full FPS camera: WASD move + mouse look
// Click the canvas to lock the pointer. ESC to unlock / pause.
// =============================================================================

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './GameState';
import { GAME_CONFIG } from './GameConfig';

const EYE_HEIGHT = 1.7;
const MOVE_SPEED = 5; // units per second
const MOUSE_SENSITIVITY = 0.002;
const PLAYER_Z = -GAME_CONFIG.playerSpawnDistance / 2;

export function FirstPersonCamera() {
  const { camera, gl } = useThree();
  const phase = useGameStore((s) => s.phase);

  const initialized = useRef(false);
  const keys = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const isLocked = useRef(false);

  // ---- Keyboard listeners ----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ---- Pointer lock for mouse look ----
  useEffect(() => {
    const canvas = gl.domElement;

    const onClick = () => {
      const p = useGameStore.getState().phase;
      if (p === 'playing' || p === 'countdown' || p === 'roundEnd') {
        canvas.requestPointerLock();
      }
    };

    const onLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return;
      euler.current.y -= e.movementX * MOUSE_SENSITIVITY;
      euler.current.x -= e.movementY * MOUSE_SENSITIVITY;
      // Clamp vertical look to +-85 degrees
      euler.current.x = Math.max(
        -Math.PI * 0.47,
        Math.min(Math.PI * 0.47, euler.current.x)
      );
    };

    canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);

    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [gl]);

  // ---- Per-frame update ----
  useFrame((_, delta) => {
    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'paused' ||
      phase === 'roundEnd';

    if (isGameplay) {
      if (!initialized.current) {
        camera.position.set(0, EYE_HEIGHT, PLAYER_Z);
        // Face toward +Z (the opponent)
        euler.current.set(0, 0, 0);
        initialized.current = true;
      }

      // ---- WASD movement relative to where camera is facing ----
      const k = keys.current;
      const forward = new THREE.Vector3(0, 0, -1);
      const right = new THREE.Vector3(1, 0, 0);

      // Rotate movement vectors by camera's Y rotation (yaw only — no flying)
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        euler.current.y
      );
      forward.applyQuaternion(yawQuat);
      right.applyQuaternion(yawQuat);

      const move = new THREE.Vector3();
      if (k.has('KeyW')) move.add(forward);
      if (k.has('KeyS')) move.sub(forward);
      if (k.has('KeyD')) move.add(right);
      if (k.has('KeyA')) move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(MOVE_SPEED * delta);
        camera.position.add(move);
      }

      // Keep at eye height
      camera.position.y = EYE_HEIGHT;

      // Clamp to arena bounds
      const pos2D = new THREE.Vector2(camera.position.x, camera.position.z);
      if (pos2D.length() > GAME_CONFIG.arenaRadius - 0.5) {
        pos2D.normalize().multiplyScalar(GAME_CONFIG.arenaRadius - 0.5);
        camera.position.x = pos2D.x;
        camera.position.z = pos2D.y;
      }

      // Apply mouse look rotation
      camera.quaternion.setFromEuler(euler.current);
    }

    if (phase === 'menu') {
      // Slow orbiting camera for menu background
      const t = Date.now() * 0.0003;
      camera.position.set(Math.cos(t) * 10, 5, Math.sin(t) * 10);
      camera.lookAt(0, 1, 0);
      initialized.current = false;
    }

    if (phase === 'arenaLoading') {
      initialized.current = false;
    }
  });

  return null;
}
