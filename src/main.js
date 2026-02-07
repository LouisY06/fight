import * as THREE from 'three';
import { createScene } from './scene.js';
import { createMecha, updateMecha, getHeadPosition } from './mecha.js';
import { startWebcam, initTracking, detectPose, setProgressCallback } from './tracking.js';
import { detectColorRegion } from './colorTrack.js';

// ── DOM refs ──────────────────────────────────────────────

const videoEl = document.getElementById('webcam');
const webcamCanvas = document.getElementById('webcam-canvas');
const webcamCtx = webcamCanvas.getContext('2d');
const loadingEl = document.getElementById('loading');
const loadingFill = document.getElementById('loading-fill');
const loadingText = document.getElementById('loading-text');
const hudStatus = document.getElementById('hud-status');

function updateLoading(pct, msg) {
  loadingFill.style.width = pct + '%';
  loadingText.textContent = msg;
}

// ── Init ──────────────────────────────────────────────────

async function init() {
  updateLoading(10, 'Setting up 3D scene...');
  const { scene, camera, renderer } = createScene();

  updateLoading(25, 'Building mecha...');
  const parts = await createMecha(scene);

  // Start webcam first (independent of tracking)
  updateLoading(35, 'Starting webcam...');
  try {
    await startWebcam(videoEl);
    webcamCanvas.width = videoEl.videoWidth;
    webcamCanvas.height = videoEl.videoHeight;
    updateLoading(45, 'Webcam active');
  } catch (err) {
    console.error('Webcam failed:', err);
    updateLoading(45, 'Webcam failed: ' + err.message);
  }

  // Load pose tracker (with timeout)
  updateLoading(50, 'Loading pose tracker...');
  setProgressCallback((msg) => updateLoading(60, msg));

  let trackingReady = false;
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timed out after 30s')), 30000)
    );
    await Promise.race([initTracking(), timeout]);
    trackingReady = true;
    updateLoading(90, 'Tracking ready');
  } catch (err) {
    console.error('Tracking init failed:', err);
    updateLoading(90, 'Tracker failed: ' + err.message);
    hudStatus.textContent = 'NO TRACKING';
    hudStatus.style.color = '#f00';
  }

  updateLoading(100, 'SYSTEMS ONLINE');
  setTimeout(() => loadingEl.classList.add('done'), 600);

  // ── Camera state ──────────────────────────────────────
  // Fixed first-person camera — only subtle X/Y sway from head, NO Z follow
  // so punching forward actually extends the arms away from you.
  // Tilt slightly down so the ground plane is visible.

  camera.position.set(0, 1.6, 0);
  const cameraTarget = new THREE.Vector3(0, 1.6, 0);
  const cameraLookTarget = new THREE.Vector3(0, 1.0, -10);

  // ── Game loop ─────────────────────────────────────────

  let lastPose = null;

  function loop() {
    requestAnimationFrame(loop);

    // Draw webcam to preview canvas
    if (videoEl.readyState >= 2) {
      if (webcamCanvas.width !== videoEl.videoWidth) {
        webcamCanvas.width = videoEl.videoWidth;
        webcamCanvas.height = videoEl.videoHeight;
      }
      webcamCtx.drawImage(videoEl, 0, 0);
    }

    // Detect pose
    if (trackingReady) {
      const pose = detectPose(videoEl);
      if (pose) lastPose = pose;
    }

    // Color-track near the right hand only
    const colorData = detectColorRegion(videoEl, lastPose ? lastPose.landmarks : null);

    // Update mecha from pose
    if (lastPose) {
      updateMecha(parts, lastPose.worldLandmarks, lastPose.landmarks, colorData);

      // First-person camera: subtle X/Y sway from head, fixed Z
      const headPos = getHeadPosition(lastPose.worldLandmarks);
      if (headPos) {
        cameraTarget.x = headPos.x * 0.3;   // subtle left/right sway
        cameraTarget.y = 1.6 + (headPos.y - 1.6) * 0.3; // subtle up/down
        // Z stays at 0 — so punching forward is clearly visible
        cameraLookTarget.x = cameraTarget.x;
        cameraLookTarget.y = cameraTarget.y - 0.6;
      }

      // Draw landmarks on webcam canvas
      drawLandmarks(lastPose.landmarks);

      hudStatus.textContent = 'TRACKING';
      hudStatus.style.color = '#0f0';
    } else if (trackingReady) {
      hudStatus.textContent = 'NO SIGNAL';
      hudStatus.style.color = '#f00';
    }

    // Smooth camera movement
    camera.position.lerp(cameraTarget, 0.15);
    camera.lookAt(cameraLookTarget);

    renderer.render(scene, camera);
  }

  loop();
}

// ── Helpers ───────────────────────────────────────────────

function drawLandmarks(landmarks) {
  if (!landmarks) return;
  webcamCtx.fillStyle = '#0ff';
  for (const lm of landmarks) {
    const x = lm.x * webcamCanvas.width;
    const y = lm.y * webcamCanvas.height;
    webcamCtx.beginPath();
    webcamCtx.arc(x, y, 3, 0, Math.PI * 2);
    webcamCtx.fill();
  }
}

// ── Launch ────────────────────────────────────────────────

init().catch((err) => {
  console.error('Init failed:', err);
  document.getElementById('loading-text').textContent = 'ERROR: ' + err.message;
});
