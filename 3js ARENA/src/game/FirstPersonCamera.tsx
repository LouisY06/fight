// =============================================================================
// FirstPersonCamera.tsx — Full FPS camera: WASD/dance-pad move + mouse look
// CV mode: head rotation for camera look, sword swing detection.
// Movement via WASD keys (or dance pad mapped to WASD).
// Click the canvas to lock the pointer. ESC to unlock / pause.
// =============================================================================

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './GameState';
import { GAME_CONFIG } from './GameConfig';
import { cvBridge } from '../cv/cvBridge';
import { getDebuff } from '../combat/SpellSystem';
import { onVoiceCommand } from '../audio/VoiceCommands';
import {
  useScreenShakeStore,
  computeShakeOffset,
} from './useScreenShake';
import { getDashVelocity, getDashState } from '../combat/DashSpell';
import { getGreenGunData, getGreenGunDelta } from '../cv/GreenGunTracker';
import { useWeaponStore, GUN_AIM_CONFIG } from './WeaponState';

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

  // Re-usable objects to avoid per-frame allocation (hoisted to refs)
  const _forward = useRef(new THREE.Vector3()).current;
  const _right = useRef(new THREE.Vector3()).current;
  const _move = useRef(new THREE.Vector3()).current;
  const _yawQuat = useRef(new THREE.Quaternion()).current;
  const _yAxis = useRef(new THREE.Vector3(0, 1, 0)).current;
  const _camRight = useRef(new THREE.Vector3()).current;
  const _camUp = useRef(new THREE.Vector3()).current;

  // ---- 180° quick-turn: press C or say "mechabot, turn around" ----
  const yawOffset = useRef(0);

  // KrunkerStyle delta accumulator for smooth gun steering
  // (equivalent to target_delta_x/y in KrunkerStyleMouseController)
  const targetDeltaYaw = useRef(0);
  const targetDeltaPitch = useRef(0);

  // Diagnostic timer — logs full pipeline state every 2 seconds
  const diagTimer = useRef(0);

  const flip180 = useCallback(() => {
    if (cvEnabled) {
      // CV mode: toggle persistent yaw offset (used by head-tracking fallback)
      yawOffset.current = yawOffset.current === 0 ? Math.PI : 0;
      // Delta mode: also flip euler directly since yawOffset isn't applied per-frame
      // (harmless in head-tracking mode — euler is set absolutely each frame)
      euler.current.y += Math.PI;
    } else {
      // Mouse mode: one-shot rotation since yaw accumulates from mouse
      euler.current.y += Math.PI;
    }
  }, [cvEnabled]);

  // ---- Keyboard listeners ----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === 'Space') {
        jumpPressed.current = true;
      }
      // C key = 180° quick-turn
      if (e.code === 'KeyC' && !e.repeat) {
        flip180();
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
  }, [flip180]);

  // ---- Voice commands: "turn around" → 180° flip, "1"/"2" → weapon switch ----
  useEffect(() => {
    const unsub = onVoiceCommand((cmd) => {
      if (cmd === 'turnaround') {
        console.log('[Camera] Voice turn-around — flipping 180°');
        flip180();
      } else if (cmd === 'weapon1') {
        console.log('[Camera] Voice weapon switch → sword');
        useWeaponStore.getState().setActiveWeapon('sword', true);
      } else if (cmd === 'weapon2') {
        console.log('[Camera] Voice weapon switch → gun');
        useWeaponStore.getState().setActiveWeapon('gun', true);
      }
    });
    return unsub;
  }, [flip180]);

  // ---- Reset spawn on round start ----
  const prevPhaseForReset = useRef<string>('');

  useEffect(() => {
    const prev = prevPhaseForReset.current;
    const enteringCountdown = phase === 'countdown' && prev !== 'countdown';
    const enteringPlayingFromIntro = phase === 'playing' && prev === 'intro';

    if (enteringCountdown || enteringPlayingFromIntro) {
      // Reset player position to spawn point each round
      spawnPos.current.set(0, EYE_HEIGHT, spawnZ);
      camera.position.copy(spawnPos.current);
      euler.current.set(0, facingYaw, 0);
      camera.quaternion.setFromEuler(euler.current);
      verticalVelocity.current = 0;
      isGrounded.current = true;
      initialized.current = true;
      // Clear KrunkerStyle delta accumulator on round reset
      targetDeltaYaw.current = 0;
      targetDeltaPitch.current = 0;
      // Always start each round with sword
      useWeaponStore.getState().setActiveWeapon('sword');
    }
    prevPhaseForReset.current = phase;
  }, [phase, spawnZ, facingYaw, camera]);

  // ---- Pointer lock for mouse look (keyboard mode) ----
  useEffect(() => {
    const canvas = gl.domElement;

    const onClick = () => {
      const p = useGameStore.getState().phase;
      if (p === 'playing' || p === 'countdown' || p === 'roundEnd') {
        canvas.requestPointerLock();
      }
    };

    // Auto-request pointer lock when round starts; release on game over / pause
    const unsubPhase = useGameStore.subscribe(() => {
      const next = useGameStore.getState().phase;
      if (prevPhaseRef.current !== 'playing' && next === 'playing') {
        const el = gl.domElement;
        if (document.pointerLockElement !== el) {
          setTimeout(() => el.requestPointerLock(), 100);
        }
      }
      // Release cursor on game over, pause, or menu
      if (next === 'gameOver' || next === 'paused' || next === 'menu') {
        if (document.pointerLockElement) {
          document.exitPointerLock();
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
      if (cvEnabled) {
        // ---- CV mode: KrunkerStyle delta-based camera steering ----
        // Ported from leaning_control_system.py KrunkerStyleMouseController.
        // Instead of mapping absolute green position → camera angle each frame,
        // we accumulate frame-to-frame deltas and drain them smoothly.
        // This gives the weighted, pointer-lock feel of an FPS gaming mouse.
        //
        // NOTE: No OS mouse events (pyautogui / Quartz CGEvent) are involved.
        // The camera euler angles are set directly in this useFrame callback —
        // pointer lock is irrelevant in CV mode.
        const greenGun = getGreenGunData();
        const gunDelta = getGreenGunDelta();

        if (greenGun.detected) {
          // Accumulate raw delta from green gun movement
          if (gunDelta.isValid) {
            const { sensitivity, deadZone, invertX } = GUN_AIM_CONFIG;

            // Dead zone filter — suppress hand tremor
            // (mirrors Python dead_zone logic, lines 492-496)
            const mag = Math.sqrt(gunDelta.deltaX ** 2 + gunDelta.deltaY ** 2);
            if (mag > deadZone) {
              const xMult = invertX ? -1 : 1;
              targetDeltaYaw.current += gunDelta.deltaX * sensitivity * xMult;
              targetDeltaPitch.current += gunDelta.deltaY * sensitivity;
            }
          }
        } else if (cvInput.isTracking) {
          // Head tracking aim (fallback when no green detected)
          // Clear delta accumulator to prevent stale motion
          targetDeltaYaw.current = 0;
          targetDeltaPitch.current = 0;
          euler.current.y = facingYaw - cvInput.lookYaw + yawOffset.current;
          euler.current.x = cvInput.lookPitch;
        }

        // ---- Interpolated drain (smooth steering) ----
        // Each render frame, drain a fraction of the accumulated delta.
        // Frame-rate-independent: matches Python's 120Hz cursor thread behavior.
        // (mirrors _cursor_update_thread logic, lines 400-429)
        const drainAlpha = 1 - Math.pow(
          1 - GUN_AIM_CONFIG.interpolationSpeed,
          delta * 120  // scale to 120Hz base rate
        );

        if (Math.abs(targetDeltaYaw.current) > 0.00001 || Math.abs(targetDeltaPitch.current) > 0.00001) {
          const drainYaw = targetDeltaYaw.current * drainAlpha;
          const drainPitch = targetDeltaPitch.current * drainAlpha;

          // Apply to euler angles:
          // Raw webcam (front-facing): image-left = physical-right, so
          // deltaX > 0 (moved right in image) = moved LEFT physically → yaw decreases
          euler.current.y -= drainYaw;
          // deltaY > 0 (moved down in image) = moved DOWN physically → pitch decreases
          euler.current.x -= drainPitch;

          // Subtract drained amount from accumulator (drain the queue)
          targetDeltaYaw.current -= drainYaw;
          targetDeltaPitch.current -= drainPitch;
        } else {
          // Below threshold — clear to prevent float drift
          targetDeltaYaw.current = 0;
          targetDeltaPitch.current = 0;
        }

        euler.current.x = Math.max(
          -Math.PI * 0.47,
          Math.min(Math.PI * 0.47, euler.current.x)
        );

        // ---- DIAGNOSTIC: pipeline health log (every 2s) ----
        diagTimer.current += delta;
        if (diagTimer.current > 2) {
          diagTimer.current = 0;
          const { sensitivity, deadZone, invertX } = GUN_AIM_CONFIG;
          const mag = gunDelta.isValid
            ? Math.sqrt(gunDelta.deltaX ** 2 + gunDelta.deltaY ** 2)
            : 0;
          console.log(
            `[Camera/CV DIAG] green=${greenGun.detected} px=${greenGun.pixelCount}` +
            ` | delta valid=${gunDelta.isValid} dX=${gunDelta.deltaX.toFixed(5)} dY=${gunDelta.deltaY.toFixed(5)} mag=${mag.toFixed(5)}` +
            ` | deadZone=${deadZone} passedDZ=${mag > deadZone}` +
            ` | accum yaw=${targetDeltaYaw.current.toFixed(4)} pitch=${targetDeltaPitch.current.toFixed(4)}` +
            ` | euler y=${euler.current.y.toFixed(3)} x=${euler.current.x.toFixed(3)}` +
            ` | sens=${sensitivity} invertX=${invertX}` +
            ` | headTrack=${cvInput.isTracking}`
          );
        }
      }

      // ---- Debuff checks (stun / slow from spells) ----
      const mySlot = (playerSlot ?? 'player1') as 'player1' | 'player2';
      const debuff = getDebuff(mySlot);
      const isStunned = debuff === 'stun';
      const moveSpeedMult = debuff === 'slow' ? 0.35 : 1;

      // ---- Lock movement during countdown ----
      const movementLocked = phase === 'countdown';

      // ---- WASD movement (works in both keyboard and CV mode) ----
      _forward.set(0, 0, -1);
      _right.set(1, 0, 0);
      _yawQuat.setFromAxisAngle(_yAxis, euler.current.y);
      _forward.applyQuaternion(_yawQuat);
      _right.applyQuaternion(_yawQuat);

      _move.set(0, 0, 0);
      if (!isStunned && !movementLocked) {
        const k = keys.current;
        if (k.has('KeyW')) _move.add(_forward);
        if (k.has('KeyS')) _move.sub(_forward);
        if (k.has('KeyD')) _move.add(_right);
        if (k.has('KeyA')) _move.sub(_right);
      }

      const isMoving = _move.lengthSq() > 0;
      if (isMoving) {
        _move.normalize().multiplyScalar(MOVE_SPEED * moveSpeedMult * delta);
        camera.position.add(_move);
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

      // Jump when spacebar is pressed and on ground (not during countdown)
      if (jumpPressed.current && isGrounded.current && !movementLocked) {
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

      // ---- Dash spell velocity ----
      const dashVel = getDashVelocity();
      if (dashVel) {
        camera.position.addScaledVector(dashVel, delta);
      }

      // FOV animation: zoom out during dash, lerp back
      const baseFov = 70;
      const dashFov = 100;
      const cam = camera as THREE.PerspectiveCamera;
      if (getDashState() === 'dashing') {
        cam.fov += (dashFov - cam.fov) * Math.min(1, delta * 12);
      } else {
        cam.fov += (baseFov - cam.fov) * Math.min(1, delta * 6);
      }
      cam.updateProjectionMatrix();

      // Screen shake
      const { intensity: si, durationMs: sd, startTime: st } =
        useScreenShakeStore.getState();
      const shake = computeShakeOffset(st, sd, si);
      _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      _camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(_camRight, shake.x);
      camera.position.addScaledVector(_camUp, shake.y);

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
