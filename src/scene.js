import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function createScene() {
  const container = document.getElementById('scene-container');

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Scene — lighter background
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x667788);
  scene.fog = new THREE.Fog(0x667788, 30, 80);

  // Camera — first-person (position updated per-frame from landmarks)
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.05,
    200
  );
  camera.position.set(0, 1.6, 0);
  camera.lookAt(0, 1.6, -5);

  // Lights — brighter for the flat plane look
  const ambientLight = new THREE.AmbientLight(0xaabbcc, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 12, 7);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight(0x4488ff, 0.4);
  rimLight.position.set(-3, 3, -5);
  scene.add(rimLight);

  // Flat ground plane
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x889999,
    roughness: 0.85,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Subtle grid overlay on the ground
  const gridHelper = new THREE.GridHelper(60, 60, 0x556666, 0x667777);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // Post-processing — bloom
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,   // strength
    0.4,   // radius
    0.85   // threshold
  );
  composer.addPass(bloomPass);

  // Handle resize
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });

  return { scene, camera, renderer, composer };
}
