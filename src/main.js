import { createScene } from './scene.js';
import { createMecha, updateMecha, getWeaponRay } from './mecha.js';
import { initTracking, detectPose } from './tracking.js';
import { checkOpenCV, detectWeaponColor, detectLED } from './vision.js';
import { CombatSystem } from './combat.js';

// --- State ---
let currentWeapon = 'none'; // 'none' | 'gun' | 'sword'
let isFiring = false;
let fireCooldown = 0;
const FIRE_COOLDOWN = 0.3; // seconds between shots
let energy = 100;
let lastPoseResult = null;

// --- DOM refs ---
const videoEl = document.getElementById('webcam');
const webcamCanvas = document.getElementById('webcam-canvas');
const webcamCtx = webcamCanvas.getContext('2d', { willReadFrequently: true });
const loadingEl = document.getElementById('loading');
const loadingFill = document.getElementById('loading-fill');
const hudWeapon = document.getElementById('hud-weapon');
const hudStatus = document.getElementById('hud-status');
const hudTarget = document.getElementById('hud-target');
const hudEnergyFill = document.getElementById('hud-energy-fill');
const killCountEl = document.getElementById('kill-count');

// --- Init ---
async function init() {
  updateLoading(10, 'Setting up 3D scene...');
  const { scene, camera, renderer, composer } = createScene();

  updateLoading(25, 'Building mecha...');
  const mechaParts = createMecha(scene);

  updateLoading(40, 'Loading pose tracker...');
  let trackingReady = false;
  try {
    await initTracking(videoEl);
    trackingReady = true;
  } catch (err) {
    console.warn('Tracking init failed:', err);
    hudStatus.textContent = 'NO CAMERA';
    hudStatus.style.color = '#f00';
  }

  updateLoading(80, 'Initializing combat systems...');
  const combat = new CombatSystem(scene);
  // Spawn a few initial enemies
  combat.spawnEnemy();
  combat.spawnEnemy();

  updateLoading(100, 'SYSTEMS ONLINE');
  setTimeout(() => loadingEl.classList.add('done'), 500);

  // Set webcam canvas size to match video
  videoEl.addEventListener('loadeddata', () => {
    webcamCanvas.width = videoEl.videoWidth;
    webcamCanvas.height = videoEl.videoHeight;
  });

  // --- Keyboard fallbacks for testing without props ---
  document.addEventListener('keydown', (e) => {
    if (e.key === '1') currentWeapon = 'none';
    if (e.key === '2') currentWeapon = 'gun';
    if (e.key === '3') currentWeapon = 'sword';
    if (e.key === ' ' || e.key === 'f') {
      isFiring = true;
      setTimeout(() => (isFiring = false), 100);
    }
  });

  // --- Game loop ---
  let lastTime = performance.now();
  let visionFrameCounter = 0;

  function gameLoop() {
    requestAnimationFrame(gameLoop);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 1. Draw webcam to canvas for vision processing
    if (videoEl.readyState >= 2) {
      webcamCtx.drawImage(videoEl, 0, 0);
    }

    // 2. Detect pose
    if (trackingReady) {
      const poseResult = detectPose(videoEl);
      if (poseResult) {
        lastPoseResult = poseResult;
      }
    }

    // 3. Update mecha from pose
    if (lastPoseResult) {
      updateMecha(mechaParts, lastPoseResult.worldLandmarks, currentWeapon);

      // Draw landmarks on webcam canvas (debug overlay)
      drawLandmarks(lastPoseResult.landmarks);

      // 4. Vision detection (run every 5th frame for perf)
      visionFrameCounter++;
      if (visionFrameCounter % 5 === 0) {
        checkOpenCV();

        const detectedWeapon = detectWeaponColor(
          webcamCanvas,
          lastPoseResult.landmarks[16], // right wrist (2D)
          webcamCanvas.width,
          webcamCanvas.height
        );
        if (detectedWeapon !== 'none') {
          currentWeapon = detectedWeapon;
        }

        const ledDetected = detectLED(
          webcamCanvas,
          lastPoseResult.landmarks[20], // right index (2D)
          webcamCanvas.width,
          webcamCanvas.height
        );
        if (ledDetected) {
          isFiring = true;
          setTimeout(() => (isFiring = false), 100);
        }
      }
    }

    // 5. Fire weapon
    fireCooldown -= dt;
    if (isFiring && fireCooldown <= 0 && currentWeapon !== 'none' && energy > 0) {
      fireCooldown = FIRE_COOLDOWN;
      energy = Math.max(0, energy - 5);

      const ray = getWeaponRay(mechaParts, lastPoseResult?.worldLandmarks);
      if (ray) {
        const hit = combat.fireWeapon(ray.origin, ray.direction, currentWeapon);
        if (hit) {
          hudTarget.classList.remove('hidden');
          setTimeout(() => hudTarget.classList.add('hidden'), 300);
        }
      }

      // Recoil flash
      triggerRecoil();
      // Camera shake
      camera.position.z += 0.05;
      setTimeout(() => (camera.position.z = 5), 80);
    }

    // 6. Recharge energy
    energy = Math.min(100, energy + dt * 8);

    // 7. Update combat (enemy spawning, animation, particles)
    combat.update(dt);

    // 8. Update HUD
    hudWeapon.textContent = currentWeapon === 'none' ? 'FISTS' : currentWeapon.toUpperCase();
    hudEnergyFill.style.width = energy + '%';
    killCountEl.textContent = combat.kills;
    hudStatus.textContent = lastPoseResult ? 'TRACKING' : 'NO SIGNAL';
    hudStatus.style.color = lastPoseResult ? '#0f0' : '#f00';

    // 9. Render
    composer.render();
  }

  gameLoop();
}

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

function triggerRecoil() {
  const flash = document.createElement('div');
  flash.className = 'recoil-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 150);
}

function updateLoading(pct, msg) {
  loadingFill.style.width = pct + '%';
  document.getElementById('loading-text').textContent = msg;
}

// Launch
init().catch((err) => {
  console.error('Failed to initialize Mecha-Mime:', err);
  document.getElementById('loading-text').textContent = 'ERROR: ' + err.message;
});
