// =============================================================================
// FirstPersonCamera.tsx — Full FPS camera: WASD move + mouse look
// CV mode: head rotation for look + 1:1 position mapping from body tracking.
// Click the canvas to lock the pointer. ESC to unlock / pause.
// =============================================================================

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './GameState';
import { GAME_CONFIG } from './GameConfig';
import { useCVContext } from '../cv/CVProvider';

const EYE_HEIGHT = 1.7;
const MOVE_SPEED = 5; // units per second (keyboard mode)
const MOUSE_SENSITIVITY = 0.002;
const PLAYER_Z = -GAME_CONFIG.playerSpawnDistance / 2;

// Player spawns at -Z and opponent at +Z, so we face +Z (PI yaw).
const FACING_OPPONENT_YAW = Math.PI;

export function FirstPersonCamera() {
  const { camera, gl } = useThree();
  const phase = useGameStore((s) => s.phase);
  const { cvEnabled, cvInputRef } = useCVContext();

  const initialized = useRef(false);
  const keys = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const isLocked = useRef(false);

  // Spawn position — CV mode adds offset to this
  const spawnPos = useRef(new THREE.Vector3(0, EYE_HEIGHT, PLAYER_Z));

  // Re-usable objects to avoid per-frame allocation
  const _forward = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _yawQuat = new THREE.Quaternion();
  const _yAxis = new THREE.Vector3(0, 1, 0);

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

  // ---- Pointer lock for mouse look (keyboard mode) ----
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
        spawnPos.current.set(0, EYE_HEIGHT, PLAYER_Z);
        camera.position.copy(spawnPos.current);
        // Start facing the opponent (+Z direction)
        euler.current.set(0, FACING_OPPONENT_YAW, 0);
        initialized.current = true;
      }

      const cvInput = cvInputRef.current;
      if (cvEnabled && cvInput.isTracking) {
        // ---- CV mode ----

        // Head rotation → camera look direction
        //    lookYaw / lookPitch from CVInputMapper are offsets from neutral.
        //    We ADD them to the base facing-opponent yaw.
        euler.current.y = FACING_OPPONENT_YAW - cvInput.lookYaw;
        euler.current.x = cvInput.lookPitch;
        euler.current.x = Math.max(
          -Math.PI * 0.47,
          Math.min(Math.PI * 0.47, euler.current.x)
        );

        // Movement is handled by WASD even in CV mode (CV position tracking disabled).
      }

      // ---- WASD movement (works in both keyboard and CV mode) ----
      _forward.set(0, 0, -1);
      _right.set(1, 0, 0);
      _yawQuat.setFromAxisAngle(_yAxis, euler.current.y);
      _forward.applyQuaternion(_yawQuat);
      _right.applyQuaternion(_yawQuat);

      const move = new THREE.Vector3();
      const k = keys.current;
      if (k.has('KeyW')) move.add(_forward);
      if (k.has('KeyS')) move.sub(_forward);
      if (k.has('KeyD')) move.add(_right);
      if (k.has('KeyA')) move.sub(_right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(MOVE_SPEED * delta);
        camera.position.add(move);
      }

      // Keep at eye height
      camera.position.y = EYE_HEIGHT;

      // Clamp to arena bounds
      const r = GAME_CONFIG.arenaRadius - 0.5;
      const dx = camera.position.x;
      const dz = camera.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > r) {
        const scale = r / dist;
        camera.position.x = dx * scale;
        camera.position.z = dz * scale;
      }

      // Apply look rotation
      camera.quaternion.setFromEuler(euler.current);
    }

    if (phase === 'menu' || phase === 'lobby' || phase === 'waiting') {
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
