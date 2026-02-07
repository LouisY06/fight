import * as THREE from 'three';

// Materials
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

function makePart(geo, mat) {
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

/**
 * Creates the mecha as a collection of independently positionable body parts.
 * Each part is placed/oriented per-frame based on MediaPipe landmarks.
 */
export function createMecha(scene) {
  const parts = {};

  // Torso (chest + abdomen)
  parts.torso = makePart(new THREE.BoxGeometry(0.7, 0.85, 0.35), bodyMat);
  // Shoulder pads
  parts.shoulderL = makePart(new THREE.BoxGeometry(0.3, 0.15, 0.3), accentMat);
  parts.shoulderR = makePart(new THREE.BoxGeometry(0.3, 0.15, 0.3), accentMat);
  // Head
  parts.head = makePart(new THREE.BoxGeometry(0.3, 0.3, 0.3), bodyMat);
  // Eyes
  parts.eyeL = makePart(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
  parts.eyeR = makePart(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
  // Upper arms
  parts.upperArmL = makePart(new THREE.CylinderGeometry(0.08, 0.07, 1, 8), bodyMat);
  parts.upperArmR = makePart(new THREE.CylinderGeometry(0.08, 0.07, 1, 8), bodyMat);
  // Lower arms
  parts.lowerArmL = makePart(new THREE.CylinderGeometry(0.07, 0.06, 1, 8), bodyMat);
  parts.lowerArmR = makePart(new THREE.CylinderGeometry(0.07, 0.06, 1, 8), bodyMat);
  // Hands
  parts.handL = makePart(new THREE.BoxGeometry(0.1, 0.12, 0.08), accentMat);
  parts.handR = makePart(new THREE.BoxGeometry(0.1, 0.12, 0.08), accentMat);
  // Hips
  parts.hips = makePart(new THREE.BoxGeometry(0.55, 0.25, 0.3), bodyMat);
  // Upper legs
  parts.upperLegL = makePart(new THREE.CylinderGeometry(0.09, 0.08, 1, 8), bodyMat);
  parts.upperLegR = makePart(new THREE.CylinderGeometry(0.09, 0.08, 1, 8), bodyMat);
  // Lower legs
  parts.lowerLegL = makePart(new THREE.CylinderGeometry(0.08, 0.06, 1, 8), bodyMat);
  parts.lowerLegR = makePart(new THREE.CylinderGeometry(0.08, 0.06, 1, 8), bodyMat);

  // Weapons (hidden by default)
  // Sword
  const swordGroup = new THREE.Group();
  const hilt = makePart(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), gunMat);
  const blade = makePart(new THREE.BoxGeometry(0.04, 0.9, 0.01), swordBladeMat);
  blade.position.y = 0.55;
  const guard = makePart(new THREE.BoxGeometry(0.15, 0.03, 0.03), accentMat);
  guard.position.y = 0.1;
  swordGroup.add(hilt, blade, guard);
  swordGroup.visible = false;
  parts.sword = swordGroup;

  // Gun
  const gunGroup = new THREE.Group();
  const gunBody = makePart(new THREE.BoxGeometry(0.08, 0.12, 0.3), gunMat);
  const barrel = makePart(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), gunMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.3;
  const muzzle = makePart(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
  muzzle.position.z = -0.47;
  gunGroup.add(gunBody, barrel, muzzle);
  gunGroup.visible = false;
  parts.gun = gunGroup;

  // Add all to scene
  for (const part of Object.values(parts)) {
    scene.add(part);
  }

  return parts;
}

// MediaPipe landmark indices
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

const SCALE = 3.5; // Scale landmarks to scene units
const _up = new THREE.Vector3(0, 1, 0);
const _tmpV = new THREE.Vector3();
const _tmpQ = new THREE.Quaternion();

function toScene(lm) {
  // MediaPipe world landmarks: X right, Y down, Z toward camera
  // Three.js: X right, Y up, Z toward viewer
  return new THREE.Vector3(
    lm.x * SCALE,
    -lm.y * SCALE + 1.5, // flip Y, offset so mecha stands on grid
    -lm.z * SCALE
  );
}

function orientBetween(mesh, a, b) {
  const start = toScene(a);
  const end = toScene(b);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  mesh.position.copy(mid);

  const dir = end.clone().sub(start);
  const len = dir.length();
  // Scale the cylinder/box along Y to match limb length
  mesh.scale.y = Math.max(len, 0.01);

  dir.normalize();
  _tmpQ.setFromUnitVectors(_up, dir);
  mesh.quaternion.slerp(_tmpQ, 0.4); // Smoothing
}

function positionAt(mesh, lm) {
  const p = toScene(lm);
  mesh.position.lerp(p, 0.4);
}

/**
 * Update mecha body parts from world landmarks.
 * @param {Object} parts - Mecha parts from createMecha()
 * @param {Array} wl - MediaPipe worldLandmarks array (33 points)
 * @param {string} weapon - Current weapon: 'none' | 'sword' | 'gun'
 */
export function updateMecha(parts, wl, weapon) {
  if (!wl || wl.length < 33) return;

  // Torso: between shoulders midpoint and hips midpoint
  const shoulderMid = mid(wl[LM.LEFT_SHOULDER], wl[LM.RIGHT_SHOULDER]);
  const hipMid = mid(wl[LM.LEFT_HIP], wl[LM.RIGHT_HIP]);
  orientBetween(parts.torso, hipMid, shoulderMid);

  // Hips
  orientBetween(parts.hips, wl[LM.LEFT_HIP], wl[LM.RIGHT_HIP]);
  parts.hips.scale.y = 1; // Don't stretch hips

  // Head: at nose, slightly above
  const headPos = toScene(wl[LM.NOSE]);
  headPos.y += 0.15;
  parts.head.position.lerp(headPos, 0.4);
  // Eyes on the head
  parts.eyeL.position.copy(parts.head.position);
  parts.eyeL.position.x -= 0.08;
  parts.eyeL.position.z += 0.16;
  parts.eyeR.position.copy(parts.head.position);
  parts.eyeR.position.x += 0.08;
  parts.eyeR.position.z += 0.16;

  // Shoulder pads
  positionAt(parts.shoulderL, wl[LM.LEFT_SHOULDER]);
  parts.shoulderL.position.y += 0.1;
  positionAt(parts.shoulderR, wl[LM.RIGHT_SHOULDER]);
  parts.shoulderR.position.y += 0.1;

  // Arms
  orientBetween(parts.upperArmL, wl[LM.LEFT_SHOULDER], wl[LM.LEFT_ELBOW]);
  orientBetween(parts.lowerArmL, wl[LM.LEFT_ELBOW], wl[LM.LEFT_WRIST]);
  orientBetween(parts.upperArmR, wl[LM.RIGHT_SHOULDER], wl[LM.RIGHT_ELBOW]);
  orientBetween(parts.lowerArmR, wl[LM.RIGHT_ELBOW], wl[LM.RIGHT_WRIST]);

  // Hands
  positionAt(parts.handL, wl[LM.LEFT_WRIST]);
  positionAt(parts.handR, wl[LM.RIGHT_WRIST]);

  // Legs
  orientBetween(parts.upperLegL, wl[LM.LEFT_HIP], wl[LM.LEFT_KNEE]);
  orientBetween(parts.lowerLegL, wl[LM.LEFT_KNEE], wl[LM.LEFT_ANKLE]);
  orientBetween(parts.upperLegR, wl[LM.RIGHT_HIP], wl[LM.RIGHT_KNEE]);
  orientBetween(parts.lowerLegR, wl[LM.RIGHT_KNEE], wl[LM.RIGHT_ANKLE]);

  // Weapon placement — attach to right hand
  parts.sword.visible = weapon === 'sword';
  parts.gun.visible = weapon === 'gun';

  const rightHandPos = toScene(wl[LM.RIGHT_WRIST]);
  const rightIndexPos = toScene(wl[LM.RIGHT_INDEX]);
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
export function getWeaponRay(parts, wl) {
  if (!wl || wl.length < 33) return null;
  const origin = toScene(wl[LM.RIGHT_WRIST]);
  const target = toScene(wl[LM.RIGHT_INDEX]);
  const dir = target.clone().sub(origin).normalize();
  return { origin, direction: dir };
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}
