import * as THREE from 'three';

/**
 * MediaPipe landmark indices:
 *  11 = left shoulder   12 = right shoulder
 *  13 = left elbow      14 = right elbow
 *  15 = left wrist      16 = right wrist
 *  17 = left pinky      18 = right pinky
 *  19 = left index tip  20 = right index tip
 */

const MECHA_BLUE   = 0x2288cc;
const MECHA_DARK   = 0x334455;
const MECHA_ACCENT = 0x00ffff;
const PANEL_DARK   = 0x1a2a3a;
const JOINT_COLOR  = 0x00ffff;
const SWORD_BLADE  = 0xccddee;
const SWORD_GUARD  = 0xffcc00;
const SWORD_HANDLE = 0x553300;
const GUN_BODY     = 0x444444;
const GUN_BARREL   = 0x222222;
const GUN_ACCENT   = 0xff3333;
const SHIELD_MAIN  = 0x22cc44;
const SHIELD_RIM   = 0x44ff88;

const CHROME     = 0x888899;
const PISTON     = 0x666677;
const ENERGY_CORE = 0x00ccff;

// Shared materials
const matBlue   = new THREE.MeshStandardMaterial({ color: MECHA_BLUE,   metalness: 0.7, roughness: 0.25 });
const matDark   = new THREE.MeshStandardMaterial({ color: MECHA_DARK,   metalness: 0.6, roughness: 0.3 });
const matPanel  = new THREE.MeshStandardMaterial({ color: PANEL_DARK,   metalness: 0.8, roughness: 0.2 });
const matAccent = new THREE.MeshStandardMaterial({ color: MECHA_ACCENT, emissive: MECHA_ACCENT, emissiveIntensity: 0.5 });
const matChrome = new THREE.MeshStandardMaterial({ color: CHROME,       metalness: 0.9, roughness: 0.1 });
const matPiston = new THREE.MeshStandardMaterial({ color: PISTON,       metalness: 0.85, roughness: 0.15 });
const matGlow   = new THREE.MeshStandardMaterial({ color: ENERGY_CORE,  emissive: ENERGY_CORE, emissiveIntensity: 0.8 });

// ── Procedural arm segments ─────────────────────────────

/**
 * Upper arm: heavy pauldron, layered armor shell, hydraulic pistons, energy conduits.
 * Local Y axis runs along the limb. referenceHeight used for scaling.
 */
function makeUpperArm() {
  const group = new THREE.Group();
  group.referenceHeight = 0.35;

  // Thick inner core
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.055, 0.34, 10),
    matDark
  );
  group.add(core);

  // ── Shoulder pauldron — big angular cap ──
  const pauldron = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.09, 0.08, 6),
    matBlue
  );
  pauldron.position.y = 0.16;
  group.add(pauldron);

  // Pauldron bevel ring
  const pauldronRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.105, 0.008, 4, 6),
    matChrome
  );
  pauldronRing.position.y = 0.13;
  pauldronRing.rotation.x = Math.PI / 2;
  group.add(pauldronRing);

  // Pauldron top energy node
  const topNode = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 6),
    matGlow
  );
  topNode.position.set(0, 0.20, 0);
  group.add(topNode);

  // ── Front armor — layered overlapping plates ──
  const frontOuter = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.16, 0.02),
    matBlue
  );
  frontOuter.position.set(0, 0.02, 0.065);
  group.add(frontOuter);

  const frontInner = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.12, 0.015),
    matPanel
  );
  frontInner.position.set(0, 0.0, 0.078);
  group.add(frontInner);

  // Angular side armor flares
  for (const side of [-1, 1]) {
    const flare = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.20, 0.08),
      matBlue
    );
    flare.position.set(side * 0.075, 0.0, 0.01);
    flare.rotation.y = side * 0.25;
    group.add(flare);

    // Side panel inset
    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.14, 0.06),
      matPanel
    );
    inset.position.set(side * 0.078, -0.01, 0.01);
    inset.rotation.y = side * 0.25;
    group.add(inset);
  }

  // Back armor plate
  const backPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.18, 0.02),
    matDark
  );
  backPlate.position.set(0, 0.0, -0.06);
  group.add(backPlate);

  // ── Hydraulic pistons (two chrome rods on sides) ──
  for (const side of [-1, 1]) {
    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6),
      matPiston
    );
    piston.position.set(side * 0.055, -0.03, -0.03);
    group.add(piston);

    // Piston sleeve
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.08, 6),
      matChrome
    );
    sleeve.position.set(side * 0.055, -0.08, -0.03);
    group.add(sleeve);
  }

  // ── Glowing energy bands (3 rings) ──
  for (const yOff of [-0.10, -0.02, 0.06]) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.005, 4, 12),
      matAccent
    );
    band.position.y = yOff;
    band.rotation.x = Math.PI / 2;
    group.add(band);
  }

  // Panel line grooves (horizontal)
  for (const yOff of [-0.06, 0.08]) {
    const groove = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.006, 0.025),
      matPanel
    );
    groove.position.set(0, yOff, 0.075);
    group.add(groove);
  }

  // ── Exhaust vents on back ──
  for (let i = 0; i < 4; i++) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.014, 0.008),
      matGlow
    );
    vent.position.set(0, -0.06 + i * 0.04, -0.068);
    group.add(vent);
  }

  return group;
}

/**
 * Forearm: heavy elbow guard, layered plates, hydraulic lines, energy conduit, wrist cuff.
 */
function makeForearm() {
  const group = new THREE.Group();
  group.referenceHeight = 0.32;

  // Thick inner core
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.045, 0.32, 10),
    matDark
  );
  group.add(core);

  // ── Elbow guard — big angular shield ──
  const elbowMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.10, 0.10),
    matBlue
  );
  elbowMain.position.set(0, 0.14, 0.02);
  elbowMain.rotation.x = 0.12;
  group.add(elbowMain);

  const elbowBevel = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.06, 0.08),
    matPanel
  );
  elbowBevel.position.set(0, 0.15, 0.03);
  elbowBevel.rotation.x = 0.12;
  group.add(elbowBevel);

  // Elbow joint ring
  const elbowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.065, 0.008, 4, 10),
    matChrome
  );
  elbowRing.position.y = 0.10;
  elbowRing.rotation.x = Math.PI / 2;
  group.add(elbowRing);

  // ── Front armor — double layer ──
  const frontOuter = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.20, 0.018),
    matBlue
  );
  frontOuter.position.set(0, -0.02, 0.058);
  group.add(frontOuter);

  const frontInner = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.14, 0.012),
    matPanel
  );
  frontInner.position.set(0, -0.03, 0.070);
  group.add(frontInner);

  // ── Side armor plates ──
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.22, 0.07),
      matBlue
    );
    sidePlate.position.set(side * 0.062, -0.01, 0);
    group.add(sidePlate);

    // Side panel insets
    const sideInset = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.16, 0.05),
      matPanel
    );
    sideInset.position.set(side * 0.065, -0.02, 0);
    group.add(sideInset);
  }

  // ── Hydraulic lines (single side) ──
  const hLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.010, 0.24, 6),
    matPiston
  );
  hLine.position.set(0.045, -0.02, -0.04);
  group.add(hLine);

  const hSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.06, 6),
    matChrome
  );
  hSleeve.position.set(0.045, -0.08, -0.04);
  group.add(hSleeve);

  // ── Side vent arrays ──
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.006, 0.016, 0.035),
        matAccent
      );
      vent.position.set(side * 0.068, -0.04 + i * 0.035, 0);
      group.add(vent);
    }
  }

  // ── Wrist cuff — heavy ring ──
  const cuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.06, 0.04, 10),
    matBlue
  );
  cuff.position.y = -0.155;
  group.add(cuff);

  const cuffRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.058, 0.006, 4, 10),
    matChrome
  );
  cuffRing.position.y = -0.14;
  cuffRing.rotation.x = Math.PI / 2;
  group.add(cuffRing);

  // ── Energy conduit — glowing strip down the front ──
  const conduit = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.18, 0.008),
    matGlow
  );
  conduit.position.set(0, -0.03, 0.078);
  group.add(conduit);

  // Energy conduit nodes
  for (const yOff of [-0.10, 0.04]) {
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 6, 4),
      matGlow
    );
    node.position.set(0, yOff, 0.078);
    group.add(node);
  }

  // Panel line grooves
  for (const yOff of [-0.08, 0.02]) {
    const groove = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.005, 0.022),
      matPanel
    );
    groove.position.set(0, yOff, 0.062);
    group.add(groove);
  }

  // Back plate
  const backPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.22, 0.018),
    matDark
  );
  backPlate.position.set(0, -0.01, -0.052);
  group.add(backPlate);

  return group;
}

/**
 * Hand: heavy armored gauntlet, chunky knuckle guard, thick fingers, energy accents.
 */
function makeHand() {
  const group = new THREE.Group();
  group.referenceHeight = 0.12;

  // ── Palm block — thick armored slab ──
  const palm = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.06, 0.06),
    matDark
  );
  group.add(palm);

  // Back-of-hand armor plate
  const backPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.05, 0.025),
    matBlue
  );
  backPlate.position.set(0, 0, -0.038);
  group.add(backPlate);

  // ── Knuckle guard — heavy angular plate ──
  const knuckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.025, 0.07),
    matBlue
  );
  knuckle.position.set(0, 0.038, 0);
  group.add(knuckle);

  // Knuckle ridge
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.012, 0.055),
    matChrome
  );
  ridge.position.set(0, 0.048, 0);
  group.add(ridge);

  // ── Chunky finger plates — 4 armored fingers ──
  for (let i = 0; i < 4; i++) {
    // Proximal segment
    const seg1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.03, 0.028),
      matBlue
    );
    seg1.position.set(-0.039 + i * 0.026, 0.06, 0);
    group.add(seg1);

    // Distal segment (fingertip)
    const seg2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.025, 0.024),
      matDark
    );
    seg2.position.set(-0.039 + i * 0.026, 0.085, 0);
    group.add(seg2);

    // Finger joint dot
    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(0.007, 4, 4),
      matChrome
    );
    joint.position.set(-0.039 + i * 0.026, 0.072, 0.012);
    group.add(joint);
  }

  // ── Thumb — chunky with joint ──
  const thumbBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.035, 0.028),
    matBlue
  );
  thumbBase.position.set(-0.065, 0.01, 0.02);
  thumbBase.rotation.z = 0.5;
  group.add(thumbBase);

  const thumbTip = new THREE.Mesh(
    new THREE.BoxGeometry(0.020, 0.028, 0.022),
    matDark
  );
  thumbTip.position.set(-0.080, 0.035, 0.02);
  thumbTip.rotation.z = 0.6;
  group.add(thumbTip);

  // ── Wrist connector — heavy ring ──
  const connector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.052, 0.025, 10),
    matChrome
  );
  connector.position.y = -0.035;
  group.add(connector);

  // ── Palm underside plate ──
  const underPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.04, 0.02),
    matPanel
  );
  underPlate.position.set(0, 0, 0.035);
  group.add(underPlate);

  // ── Knuckle energy glow ──
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.006, 0.05),
    matGlow
  );
  glow.position.set(0, 0.052, 0);
  group.add(glow);

  // Side accent strips
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.006, 0.05, 0.04),
      matAccent
    );
    strip.position.set(side * 0.058, 0, 0);
    group.add(strip);
  }

  return group;
}

function makeJoint(radius) {
  const group = new THREE.Group();
  // Inner glowing core
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.7, 8, 8),
    matGlow
  );
  group.add(core);
  // Outer chrome shell (slightly transparent look via metalness)
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 10),
    matChrome
  );
  group.add(shell);
  // Equator ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.1, radius * 0.08, 4, 12),
    matAccent
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

function makeSword() {
  const group = new THREE.Group();

  const bladeMat = new THREE.MeshStandardMaterial({
    color: SWORD_BLADE, metalness: 0.92, roughness: 0.08,
  });

  // ── Main blade — massive greatsword ──
  const bladeMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 2.0, 0.022),
    bladeMat
  );
  bladeMain.position.y = 1.08;
  group.add(bladeMain);

  // Blade edge bevels (angled strips along both sides)
  for (const side of [-1, 1]) {
    const bevel = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 1.9, 0.026),
      new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.95, roughness: 0.05 })
    );
    bevel.position.set(side * 0.095, 1.08, 0);
    bevel.rotation.z = side * 0.03;
    group.add(bevel);
  }

  // Blade tip — tapered point
  const tipGeo = new THREE.ConeGeometry(0.10, 0.28, 4);
  const tip = new THREE.Mesh(tipGeo, bladeMat);
  tip.position.y = 2.22;
  tip.rotation.y = Math.PI / 4;
  group.add(tip);

  // ── Central fuller (groove down the blade) ──
  const fuller = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 1.5, 0.026),
    matPanel
  );
  fuller.position.set(0, 0.9, 0);
  group.add(fuller);

  // ── Energy line running through the fuller ──
  const energyLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 1.45, 0.006),
    matGlow
  );
  energyLine.position.set(0, 0.9, 0.014);
  group.add(energyLine);

  // Energy pulse nodes along the blade
  for (let i = 0; i < 7; i++) {
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 6, 4),
      matGlow
    );
    node.position.set(0, 0.25 + i * 0.28, 0.014);
    group.add(node);
  }

  // ── Guard — large angular crosspiece ──
  const guardMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.05, 0.06),
    new THREE.MeshStandardMaterial({ color: SWORD_GUARD, metalness: 0.75, roughness: 0.2 })
  );
  guardMain.position.y = 0.07;
  group.add(guardMain);

  // Guard wing tips (angled upward)
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.045),
      new THREE.MeshStandardMaterial({ color: SWORD_GUARD, metalness: 0.75, roughness: 0.2 })
    );
    wing.position.set(side * 0.20, 0.11, 0);
    wing.rotation.z = side * -0.4;
    group.add(wing);
  }

  // Guard accent — chrome trim
  const guardTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.015, 0.065),
    matChrome
  );
  guardTrim.position.y = 0.045;
  group.add(guardTrim);

  // Guard energy gem
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.032, 0),
    matGlow
  );
  gem.position.set(0, 0.07, 0.038);
  group.add(gem);

  // ── Handle — long two-handed grip ──
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.026, 0.32, 8);
  const handleMat = new THREE.MeshStandardMaterial({ color: SWORD_HANDLE, roughness: 0.7 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.y = -0.10;
  group.add(handle);

  // Grip wrapping bands
  for (let i = 0; i < 5; i++) {
    const wrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.034, 0.006, 4, 8),
      matChrome
    );
    wrap.position.y = -0.22 + i * 0.06;
    wrap.rotation.x = Math.PI / 2;
    group.add(wrap);
  }

  // ── Pommel — heavy counterweight ──
  const pommel = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 8, 6),
    new THREE.MeshStandardMaterial({ color: SWORD_GUARD, metalness: 0.8, roughness: 0.2 })
  );
  pommel.position.y = -0.28;
  group.add(pommel);

  // Pommel glow
  const pommelGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 6, 4),
    matGlow
  );
  pommelGlow.position.y = -0.28;
  group.add(pommelGlow);

  return group;
}

function makeGun() {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.06, 0.10, 0.18);
  const bodyMat = new THREE.MeshStandardMaterial({ color: GUN_BODY, metalness: 0.7, roughness: 0.3 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.30, 8);
  const barrelMat = new THREE.MeshStandardMaterial({ color: GUN_BARREL, metalness: 0.8, roughness: 0.2 });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.22;
  barrel.position.y = 0.02;
  group.add(barrel);

  // Muzzle glow
  const muzzleGeo = new THREE.RingGeometry(0.01, 0.025, 8);
  const muzzleMat = new THREE.MeshStandardMaterial({
    color: GUN_ACCENT, emissive: GUN_ACCENT, emissiveIntensity: 0.6, side: THREE.DoubleSide,
  });
  const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzle.position.z = -0.37;
  muzzle.position.y = 0.02;
  group.add(muzzle);

  // Grip
  const gripGeo = new THREE.BoxGeometry(0.04, 0.10, 0.05);
  const gripMat = new THREE.MeshStandardMaterial({ color: SWORD_HANDLE, roughness: 0.8 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.y = -0.09;
  grip.position.z = 0.04;
  group.add(grip);

  return group;
}

function makeShield() {
  const group = new THREE.Group();

  // Main plate — rounded octagonal look via cylinder
  const plateGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.03, 8);
  const plateMat = new THREE.MeshStandardMaterial({
    color: SHIELD_MAIN, metalness: 0.5, roughness: 0.4,
  });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.rotation.x = Math.PI / 2;
  group.add(plate);

  // Rim ring
  const rimGeo = new THREE.TorusGeometry(0.25, 0.015, 8, 8);
  const rimMat = new THREE.MeshStandardMaterial({
    color: SHIELD_RIM, emissive: SHIELD_RIM, emissiveIntensity: 0.3,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  group.add(rim);

  // Center emblem
  const emblemGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const emblemMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: SHIELD_RIM, emissiveIntensity: 0.4,
  });
  const emblem = new THREE.Mesh(emblemGeo, emblemMat);
  emblem.position.z = 0.02;
  group.add(emblem);

  return group;
}

export async function createMecha(scene) {
  const parts = {};

  // Procedural armored segments for each arm
  parts.leftUpperArm  = makeUpperArm();
  parts.rightUpperArm = makeUpperArm();
  parts.leftForearm   = makeForearm();
  parts.rightForearm  = makeForearm();
  parts.leftHand      = makeHand();
  parts.rightHand     = makeHand();

  // Mirror left arm segments on X
  parts.leftUpperArm.scale.x = -1;
  parts.leftForearm.scale.x  = -1;
  parts.leftHand.scale.x     = -1;

  parts.leftShoulder  = makeJoint(0.08);
  parts.rightShoulder = makeJoint(0.08);
  parts.leftElbow     = makeJoint(0.06);
  parts.rightElbow    = makeJoint(0.06);
  parts.leftWrist     = makeJoint(0.05);
  parts.rightWrist    = makeJoint(0.05);

  // Weapons
  parts.sword  = makeSword();
  parts.gun    = makeGun();
  parts.shield = makeShield();
  parts.sword.visible  = false;
  parts.gun.visible    = false;
  parts.shield.visible = false;
  parts.activeWeapon = null;

  for (const v of Object.values(parts)) {
    if (v instanceof THREE.Object3D) scene.add(v);
  }

  return parts;
}

// ── Cockpit arm positioning ─────────────────────────────

// Fixed shoulder anchors in world space (relative to camera at 0,1.6,0)
// These sit at the bottom-left and bottom-right of the viewport, like cockpit arms.
const LEFT_SHOULDER_ANCHOR  = new THREE.Vector3(-0.5, 1.15, -1.0);
const RIGHT_SHOULDER_ANCHOR = new THREE.Vector3( 0.5, 1.15, -1.0);

// How much the pose delta drives the arm (scale factor)
const ARM_SCALE = 3.5;
const DEPTH_SCALE = 5.0; // extra amplification for punching forward

/**
 * Get the delta of a landmark relative to its shoulder in MediaPipe space.
 * MediaPipe: x-left(subject), y-down, z-toward-camera
 * We swap left/right landmarks below, so X stays as-is.
 */
function getDelta(lm, shoulderLm) {
  return new THREE.Vector3(
    -(lm.x - shoulderLm.x) * ARM_SCALE,         // X: flip side-to-side
    -(lm.y - shoulderLm.y) * ARM_SCALE,         // flip Y (up)
    (lm.z - shoulderLm.z) * DEPTH_SCALE           // Z: punch forward = extend forward
  );
}

/**
 * Position a limb (Mesh or Group) between two 3D points.
 * Supports Group objects with a `referenceHeight` property.
 */
function positionLimb(mesh, from, to) {
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mesh.position.copy(mid);

  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();

  // Scale Y to match distance
  if (mesh.referenceHeight) {
    // Group with known reference height — preserve X mirror
    const xSign = mesh.scale.x < 0 ? -1 : 1;
    const s = len / mesh.referenceHeight;
    mesh.scale.set(xSign * s, s, s);
  } else if (mesh.geometry && mesh.geometry.parameters) {
    mesh.scale.y = len / mesh.geometry.parameters.height;
  }

  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(dir.normalize().dot(up)) > 0.999) {
    dir.x += 0.001;
    dir.normalize();
  }
  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(up, dir.normalize());
  mesh.quaternion.copy(quat);
}

/**
 * Position a limb with roll rotation derived from a third reference point.
 * Uses the reference point to determine twist around the limb axis.
 */
function positionLimbWithRoll(mesh, from, to, refPoint) {
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mesh.position.copy(mid);

  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (mesh.referenceHeight) {
    const xSign = mesh.scale.x < 0 ? -1 : 1;
    const s = len / mesh.referenceHeight;
    mesh.scale.set(xSign * s, s, s);
  } else if (mesh.geometry && mesh.geometry.parameters) {
    mesh.scale.y = len / mesh.geometry.parameters.height;
  }

  const limbDir = dir.normalize();
  // Use refPoint to derive a side vector for roll
  const toRef = new THREE.Vector3().subVectors(refPoint, from).normalize();
  const side = new THREE.Vector3().crossVectors(limbDir, toRef).normalize();
  const up = new THREE.Vector3().crossVectors(side, limbDir).normalize();

  const mat = new THREE.Matrix4();
  mat.makeBasis(side, limbDir, up);
  mesh.quaternion.setFromRotationMatrix(mat);
}

/**
 * Update mecha arms from MediaPipe worldLandmarks.
 * Shoulders are anchored to fixed cockpit positions.
 * Elbows/wrists/hands move relative to their shoulder based on your pose.
 */
export function updateMecha(parts, worldLandmarks, landmarks2d, colorData) {
  if (!worldLandmarks || worldLandmarks.length < 25) return;

  const wlLS = worldLandmarks[11]; // left shoulder
  const wlRS = worldLandmarks[12]; // right shoulder

  const lShoulder = LEFT_SHOULDER_ANCHOR.clone();
  const rShoulder = RIGHT_SHOULDER_ANCHOR.clone();

  // Screen LEFT arm ← subject's LEFT landmarks (11,13,15,19)
  const lElbow = lShoulder.clone().add(getDelta(worldLandmarks[13], wlLS));
  const lWrist = lShoulder.clone().add(getDelta(worldLandmarks[15], wlLS));
  const lHand  = lShoulder.clone().add(getDelta(worldLandmarks[19], wlLS));

  // Screen RIGHT arm ← subject's RIGHT landmarks (12,14,16,18,20)
  const rElbow = rShoulder.clone().add(getDelta(worldLandmarks[14], wlRS));
  const rWrist = rShoulder.clone().add(getDelta(worldLandmarks[16], wlRS));
  const rHand  = rShoulder.clone().add(getDelta(worldLandmarks[20], wlRS));
  const rPinky = rShoulder.clone().add(getDelta(worldLandmarks[18], wlRS));

  // Joints
  parts.leftShoulder.position.copy(lShoulder);
  parts.rightShoulder.position.copy(rShoulder);
  parts.leftElbow.position.copy(lElbow);
  parts.rightElbow.position.copy(rElbow);
  parts.leftWrist.position.copy(lWrist);
  parts.rightWrist.position.copy(rWrist);

  // Position arm segments
  positionLimb(parts.leftUpperArm, lShoulder, lElbow);
  positionLimb(parts.rightUpperArm, rShoulder, rElbow);
  positionLimb(parts.leftForearm, lElbow, lWrist);
  positionLimb(parts.rightForearm, rElbow, rWrist);
  positionLimb(parts.leftHand, lWrist, lHand);
  positionLimbWithRoll(parts.rightHand, rWrist, rHand, rPinky);

  // ── Weapon switching ──────────────────────────────────
  const weaponName = colorData ? colorData.weapon : null;

  // Show/hide weapons
  if (weaponName !== parts.activeWeapon) {
    parts.sword.visible  = weaponName === 'sword';
    parts.gun.visible    = weaponName === 'gun';
    parts.shield.visible = weaponName === 'shield';
    parts.activeWeapon   = weaponName;
  }

  // Hand frame for orientation fallback
  const forearmDir = new THREE.Vector3().subVectors(rHand, rWrist).normalize();
  const palmSpread = new THREE.Vector3().subVectors(rHand, rPinky).normalize();
  const palmNormal = new THREE.Vector3().crossVectors(forearmDir, palmSpread).normalize();

  // Color-based direction (wrist → tape centroid)
  let colorDir = null;
  if (colorData && landmarks2d && landmarks2d.length > 16) {
    const w2d = landmarks2d[16];
    const dx = -(colorData.cx - w2d.x);
    const dy = -(colorData.cy - w2d.y);
    const len2d = Math.sqrt(dx * dx + dy * dy);
    if (len2d > 0.02) {
      colorDir = new THREE.Vector3(dx / len2d, dy / len2d, 0);
    }
  }

  // Position & orient the active weapon
  if (weaponName === 'sword') {
    parts.sword.position.copy(rHand);
    if (colorDir) {
      const up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(colorDir.dot(up)) > 0.999) { colorDir.x += 0.001; colorDir.normalize(); }
      const q = new THREE.Quaternion().setFromUnitVectors(up, colorDir);
      parts.sword.quaternion.slerp(q, 0.4);
    } else {
      const bladeDir = new THREE.Vector3().crossVectors(palmNormal, forearmDir).normalize();
      const swordX = new THREE.Vector3().crossVectors(bladeDir, palmNormal).normalize();
      const m = new THREE.Matrix4().makeBasis(swordX, bladeDir, palmNormal);
      parts.sword.quaternion.setFromRotationMatrix(m);
    }
  }

  if (weaponName === 'gun') {
    parts.gun.position.copy(rHand);
    // Gun points along the forearm direction (barrel forward)
    if (colorDir) {
      const forward = new THREE.Vector3(0, 0, -1);
      if (Math.abs(colorDir.dot(forward)) > 0.999) { colorDir.x += 0.001; colorDir.normalize(); }
      const q = new THREE.Quaternion().setFromUnitVectors(forward, colorDir);
      parts.gun.quaternion.slerp(q, 0.4);
    } else {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), forearmDir);
      parts.gun.quaternion.copy(q);
    }
  }

  if (weaponName === 'shield') {
    parts.shield.position.copy(rHand);
    // Shield faces outward (palm normal direction)
    const shieldForward = palmNormal.clone();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), shieldForward);
    parts.shield.quaternion.slerp(q, 0.3);
  }
}

/**
 * Get head position (for subtle camera sway).
 */
export function getHeadPosition(worldLandmarks) {
  if (!worldLandmarks || worldLandmarks.length < 1) return null;
  const nose = worldLandmarks[0];
  return new THREE.Vector3(
    -nose.x * 2.0,
    -nose.y * 2.0 + 1.6,
    0
  );
}
