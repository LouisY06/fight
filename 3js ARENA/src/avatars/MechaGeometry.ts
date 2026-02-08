// =============================================================================
// MechaGeometry.ts — Shared materials + procedural geometry builders for mecha
// Gunmetal gray armor + hot orange energy accents. HEAVY pilotable-mech proportions.
// Used by both MechaArms.tsx (first-person) and MechaEntity.tsx (third-person).
// =============================================================================

import * as THREE from 'three';

// ---- Color constants (gunmetal + orange) ----
export const MECHA_PRIMARY = 0x4a4e55;   // gunmetal gray armor
export const MECHA_DARK    = 0x2a2d33;   // dark gunmetal frame
export const MECHA_ACCENT  = 0xff6600;   // hot orange energy
export const PANEL_DARK    = 0x1e2024;   // recessed panel dark
export const CHROME        = 0x8a8d94;   // lighter chrome trim
export const PISTON        = 0x555860;   // mechanical internals
export const ENERGY_CORE   = 0xff4400;   // deep orange energy glow
export const SWORD_BLADE   = 0xb8bcc4;   // cool steel blade
export const SWORD_GUARD   = 0xff5500;   // orange guard
export const SWORD_HANDLE  = 0x1a1a1a;   // dark grip

// Legacy aliases (referenced elsewhere)
export const MECHA_BLUE = MECHA_PRIMARY;

// ---- Shared materials (module-level singletons) ----
export const matBlue   = new THREE.MeshStandardMaterial({ color: MECHA_PRIMARY, metalness: 0.75, roughness: 0.22 });
export const matDark   = new THREE.MeshStandardMaterial({ color: MECHA_DARK,    metalness: 0.65, roughness: 0.28 });
export const matPanel  = new THREE.MeshStandardMaterial({ color: PANEL_DARK,    metalness: 0.8,  roughness: 0.18 });
export const matAccent = new THREE.MeshStandardMaterial({ color: MECHA_ACCENT,  emissive: MECHA_ACCENT, emissiveIntensity: 0.6 });
export const matChrome = new THREE.MeshStandardMaterial({ color: CHROME,        metalness: 0.92, roughness: 0.08 });
export const matPiston = new THREE.MeshStandardMaterial({ color: PISTON,        metalness: 0.85, roughness: 0.15 });
export const matGlow   = new THREE.MeshStandardMaterial({ color: ENERGY_CORE,   emissive: ENERGY_CORE, emissiveIntensity: 1.0 });
export const matBlade  = new THREE.MeshStandardMaterial({ color: SWORD_BLADE,   metalness: 0.94, roughness: 0.06 });
export const matBevel  = new THREE.MeshStandardMaterial({ color: 0x9a9ea6,      metalness: 0.95, roughness: 0.05 });
export const matGuard  = new THREE.MeshStandardMaterial({ color: SWORD_GUARD,   metalness: 0.75, roughness: 0.2, emissive: SWORD_GUARD, emissiveIntensity: 0.25 });
export const matHandle = new THREE.MeshStandardMaterial({ color: SWORD_HANDLE,  roughness: 0.6,  metalness: 0.4 });
export const matPommel = new THREE.MeshStandardMaterial({ color: SWORD_GUARD,   metalness: 0.8,  roughness: 0.2, emissive: SWORD_GUARD, emissiveIntensity: 0.15 });

/** Enable castShadow on all meshes in a group. */
function enableShadows(g: THREE.Group) {
  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
}

// ============================================================================
// Arm segment builders (shared between first-person & third-person)
// ============================================================================

export function makeUpperArm(): THREE.Group {
  const g = new THREE.Group();

  // Thick core cylinder
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.09, 0.40, 8), matDark);
  g.add(core);

  // MASSIVE pauldron — wide angular shoulder shield
  const pauldronBase = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.22), matBlue);
  pauldronBase.position.set(0, 0.18, -0.02);
  pauldronBase.rotation.x = -0.1;
  g.add(pauldronBase);

  // Pauldron top layer (stacked armor)
  const pauldronTop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.18), matBlue);
  pauldronTop.position.set(0, 0.24, -0.03);
  pauldronTop.rotation.x = -0.15;
  g.add(pauldronTop);

  // Pauldron swept-back fin
  const pauldronFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.20), matBlue);
  pauldronFin.position.set(0, 0.27, -0.06);
  pauldronFin.rotation.x = -0.25;
  g.add(pauldronFin);

  // Pauldron leading edge glow
  const pauldronGlow = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.008, 0.008), matGlow);
  pauldronGlow.position.set(0, 0.19, 0.10);
  g.add(pauldronGlow);

  // Pauldron chrome trim
  const pauldronTrim = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.012, 0.005), matChrome);
  pauldronTrim.position.set(0, 0.14, 0.11);
  g.add(pauldronTrim);

  // Heavy front plate
  const frontOuter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.03), matBlue);
  frontOuter.position.set(0, -0.02, 0.09);
  frontOuter.rotation.x = -0.04;
  g.add(frontOuter);

  const frontInner = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.02), matPanel);
  frontInner.position.set(0, -0.03, 0.105);
  g.add(frontInner);

  // Thick side armor plates
  for (const side of [-1, 1]) {
    const flare = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.14), matBlue);
    flare.position.set(side * 0.10, -0.02, -0.01);
    flare.rotation.y = side * 0.12;
    g.add(flare);

    const inset = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.20, 0.10), matPanel);
    inset.position.set(side * 0.11, -0.03, -0.01);
    flare.rotation.y = side * 0.12;
    g.add(inset);

    // Orange vent slits
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.028, 0.06), matGlow);
      vent.position.set(side * 0.12, -0.08 + i * 0.05, -0.01);
      g.add(vent);
    }
  }

  // Heavy back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.03), matDark);
  backPlate.position.set(0, -0.02, -0.085);
  g.add(backPlate);

  // Hydraulic pistons (thick)
  for (const side of [-1, 1]) {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 6), matPiston);
    piston.position.set(side * 0.065, -0.05, -0.05);
    g.add(piston);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.10, 6), matChrome);
    sleeve.position.set(side * 0.065, -0.12, -0.05);
    g.add(sleeve);
  }

  // Orange energy bands
  for (const yOff of [-0.12, 0.0, 0.08]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.005, 4, 8), matAccent);
    band.position.y = yOff;
    band.rotation.x = Math.PI / 2;
    g.add(band);
  }

  // Back vents — orange glow
  for (let i = 0; i < 4; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 0.010), matGlow);
    vent.position.set(0, -0.10 + i * 0.05, -0.098);
    g.add(vent);
  }

  enableShadows(g);
  return g;
}

export function makeForearm(): THREE.Group {
  const g = new THREE.Group();

  // Thick core
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.36, 8), matDark);
  g.add(core);

  // Heavy elbow guard
  const elbowMain = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.16), matBlue);
  elbowMain.position.set(0, 0.16, 0.02);
  elbowMain.rotation.x = 0.12;
  g.add(elbowMain);

  // Elbow back fin
  const elbowFin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.16), matBlue);
  elbowFin.position.set(0, 0.17, -0.06);
  elbowFin.rotation.x = -0.2;
  g.add(elbowFin);

  const elbowInset = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.10), matPanel);
  elbowInset.position.set(0, 0.16, 0.04);
  g.add(elbowInset);

  // Elbow glow slit
  const elbowGlow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.010), matGlow);
  elbowGlow.position.set(0, 0.11, 0.09);
  g.add(elbowGlow);

  // Chrome ring
  const elbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 4, 8), matChrome);
  elbowRing.position.y = 0.11;
  elbowRing.rotation.x = Math.PI / 2;
  g.add(elbowRing);

  // Heavy front plate
  const frontOuter = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.025), matBlue);
  frontOuter.position.set(0, -0.02, 0.08);
  g.add(frontOuter);

  const frontInner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.018), matPanel);
  frontInner.position.set(0, -0.03, 0.09);
  g.add(frontInner);

  // Side armor
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.10), matBlue);
    sidePlate.position.set(side * 0.085, -0.01, 0);
    sidePlate.rotation.y = side * 0.06;
    g.add(sidePlate);

    const sideInset = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.20, 0.07), matPanel);
    sideInset.position.set(side * 0.09, -0.02, 0);
    g.add(sideInset);
  }

  // Hydraulic line
  const hLine = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 6), matPiston);
  hLine.position.set(0.06, -0.02, -0.05);
  g.add(hLine);

  const hSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.08, 6), matChrome);
  hSleeve.position.set(0.06, -0.10, -0.05);
  g.add(hSleeve);

  // Side vent slits — orange glow
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.04), matGlow);
      vent.position.set(side * 0.095, -0.04 + i * 0.04, 0);
      g.add(vent);
    }
  }

  // Wrist cuff (thick)
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.05, 8), matBlue);
  cuff.position.y = -0.175;
  g.add(cuff);

  const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.006, 4, 8), matChrome);
  cuffRing.position.y = -0.155;
  cuffRing.rotation.x = Math.PI / 2;
  g.add(cuffRing);

  // Front energy conduit — orange glow line
  const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.24, 0.008), matGlow);
  conduit.position.set(0, -0.03, 0.095);
  g.add(conduit);

  // Energy nodes
  for (const yOff of [-0.12, 0.05]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), matGlow);
    node.position.set(0, yOff, 0.095);
    g.add(node);
  }

  // Back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.30, 0.025), matDark);
  backPlate.position.set(0, -0.01, -0.072);
  g.add(backPlate);

  enableShadows(g);
  return g;
}

export function makeHand(): THREE.Group {
  const g = new THREE.Group();

  // Big mechanical palm
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.09), matDark);
  g.add(palm);

  // Back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.07, 0.03), matBlue);
  backPlate.position.set(0, 0, -0.05);
  g.add(backPlate);

  // Knuckle ridge
  const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.10), matBlue);
  knuckle.position.set(0, 0.05, 0);
  g.add(knuckle);

  const knuckleEdge = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.015, 0.08), matChrome);
  knuckleEdge.position.set(0, 0.06, 0);
  g.add(knuckleEdge);

  // Thick fingers
  for (let i = 0; i < 4; i++) {
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.04, 0.038), matBlue);
    seg1.position.set(-0.054 + i * 0.036, 0.08, 0);
    g.add(seg1);

    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.032, 0.032), matDark);
    seg2.position.set(-0.054 + i * 0.036, 0.115, 0);
    g.add(seg2);

    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.010, 4, 4), matChrome);
    joint.position.set(-0.054 + i * 0.036, 0.098, 0.016);
    g.add(joint);
  }

  // Thumb
  const thumbBase = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.045, 0.038), matBlue);
  thumbBase.position.set(-0.09, 0.01, 0.03);
  thumbBase.rotation.z = 0.5;
  g.add(thumbBase);

  const thumbTip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.035, 0.030), matDark);
  thumbTip.position.set(-0.11, 0.045, 0.03);
  thumbTip.rotation.z = 0.6;
  g.add(thumbTip);

  // Wrist connector
  const connector = new THREE.Mesh(new THREE.CylinderGeometry(0.070, 0.075, 0.03, 8), matChrome);
  connector.position.y = -0.045;
  g.add(connector);

  // Knuckle glow strip
  const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.006, 0.07), matGlow);
  glowStrip.position.set(0, 0.068, 0);
  g.add(glowStrip);

  // Side accent strips
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.06, 0.05), matAccent);
    strip.position.set(side * 0.082, 0, 0);
    g.add(strip);
  }

  enableShadows(g);
  return g;
}

export function makeJoint(radius: number): THREE.Group {
  const g = new THREE.Group();

  // Inner core — orange glow
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.65, 8, 8), matGlow);
  g.add(core);

  // Outer shell — chrome
  const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 10), matChrome);
  g.add(shell);

  // Orange accent ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.1, radius * 0.08, 4, 10), matAccent);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  return g;
}

export function makeSword(): THREE.Group {
  const g = new THREE.Group();

  // Blade — wide, aggressive profile
  const bladeMain = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.0, 0.022), matBlade);
  bladeMain.position.y = 1.08;
  g.add(bladeMain);

  // Blade edge bevels
  for (const side of [-1, 1]) {
    const bevel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.9, 0.026), matBevel);
    bevel.position.set(side * 0.095, 1.08, 0);
    bevel.rotation.z = side * 0.03;
    g.add(bevel);
  }

  // Tip
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.30, 4), matBlade);
  tip.position.y = 2.24;
  tip.rotation.y = Math.PI / 4;
  g.add(tip);

  // Fuller channel
  const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.026), matPanel);
  fuller.position.set(0, 0.9, 0);
  g.add(fuller);

  // Central energy line — orange glow
  const energyLine = new THREE.Mesh(new THREE.BoxGeometry(0.020, 1.5, 0.006), matGlow);
  energyLine.position.set(0, 0.9, 0.014);
  g.add(energyLine);

  // Energy nodes along blade
  for (let i = 0; i < 7; i++) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), matGlow);
    node.position.set(0, 0.25 + i * 0.28, 0.014);
    g.add(node);
  }

  // Guard — angular orange wings
  const guardMain = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.05, 0.06), matGuard);
  guardMain.position.y = 0.07;
  g.add(guardMain);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.04), matGuard);
    wing.position.set(side * 0.22, 0.10, -0.01);
    wing.rotation.z = side * -0.35;
    wing.rotation.x = -0.15;
    g.add(wing);
  }

  const guardTrim = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.012, 0.065), matChrome);
  guardTrim.position.y = 0.045;
  g.add(guardTrim);

  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.030, 0), matGlow);
  gem.position.set(0, 0.07, 0.038);
  g.add(gem);

  // Handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.32, 8), matHandle);
  handle.position.y = -0.10;
  g.add(handle);

  for (let i = 0; i < 5; i++) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 4, 8), matChrome);
    wrap.position.y = -0.22 + i * 0.06;
    wrap.rotation.x = Math.PI / 2;
    g.add(wrap);
  }

  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.040, 8, 6), matPommel);
  pommel.position.y = -0.28;
  g.add(pommel);

  const pommelGlow = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), matGlow);
  pommelGlow.position.y = -0.28;
  g.add(pommelGlow);

  enableShadows(g);
  return g;
}

export function makeGun(): THREE.Group {
  const g = new THREE.Group();

  // Main receiver — angular, chunky sci-fi pistol
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.44), matDark);
  receiver.position.set(0, 0, -0.06);
  g.add(receiver);

  // Top rail — chrome strip
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.36), matChrome);
  topRail.position.set(0, 0.08, -0.04);
  g.add(topRail);

  // Barrel — forward-extending cylinder
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.35, 10), matBlue);
  barrel.position.set(0, 0.02, -0.40);
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);

  // Barrel shroud — angular armor casing around barrel
  const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.25), matBlue);
  shroud.position.set(0, 0.02, -0.30);
  g.add(shroud);

  const shroudInset = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.22), matPanel);
  shroudInset.position.set(0, 0.02, -0.30);
  g.add(shroudInset);

  // Muzzle — chrome ring at barrel tip
  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 4, 8), matChrome);
  muzzle.position.set(0, 0.02, -0.58);
  g.add(muzzle);

  // Muzzle glow insert
  const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), matGlow);
  muzzleGlow.position.set(0, 0.02, -0.58);
  g.add(muzzleGlow);

  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.08), matHandle);
  grip.position.set(0, -0.15, 0.06);
  grip.rotation.x = 0.15;
  g.add(grip);

  // Grip chrome wraps
  for (let i = 0; i < 3; i++) {
    const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.085), matChrome);
    wrap.position.set(0, -0.08 - i * 0.06, 0.06);
    wrap.rotation.x = 0.15;
    g.add(wrap);
  }

  // Trigger guard
  const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.12), matDark);
  triggerGuard.position.set(0, -0.04, 0);
  g.add(triggerGuard);

  // Side energy accent strips — orange glow
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.05, 0.25), matGlow);
    strip.position.set(side * 0.052, 0, -0.10);
    g.add(strip);

    // Energy nodes
    for (let i = 0; i < 3; i++) {
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 4), matGlow);
      node.position.set(side * 0.054, 0, -0.02 - i * 0.10);
      g.add(node);
    }
  }

  // Rear sight — angular
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.02), matChrome);
  rearSight.position.set(0, 0.10, 0.10);
  g.add(rearSight);

  // Front sight — angular
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.02), matChrome);
  frontSight.position.set(0, 0.10, -0.18);
  g.add(frontSight);

  // Magazine well accent
  const magWell = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), matPanel);
  magWell.position.set(0, -0.04, 0.06);
  g.add(magWell);

  enableShadows(g);
  return g;
}

export function makeShield(): THREE.Group {
  const g = new THREE.Group();

  // Main shield face — large, angular, armored plate
  const mainPlate = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.90, 0.05), matBlue);
  g.add(mainPlate);

  // Outer frame — chrome border
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.06), matChrome);
  frameTop.position.y = 0.45;
  g.add(frameTop);

  const frameBot = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.06), matChrome);
  frameBot.position.y = -0.45;
  g.add(frameBot);

  for (const side of [-1, 1]) {
    const frameSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.90, 0.06), matChrome);
    frameSide.position.x = side * 0.35;
    g.add(frameSide);
  }

  // Central boss — angular raised section with reactor glow
  const boss = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.06), matDark);
  boss.position.z = 0.04;
  g.add(boss);

  const bossCore = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), matGlow);
  bossCore.position.z = 0.08;
  g.add(bossCore);

  const bossRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 4, 8), matChrome);
  bossRing.position.z = 0.08;
  g.add(bossRing);

  // Angular reinforcement strips
  for (const yOff of [-0.30, -0.15, 0.15, 0.30]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.03, 0.02), matPanel);
    strip.position.set(0, yOff, 0.03);
    g.add(strip);
  }

  // Vertical reinforcement
  for (const xOff of [-0.22, 0.22]) {
    const vStrip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.84, 0.02), matPanel);
    vStrip.position.set(xOff, 0, 0.03);
    g.add(vStrip);
  }

  // Corner rivets — chrome spheres
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), matChrome);
      rivet.position.set(sx * 0.30, sy * 0.38, 0.04);
      g.add(rivet);
    }
  }

  // Edge glow — orange accent along top and bottom
  const glowTop = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.008, 0.008), matGlow);
  glowTop.position.set(0, 0.42, 0.035);
  g.add(glowTop);

  const glowBot = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.008, 0.008), matGlow);
  glowBot.position.set(0, -0.42, 0.035);
  g.add(glowBot);

  // Side glow accents — orange
  for (const side of [-1, 1]) {
    const sideGlow = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.80, 0.008), matGlow);
    sideGlow.position.set(side * 0.32, 0, 0.035);
    g.add(sideGlow);
  }

  // Back handle (grip attached to arm)
  const handleMain = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.04), matHandle);
  handleMain.position.set(0, 0, -0.05);
  g.add(handleMain);

  // Handle chrome wraps
  for (let i = 0; i < 3; i++) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 4, 8), matChrome);
    wrap.position.set(0, -0.08 + i * 0.08, -0.05);
    wrap.rotation.x = Math.PI / 2;
    g.add(wrap);
  }

  // Back brace
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.04), matDark);
  brace.position.set(0, 0.20, -0.05);
  g.add(brace);

  enableShadows(g);
  return g;
}

// ============================================================================
// Body segment builders (third-person mecha body — HEAVY proportions)
// ============================================================================

/** Head: small sensor pod relative to massive body. */
export function makeHead(): THREE.Group {
  const g = new THREE.Group();

  // Compact angular helmet
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.20), matBlue);
  helmet.position.y = 0.02;
  g.add(helmet);

  // Crest (swept back)
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.18), matBlue);
  crest.position.set(0, 0.10, -0.02);
  crest.rotation.x = -0.15;
  g.add(crest);

  const crestTip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.10), matChrome);
  crestTip.position.set(0, 0.12, -0.07);
  crestTip.rotation.x = -0.2;
  g.add(crestTip);

  // Face plate
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.14), matDark);
  face.position.y = -0.01;
  g.add(face);

  // Chin
  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.12), matBlue);
  chin.position.set(0, -0.08, 0.01);
  g.add(chin);

  const chinGuard = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.05), matPanel);
  chinGuard.position.set(0, -0.09, 0.06);
  g.add(chinGuard);

  // Visor slit — orange glow
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.020, 0.005), matGlow);
  visor.position.set(0, 0.02, 0.102);
  g.add(visor);

  const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.032, 0.004), matChrome);
  visorFrame.position.set(0, 0.02, 0.101);
  g.add(visorFrame);

  // Side fins
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.14), matBlue);
    fin.position.set(side * 0.12, 0.05, -0.04);
    fin.rotation.y = side * 0.2;
    fin.rotation.x = -0.1;
    g.add(fin);

    const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.05), matChrome);
    finTip.position.set(side * 0.14, 0.06, -0.11);
    g.add(finTip);

    const finGlow = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, 0.04), matGlow);
    finGlow.position.set(side * 0.14, 0.06, -0.09);
    g.add(finGlow);
  }

  // Side vents
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.04), matGlow);
      vent.position.set(side * 0.112, -0.02 + i * 0.025, 0);
      g.add(vent);
    }
  }

  // Brow line
  const browLine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.005), matAccent);
  browLine.position.set(0, 0.05, 0.100);
  g.add(browLine);

  // Neck connector (thick)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 8), matPiston);
  neck.position.y = -0.14;
  g.add(neck);

  const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.005, 4, 8), matAccent);
  neckRing.position.y = -0.10;
  neckRing.rotation.x = Math.PI / 2;
  g.add(neckRing);

  enableShadows(g);
  return g;
}

/** Torso: MASSIVE cockpit-sized chest. Wide shoulders, heavy reactor. */
export function makeTorso(): THREE.Group {
  const g = new THREE.Group();

  // Main chest — very wide and deep (cockpit housing)
  const chestUpper = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.32), matBlue);
  chestUpper.position.y = 0.16;
  g.add(chestUpper);

  const chestMid = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.30), matBlue);
  chestMid.position.y = 0.02;
  g.add(chestMid);

  const chestLower = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.26), matDark);
  chestLower.position.y = -0.10;
  g.add(chestLower);

  // Front chest armor — layered angular plates
  for (const side of [-1, 1]) {
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.03), matBlue);
    chestPlate.position.set(side * 0.12, 0.14, 0.17);
    chestPlate.rotation.y = side * 0.06;
    g.add(chestPlate);

    const chestInset = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.02), matPanel);
    chestInset.position.set(side * 0.12, 0.14, 0.185);
    g.add(chestInset);

    // Chest vent slits
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.006, 0.008), matGlow);
      vent.position.set(side * 0.12, 0.08 + i * 0.04, 0.19);
      g.add(vent);
    }
  }

  // Reactor core — large orange glow
  const reactor = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), matGlow);
  reactor.position.set(0, 0.10, 0.18);
  g.add(reactor);

  const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 6, 12), matChrome);
  reactorRing.position.set(0, 0.10, 0.18);
  g.add(reactorRing);

  const reactorOuter = new THREE.Mesh(new THREE.TorusGeometry(0.060, 0.004, 4, 12), matAccent);
  reactorOuter.position.set(0, 0.10, 0.19);
  g.add(reactorOuter);

  // Heavy collar — angular frame around head
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.24), matChrome);
  collar.position.y = 0.28;
  g.add(collar);

  // Collar uprights (frame around head mounting)
  for (const side of [-1, 1]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), matBlue);
    upright.position.set(side * 0.28, 0.28, -0.02);
    upright.rotation.z = side * 0.10;
    g.add(upright);

    const uprightGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.006, 0.010), matGlow);
    uprightGlow.position.set(side * 0.28, 0.22, 0.08);
    g.add(uprightGlow);
  }

  // Ab plates (tapered, heavy)
  for (let i = 0; i < 3; i++) {
    const ab = new THREE.Mesh(
      new THREE.BoxGeometry(0.38 - i * 0.06, 0.045, 0.22 - i * 0.03),
      i % 2 === 0 ? matBlue : matPanel
    );
    ab.position.y = -0.16 - i * 0.06;
    g.add(ab);
  }

  // Ab glow lines
  for (let i = 0; i < 2; i++) {
    const abGlow = new THREE.Mesh(new THREE.BoxGeometry(0.30 - i * 0.06, 0.005, 0.010), matGlow);
    abGlow.position.set(0, -0.18 - i * 0.06, 0.11);
    g.add(abGlow);
  }

  // Massive back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.03), matDark);
  backPlate.position.set(0, 0.06, -0.16);
  g.add(backPlate);

  // Back thrusters / exhaust blocks
  for (const side of [-1, 1]) {
    const thruster = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.08), matDark);
    thruster.position.set(side * 0.18, 0.10, -0.20);
    g.add(thruster);

    const thrusterGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.006), matGlow);
    thrusterGlow.position.set(side * 0.18, 0.10, -0.24);
    g.add(thrusterGlow);
  }

  // Spine column
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 6), matPiston);
  spine.position.set(0, 0.02, -0.17);
  g.add(spine);

  for (let i = 0; i < 5; i++) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 4), matChrome);
    node.position.set(0, -0.16 + i * 0.10, -0.17);
    g.add(node);
  }

  // Side exhaust vents — orange glow
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.025, 0.07), matGlow);
      vent.position.set(side * 0.315, 0.0 + i * 0.04, 0);
      g.add(vent);
    }
  }

  // Shoulder mount platforms (massive, raised)
  for (const side of [-1, 1]) {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.18), matDark);
    mount.position.set(side * 0.32, 0.24, -0.02);
    g.add(mount);

    const mountCap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 8), matChrome);
    mountCap.position.set(side * 0.32, 0.28, 0);
    g.add(mountCap);
  }

  enableShadows(g);
  return g;
}

/** Hips: heavy waist connector. */
export function makeHips(): THREE.Group {
  const g = new THREE.Group();

  // Wide central pelvis
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.14, 0.24), matDark);
  g.add(pelvis);

  // Waist band — orange accent
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 4, 8), matAccent);
  band.position.y = 0.07;
  band.rotation.x = Math.PI / 2;
  g.add(band);

  // Hip joint mounts (big spheres)
  for (const side of [-1, 1]) {
    const mount = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), matChrome);
    mount.position.set(side * 0.18, -0.02, 0);
    g.add(mount);
  }

  // Skirt armor plates (hanging armor around hips)
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.18), matBlue);
    skirt.position.set(side * 0.22, -0.06, 0);
    g.add(skirt);

    const skirtGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.010), matGlow);
    skirtGlow.position.set(side * 0.22, -0.01, 0.09);
    g.add(skirtGlow);
  }

  // Front crotch plate
  const crotch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.06), matPanel);
  crotch.position.set(0, -0.08, 0.09);
  g.add(crotch);

  // Front glow slit
  const frontGlow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.005, 0.008), matGlow);
  frontGlow.position.set(0, -0.02, 0.12);
  g.add(frontGlow);

  // Back plate
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.03), matDark);
  back.position.set(0, 0, -0.12);
  g.add(back);

  enableShadows(g);
  return g;
}

/** Upper leg (thick thigh). ~0.44 tall, origin at top (hip pivot). */
export function makeUpperLeg(): THREE.Group {
  const g = new THREE.Group();

  // Thick core
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.085, 0.42, 8), matDark);
  core.position.y = -0.21;
  g.add(core);

  // Heavy front thigh plate
  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.30, 0.03), matBlue);
  frontPlate.position.set(0, -0.16, 0.09);
  frontPlate.rotation.x = -0.04;
  g.add(frontPlate);

  const frontInset = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.02), matPanel);
  frontInset.position.set(0, -0.17, 0.10);
  g.add(frontInset);

  // Side armor (thick plates)
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.32, 0.12), matBlue);
    sidePlate.position.set(side * 0.095, -0.16, 0);
    sidePlate.rotation.y = side * 0.04;
    g.add(sidePlate);

    // Side vent slits
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.025, 0.05), matGlow);
      vent.position.set(side * 0.11, -0.10 + i * 0.07, 0);
      g.add(vent);
    }
  }

  // Hydraulic pistons (heavy)
  for (const side of [-1, 1]) {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 6), matPiston);
    piston.position.set(side * 0.06, -0.22, -0.06);
    g.add(piston);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.08, 6), matChrome);
    sleeve.position.set(side * 0.06, -0.30, -0.06);
    g.add(sleeve);
  }

  // Energy bands
  for (const yOff of [-0.12, -0.28]) {
    const bandMesh = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.005, 4, 8), matAccent);
    bandMesh.position.y = yOff;
    bandMesh.rotation.x = Math.PI / 2;
    g.add(bandMesh);
  }

  // Front conduit
  const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.22, 0.006), matGlow);
  conduit.position.set(0, -0.20, 0.11);
  g.add(conduit);

  // Back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.30, 0.02), matDark);
  backPlate.position.set(0, -0.16, -0.075);
  g.add(backPlate);

  enableShadows(g);
  return g;
}

/** Lower leg (heavy shin). ~0.44 tall, origin at top (knee pivot). */
export function makeLowerLeg(): THREE.Group {
  const g = new THREE.Group();

  // Thick core
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.42, 8), matDark);
  core.position.y = -0.21;
  g.add(core);

  // Massive knee cap
  const kneeCap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), matBlue);
  kneeCap.position.set(0, -0.02, 0.04);
  kneeCap.rotation.x = 0.05;
  g.add(kneeCap);

  const kneeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.010), matGlow);
  kneeGlow.position.set(0, -0.08, 0.10);
  g.add(kneeGlow);

  // Heavy shin guard
  const shin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.035), matBlue);
  shin.position.set(0, -0.20, 0.07);
  shin.rotation.x = -0.03;
  g.add(shin);

  const shinInset = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.02), matPanel);
  shinInset.position.set(0, -0.21, 0.085);
  g.add(shinInset);

  // Shin energy conduit
  const shinConduit = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.24, 0.006), matGlow);
  shinConduit.position.set(0, -0.20, 0.095);
  g.add(shinConduit);

  // Calf plate
  const calf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.025), matDark);
  calf.position.set(0, -0.20, -0.06);
  g.add(calf);

  // Side armor
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.30, 0.10), matBlue);
    sidePlate.position.set(side * 0.08, -0.20, 0);
    sidePlate.rotation.y = side * 0.03;
    g.add(sidePlate);

    // Side vents
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.020, 0.04), matGlow);
      vent.position.set(side * 0.09, -0.14 + i * 0.07, 0);
      g.add(vent);
    }
  }

  // Heavy ankle cuff
  const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.04, 8), matBlue);
  ankle.position.y = -0.40;
  g.add(ankle);

  const ankleRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.006, 4, 8), matChrome);
  ankleRing.position.y = -0.39;
  ankleRing.rotation.x = Math.PI / 2;
  g.add(ankleRing);

  enableShadows(g);
  return g;
}

/** Foot: big stomping boot. ~0.12 tall, origin at top (ankle pivot). */
export function makeFoot(): THREE.Group {
  const g = new THREE.Group();

  // Large sole
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.28), matDark);
  sole.position.set(0, -0.07, 0.03);
  g.add(sole);

  // Toe cap — heavy, angular
  const toe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.10), matBlue);
  toe.position.set(0, -0.05, 0.13);
  toe.rotation.x = 0.06;
  g.add(toe);

  // Toe glow slit
  const toeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.005, 0.008), matGlow);
  toeGlow.position.set(0, -0.025, 0.175);
  g.add(toeGlow);

  // Heel — heavy block
  const heel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), matPanel);
  heel.position.set(0, -0.045, -0.08);
  g.add(heel);

  // Top armor
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.18), matBlue);
  top.position.set(0, -0.02, 0.03);
  g.add(top);

  // Ankle connector
  const ankleJoint = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), matChrome);
  g.add(ankleJoint);

  // Side glow strips
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.04, 0.12), matAccent);
    strip.position.set(side * 0.075, -0.04, 0.03);
    g.add(strip);
  }

  enableShadows(g);
  return g;
}
