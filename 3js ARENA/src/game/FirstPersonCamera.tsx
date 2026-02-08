// =============================================================================
// FirstPersonCamera.tsx — Full FPS camera: WASD/dance-pad move + mouse look
// CV mode: head rotation for camera look, sword swing detection.
// Movement via WASD keys (or dance pad mapped to WASD).
// Click the canvas to lock the pointer. ESC to unlock / pause.
// =============================================================================

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './GameState';
import { GAME_CONFIG } from './GameConfig';
import { cvBridge } from '../cv/cvBridge';
import { getDebuff } from '../combat/SpellSystem';
import {
  useScreenShakeStore,
  computeShakeOffset,
} from './useScreenShake';

const EYE_HEIGHT = 1.7;
const MOVE_SPEED = 5; // units per second (keyboard mode)
const MOUSE_SENSITIVITY = 0.002;
const JUMP_FORCE = 7; // units per second
const GRAVITY = 20; // units per second squared
const MAX_FALL_SPEED = 20;

export function FirstPersonCamera() {
  const { camera, gl } = useThree();
  const phase = useGameStore((s) => s.phase);
  const playerSlot = useGameStore((s) => s.playerSlot);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const cvEnabled = cvBridge.cvEnabled;
  const cvInputRef = cvBridge.cvInputRef;

  const initialized = useRef(false);
  const keys = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const isLocked = useRef(false);
  const prevPhaseRef = useRef(useGameStore.getState().phase);

  // Jump physics
  const verticalVelocity = useRef(0);
  const isGrounded = useRef(true);
  const jumpPressed = useRef(false);

  // Spawn Z and facing yaw depend on which player slot we are.
  // Player 1 (or practice): spawn at -Z, face +Z (yaw = PI)
  // Player 2: spawn at +Z, face -Z (yaw = 0)
  const isP2 = isMultiplayer && playerSlot === 'player2';
  const spawnZ = isP2
    ? GAME_CONFIG.playerSpawnDistance / 2
    : -GAME_CONFIG.playerSpawnDistance / 2;
  const facingYaw = isP2 ? 0 : Math.PI;

  const spawnPos = useRef(new THREE.Vector3(0, EYE_HEIGHT, spawnZ));
  const walkBobPhase = useRef(0);

  // Re-usable objects to avoid per-frame allocation
  const _forward = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _yawQuat = new THREE.Quaternion();
  const _yAxis = new THREE.Vector3(0, 1, 0);

  // ---- Keyboard listeners ----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      // Track jump key for jump buffering
      if (e.code === 'Space') {
        jumpPressed.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      if (e.code === 'Space') {
        jumpPressed.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ---- Reset camera facing on calibrate ----
  useEffect(() => {
    const unsub = cvBridge.onCalibrate(() => {
      euler.current.set(0, facingYaw, 0);
    });
    return unsub;
  }, [facingYaw]);

  // ---- Auto-calibrate: fully automatic, no manual button needed ----
  // Fires on: round start, first tracking lock during gameplay, and
  // periodically every 30s to correct drift. The player's current
  // sitting position always = "facing the enemy."
  const prevPhaseForCalibrate = useRef<string>('');
  const wasTrackingRef = useRef(false);
  const lastAutoCalibrate = useRef(0);

  const doAutoCalibrate = () => {
    if (cvBridge.mapperRef) {
      cvBridge.mapperRef.current.calibrate();
      cvBridge.triggerCalibrate();
      lastAutoCalibrate.current = Date.now();
    }
  };

  // Calibrate on round start (countdown phase)
  useEffect(() => {
    if (
      phase === 'countdown' &&
      prevPhaseForCalibrate.current !== 'countdown' &&
      cvEnabled
    ) {
      // Small delay to let pose tracker settle after scene transition
      const timer = setTimeout(doAutoCalibrate, 300);
      return () => clearTimeout(timer);
    }
    prevPhaseForCalibrate.current = phase;
  }, [phase, cvEnabled]);

  // Calibrate when tracking first locks on during gameplay
  useEffect(() => {
    const cvInput = cvInputRef.current;
    const isGameplay = phase === 'playing' || phase === 'countdown';
    const isNowTracking = cvEnabled && cvInput.isTracking;

    if (isNowTracking && !wasTrackingRef.current && isGameplay) {
      // Tracking just started mid-game — auto-calibrate
      setTimeout(doAutoCalibrate, 200);
    }
    wasTrackingRef.current = isNowTracking;
  });

  // ---- Pointer lock for mouse look (keyboard mode) ----
  useEffect(() => {
    const canvas = gl.domElement;

    const onClick = () => {
      const p = useGameStore.getState().phase;
      if (p === 'playing' || p === 'countdown' || p === 'roundEnd') {
        canvas.requestPointerLock();
      }
    };

    // Auto-request pointer lock when round starts so player can move/look without clicking
    const unsubPhase = useGameStore.subscribe(() => {
      const next = useGameStore.getState().phase;
      if (prevPhaseRef.current !== 'playing' && next === 'playing') {
        const el = gl.domElement;
        if (document.pointerLockElement !== el) {
          setTimeout(() => el.requestPointerLock(), 100);
        }
      }
      prevPhaseRef.current = next;
    });

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
      unsubPhase();
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [gl]);

  // ---- Per-frame update ----
  useFrame((_, delta) => {
    // Intro: camera driven by IntroSequencer (orbit + Power On)
    if (phase === 'intro') {
      initialized.current = false; // so countdown will re-apply spawn position
      return;
    }

    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'paused' ||
      phase === 'roundEnd';

    if (isGameplay) {
      if (!initialized.current) {
        spawnPos.current.set(0, EYE_HEIGHT, spawnZ);
        camera.position.copy(spawnPos.current);
        // Face the opponent
        euler.current.set(0, facingYaw, 0);
        initialized.current = true;
      }

      const cvInput = cvInputRef.current;
      if (cvEnabled && cvInput.isTracking) {
        // ---- CV mode ----

        // Head rotation → camera look direction
        euler.current.y = facingYaw - cvInput.lookYaw;
        euler.current.x = cvInput.lookPitch;
        euler.current.x = Math.max(
          -Math.PI * 0.47,
          Math.min(Math.PI * 0.47, euler.current.x)
        );

        // Movement via WASD / dance pad (below). CV only handles head look + combat.
      }

      // ---- Debuff checks (stun / slow from spells) ----
      const mySlot = (playerSlot ?? 'player1') as 'player1' | 'player2';
      const debuff = getDebuff(mySlot);
      const isStunned = debuff === 'stun';
      const moveSpeedMult = debuff === 'slow' ? 0.35 : 1;

      // ---- WASD movement (works in both keyboard and CV mode) ----
      _forward.set(0, 0, -1);
      _right.set(1, 0, 0);
      _yawQuat.setFromAxisAngle(_yAxis, euler.current.y);
      _forward.applyQuaternion(_yawQuat);
      _right.applyQuaternion(_yawQuat);

      const move = new THREE.Vector3();
      if (!isStunned) {
        const k = keys.current;
        if (k.has('KeyW')) move.add(_forward);
        if (k.has('KeyS')) move.sub(_forward);
        if (k.has('KeyD')) move.add(_right);
        if (k.has('KeyA')) move.sub(_right);
      }

      const isMoving = move.lengthSq() > 0;
      if (isMoving) {
        move.normalize().multiplyScalar(MOVE_SPEED * moveSpeedMult * delta);
        camera.position.add(move);
      }
      // Head bob when moving (subtle vertical + lateral)
      walkBobPhase.current = isMoving ? walkBobPhase.current + delta * 12 : walkBobPhase.current * 0.9;
      const bob = Math.sin(walkBobPhase.current) * 0.015;
      const bobLateral = Math.sin(walkBobPhase.current * 2) * 0.008;
      camera.position.y += bob;
      camera.position.addScaledVector(_right, bobLateral);

      // ---- Jump Physics ----
      // Check if on ground
      isGrounded.current = camera.position.y <= EYE_HEIGHT;

      // Jump when spacebar is pressed and on ground
      if (jumpPressed.current && isGrounded.current) {
        verticalVelocity.current = JUMP_FORCE;
        jumpPressed.current = false; // Prevent double jump
      }

      // Apply gravity
      if (!isGrounded.current || verticalVelocity.current > 0) {
        verticalVelocity.current -= GRAVITY * delta;
        
        // Clamp fall speed
        if (verticalVelocity.current < -MAX_FALL_SPEED) {
          verticalVelocity.current = -MAX_FALL_SPEED;
        }
        
        // Apply vertical velocity
        camera.position.y += verticalVelocity.current * delta;
      }

      // Ground collision - stop falling
      if (camera.position.y <= EYE_HEIGHT) {
        camera.position.y = EYE_HEIGHT;
        verticalVelocity.current = 0;
        isGrounded.current = true;
      }

      // Screen shake
      const { intensity: si, durationMs: sd, startTime: st } =
        useScreenShakeStore.getState();
      const shake = computeShakeOffset(st, sd, si);
      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(camRight, shake.x);
      camera.position.addScaledVector(camUp, shake.y);

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
      spawnPos.current.set(0, EYE_HEIGHT, spawnZ);
      initialized.current = false;
    }
  });

  return null;
}
