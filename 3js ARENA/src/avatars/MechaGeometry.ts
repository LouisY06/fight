// =============================================================================
// MechaGeometry.ts — Shared materials + procedural geometry builders for mecha
// Gunmetal gray armor + hot orange energy accents. Angular, aggressive plates.
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

  // Core structure — octagonal feel
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.34, 8), matDark);
  g.add(core);

  // Large swept-back pauldron (angular wedge shape)
  const pauldronMain = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.12), matBlue);
  pauldronMain.position.set(0, 0.17, -0.01);
  pauldronMain.rotation.x = -0.15; // swept back
  g.add(pauldronMain);

  // Pauldron top fin (aggressive swept-back blade)
  const pauldronFin = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.14), matBlue);
  pauldronFin.position.set(0, 0.20, -0.03);
  pauldronFin.rotation.x = -0.25;
  g.add(pauldronFin);

  // Pauldron accent edge — orange glow strip on leading edge
  const pauldronGlow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.008, 0.008), matGlow);
  pauldronGlow.position.set(0, 0.175, 0.058);
  g.add(pauldronGlow);

  // Pauldron chrome trim
  const pauldronTrim = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.012, 0.005), matChrome);
  pauldronTrim.position.set(0, 0.145, 0.062);
  g.add(pauldronTrim);

  // Angular front plate (layered, swept)
  const frontOuter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.02), matBlue);
  frontOuter.position.set(0, 0.0, 0.065);
  frontOuter.rotation.x = -0.06;
  g.add(frontOuter);

  const frontInner = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.015), matPanel);
  frontInner.position.set(0, -0.01, 0.078);
  g.add(frontInner);

  // Side flares (angular swept-back)
  for (const side of [-1, 1]) {
    const flare = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.09), matBlue);
    flare.position.set(side * 0.072, -0.02, -0.01);
    flare.rotation.y = side * 0.2;
    flare.rotation.x = -0.05;
    g.add(flare);

    const inset = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.07), matPanel);
    inset.position.set(side * 0.076, -0.03, -0.01);
    inset.rotation.y = side * 0.2;
    g.add(inset);

    // Orange vent slits on side plates
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.022, 0.04), matGlow);
      vent.position.set(side * 0.085, -0.06 + i * 0.04, -0.01);
      g.add(vent);
    }
  }

  // Back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.02), matDark);
  backPlate.position.set(0, -0.02, -0.06);
  g.add(backPlate);

  // Hydraulic pistons
  for (const side of [-1, 1]) {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), matPiston);
    piston.position.set(side * 0.048, -0.04, -0.035);
    g.add(piston);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 6), matChrome);
    sleeve.position.set(side * 0.048, -0.10, -0.035);
    g.add(sleeve);
  }

  // Orange energy bands (angular torus)
  for (const yOff of [-0.10, 0.0, 0.08]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.004, 4, 8), matAccent);
    band.position.y = yOff;
    band.rotation.x = Math.PI / 2;
    g.add(band);
  }

  // Back vents — orange glow
  for (let i = 0; i < 4; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.008), matGlow);
    vent.position.set(0, -0.08 + i * 0.04, -0.068);
    g.add(vent);
  }

  // Panel line grooves
  for (const yOff of [-0.06, 0.06]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.005, 0.025), matPanel);
    groove.position.set(0, yOff, 0.075);
    g.add(groove);
  }

  enableShadows(g);
  return g;
}

export function makeForearm(): THREE.Group {
  const g = new THREE.Group();

  // Core cylinder
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.32, 8), matDark);
  g.add(core);

  // Angular elbow guard (swept-back wedge)
  const elbowMain = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.10), matBlue);
  elbowMain.position.set(0, 0.14, 0.02);
  elbowMain.rotation.x = 0.15;
  g.add(elbowMain);

  const elbowBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.12), matBlue);
  elbowBlade.position.set(0, 0.15, -0.04);
  elbowBlade.rotation.x = -0.2; // swept back
  g.add(elbowBlade);

  const elbowInset = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.06), matPanel);
  elbowInset.position.set(0, 0.15, 0.03);
  elbowInset.rotation.x = 0.12;
  g.add(elbowInset);

  // Elbow glow slit
  const elbowGlow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.006, 0.008), matGlow);
  elbowGlow.position.set(0, 0.10, 0.06);
  g.add(elbowGlow);

  // Chrome ring
  const elbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 4, 8), matChrome);
  elbowRing.position.y = 0.10;
  elbowRing.rotation.x = Math.PI / 2;
  g.add(elbowRing);

  // Angular front plate
  const frontOuter = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.018), matBlue);
  frontOuter.position.set(0, -0.02, 0.055);
  g.add(frontOuter);

  const frontInner = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.012), matPanel);
  frontInner.position.set(0, -0.03, 0.066);
  g.add(frontInner);

  // Side plates (angular)
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.24, 0.07), matBlue);
    sidePlate.position.set(side * 0.058, -0.01, -0.005);
    sidePlate.rotation.y = side * 0.08;
    g.add(sidePlate);

    const sideInset = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.16, 0.05), matPanel);
    sideInset.position.set(side * 0.062, -0.02, -0.005);
    g.add(sideInset);
  }

  // Hydraulic line
  const hLine = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.24, 6), matPiston);
  hLine.position.set(0.042, -0.02, -0.038);
  g.add(hLine);

  const hSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 6), matChrome);
  hSleeve.position.set(0.042, -0.08, -0.038);
  g.add(hSleeve);

  // Side vent slits — orange glow
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.030), matGlow);
      vent.position.set(side * 0.065, -0.04 + i * 0.035, 0);
      g.add(vent);
    }
  }

  // Wrist cuff
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.04, 8), matBlue);
  cuff.position.y = -0.155;
  g.add(cuff);

  const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.005, 4, 8), matChrome);
  cuffRing.position.y = -0.14;
  cuffRing.rotation.x = Math.PI / 2;
  g.add(cuffRing);

  // Front energy conduit — orange glow line
  const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.20, 0.006), matGlow);
  conduit.position.set(0, -0.03, 0.074);
  g.add(conduit);

  // Energy nodes along conduit
  for (const yOff of [-0.10, 0.04]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.010, 6, 4), matGlow);
    node.position.set(0, yOff, 0.074);
    g.add(node);
  }

  // Panel grooves
  for (const yOff of [-0.08, 0.02]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.004, 0.020), matPanel);
    groove.position.set(0, yOff, 0.060);
    g.add(groove);
  }

  // Back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.018), matDark);
  backPlate.position.set(0, -0.01, -0.050);
  g.add(backPlate);

  enableShadows(g);
  return g;
}

export function makeHand(): THREE.Group {
  const g = new THREE.Group();

  // Palm block
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.055, 0.055), matDark);
  g.add(palm);

  // Back plate — angular
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.048, 0.022), matBlue);
  backPlate.position.set(0, 0, -0.035);
  g.add(backPlate);

  // Knuckle ridge
  const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.065), matBlue);
  knuckle.position.set(0, 0.035, 0);
  g.add(knuckle);

  const knuckleEdge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.010, 0.050), matChrome);
  knuckleEdge.position.set(0, 0.044, 0);
  g.add(knuckleEdge);

  // Finger segments
  for (let i = 0; i < 4; i++) {
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.028, 0.026), matBlue);
    seg1.position.set(-0.036 + i * 0.024, 0.058, 0);
    g.add(seg1);

    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.022), matDark);
    seg2.position.set(-0.036 + i * 0.024, 0.082, 0);
    g.add(seg2);

    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), matChrome);
    joint.position.set(-0.036 + i * 0.024, 0.070, 0.011);
    g.add(joint);
  }

  // Thumb
  const thumbBase = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.032, 0.026), matBlue);
  thumbBase.position.set(-0.060, 0.01, 0.02);
  thumbBase.rotation.z = 0.5;
  g.add(thumbBase);

  const thumbTip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.025, 0.020), matDark);
  thumbTip.position.set(-0.075, 0.033, 0.02);
  thumbTip.rotation.z = 0.6;
  g.add(thumbTip);

  // Wrist connector
  const connector = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.050, 0.022, 8), matChrome);
  connector.position.y = -0.032;
  g.add(connector);

  // Under plate
  const underPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.038, 0.018), matPanel);
  underPlate.position.set(0, 0, 0.032);
  g.add(underPlate);

  // Knuckle glow strip — orange
  const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.005, 0.045), matGlow);
  glowStrip.position.set(0, 0.050, 0);
  g.add(glowStrip);

  // Side accent strips
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.045, 0.035), matAccent);
    strip.position.set(side * 0.054, 0, 0);
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
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.1, radius * 0.07, 4, 10), matAccent);
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

  // Tip — angular
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

  // Energy nodes along blade — orange
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
    // Swept-back guard wings
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.04), matGuard);
    wing.position.set(side * 0.22, 0.10, -0.01);
    wing.rotation.z = side * -0.35;
    wing.rotation.x = -0.15; // swept back
    g.add(wing);
  }

  // Guard chrome trim
  const guardTrim = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.012, 0.065), matChrome);
  guardTrim.position.y = 0.045;
  g.add(guardTrim);

  // Guard gem — orange glow
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.030, 0), matGlow);
  gem.position.set(0, 0.07, 0.038);
  g.add(gem);

  // Handle — dark grip
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.32, 8), matHandle);
  handle.position.y = -0.10;
  g.add(handle);

  // Handle wraps — chrome
  for (let i = 0; i < 5; i++) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 4, 8), matChrome);
    wrap.position.y = -0.22 + i * 0.06;
    wrap.rotation.x = Math.PI / 2;
    g.add(wrap);
  }

  // Pommel — orange accent
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
// Body segment builders (third-person mecha body)
// ============================================================================

/** Head: angular helmet, visor slit, swept-back fins, side vents. ~0.30 tall. */
export function makeHead(): THREE.Group {
  const g = new THREE.Group();

  // Main helmet — angular (box-based, not sphere)
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), matBlue);
  helmet.position.y = 0.02;
  g.add(helmet);

  // Helmet top ridge — aggressive swept-back crest
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.16), matBlue);
  crest.position.set(0, 0.10, -0.02);
  crest.rotation.x = -0.15;
  g.add(crest);

  const crestTip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), matChrome);
  crestTip.position.set(0, 0.12, -0.06);
  crestTip.rotation.x = -0.2;
  g.add(crestTip);

  // Face plate (angular, tapered at chin)
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.12), matDark);
  face.position.y = -0.01;
  g.add(face);

  // Lower face / chin (narrower)
  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.10), matBlue);
  chin.position.set(0, -0.08, 0.01);
  g.add(chin);

  // Chin guard plate
  const chinGuard = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.04), matPanel);
  chinGuard.position.set(0, -0.09, 0.05);
  g.add(chinGuard);

  // Visor slit — orange glow (angry narrow slit)
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.020, 0.005), matGlow);
  visor.position.set(0, 0.02, 0.092);
  g.add(visor);

  // Visor frame — chrome
  const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.032, 0.004), matChrome);
  visorFrame.position.set(0, 0.02, 0.091);
  g.add(visorFrame);

  // Side swept-back fins (angular antenna-like)
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.12), matBlue);
    fin.position.set(side * 0.12, 0.05, -0.04);
    fin.rotation.y = side * 0.2;
    fin.rotation.x = -0.1;
    g.add(fin);

    const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.04), matChrome);
    finTip.position.set(side * 0.14, 0.06, -0.10);
    g.add(finTip);

    const finGlow = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, 0.03), matGlow);
    finGlow.position.set(side * 0.14, 0.06, -0.08);
    g.add(finGlow);
  }

  // Side vents — orange glow (3 per side)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.035), matGlow);
      vent.position.set(side * 0.112, -0.02 + i * 0.025, 0);
      g.add(vent);
    }
  }

  // Forehead panel lines
  const browLine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.005), matAccent);
  browLine.position.set(0, 0.05, 0.090);
  g.add(browLine);

  // Neck connector
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 8), matPiston);
  neck.position.y = -0.13;
  g.add(neck);

  // Neck glow ring
  const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.004, 4, 8), matAccent);
  neckRing.position.y = -0.10;
  neckRing.rotation.x = Math.PI / 2;
  g.add(neckRing);

  enableShadows(g);
  return g;
}

/** Torso: angular chest plates, reactor core, shoulder mounts. ~0.55 tall. */
export function makeTorso(): THREE.Group {
  const g = new THREE.Group();

  // Main chest — wider at top, narrower at waist (aggressive taper)
  const chestUpper = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.18, 0.20), matBlue);
  chestUpper.position.y = 0.14;
  g.add(chestUpper);

  const chestLower = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.18), matBlue);
  chestLower.position.y = -0.02;
  g.add(chestLower);

  // Front chest armor plates (layered angular panels)
  const chestPlateL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.02), matBlue);
  chestPlateL.position.set(-0.08, 0.14, 0.11);
  chestPlateL.rotation.y = 0.08;
  g.add(chestPlateL);

  const chestPlateR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.02), matBlue);
  chestPlateR.position.set(0.08, 0.14, 0.11);
  chestPlateR.rotation.y = -0.08;
  g.add(chestPlateR);

  // Chest plate insets (darker panel)
  const chestInsetL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.015), matPanel);
  chestInsetL.position.set(-0.08, 0.14, 0.12);
  g.add(chestInsetL);

  const chestInsetR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.015), matPanel);
  chestInsetR.position.set(0.08, 0.14, 0.12);
  g.add(chestInsetR);

  // Reactor core — orange glow sphere with ring
  const reactor = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), matGlow);
  reactor.position.set(0, 0.10, 0.12);
  g.add(reactor);

  const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(0.050, 0.006, 4, 10), matChrome);
  reactorRing.position.set(0, 0.10, 0.12);
  g.add(reactorRing);

  const reactorOuter = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.003, 4, 10), matAccent);
  reactorOuter.position.set(0, 0.10, 0.13);
  g.add(reactorOuter);

  // Collar — angular, aggressive
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.035, 0.16), matChrome);
  collar.position.y = 0.24;
  g.add(collar);

  // Collar flares (swept up and back)
  for (const side of [-1, 1]) {
    const flare = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.12), matBlue);
    flare.position.set(side * 0.20, 0.24, -0.01);
    flare.rotation.z = side * 0.18;
    flare.rotation.x = -0.1;
    g.add(flare);

    // Orange glow on collar edge
    const flareGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 0.008), matGlow);
    flareGlow.position.set(side * 0.20, 0.20, 0.06);
    g.add(flareGlow);
  }

  // Ab plates (3 segments, tapering down)
  for (let i = 0; i < 3; i++) {
    const ab = new THREE.Mesh(
      new THREE.BoxGeometry(0.26 - i * 0.04, 0.038, 0.15 - i * 0.02),
      i % 2 === 0 ? matBlue : matPanel
    );
    ab.position.y = -0.12 - i * 0.05;
    g.add(ab);
  }

  // Ab glow lines between segments
  for (let i = 0; i < 2; i++) {
    const abGlow = new THREE.Mesh(new THREE.BoxGeometry(0.22 - i * 0.04, 0.004, 0.008), matGlow);
    abGlow.position.set(0, -0.14 - i * 0.05, 0.075);
    g.add(abGlow);
  }

  // Back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.02), matDark);
  backPlate.position.set(0, 0.05, -0.10);
  g.add(backPlate);

  // Spine column
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), matPiston);
  spine.position.set(0, 0.02, -0.11);
  g.add(spine);

  // Spine nodes
  for (let i = 0; i < 4; i++) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.013, 4, 4), matChrome);
    node.position.set(0, -0.12 + i * 0.10, -0.11);
    g.add(node);
  }

  // Side exhaust vents — orange glow
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.020, 0.05), matGlow);
      vent.position.set(side * 0.205, 0.02 + i * 0.035, 0);
      g.add(vent);
    }
  }

  // Shoulder mount platforms (raised, angular)
  for (const side of [-1, 1]) {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.12), matDark);
    mount.position.set(side * 0.21, 0.20, -0.01);
    g.add(mount);

    const mountCap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 8), matChrome);
    mountCap.position.set(side * 0.21, 0.23, 0);
    g.add(mountCap);
  }

  enableShadows(g);
  return g;
}

/** Hips/pelvis connector. ~0.12 tall. */
export function makeHips(): THREE.Group {
  const g = new THREE.Group();

  // Central pelvis — angular
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.15), matDark);
  g.add(pelvis);

  // Waist band — orange accent
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.010, 4, 8), matAccent);
  band.position.y = 0.05;
  band.rotation.x = Math.PI / 2;
  g.add(band);

  // Hip joint mounts
  for (const side of [-1, 1]) {
    const mount = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), matChrome);
    mount.position.set(side * 0.11, -0.02, 0);
    g.add(mount);
  }

  // Front crotch plate
  const crotch = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.04), matPanel);
  crotch.position.set(0, -0.06, 0.055);
  g.add(crotch);

  // Front glow slit
  const frontGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.006), matGlow);
  frontGlow.position.set(0, -0.02, 0.076);
  g.add(frontGlow);

  // Back plate
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.02), matDark);
  back.position.set(0, 0, -0.075);
  g.add(back);

  // Side armor panels
  for (const side of [-1, 1]) {
    const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.10), matBlue);
    sidePanel.position.set(side * 0.14, -0.01, 0);
    g.add(sidePanel);
  }

  enableShadows(g);
  return g;
}

/** Upper leg (thigh armor). ~0.40 tall, origin at top (hip pivot). */
export function makeUpperLeg(): THREE.Group {
  const g = new THREE.Group();

  // Core
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.38, 8), matDark);
  core.position.y = -0.19;
  g.add(core);

  // Front thigh plate — angular, swept
  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.02), matBlue);
  frontPlate.position.set(0, -0.14, 0.055);
  frontPlate.rotation.x = -0.05;
  g.add(frontPlate);

  const frontInset = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.015), matPanel);
  frontInset.position.set(0, -0.15, 0.064);
  g.add(frontInset);

  // Side armor (angular flares)
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.08), matBlue);
    sidePlate.position.set(side * 0.058, -0.15, -0.005);
    sidePlate.rotation.y = side * 0.06;
    g.add(sidePlate);

    // Side vent slits — orange glow
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.020, 0.03), matGlow);
      vent.position.set(side * 0.068, -0.10 + i * 0.06, 0);
      g.add(vent);
    }
  }

  // Hydraulic pistons
  for (const side of [-1, 1]) {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.22, 6), matPiston);
    piston.position.set(side * 0.038, -0.20, -0.038);
    g.add(piston);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6), matChrome);
    sleeve.position.set(side * 0.038, -0.28, -0.038);
    g.add(sleeve);
  }

  // Energy bands — orange
  for (const yOff of [-0.10, -0.26]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.004, 4, 8), matAccent);
    band.position.y = yOff;
    band.rotation.x = Math.PI / 2;
    g.add(band);
  }

  // Front conduit line — orange glow
  const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.16, 0.005), matGlow);
  conduit.position.set(0, -0.18, 0.072);
  g.add(conduit);

  // Back plate
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.015), matDark);
  backPlate.position.set(0, -0.16, -0.048);
  g.add(backPlate);

  enableShadows(g);
  return g;
}

/** Lower leg (shin guard). ~0.40 tall, origin at top (knee pivot). */
export function makeLowerLeg(): THREE.Group {
  const g = new THREE.Group();

  // Core cylinder
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.38, 8), matDark);
  core.position.y = -0.19;
  g.add(core);

  // Knee cap — angular, aggressive
  const kneeCap = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.09), matBlue);
  kneeCap.position.set(0, -0.02, 0.03);
  kneeCap.rotation.x = 0.05;
  g.add(kneeCap);

  const kneeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.005, 0.008), matGlow);
  kneeGlow.position.set(0, -0.06, 0.072);
  g.add(kneeGlow);

  // Shin guard — angular plate
  const shin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.025), matBlue);
  shin.position.set(0, -0.18, 0.048);
  shin.rotation.x = -0.03;
  g.add(shin);

  const shinInset = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.015), matPanel);
  shinInset.position.set(0, -0.19, 0.058);
  g.add(shinInset);

  // Shin energy conduit — orange glow line
  const shinConduit = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.20, 0.005), matGlow);
  shinConduit.position.set(0, -0.18, 0.065);
  g.add(shinConduit);

  // Calf plate
  const calf = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.015), matDark);
  calf.position.set(0, -0.18, -0.042);
  g.add(calf);

  // Side armor
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.26, 0.06), matBlue);
    sidePlate.position.set(side * 0.048, -0.18, 0);
    sidePlate.rotation.y = side * 0.04;
    g.add(sidePlate);

    // Side vents — orange glow
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.016, 0.025), matGlow);
      vent.position.set(side * 0.056, -0.12 + i * 0.06, 0);
      g.add(vent);
    }
  }

  // Ankle cuff
  const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.050, 0.03, 8), matBlue);
  ankle.position.y = -0.37;
  g.add(ankle);

  const ankleRing = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.005, 4, 8), matChrome);
  ankleRing.position.y = -0.36;
  ankleRing.rotation.x = Math.PI / 2;
  g.add(ankleRing);

  enableShadows(g);
  return g;
}

/** Foot: armored boot. ~0.10 tall, origin at top (ankle pivot). */
export function makeFoot(): THREE.Group {
  const g = new THREE.Group();

  // Sole (slightly larger, aggressive)
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.028, 0.19), matDark);
  sole.position.set(0, -0.058, 0.02);
  g.add(sole);

  // Toe cap — angular
  const toe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.038, 0.06), matBlue);
  toe.position.set(0, -0.038, 0.09);
  toe.rotation.x = 0.08;
  g.add(toe);

  // Toe glow slit
  const toeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.006), matGlow);
  toeGlow.position.set(0, -0.02, 0.118);
  g.add(toeGlow);

  // Heel guard
  const heel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.04), matPanel);
  heel.position.set(0, -0.035, -0.06);
  g.add(heel);

  // Top armor
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.028, 0.12), matBlue);
  top.position.set(0, -0.018, 0.02);
  g.add(top);

  // Ankle connector
  const ankleJoint = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 4), matChrome);
  g.add(ankleJoint);

  enableShadows(g);
  return g;
}
