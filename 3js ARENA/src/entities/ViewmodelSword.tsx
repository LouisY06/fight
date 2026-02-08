// =============================================================================
// ViewmodelSword.tsx — First-person sword that follows the camera
// Keyboard mode: click to swing (impressive arc animation).
// CV mode: defers to MechaArms.
//
// Features:
//   • Renders the selected SwordModel (procedural or GLB)
//   • 120° horizontal arc swing over 0.3s with curved easing
//   • Swoosh sound on swing, camera shake at midpoint
//   • Purple/neon emissive glow during swing
//   • Depth fix: renders on top of scene (no wall clipping)
// =============================================================================

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { cvBridge } from '../cv/cvBridge';
import { fireSwing } from '../combat/SwingEvent';
import { updateSwordTransform, setKeyboardSwingActive } from '../combat/SwordState';
import { isPlayerStunned } from '../combat/ClashEvent';
import { setSwingProgress } from '../combat/SwingState';
import { playSwordSwing } from '../audio/SoundManager';
import { useScreenShakeStore } from '../game/useScreenShake';
import { SwordModel } from './SwordModel';
import { useSwordStore, SWORD_VARIANTS } from '../game/SwordSelection';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Sword resting position: lower-right of screen, blade angled up-left
const IDLE_OFFSET = new THREE.Vector3(0.55, -0.5, -0.5);
const SWORD_SCALE = 0.65;

// --- Swing animation ---
const SWING_DURATION = 0.3;    // seconds — heavy mecha feel
const SWING_ARC_DEG = 120;     // degrees of horizontal arc
const SWING_ARC_RAD = (SWING_ARC_DEG * Math.PI) / 180;

// At what fraction of the swing to fire the hit callback / camera shake
const SWING_HIT_POINT = 0.4;
// Camera shake intensity at swing midpoint
const SWING_SHAKE_INTENSITY = 0.15;
const SWING_SHAKE_DURATION_MS = 80;

// --- Idle bob ---
const IDLE_BOB_SPEED_X = 1.5;
const IDLE_BOB_SPEED_Y = 2.0;
const IDLE_BOB_AMOUNT_X = 0.003;
const IDLE_BOB_AMOUNT_Y = 0.005;

// --- Depth rendering ---
const FPV_RENDER_ORDER = 999;

// Pre-allocated temp objects (avoid per-frame GC pressure)
const _offset = new THREE.Vector3();
const _worldOffset = new THREE.Vector3();
const _localQuat = new THREE.Quaternion();
const _localEuler = new THREE.Euler();

// ---------------------------------------------------------------------------
// Easing helpers
// ---------------------------------------------------------------------------

/** Fast-in, ease-out cubic */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Bell-curve: peaks at t=0.5, returns 0 at t=0 and t=1 */
function bellCurve(t: number): number {
  return Math.sin(t * Math.PI);
}

// ---------------------------------------------------------------------------
// NeonEdgeOverlay — MeshPhysicalMaterial glow matching the mecha's visor
// ---------------------------------------------------------------------------

function NeonEdgeOverlay({ isSwinging }: { isSwinging: boolean }) {
  const edgeRef = useRef<THREE.Mesh>(null!);
  const selectedId = useSwordStore((s) => s.selectedSwordId);
  const variant = SWORD_VARIANTS.find((v) => v.id === selectedId) ?? SWORD_VARIANTS[0];

  const neonMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(variant.energyColor),
      emissive: new THREE.Color(variant.energyColor),
      emissiveIntensity: 2.0,
      roughness: 0.05,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
  }, [variant.energyColor]);

  useFrame(() => {
    if (!edgeRef.current) return;
    const time = Date.now() * 0.001;
    const pulse = isSwinging
      ? 3.5 + Math.sin(time * 15) * 1.5
      : 1.5 + Math.sin(time * 2.5) * 0.5;
    neonMaterial.emissiveIntensity = pulse;
    neonMaterial.opacity = isSwinging ? 0.8 : 0.35 + Math.sin(time * 3) * 0.1;
  });

  return (
    <mesh
      ref={edgeRef}
      position={[0, 0.35, 0]}
      material={neonMaterial}
      renderOrder={FPV_RENDER_ORDER}
    >
      <boxGeometry args={[0.005, 0.7, 0.025]} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// SlashTrail — Neon trail VFX left behind during sword swing
// ---------------------------------------------------------------------------

const TRAIL_LIFETIME = 0.25; // seconds to fade

function SlashTrail({ isSwinging, color }: { isSwinging: boolean; color: string }) {
  const trailRef = useRef<THREE.Mesh>(null!);
  const trailMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [color],
  );

  const fadeRef = useRef(0);

  useFrame((_, delta) => {
    if (!trailRef.current) return;
    if (isSwinging) {
      fadeRef.current = 1.0;
      trailRef.current.visible = true;
    } else {
      fadeRef.current = Math.max(0, fadeRef.current - delta / TRAIL_LIFETIME);
    }
    trailMat.opacity = fadeRef.current * 0.45;
    trailRef.current.visible = fadeRef.current > 0.01;

    if (trailRef.current.visible) {
      trailRef.current.scale.x = 1 + fadeRef.current * 2.5;
    }
  });

  return (
    <mesh
      ref={trailRef}
      position={[0, 0.4, 0]}
      material={trailMat}
      visible={false}
      renderOrder={FPV_RENDER_ORDER}
    >
      <planeGeometry args={[0.5, 0.8, 1, 8]} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ViewmodelSword() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const phase = useGameStore((s) => s.phase);
  const cvEnabled = cvBridge.cvEnabled;
  const cvInputRef = cvBridge.cvInputRef;

  // Keyboard mode swing state
  const swingTime = useRef(-1);
  const [isSwinging, setIsSwinging] = useState(false);
  const swingNotified = useRef(false);
  const swingSoundPlayed = useRef(false);
  const swingShakeFired = useRef(false);

  // Depth fix: traverse the group once and set depthTest/depthWrite on all materials
  const depthFixApplied = useRef(false);
  const applyDepthFix = useCallback((group: THREE.Group) => {
    if (depthFixApplied.current) return;
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          (mat as THREE.Material).depthTest = false;
          (mat as THREE.Material).depthWrite = false;
        }
        mesh.renderOrder = FPV_RENDER_ORDER;
      }
    });
    depthFixApplied.current = true;
  }, []);

  // Re-apply depth fix when sword model changes (SwordModel re-mounts)
  useEffect(() => {
    depthFixApplied.current = false;
  }, []);

  // Left-click to swing while pointer is locked (keyboard mode only)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement && !cvEnabled && !isPlayerStunned()) {
        if (swingTime.current < 0) {
          swingTime.current = 0;
          swingNotified.current = false;
          swingSoundPlayed.current = false;
          swingShakeFired.current = false;
          setIsSwinging(true);
        }
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [cvEnabled]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'roundEnd';

    if (!isGameplay) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    // ---- CV mode: MechaArms handles the sword visual ----
    if (cvEnabled && cvInputRef.current.isTracking) {
      groupRef.current.visible = false;
      return; // MechaArms renders the sword in CV mode
    }

    // Apply depth fix once the SwordModel has mounted its geometry
    applyDepthFix(groupRef.current);

    // ---- Keyboard mode: impressive arc swing animation ----

    // Advance swing timer
    if (swingTime.current >= 0) {
      swingTime.current += delta;
      setKeyboardSwingActive(true);

      // Play swoosh sound at the very start
      if (!swingSoundPlayed.current) {
        swingSoundPlayed.current = true;
        playSwordSwing();
      }

      // Fire hit callback at ~40% of the swing (blade crosses center)
      if (!swingNotified.current && swingTime.current >= SWING_DURATION * SWING_HIT_POINT) {
        swingNotified.current = true;
        fireSwing();
      }

      // Camera shake at midpoint for "heavy" feel
      if (!swingShakeFired.current && swingTime.current >= SWING_DURATION * 0.5) {
        swingShakeFired.current = true;
        useScreenShakeStore.getState().trigger(SWING_SHAKE_INTENSITY, SWING_SHAKE_DURATION_MS);
      }

      // Update global swing progress for bloom/glow
      const progress = Math.min(swingTime.current / SWING_DURATION, 1);
      setSwingProgress(progress);

      if (swingTime.current >= SWING_DURATION) {
        swingTime.current = -1;
        setKeyboardSwingActive(false);
        setIsSwinging(false);
        setSwingProgress(0);
      }
    }

    // ---- Compute position & rotation ----
    _offset.copy(IDLE_OFFSET);
    let rotX = 0;
    let rotY = 0.3;   // slight inward tilt (blade toward center)
    let rotZ = 0.4;   // resting tilt

    // Stun vibration — sword shakes while stunned
    if (isPlayerStunned()) {
      const now = Date.now();
      const stunShake = Math.sin(now * 0.05) * 0.015;
      const stunShake2 = Math.cos(now * 0.07) * 0.01;
      _offset.x += stunShake;
      _offset.y += stunShake2;
      rotZ += Math.sin(now * 0.04) * 0.05;
    }

    if (swingTime.current >= 0) {
      // --- Impressive 120° arc swing ---
      const t = swingTime.current / SWING_DURATION;       // 0→1
      const ease = easeOutCubic(t);                        // fast start, smooth end
      const bell = bellCurve(t);                           // peaks at center

      // Horizontal arc: sweep from right (+X) to left (-X)
      const arcProgress = ease * SWING_ARC_RAD;
      _offset.x += -ease * 0.8;                           // sweep left

      // Vertical lift at peak of swing (blade rises then falls)
      _offset.y += bell * 0.2 - ease * 0.1;

      // Forward thrust at swing center (reach toward enemy)
      _offset.z += -bell * 0.25;

      // Rotation: dramatic wrist roll through the arc
      rotX += ease * 0.4;                                  // forward pitch
      rotY += -arcProgress * 0.85;                         // main horizontal arc
      rotZ += ease * 1.2 - bell * 0.3;                    // roll with slight correction
    } else {
      // Idle bob — subtle breathing motion
      const time = Date.now() * 0.001;
      _offset.x += Math.sin(time * IDLE_BOB_SPEED_X) * IDLE_BOB_AMOUNT_X;
      _offset.y += Math.sin(time * IDLE_BOB_SPEED_Y) * IDLE_BOB_AMOUNT_Y;
    }

    // Transform offset from camera-local to world space
    _worldOffset.copy(_offset).applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(_worldOffset);

    // Build rotation: camera orientation × local sword angles
    _localEuler.set(rotX, rotY, rotZ);
    _localQuat.setFromEuler(_localEuler);
    groupRef.current.quaternion.copy(camera.quaternion).multiply(_localQuat);

    // Set render order on the group itself
    groupRef.current.renderOrder = FPV_RENDER_ORDER;

    // Publish world-space sword line for collision detection
    updateSwordTransform(groupRef.current);
  });

  const selectedId = useSwordStore((s) => s.selectedSwordId);
  const variant = SWORD_VARIANTS.find((v) => v.id === selectedId) ?? SWORD_VARIANTS[0];

  return (
    <group ref={groupRef} scale={SWORD_SCALE}>
      {/* Selected sword model with energy aura + swing glow */}
      <SwordModel isSwinging={isSwinging} fpvMode />

      {/* Neon edge overlay — MeshPhysicalMaterial glow matching mecha visor */}
      <NeonEdgeOverlay isSwinging={isSwinging} />

      {/* Slash trail VFX — neon streak during swing */}
      <SlashTrail isSwinging={isSwinging} color={variant.trailColor} />
    </group>
  );
}
