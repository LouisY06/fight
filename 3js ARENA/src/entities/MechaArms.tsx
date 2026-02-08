// =============================================================================
// MechaArms.tsx — First-person cockpit RIGHT arm driven by CV pose tracking
// Left arm removed (left hand is on keyboard for WASD movement).
// Right hand holds a weapon (sword / gun / shield) based on WeaponState.
// All joints interpolated for smooth motion.
// Detailed procedural armor: layered plates, hydraulics, energy conduits.
// OWN geometry — independent of MechaGeometry.ts (third-person uses different scale).
// =============================================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cvBridge } from '../cv/cvBridge';
import { useGameStore } from '../game/GameState';
import { useWeaponStore } from '../game/WeaponState';
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

function enableShadows(g: THREE.Group) {
  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
}

// ============================================================================
// Procedural arm segment builders (first-person scale)
// ============================================================================

function makeUpperArm(): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.34, 10), matDark);
  g.add(core);
  const pauldron = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.08, 6), matBlue);
  pauldron.position.y = 0.16;
  g.add(pauldron);
  const pauldronRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.008, 4, 6), matChrome);
  pauldronRing.position.y = 0.13;
  pauldronRing.rotation.x = Math.PI / 2;
  g.add(pauldronRing);
  const topNode = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), matGlow);
  topNode.position.set(0, 0.20, 0);
  g.add(topNode);
  const frontOuter = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.02), matBlue);
  frontOuter.position.set(0, 0.02, 0.065);
  g.add(frontOuter);
  const frontInner = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.015), matPanel);
  frontInner.position.set(0, 0.0, 0.078);
  g.add(frontInner);
  for (const side of [-1, 1]) {
    const flare = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.20, 0.08), matBlue);
    flare.position.set(side * 0.075, 0.0, 0.01);
    flare.rotation.y = side * 0.25;
    g.add(flare);
    const inset = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.14, 0.06), matPanel);
    inset.position.set(side * 0.078, -0.01, 0.01);
    inset.rotation.y = side * 0.25;
    g.add(inset);
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.022, 0.04), matGlow);
      vent.position.set(side * 0.085, -0.06 + i * 0.04, -0.01);
      g.add(vent);
    }
  }
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.02), matDark);
  backPlate.position.set(0, 0.0, -0.06);
  g.add(backPlate);
  for (const side of [-1, 1]) {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), matPiston);
    piston.position.set(side * 0.055, -0.03, -0.03);
    g.add(piston);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 6), matChrome);
    sleeve.position.set(side * 0.055, -0.08, -0.03);
    g.add(sleeve);
  }
  for (const yOff of [-0.10, -0.02, 0.06]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.005, 4, 12), matAccent);
    band.position.y = yOff;
    band.rotation.x = Math.PI / 2;
    g.add(band);
  }
  for (const yOff of [-0.06, 0.08]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.006, 0.025), matPanel);
    groove.position.set(0, yOff, 0.075);
    g.add(groove);
  }
  for (let i = 0; i < 4; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.014, 0.008), matGlow);
    vent.position.set(0, -0.06 + i * 0.04, -0.068);
    g.add(vent);
  }
  enableShadows(g);
  return g;
}

function makeForearm(): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.045, 0.32, 10), matDark);
  g.add(core);
  const elbowMain = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.10), matBlue);
  elbowMain.position.set(0, 0.14, 0.02);
  elbowMain.rotation.x = 0.12;
  g.add(elbowMain);
  const elbowBevel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), matPanel);
  elbowBevel.position.set(0, 0.15, 0.03);
  elbowBevel.rotation.x = 0.12;
  g.add(elbowBevel);
  const elbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 4, 10), matChrome);
  elbowRing.position.y = 0.10;
  elbowRing.rotation.x = Math.PI / 2;
  g.add(elbowRing);
  const frontOuter = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.20, 0.018), matBlue);
  frontOuter.position.set(0, -0.02, 0.058);
  g.add(frontOuter);
  const frontInner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.012), matPanel);
  frontInner.position.set(0, -0.03, 0.070);
  g.add(frontInner);
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.22, 0.07), matBlue);
    sidePlate.position.set(side * 0.062, -0.01, 0);
    g.add(sidePlate);
    const sideInset = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.05), matPanel);
    sideInset.position.set(side * 0.065, -0.02, 0);
    g.add(sideInset);
  }
  const hLine = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.24, 6), matPiston);
  hLine.position.set(0.045, -0.02, -0.04);
  g.add(hLine);
  const hSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 6), matChrome);
  hSleeve.position.set(0.045, -0.08, -0.04);
  g.add(hSleeve);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.035), matAccent);
      vent.position.set(side * 0.068, -0.04 + i * 0.035, 0);
      g.add(vent);
    }
  }
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.04, 10), matBlue);
  cuff.position.y = -0.155;
  g.add(cuff);
  const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 4, 10), matChrome);
  cuffRing.position.y = -0.14;
  cuffRing.rotation.x = Math.PI / 2;
  g.add(cuffRing);
  const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.18, 0.008), matGlow);
  conduit.position.set(0, -0.03, 0.078);
  g.add(conduit);
  for (const yOff of [-0.10, 0.04]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), matGlow);
    node.position.set(0, yOff, 0.078);
    g.add(node);
  }
  for (const yOff of [-0.08, 0.02]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.022), matPanel);
    groove.position.set(0, yOff, 0.062);
    g.add(groove);
  }
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.018), matDark);
  backPlate.position.set(0, -0.01, -0.052);
  g.add(backPlate);
  enableShadows(g);
  return g;
}

function makeHand(): THREE.Group {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.06), matDark);
  g.add(palm);
  const backP = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.025), matBlue);
  backP.position.set(0, 0, -0.038);
  g.add(backP);
  const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.025, 0.07), matBlue);
  knuckle.position.set(0, 0.038, 0);
  g.add(knuckle);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.055), matChrome);
  ridge.position.set(0, 0.048, 0);
  g.add(ridge);
  for (let i = 0; i < 4; i++) {
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.028), matBlue);
    seg1.position.set(-0.039 + i * 0.026, 0.06, 0);
    g.add(seg1);
    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.025, 0.024), matDark);
    seg2.position.set(-0.039 + i * 0.026, 0.085, 0);
    g.add(seg2);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 4, 4), matChrome);
    joint.position.set(-0.039 + i * 0.026, 0.073, 0.012);
    g.add(joint);
  }
  const thumbBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.035, 0.028), matBlue);
  thumbBase.position.set(-0.065, 0.01, 0.022);
  thumbBase.rotation.z = 0.5;
  g.add(thumbBase);
  const thumbTip = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.028, 0.024), matDark);
  thumbTip.position.set(-0.080, 0.035, 0.022);
  thumbTip.rotation.z = 0.6;
  g.add(thumbTip);
  const connector = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.025, 8), matChrome);
  connector.position.y = -0.035;
  g.add(connector);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.006, 0.05), matGlow);
  glow.position.set(0, 0.052, 0);
  g.add(glow);
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.04), matAccent);
    strip.position.set(side * 0.058, 0, 0);
    g.add(strip);
  }
  enableShadows(g);
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
  const bladeMain = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.0, 0.022), matBlade);
  bladeMain.position.y = 1.08;
  g.add(bladeMain);
  for (const side of [-1, 1]) {
    const bevel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.9, 0.026), matBevel);
    bevel.position.set(side * 0.095, 1.08, 0);
    bevel.rotation.z = side * 0.03;
    g.add(bevel);
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.28, 4), matBlade);
  tip.position.y = 2.22;
  tip.rotation.y = Math.PI / 4;
  g.add(tip);
  const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.026), matPanel);
  fuller.position.set(0, 0.9, 0);
  g.add(fuller);
  const energyLine = new THREE.Mesh(new THREE.BoxGeometry(0.018, 1.45, 0.006), matGlow);
  energyLine.position.set(0, 0.9, 0.014);
  g.add(energyLine);
  for (let i = 0; i < 7; i++) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), matGlow);
    node.position.set(0, 0.25 + i * 0.28, 0.014);
    g.add(node);
  }
  const guardMain = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.06), matGuard);
  guardMain.position.y = 0.07;
  g.add(guardMain);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.045), matGuard);
    wing.position.set(side * 0.20, 0.11, 0);
    wing.rotation.z = side * -0.4;
    g.add(wing);
  }
  const guardTrim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.015, 0.065), matChrome);
  guardTrim.position.y = 0.045;
  g.add(guardTrim);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), matGlow);
  gem.position.set(0, 0.07, 0.038);
  g.add(gem);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.32, 8), matHandle);
  handle.position.y = -0.10;
  g.add(handle);
  for (let i = 0; i < 5; i++) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 4, 8), matChrome);
    wrap.position.y = -0.22 + i * 0.06;
    wrap.rotation.x = Math.PI / 2;
    g.add(wrap);
  }
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), matPommel);
  pommel.position.y = -0.28;
  g.add(pommel);
  const pommelGlow = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), matGlow);
  pommelGlow.position.y = -0.28;
  g.add(pommelGlow);
  enableShadows(g);
  return g;
}

function makeGun(): THREE.Group {
  const g = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.36), matDark);
  receiver.position.set(0, 0, -0.04);
  g.add(receiver);
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.30), matChrome);
  topRail.position.set(0, 0.07, -0.02);
  g.add(topRail);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.030, 0.30, 10), matBlue);
  barrel.position.set(0, 0.015, -0.34);
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);
  const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.20), matBlue);
  shroud.position.set(0, 0.015, -0.25);
  g.add(shroud);
  const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.020, 6, 4), matGlow);
  muzzleGlow.position.set(0, 0.015, -0.50);
  g.add(muzzleGlow);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18, 0.06), matHandle);
  grip.position.set(0, -0.12, 0.04);
  grip.rotation.x = 0.15;
  g.add(grip);
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.04, 0.20), matGlow);
    strip.position.set(side * 0.042, 0, -0.08);
    g.add(strip);
  }
  enableShadows(g);
  return g;
}

function makeShield(): THREE.Group {
  const g = new THREE.Group();
  const mainPlate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.70, 0.04), matBlue);
  g.add(mainPlate);
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.03, 0.05), matChrome);
  frameTop.position.y = 0.35;
  g.add(frameTop);
  const frameBot = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.03, 0.05), matChrome);
  frameBot.position.y = -0.35;
  g.add(frameBot);
  for (const side of [-1, 1]) {
    const frameSide = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.70, 0.05), matChrome);
    frameSide.position.x = side * 0.275;
    g.add(frameSide);
  }
  const boss = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), matDark);
  boss.position.z = 0.03;
  g.add(boss);
  const bossCore = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), matGlow);
  bossCore.position.z = 0.06;
  g.add(bossCore);
  const handleMain = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.03), matHandle);
  handleMain.position.set(0, 0, -0.04);
  g.add(handleMain);
  enableShadows(g);
  return g;
}

// ============================================================================
// Cockpit anchor & tracking constants
// ============================================================================

const R_SHOULDER = new THREE.Vector3(0.5, -0.45, -0.55);
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
  const activeWeapon = useWeaponStore((s) => s.activeWeapon);
  const cvEnabled = cvBridge.cvEnabled;
  const cvInputRef = cvBridge.cvInputRef;
  const worldLandmarksRef = cvBridge.worldLandmarksRef;

  // Build detailed geometry once
  const upperArm = useMemo(() => makeUpperArm(), []);
  const forearm = useMemo(() => makeForearm(), []);
  const hand = useMemo(() => makeHand(), []);
  const shoulderJoint = useMemo(() => makeJoint(0.08), []);
  const elbowJoint = useMemo(() => makeJoint(0.06), []);
  const wristJoint = useMemo(() => makeJoint(0.05), []);
  const sword = useMemo(() => makeSword(), []);
  const gun = useMemo(() => makeGun(), []);
  const shield = useMemo(() => makeShield(), []);

  const groupRef = useRef<THREE.Group>(null!);
  const swordGroupRef = useRef<THREE.Group>(null!);
  const gunGroupRef = useRef<THREE.Group>(null!);
  const shieldGroupRef = useRef<THREE.Group>(null!);

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

    // Weapon at right hand, oriented along forearm
    const weaponDir = _tmpDir.subVectors(s.rHand, s.rWrist);
    let weaponTargetQuat: THREE.Quaternion | null = null;
    if (weaponDir.lengthSq() > 0.0001) {
      weaponDir.normalize();
      if (Math.abs(weaponDir.dot(_UP)) > 0.999) {
        weaponDir.x += 0.001;
        weaponDir.normalize();
      }
      weaponTargetQuat = _tmpQuat.setFromUnitVectors(_UP, weaponDir);
      s.swordQuat.slerp(weaponTargetQuat, SMOOTH_SWORD_ROT);
    }

    // --- Sword ---
    if (swordGroupRef.current) {
      swordGroupRef.current.visible = activeWeapon === 'sword';
      if (activeWeapon === 'sword') {
        swordGroupRef.current.position.lerp(s.rHand, SMOOTH_SWORD_POS);
        if (weaponTargetQuat) {
          swordGroupRef.current.quaternion.copy(s.swordQuat);
        }
        updateSwordTransform(swordGroupRef.current);
      }
    }

    // --- Gun ---
    if (gunGroupRef.current) {
      gunGroupRef.current.visible = activeWeapon === 'gun';
      if (activeWeapon === 'gun') {
        gunGroupRef.current.position.lerp(s.rHand, SMOOTH_SWORD_POS);
        if (weaponTargetQuat) {
          gunGroupRef.current.quaternion.copy(s.swordQuat);
        }
      }
    }

    // --- Shield ---
    if (shieldGroupRef.current) {
      shieldGroupRef.current.visible = activeWeapon === 'shield';
      if (activeWeapon === 'shield') {
        shieldGroupRef.current.position.lerp(s.rHand, SMOOTH_SWORD_POS);
        if (weaponTargetQuat) {
          shieldGroupRef.current.quaternion.copy(s.swordQuat);
        }
      }
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

      {/* Greatsword — visible when sword is active */}
      <group ref={swordGroupRef} scale={0.65}>
        <primitive object={sword} />
      </group>

      {/* Gun — visible when gun is active */}
      <group ref={gunGroupRef} scale={0.55}>
        <primitive object={gun} />
      </group>

      {/* Shield — visible when shield is active */}
      <group ref={shieldGroupRef} scale={0.45}>
        <primitive object={shield} />
      </group>
    </group>
  );
}
