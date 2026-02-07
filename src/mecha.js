import * as THREE from 'three';

// ── Materials ──────────────────────────────────────────────

const bodyMat = new THREE.MeshStandardMaterial({
  color: 0x333340,
  metalness: 0.85,
  roughness: 0.25,
});

const accentMat = new THREE.MeshStandardMaterial({
  color: 0xcc2222,
  metalness: 0.7,
  roughness: 0.3,
  emissive: 0xcc2222,
  emissiveIntensity: 0.3,
});

const eyeMat = new THREE.MeshStandardMaterial({
  color: 0x00ccff,
  emissive: 0x00ccff,
  emissiveIntensity: 2.0,
});

const swordBladeMat = new THREE.MeshStandardMaterial({
  color: 0x44ffff,
  emissive: 0x00ffff,
  emissiveIntensity: 1.5,
  transparent: true,
  opacity: 0.85,
});

const gunMat = new THREE.MeshStandardMaterial({
  color: 0x555566,
  metalness: 0.9,
  roughness: 0.2,
});

// Opponent uses orange/yellow accent instead of red/cyan
const opponentBodyMat = new THREE.MeshStandardMaterial({
  color: 0x3a3332,
  metalness: 0.85,
  roughness: 0.25,
});

const opponentAccentMat = new THREE.MeshStandardMaterial({
  color: 0xff6600,
  metalness: 0.7,
  roughness: 0.3,
  emissive: 0xff6600,
  emissiveIntensity: 0.3,
});

const opponentEyeMat = new THREE.MeshStandardMaterial({
  color: 0xff3300,
  emissive: 0xff3300,
  emissiveIntensity: 2.0,
});

// ── Helpers ────────────────────────────────────────────────

function makePart(geo, mat) {
  return new THREE.Mesh(geo, mat);
}

function makeWeapons(isOpponent) {
  const accent = isOpponent ? opponentAccentMat : accentMat;
  const eye = isOpponent ? opponentEyeMat : eyeMat;

  // Sword
  const swordGroup = new THREE.Group();
  const hilt = makePart(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), gunMat);
  const blade = makePart(new THREE.BoxGeometry(0.04, 0.9, 0.01), swordBladeMat);
  blade.position.y = 0.55;
  const guard = makePart(new THREE.BoxGeometry(0.15, 0.03, 0.03), accent);
  guard.position.y = 0.1;
  swordGroup.add(hilt, blade, guard);
  swordGroup.visible = false;

  // Gun
  const gunGroup = new THREE.Group();
  const gunBody = makePart(new THREE.BoxGeometry(0.08, 0.12, 0.3), gunMat);
  const barrel = makePart(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), gunMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.3;
  const muzzle = makePart(new THREE.SphereGeometry(0.025, 8, 8), eye);
  muzzle.position.z = -0.47;
  gunGroup.add(gunBody, barrel, muzzle);
  gunGroup.visible = false;

  return { sword: swordGroup, gun: gunGroup };
}

// ── Mecha Creation ─────────────────────────────────────────

function buildMechaParts(scene, isOpponent) {
  const body = isOpponent ? opponentBodyMat : bodyMat;
  const accent = isOpponent ? opponentAccentMat : accentMat;
  const eye = isOpponent ? opponentEyeMat : eyeMat;

  const parts = {};

  parts.torso = makePart(new THREE.BoxGeometry(0.7, 0.85, 0.35), body);
  parts.shoulderL = makePart(new THREE.BoxGeometry(0.3, 0.15, 0.3), accent);
  parts.shoulderR = makePart(new THREE.BoxGeometry(0.3, 0.15, 0.3), accent);
  parts.head = makePart(new THREE.BoxGeometry(0.3, 0.3, 0.3), body);
  parts.eyeL = makePart(new THREE.SphereGeometry(0.04, 8, 8), eye);
  parts.eyeR = makePart(new THREE.SphereGeometry(0.04, 8, 8), eye);
  parts.upperArmL = makePart(new THREE.CylinderGeometry(0.08, 0.07, 1, 8), body);
  parts.upperArmR = makePart(new THREE.CylinderGeometry(0.08, 0.07, 1, 8), body);
  parts.lowerArmL = makePart(new THREE.CylinderGeometry(0.07, 0.06, 1, 8), body);
  parts.lowerArmR = makePart(new THREE.CylinderGeometry(0.07, 0.06, 1, 8), body);
  parts.handL = makePart(new THREE.BoxGeometry(0.1, 0.12, 0.08), accent);
  parts.handR = makePart(new THREE.BoxGeometry(0.1, 0.12, 0.08), accent);
  parts.hips = makePart(new THREE.BoxGeometry(0.55, 0.25, 0.3), body);
  parts.upperLegL = makePart(new THREE.CylinderGeometry(0.09, 0.08, 1, 8), body);
  parts.upperLegR = makePart(new THREE.CylinderGeometry(0.09, 0.08, 1, 8), body);
  parts.lowerLegL = makePart(new THREE.CylinderGeometry(0.08, 0.06, 1, 8), body);
  parts.lowerLegR = makePart(new THREE.CylinderGeometry(0.08, 0.06, 1, 8), body);

  const weapons = makeWeapons(isOpponent);
  parts.sword = weapons.sword;
  parts.gun = weapons.gun;

  for (const part of Object.values(parts)) {
    scene.add(part);
  }

  return parts;
}

/**
 * Create the local player's mecha (first-person — only arms/hands/weapon visible).
 */
export function createLocalMecha(scene) {
  const parts = buildMechaParts(scene, false);
  setFirstPerson(parts, true);
  return parts;
}

/**
 * Create the opponent's mecha (full body visible).
 */
export function createOpponentMecha(scene) {
  const parts = buildMechaParts(scene, true);
  // Start hidden until opponent connects
  setVisible(parts, false);
  return parts;
}

// Hide body parts not visible in first-person (head, torso, hips, legs)
const FIRST_PERSON_HIDDEN = [
  'torso', 'head', 'eyeL', 'eyeR', 'shoulderL', 'shoulderR',
  'hips', 'upperLegL', 'upperLegR', 'lowerLegL', 'lowerLegR',
];

function setFirstPerson(parts, fp) {
  for (const name of FIRST_PERSON_HIDDEN) {
    if (parts[name]) parts[name].visible = !fp;
  }
}

function setVisible(parts, visible) {
  for (const part of Object.values(parts)) {
    part.visible = visible;
  }
}

export function showOpponent(parts) {
  setVisible(parts, true);
}

export function hideOpponent(parts) {
  setVisible(parts, false);
}

// ── Landmark Mapping ───────────────────────────────────────

const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
};

export { LM };

const SCALE = 3.5;
const _up = new THREE.Vector3(0, 1, 0);
const _tmpQ = new THREE.Quaternion();

/**
 * Convert a MediaPipe world landmark to scene coordinates.
 * @param {Object} lm - {x, y, z}
 * @param {THREE.Vector3} offset - world-space offset for this player
 * @param {boolean} mirror - if true, flip X (for opponent facing us)
 */
export function toScene(lm, offset = _zeroVec, mirror = false) {
  return new THREE.Vector3(
    (mirror ? -lm.x : lm.x) * SCALE + offset.x,
    -lm.y * SCALE + 1.5 + offset.y,
    -lm.z * SCALE + offset.z
  );
}

const _zeroVec = new THREE.Vector3(0, 0, 0);

function orientBetween(mesh, a, b, offset, mirror) {
  const start = toScene(a, offset, mirror);
  const end = toScene(b, offset, mirror);
  const midPt = start.clone().add(end).multiplyScalar(0.5);
  mesh.position.copy(midPt);

  const dir = end.clone().sub(start);
  const len = dir.length();
  mesh.scale.y = Math.max(len, 0.01);

  dir.normalize();
  _tmpQ.setFromUnitVectors(_up, dir);
  mesh.quaternion.slerp(_tmpQ, 0.4);
}

function positionAt(mesh, lm, offset, mirror) {
  const p = toScene(lm, offset, mirror);
  mesh.position.lerp(p, 0.4);
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

// ── Update Functions ───────────────────────────────────────

/**
 * Update mecha body parts from world landmarks.
 * @param {Object} parts - Mecha parts
 * @param {Array} wl - worldLandmarks (33 points)
 * @param {string} weapon - 'none' | 'sword' | 'gun'
 * @param {THREE.Vector3} offset - world offset for this player
 * @param {boolean} mirror - flip X for opponent
 */
export function updateMecha(parts, wl, weapon, offset = _zeroVec, mirror = false) {
  if (!wl || wl.length < 33) return;

  const o = offset;
  const m = mirror;

  // Torso
  const shoulderMid = mid(wl[LM.LEFT_SHOULDER], wl[LM.RIGHT_SHOULDER]);
  const hipMid = mid(wl[LM.LEFT_HIP], wl[LM.RIGHT_HIP]);
  orientBetween(parts.torso, hipMid, shoulderMid, o, m);

  // Hips
  orientBetween(parts.hips, wl[LM.LEFT_HIP], wl[LM.RIGHT_HIP], o, m);
  parts.hips.scale.y = 1;

  // Head
  const headPos = toScene(wl[LM.NOSE], o, m);
  headPos.y += 0.15;
  parts.head.position.lerp(headPos, 0.4);
  parts.eyeL.position.copy(parts.head.position);
  parts.eyeL.position.x -= mirror ? -0.08 : 0.08;
  parts.eyeL.position.z += mirror ? -0.16 : 0.16;
  parts.eyeR.position.copy(parts.head.position);
  parts.eyeR.position.x += mirror ? -0.08 : 0.08;
  parts.eyeR.position.z += mirror ? -0.16 : 0.16;

  // Shoulder pads
  positionAt(parts.shoulderL, wl[LM.LEFT_SHOULDER], o, m);
  parts.shoulderL.position.y += 0.1;
  positionAt(parts.shoulderR, wl[LM.RIGHT_SHOULDER], o, m);
  parts.shoulderR.position.y += 0.1;

  // Arms
  orientBetween(parts.upperArmL, wl[LM.LEFT_SHOULDER], wl[LM.LEFT_ELBOW], o, m);
  orientBetween(parts.lowerArmL, wl[LM.LEFT_ELBOW], wl[LM.LEFT_WRIST], o, m);
  orientBetween(parts.upperArmR, wl[LM.RIGHT_SHOULDER], wl[LM.RIGHT_ELBOW], o, m);
  orientBetween(parts.lowerArmR, wl[LM.RIGHT_ELBOW], wl[LM.RIGHT_WRIST], o, m);

  // Hands
  positionAt(parts.handL, wl[LM.LEFT_WRIST], o, m);
  positionAt(parts.handR, wl[LM.RIGHT_WRIST], o, m);

  // Legs
  orientBetween(parts.upperLegL, wl[LM.LEFT_HIP], wl[LM.LEFT_KNEE], o, m);
  orientBetween(parts.lowerLegL, wl[LM.LEFT_KNEE], wl[LM.LEFT_ANKLE], o, m);
  orientBetween(parts.upperLegR, wl[LM.RIGHT_HIP], wl[LM.RIGHT_KNEE], o, m);
  orientBetween(parts.lowerLegR, wl[LM.RIGHT_KNEE], wl[LM.RIGHT_ANKLE], o, m);

  // Weapon placement
  parts.sword.visible = weapon === 'sword';
  parts.gun.visible = weapon === 'gun';

  const rightHandPos = toScene(wl[LM.RIGHT_WRIST], o, m);
  const rightIndexPos = toScene(wl[LM.RIGHT_INDEX], o, m);
  const weaponDir = rightIndexPos.clone().sub(rightHandPos).normalize();

  if (weapon === 'sword') {
    parts.sword.position.copy(rightHandPos);
    _tmpQ.setFromUnitVectors(_up, weaponDir);
    parts.sword.quaternion.slerp(_tmpQ, 0.4);
  }
  if (weapon === 'gun') {
    parts.gun.position.copy(rightHandPos);
    const forward = new THREE.Vector3(0, 0, -1);
    _tmpQ.setFromUnitVectors(forward, weaponDir);
    parts.gun.quaternion.slerp(_tmpQ, 0.4);
  }
}

/**
 * Get the weapon muzzle position and direction for raycasting.
 */
export function getWeaponRay(parts, wl, offset = _zeroVec, mirror = false) {
  if (!wl || wl.length < 33) return null;
  const origin = toScene(wl[LM.RIGHT_WRIST], offset, mirror);
  const target = toScene(wl[LM.RIGHT_INDEX], offset, mirror);
  const dir = target.clone().sub(origin).normalize();
  return { origin, direction: dir };
}

/**
 * Get the head (camera) position from landmarks.
 */
export function getHeadPosition(wl, offset = _zeroVec, mirror = false) {
  if (!wl || wl.length < 33) return null;
  return toScene(wl[LM.NOSE], offset, mirror);
}
