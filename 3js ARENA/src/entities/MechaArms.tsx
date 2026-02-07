// =============================================================================
// MechaArms.tsx — First-person cockpit RIGHT arm driven by CV pose tracking
// Left arm removed (left hand is on keyboard for WASD movement).
// Right hand holds a greatsword. All joints interpolated for smooth motion.
// Detailed procedural armor: layered plates, hydraulics, energy conduits.
// =============================================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCVContext } from '../cv/CVProvider';
import { useGameStore } from '../game/GameState';
import { fireSwing } from '../combat/SwingEvent';
import { updateSwordTransform } from '../combat/SwordState';

// ---- Colors ----
const MECHA_BLUE   = 0x2288cc;
const MECHA_DARK   = 0x334455;
const MECHA_ACCENT = 0x00ffff;
const PANEL_DARK   = 0x1a2a3a;
const CHROME       = 0x888899;
const PISTON       = 0x666677;
const ENERGY_CORE  = 0x00ccff;
const SWORD_BLADE  = 0xccddee;
const SWORD_GUARD  = 0xffcc00;
const SWORD_HANDLE = 0x553300;

// ---- Shared materials (created once, reused by all geometry) ----
const matBlue   = new THREE.MeshStandardMaterial({ color: MECHA_BLUE,   metalness: 0.7, roughness: 0.25 });
const matDark   = new THREE.MeshStandardMaterial({ color: MECHA_DARK,   metalness: 0.6, roughness: 0.3 });
const matPanel  = new THREE.MeshStandardMaterial({ color: PANEL_DARK,   metalness: 0.8, roughness: 0.2 });
const matAccent = new THREE.MeshStandardMaterial({ color: MECHA_ACCENT, emissive: MECHA_ACCENT, emissiveIntensity: 0.5 });
const matChrome = new THREE.MeshStandardMaterial({ color: CHROME,       metalness: 0.9, roughness: 0.1 });
const matPiston = new THREE.MeshStandardMaterial({ color: PISTON,       metalness: 0.85, roughness: 0.15 });
const matGlow   = new THREE.MeshStandardMaterial({ color: ENERGY_CORE,  emissive: ENERGY_CORE, emissiveIntensity: 0.8 });
const matBlade  = new THREE.MeshStandardMaterial({ color: SWORD_BLADE,  metalness: 0.92, roughness: 0.08 });
const matBevel  = new THREE.MeshStandardMaterial({ color: 0xaabbcc,     metalness: 0.95, roughness: 0.05 });
const matGuard  = new THREE.MeshStandardMaterial({ color: SWORD_GUARD,  metalness: 0.75, roughness: 0.2 });
const matHandle = new THREE.MeshStandardMaterial({ color: SWORD_HANDLE, roughness: 0.7 });
const matPommel = new THREE.MeshStandardMaterial({ color: SWORD_GUARD,  metalness: 0.8, roughness: 0.2 });

// ============================================================================
// Procedural arm segment builders
// ============================================================================

function makeUpperArm(): THREE.Group {
  const g = new THREE.Group();

  // Core cylinder — tapered
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.34, 10), matDark);
  g.add(core);

  // Shoulder pauldron
  const pauldron = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.08, 6), matBlue);
  pauldron.position.y = 0.16;
  g.add(pauldron);

  // Pauldron bevel ring
  const pauldronRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.008, 4, 6), matChrome);
  pauldronRing.position.y = 0.13;
  pauldronRing.rotation.x = Math.PI / 2;
  g.add(pauldronRing);

  // Pauldron top energy node
  const topNode = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), matGlow);
  topNode.position.set(0, 0.20, 0);
  g.add(topNode);

  // Front armor — layered plates
  const frontOuter = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.02), matBlue);
  frontOuter.position.set(0, 0.02, 0.065);
  g.add(frontOuter);

  const frontInner = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.015), matPanel);
  frontInner.position.set(0, 0.0, 0.078);
  g.add(frontInner);

  // Angular side armor flares
  for (const side of [-1, 1]) {
    const flare = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.20, 0.08), matBlue);
    flare.position.set(side * 0.075, 0.0, 0.01);
    flare.rotation.y = side * 0.25;
    g.add(flare);

    const inset = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.14, 0.06), matPanel);
    inset.position.set(side * 0.078, -0.01, 0.01);
    inset.rotation.y = side * 0.25;
    g.add(inset);
  }

  // Back armor plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.02), matDark);
  backPlate.position.set(0, 0.0, -0.06);
  g.add(backPlate);

  // Hydraulic pistons
  for (const side of [-1, 1]) {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), matPiston);
    piston.position.set(side * 0.055, -0.03, -0.03);
    g.add(piston);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 6), matChrome);
    sleeve.position.set(side * 0.055, -0.08, -0.03);
    g.add(sleeve);
  }

  // Glowing energy bands
  for (const yOff of [-0.10, -0.02, 0.06]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.005, 4, 12), matAccent);
    band.position.y = yOff;
    band.rotation.x = Math.PI / 2;
    g.add(band);
  }

  // Panel line grooves
  for (const yOff of [-0.06, 0.08]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.006, 0.025), matPanel);
    groove.position.set(0, yOff, 0.075);
    g.add(groove);
  }

  // Exhaust vents on back
  for (let i = 0; i < 4; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.014, 0.008), matGlow);
    vent.position.set(0, -0.06 + i * 0.04, -0.068);
    g.add(vent);
  }

  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
  return g;
}

function makeForearm(): THREE.Group {
  const g = new THREE.Group();

  // Core cylinder
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.045, 0.32, 10), matDark);
  g.add(core);

  // Elbow guard
  const elbowMain = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.10), matBlue);
  elbowMain.position.set(0, 0.14, 0.02);
  elbowMain.rotation.x = 0.12;
  g.add(elbowMain);

  const elbowBevel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), matPanel);
  elbowBevel.position.set(0, 0.15, 0.03);
  elbowBevel.rotation.x = 0.12;
  g.add(elbowBevel);

  // Elbow joint ring
  const elbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 4, 10), matChrome);
  elbowRing.position.y = 0.10;
  elbowRing.rotation.x = Math.PI / 2;
  g.add(elbowRing);

  // Front armor — double layer
  const frontOuter = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.20, 0.018), matBlue);
  frontOuter.position.set(0, -0.02, 0.058);
  g.add(frontOuter);

  const frontInner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.012), matPanel);
  frontInner.position.set(0, -0.03, 0.070);
  g.add(frontInner);

  // Side armor plates
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.22, 0.07), matBlue);
    sidePlate.position.set(side * 0.062, -0.01, 0);
    g.add(sidePlate);

    const sideInset = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.05), matPanel);
    sideInset.position.set(side * 0.065, -0.02, 0);
    g.add(sideInset);
  }

  // Hydraulic line
  const hLine = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.24, 6), matPiston);
  hLine.position.set(0.045, -0.02, -0.04);
  g.add(hLine);

  const hSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 6), matChrome);
  hSleeve.position.set(0.045, -0.08, -0.04);
  g.add(hSleeve);

  // Side vent arrays
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.035), matAccent);
      vent.position.set(side * 0.068, -0.04 + i * 0.035, 0);
      g.add(vent);
    }
  }

  // Wrist cuff
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.04, 10), matBlue);
  cuff.position.y = -0.155;
  g.add(cuff);

  const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 4, 10), matChrome);
  cuffRing.position.y = -0.14;
  cuffRing.rotation.x = Math.PI / 2;
  g.add(cuffRing);

  // Energy conduit strip
  const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.18, 0.008), matGlow);
  conduit.position.set(0, -0.03, 0.078);
  g.add(conduit);

  for (const yOff of [-0.10, 0.04]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), matGlow);
    node.position.set(0, yOff, 0.078);
    g.add(node);
  }

  // Panel line grooves
  for (const yOff of [-0.08, 0.02]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.022), matPanel);
    groove.position.set(0, yOff, 0.062);
    g.add(groove);
  }

  // Back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.018), matDark);
  backPlate.position.set(0, -0.01, -0.052);
  g.add(backPlate);

  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
  return g;
}

function makeHand(): THREE.Group {
  const g = new THREE.Group();

  // Palm block
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.06), matDark);
  g.add(palm);

  // Back-of-hand armor
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.025), matBlue);
  backPlate.position.set(0, 0, -0.038);
  g.add(backPlate);

  // Knuckle guard
  const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.025, 0.07), matBlue);
  knuckle.position.set(0, 0.038, 0);
  g.add(knuckle);

  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.055), matChrome);
  ridge.position.set(0, 0.048, 0);
  g.add(ridge);

  // Armored fingers
  for (let i = 0; i < 4; i++) {
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.028), matBlue);
    seg1.position.set(-0.039 + i * 0.026, 0.06, 0);
    g.add(seg1);

    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.025, 0.024), matDark);
    seg2.position.set(-0.039 + i * 0.026, 0.085, 0);
    g.add(seg2);

    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 4, 4), matChrome);
    joint.position.set(-0.039 + i * 0.026, 0.072, 0.012);
    g.add(joint);
  }

  // Thumb
  const thumbBase = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.035, 0.028), matBlue);
  thumbBase.position.set(-0.065, 0.01, 0.02);
  thumbBase.rotation.z = 0.5;
  g.add(thumbBase);

  const thumbTip = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.028, 0.022), matDark);
  thumbTip.position.set(-0.080, 0.035, 0.02);
  thumbTip.rotation.z = 0.6;
  g.add(thumbTip);

  // Wrist connector
  const connector = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.025, 10), matChrome);
  connector.position.y = -0.035;
  g.add(connector);

  // Palm underside
  const underPlate = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.02), matPanel);
  underPlate.position.set(0, 0, 0.035);
  g.add(underPlate);

  // Knuckle glow
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.006, 0.05), matGlow);
  glow.position.set(0, 0.052, 0);
  g.add(glow);

  // Side accent strips
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.04), matAccent);
    strip.position.set(side * 0.058, 0, 0);
    g.add(strip);
  }

  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
  return g;
}

function makeJoint(radius: number): THREE.Group {
  const g = new THREE.Group();

  const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.7, 8, 8), matGlow);
  g.add(core);

  const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 10), matChrome);
  g.add(shell);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.1, radius * 0.08, 4, 12), matAccent);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  return g;
}

function makeSword(): THREE.Group {
  const g = new THREE.Group();

  // Main blade
  const bladeMain = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.0, 0.022), matBlade);
  bladeMain.position.y = 1.08;
  g.add(bladeMain);

  // Edge bevels
  for (const side of [-1, 1]) {
    const bevel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.9, 0.026), matBevel);
    bevel.position.set(side * 0.095, 1.08, 0);
    bevel.rotation.z = side * 0.03;
    g.add(bevel);
  }

  // Blade tip
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.28, 4), matBlade);
  tip.position.y = 2.22;
  tip.rotation.y = Math.PI / 4;
  g.add(tip);

  // Fuller groove
  const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.026), matPanel);
  fuller.position.set(0, 0.9, 0);
  g.add(fuller);

  // Energy line
  const energyLine = new THREE.Mesh(new THREE.BoxGeometry(0.018, 1.45, 0.006), matGlow);
  energyLine.position.set(0, 0.9, 0.014);
  g.add(energyLine);

  // Energy pulse nodes
  for (let i = 0; i < 7; i++) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), matGlow);
    node.position.set(0, 0.25 + i * 0.28, 0.014);
    g.add(node);
  }

  // Guard crosspiece
  const guardMain = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.06), matGuard);
  guardMain.position.y = 0.07;
  g.add(guardMain);

  // Guard wing tips
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.045), matGuard);
    wing.position.set(side * 0.20, 0.11, 0);
    wing.rotation.z = side * -0.4;
    g.add(wing);
  }

  // Guard chrome trim
  const guardTrim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.015, 0.065), matChrome);
  guardTrim.position.y = 0.045;
  g.add(guardTrim);

  // Guard energy gem
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), matGlow);
  gem.position.set(0, 0.07, 0.038);
  g.add(gem);

  // Handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.32, 8), matHandle);
  handle.position.y = -0.10;
  g.add(handle);

  // Grip wrapping bands
  for (let i = 0; i < 5; i++) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 4, 8), matChrome);
    wrap.position.y = -0.22 + i * 0.06;
    wrap.rotation.x = Math.PI / 2;
    g.add(wrap);
  }

  // Pommel
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), matPommel);
  pommel.position.y = -0.28;
  g.add(pommel);

  const pommelGlow = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), matGlow);
  pommelGlow.position.y = -0.28;
  g.add(pommelGlow);

  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
  return g;
}

// ============================================================================
// Cockpit anchor & tracking constants
// ============================================================================

const R_SHOULDER = new THREE.Vector3(0.5, -0.45, -1.0);
const ARM_SCALE = 3.5;
const DEPTH_SCALE = 5.0;

const SMOOTH_SHOULDER = 0.25;
const SMOOTH_ELBOW = 0.2;
const SMOOTH_WRIST = 0.25;
const SMOOTH_HAND = 0.3;
const SMOOTH_SWORD_POS = 0.3;
const SMOOTH_SWORD_ROT = 0.15;

const R_SHOULDER_IDX = 12;
const R_ELBOW_IDX = 14;
const R_WRIST_IDX = 16;
const R_INDEX_IDX = 20;

function getDelta(
  lm: { x: number; y: number; z: number },
  shoulderLm: { x: number; y: number; z: number }
): THREE.Vector3 {
  return new THREE.Vector3(
    -(lm.x - shoulderLm.x) * ARM_SCALE,
    -(lm.y - shoulderLm.y) * ARM_SCALE,
    (lm.z - shoulderLm.z) * DEPTH_SCALE
  );
}

// Reusable temp objects
const _tmpVec = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _UP = new THREE.Vector3(0, 1, 0);

/**
 * Position a group between two 3D points with uniform scaling.
 */
function positionLimb(
  obj: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  defaultHeight: number
) {
  const mid = _tmpVec.addVectors(from, to).multiplyScalar(0.5);
  obj.position.copy(mid);

  const dir = _tmpDir.subVectors(to, from);
  const len = dir.length();
  const s = len / defaultHeight;
  obj.scale.setScalar(s);

  const dirNorm = dir.normalize();
  if (Math.abs(dirNorm.dot(_UP)) > 0.999) {
    dirNorm.x += 0.001;
    dirNorm.normalize();
  }
  _tmpQuat.setFromUnitVectors(_UP, dirNorm);
  obj.quaternion.slerp(_tmpQuat, 0.35);
}

// Raw target positions
const _tRShoulder = new THREE.Vector3();
const _tRElbow = new THREE.Vector3();
const _tRWrist = new THREE.Vector3();
const _tRHand = new THREE.Vector3();

// ============================================================================
// Component
// ============================================================================

export function MechaArms() {
  const { camera } = useThree();
  const phase = useGameStore((s) => s.phase);
  const { cvEnabled, cvInputRef, worldLandmarksRef } = useCVContext();

  // Build detailed geometry once
  const upperArm = useMemo(() => makeUpperArm(), []);
  const forearm = useMemo(() => makeForearm(), []);
  const hand = useMemo(() => makeHand(), []);
  const shoulderJoint = useMemo(() => makeJoint(0.08), []);
  const elbowJoint = useMemo(() => makeJoint(0.06), []);
  const wristJoint = useMemo(() => makeJoint(0.05), []);
  const sword = useMemo(() => makeSword(), []);

  const groupRef = useRef<THREE.Group>(null!);
  const swordGroupRef = useRef<THREE.Group>(null!);

  const smoothJoints = useRef({
    rShoulder: new THREE.Vector3(),
    rElbow: new THREE.Vector3(),
    rWrist: new THREE.Vector3(),
    rHand: new THREE.Vector3(),
    swordQuat: new THREE.Quaternion(),
    initialized: false,
  });

  const prevCvSwinging = useRef(false);

  const dims = useMemo(
    () => ({ upper: 0.35, fore: 0.32, hand: 0.12 }),
    []
  );

  useFrame(() => {
    if (!groupRef.current) return;

    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'roundEnd';

    if (!isGameplay || !cvEnabled) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const cvInput = cvInputRef.current;
    const worldLandmarks = worldLandmarksRef.current;

    // Fire swing callback on rising edge
    if (cvInput.isSwinging && !prevCvSwinging.current) {
      fireSwing();
    }
    prevCvSwinging.current = cvInput.isSwinging;

    if (!worldLandmarks || worldLandmarks.length < 21) {
      groupRef.current.visible = false;
      return;
    }

    const s = smoothJoints.current;
    const wlRS = worldLandmarks[R_SHOULDER_IDX];

    // Compute raw right arm joint positions in camera-local space
    _tRShoulder.copy(R_SHOULDER);
    _tRElbow.copy(_tRShoulder).add(getDelta(worldLandmarks[R_ELBOW_IDX], wlRS));
    _tRWrist.copy(_tRShoulder).add(getDelta(worldLandmarks[R_WRIST_IDX], wlRS));
    _tRHand.copy(_tRShoulder).add(getDelta(worldLandmarks[R_INDEX_IDX], wlRS));

    // Transform from camera-local to world space
    const camQuat = camera.quaternion;
    const camPos = camera.position;
    const toWorld = (v: THREE.Vector3) => v.applyQuaternion(camQuat).add(camPos);

    toWorld(_tRShoulder);
    toWorld(_tRElbow);
    toWorld(_tRWrist);
    toWorld(_tRHand);

    // Lerp smoothing
    if (!s.initialized) {
      s.rShoulder.copy(_tRShoulder);
      s.rElbow.copy(_tRElbow);
      s.rWrist.copy(_tRWrist);
      s.rHand.copy(_tRHand);
      s.initialized = true;
    } else {
      s.rShoulder.lerp(_tRShoulder, SMOOTH_SHOULDER);
      s.rElbow.lerp(_tRElbow, SMOOTH_ELBOW);
      s.rWrist.lerp(_tRWrist, SMOOTH_WRIST);
      s.rHand.lerp(_tRHand, SMOOTH_HAND);
    }

    // Apply to joints
    shoulderJoint.position.copy(s.rShoulder);
    elbowJoint.position.copy(s.rElbow);
    wristJoint.position.copy(s.rWrist);

    // Apply to arm segments
    positionLimb(upperArm, s.rShoulder, s.rElbow, dims.upper);
    positionLimb(forearm, s.rElbow, s.rWrist, dims.fore);
    positionLimb(hand, s.rWrist, s.rHand, dims.hand);

    // Sword at right hand, oriented along forearm
    if (swordGroupRef.current) {
      swordGroupRef.current.position.lerp(s.rHand, SMOOTH_SWORD_POS);

      const swordDir = _tmpDir.subVectors(s.rHand, s.rWrist);
      if (swordDir.lengthSq() > 0.0001) {
        swordDir.normalize();
        if (Math.abs(swordDir.dot(_UP)) > 0.999) {
          swordDir.x += 0.001;
          swordDir.normalize();
        }
        const targetQuat = _tmpQuat.setFromUnitVectors(_UP, swordDir);
        s.swordQuat.slerp(targetQuat, SMOOTH_SWORD_ROT);
        swordGroupRef.current.quaternion.copy(s.swordQuat);
      }

      updateSwordTransform(swordGroupRef.current);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Detailed joint spheres */}
      <primitive object={shoulderJoint} />
      <primitive object={elbowJoint} />
      <primitive object={wristJoint} />

      {/* Detailed armored limbs */}
      <primitive object={upperArm} />
      <primitive object={forearm} />
      <primitive object={hand} />

      {/* Greatsword */}
      <group ref={swordGroupRef} scale={0.65}>
        <primitive object={sword} />
      </group>
    </group>
  );
}
