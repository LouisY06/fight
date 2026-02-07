import * as THREE from 'three';

/**
 * MediaPipe landmark indices:
 *  11 = left shoulder   12 = right shoulder
 *  13 = left elbow      14 = right elbow
 *  15 = left wrist      16 = right wrist
 *  19 = left index tip  20 = right index tip
 */

const MECHA_BLUE = 0x2288cc;
const MECHA_DARK = 0x334455;
const JOINT_COLOR = 0x00ffff;

function makeLimb(width, height, depth, color) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.6,
    roughness: 0.3,
  });
  return new THREE.Mesh(geo, mat);
}

function makeJoint(radius) {
  const geo = new THREE.SphereGeometry(radius, 8, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: JOINT_COLOR,
    emissive: JOINT_COLOR,
    emissiveIntensity: 0.3,
  });
  return new THREE.Mesh(geo, mat);
}

export function createMecha(scene) {
  const parts = {
    leftUpperArm: makeLimb(0.10, 0.35, 0.10, MECHA_BLUE),
    rightUpperArm: makeLimb(0.10, 0.35, 0.10, MECHA_BLUE),
    leftForearm: makeLimb(0.09, 0.32, 0.09, MECHA_DARK),
    rightForearm: makeLimb(0.09, 0.32, 0.09, MECHA_DARK),
    leftHand: makeLimb(0.08, 0.12, 0.06, MECHA_BLUE),
    rightHand: makeLimb(0.08, 0.12, 0.06, MECHA_BLUE),
    leftShoulder: makeJoint(0.08),
    rightShoulder: makeJoint(0.08),
    leftElbow: makeJoint(0.06),
    rightElbow: makeJoint(0.06),
    leftWrist: makeJoint(0.05),
    rightWrist: makeJoint(0.05),
  };

  for (const mesh of Object.values(parts)) {
    scene.add(mesh);
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
 * Position a limb mesh between two 3D points.
 */
function positionLimb(mesh, from, to) {
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mesh.position.copy(mid);

  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();

  mesh.scale.y = len / mesh.geometry.parameters.height;

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
 * Update mecha arms from MediaPipe worldLandmarks.
 * Shoulders are anchored to fixed cockpit positions.
 * Elbows/wrists/hands move relative to their shoulder based on your pose.
 */
export function updateMecha(parts, worldLandmarks) {
  if (!worldLandmarks || worldLandmarks.length < 25) return;

  const wlLS = worldLandmarks[11]; // left shoulder
  const wlRS = worldLandmarks[12]; // right shoulder

  const lShoulder = LEFT_SHOULDER_ANCHOR.clone();
  const rShoulder = RIGHT_SHOULDER_ANCHOR.clone();

  // Screen LEFT arm ← subject's LEFT landmarks (11,13,15,19)
  const lElbow = lShoulder.clone().add(getDelta(worldLandmarks[13], wlLS));
  const lWrist = lShoulder.clone().add(getDelta(worldLandmarks[15], wlLS));
  const lHand  = lShoulder.clone().add(getDelta(worldLandmarks[19], wlLS));

  // Screen RIGHT arm ← subject's RIGHT landmarks (12,14,16,20)
  const rElbow = rShoulder.clone().add(getDelta(worldLandmarks[14], wlRS));
  const rWrist = rShoulder.clone().add(getDelta(worldLandmarks[16], wlRS));
  const rHand  = rShoulder.clone().add(getDelta(worldLandmarks[20], wlRS));

  // Joints
  parts.leftShoulder.position.copy(lShoulder);
  parts.rightShoulder.position.copy(rShoulder);
  parts.leftElbow.position.copy(lElbow);
  parts.rightElbow.position.copy(rElbow);
  parts.leftWrist.position.copy(lWrist);
  parts.rightWrist.position.copy(rWrist);

  // Limbs
  positionLimb(parts.leftUpperArm, lShoulder, lElbow);
  positionLimb(parts.rightUpperArm, rShoulder, rElbow);
  positionLimb(parts.leftForearm, lElbow, lWrist);
  positionLimb(parts.rightForearm, rElbow, rWrist);
  positionLimb(parts.leftHand, lWrist, lHand);
  positionLimb(parts.rightHand, rWrist, rHand);
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
