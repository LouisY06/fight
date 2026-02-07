import * as THREE from 'three';

/**
 * MediaPipe landmark indices:
 *  11 = left shoulder   12 = right shoulder
 *  13 = left elbow      14 = right elbow
 *  15 = left wrist      16 = right wrist
 *  17 = left pinky      18 = right pinky
 *  19 = left index tip  20 = right index tip
 */

const MECHA_BLUE = 0x2288cc;
const MECHA_DARK = 0x334455;
const JOINT_COLOR = 0x00ffff;
const SWORD_BLADE = 0xccddee;
const SWORD_GUARD = 0xffcc00;
const SWORD_HANDLE = 0x553300;

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

function makeSword() {
  const group = new THREE.Group();

  // Blade
  const bladeGeo = new THREE.BoxGeometry(0.03, 0.7, 0.01);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: SWORD_BLADE,
    metalness: 0.9,
    roughness: 0.1,
  });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.y = 0.4; // extends upward from guard
  group.add(blade);

  // Guard (cross-piece)
  const guardGeo = new THREE.BoxGeometry(0.12, 0.025, 0.03);
  const guardMat = new THREE.MeshStandardMaterial({
    color: SWORD_GUARD,
    metalness: 0.7,
    roughness: 0.2,
  });
  const guard = new THREE.Mesh(guardGeo, guardMat);
  guard.position.y = 0.05;
  group.add(guard);

  // Handle
  const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6);
  const handleMat = new THREE.MeshStandardMaterial({
    color: SWORD_HANDLE,
    roughness: 0.8,
  });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.y = -0.03;
  group.add(handle);

  return group;
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

  parts.sword = makeSword();

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
 * Position a limb with roll rotation derived from a third reference point.
 * Uses the reference point to determine twist around the limb axis.
 */
function positionLimbWithRoll(mesh, from, to, refPoint) {
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mesh.position.copy(mid);

  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  mesh.scale.y = len / mesh.geometry.parameters.height;

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

  // Limbs
  positionLimb(parts.leftUpperArm, lShoulder, lElbow);
  positionLimb(parts.rightUpperArm, rShoulder, rElbow);
  positionLimb(parts.leftForearm, lElbow, lWrist);
  positionLimb(parts.rightForearm, rElbow, rWrist);
  positionLimb(parts.leftHand, lWrist, lHand);
  positionLimbWithRoll(parts.rightHand, rWrist, rHand, rPinky);

  // ── Sword orientation ──────────────────────────────────
  parts.sword.position.copy(rHand);

  if (colorData && landmarks2d && landmarks2d.length > 16) {
    // Color tracking available — derive sword direction from
    // the vector between the 2D wrist and the tape centroid.
    const wrist2d = landmarks2d[16]; // right wrist in normalised 2D
    // Direction from wrist to tape centroid (image space)
    // Negate X (webcam is mirrored) and Y (image Y is down, scene Y is up)
    const dx = -(colorData.cx - wrist2d.x);
    const dy = -(colorData.cy - wrist2d.y);
    const len2d = Math.sqrt(dx * dx + dy * dy);

    if (len2d > 0.02) {
      // Convert 2D image direction → 3D blade direction
      // XY from image, Z from the principal-axis length (longer = more facing camera)
      const bladeDir = new THREE.Vector3(dx / len2d, dy / len2d, 0).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(bladeDir.dot(up)) > 0.999) {
        bladeDir.x += 0.001;
        bladeDir.normalize();
      }
      const swordQuat = new THREE.Quaternion();
      swordQuat.setFromUnitVectors(up, bladeDir);
      parts.sword.quaternion.slerp(swordQuat, 0.4); // smooth
    }
  } else {
    // Fallback — use hand frame (pinky + index) for orientation
    const forearmDir = new THREE.Vector3().subVectors(rHand, rWrist).normalize();
    const palmSpread = new THREE.Vector3().subVectors(rHand, rPinky).normalize();
    const palmNormal = new THREE.Vector3().crossVectors(forearmDir, palmSpread).normalize();
    const bladeDir = new THREE.Vector3().crossVectors(palmNormal, forearmDir).normalize();

    const swordMatrix = new THREE.Matrix4();
    const swordX = new THREE.Vector3().crossVectors(bladeDir, palmNormal).normalize();
    swordMatrix.makeBasis(swordX, bladeDir, palmNormal);
    parts.sword.quaternion.setFromRotationMatrix(swordMatrix);
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
