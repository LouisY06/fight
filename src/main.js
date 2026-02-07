import * as THREE from 'three';
import { createScene } from './scene.js';
import {
  createLocalMecha,
  createOpponentMecha,
  updateMecha,
  getWeaponRay,
  getHeadPosition,
  showOpponent,
  hideOpponent,
} from './mecha.js';
import { initTracking, detectPose } from './tracking.js';
import { checkOpenCV, detectWeaponColor, detectLED } from './vision.js';
import { CombatSystem } from './combat.js';
import { NetworkClient } from './network.js';

// ── State ──────────────────────────────────────────────────

let currentWeapon = 'none';
let isFiring = false;
let fireCooldown = 0;
const FIRE_COOLDOWN = 0.3;
let energy = 100;
let lastPoseResult = null;

// Opponent is placed 6 units in front, mirrored to face the player
const OPPONENT_OFFSET = new THREE.Vector3(0, 0, -6);

// ── DOM refs ───────────────────────────────────────────────

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

// ── Init ───────────────────────────────────────────────────

async function init() {
  updateLoading(10, 'Setting up 3D scene...');
  const { scene, camera, renderer, composer } = createScene();

  // Local mecha (first-person: only arms visible)
  updateLoading(20, 'Building mecha...');
  const localParts = createLocalMecha(scene);

  // Opponent mecha (full body, hidden until connected)
  const opponentParts = createOpponentMecha(scene);

  // Pose tracking
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

  // Combat system
  updateLoading(65, 'Initializing combat systems...');
  const combat = new CombatSystem(scene);
  combat.spawnEnemy();
  combat.spawnEnemy();

  // Networking
  updateLoading(80, 'Connecting to relay server...');
  const network = new NetworkClient();
  const networkConnected = await network.connect();

  if (networkConnected) {
    console.log(`Connected as Player ${network.playerId} (${network.side})`);
  } else {
    console.log('Running in solo mode (no relay server)');
  }

  network.onStatusChange = (status) => {
    if (status === 'opponent_joined') {
      showOpponent(opponentParts);
    }
    if (status === 'opponent_left') {
      hideOpponent(opponentParts);
    }
  };

  updateLoading(100, 'SYSTEMS ONLINE');
  setTimeout(() => loadingEl.classList.add('done'), 500);

  // Webcam canvas sizing
  videoEl.addEventListener('loadeddata', () => {
    webcamCanvas.width = videoEl.videoWidth;
    webcamCanvas.height = videoEl.videoHeight;
  });

  // ── Keyboard fallbacks ─────────────────────────────────

  document.addEventListener('keydown', (e) => {
    if (e.key === '1') currentWeapon = 'none';
    if (e.key === '2') currentWeapon = 'gun';
    if (e.key === '3') currentWeapon = 'sword';
    if (e.key === ' ' || e.key === 'f') {
      isFiring = true;
      setTimeout(() => (isFiring = false), 100);
    }
  });

  // ── Camera state for first-person ──────────────────────

  const cameraTarget = new THREE.Vector3(0, 1.6, 0);
  const cameraLookAt = new THREE.Vector3(0, 1.6, -6);

  // ── Game loop ──────────────────────────────────────────

  let lastTime = performance.now();
  let visionFrameCounter = 0;
  let networkSendCounter = 0;

  function gameLoop() {
    requestAnimationFrame(gameLoop);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 1. Draw webcam to canvas
    if (videoEl.readyState >= 2) {
      webcamCtx.drawImage(videoEl, 0, 0);
    }

    // 2. Detect local pose
    if (trackingReady) {
      const poseResult = detectPose(videoEl);
      if (poseResult) {
        lastPoseResult = poseResult;
      }
    }

    // 3. Update local mecha (first-person arms)
    if (lastPoseResult) {
      updateMecha(localParts, lastPoseResult.worldLandmarks, currentWeapon);

      // First-person camera: follow head position
      const headPos = getHeadPosition(lastPoseResult.worldLandmarks);
      if (headPos) {
        cameraTarget.copy(headPos);
        cameraLookAt.set(headPos.x, headPos.y, headPos.z - 10);
      }

      // Draw landmarks on webcam canvas
      drawLandmarks(lastPoseResult.landmarks);

      // 4. Vision detection (every 5th frame)
      visionFrameCounter++;
      if (visionFrameCounter % 5 === 0) {
        checkOpenCV();

        const detectedWeapon = detectWeaponColor(
          webcamCanvas,
          lastPoseResult.landmarks[16],
          webcamCanvas.width,
          webcamCanvas.height
        );
        if (detectedWeapon !== 'none') {
          currentWeapon = detectedWeapon;
        }

        const ledDetected = detectLED(
          webcamCanvas,
          lastPoseResult.landmarks[20],
          webcamCanvas.width,
          webcamCanvas.height
        );
        if (ledDetected) {
          isFiring = true;
          setTimeout(() => (isFiring = false), 100);
        }
      }

      // 5. Send pose to opponent (every 3rd frame to save bandwidth)
      networkSendCounter++;
      if (networkSendCounter % 3 === 0 && networkConnected) {
        network.sendPose(lastPoseResult.worldLandmarks, currentWeapon);
      }
    }

    // 6. Update opponent mecha from network data
    if (network.opponentPose) {
      if (!opponentParts.torso.visible) {
        showOpponent(opponentParts);
      }
      updateMecha(
        opponentParts,
        network.opponentPose,
        network.opponentWeapon,
        OPPONENT_OFFSET,
        true // mirror so they face us
      );
    }

    // 7. Smoothly move camera to target
    camera.position.lerp(cameraTarget, 0.3);
    camera.lookAt(cameraLookAt);

    // 8. Fire weapon
    fireCooldown -= dt;
    if (isFiring && fireCooldown <= 0 && currentWeapon !== 'none' && energy > 0) {
      fireCooldown = FIRE_COOLDOWN;
      energy = Math.max(0, energy - 5);

      const ray = getWeaponRay(localParts, lastPoseResult?.worldLandmarks);
      if (ray) {
        const hit = combat.fireWeapon(ray.origin, ray.direction, currentWeapon);
        if (hit) {
          hudTarget.classList.remove('hidden');
          setTimeout(() => hudTarget.classList.add('hidden'), 300);
        }
      }

      triggerRecoil();
      // Camera shake
      camera.position.z += 0.04;
    }

    // 9. Recharge energy
    energy = Math.min(100, energy + dt * 8);

    // 10. Update combat
    combat.update(dt);

    // 11. Update HUD
    hudWeapon.textContent = currentWeapon === 'none' ? 'FISTS' : currentWeapon.toUpperCase();
    hudEnergyFill.style.width = energy + '%';
    killCountEl.textContent = combat.kills;

    // Status line
    if (!trackingReady) {
      hudStatus.textContent = 'NO CAMERA';
      hudStatus.style.color = '#f00';
    } else if (!lastPoseResult) {
      hudStatus.textContent = 'NO SIGNAL';
      hudStatus.style.color = '#f00';
    } else if (network.opponentConnected) {
      hudStatus.textContent = 'PVP ACTIVE';
      hudStatus.style.color = '#0f0';
    } else if (networkConnected) {
      hudStatus.textContent = 'WAITING FOR OPPONENT';
      hudStatus.style.color = '#ff0';
    } else {
      hudStatus.textContent = 'SOLO MODE';
      hudStatus.style.color = '#0ff';
    }

    // 12. Render
    composer.render();
  }

  gameLoop();
}

// ── Helpers ────────────────────────────────────────────────

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

// ── Launch ─────────────────────────────────────────────────

init().catch((err) => {
  console.error('Failed to initialize Mecha-Mime:', err);
  document.getElementById('loading-text').textContent = 'ERROR: ' + err.message;
});
