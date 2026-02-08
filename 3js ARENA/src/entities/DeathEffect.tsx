// =============================================================================
// DeathEffect.tsx — Mecha death: rapid outward burst of glowing voxel shards
// Particles explode outward, arc with gravity, shrink + fade, then vanish.
// =============================================================================

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DeathEffectProps {
  position: [number, number, number];
  color: string;
  onComplete?: () => void;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  rotationSpeed: THREE.Vector3;
  initialScale: number;
}

const GRAVITY = -12; // strong downward pull — shards hit the floor fast
const EFFECT_DURATION = 1.5; // seconds before full cleanup

export function DeathEffect({ position, color, onComplete }: DeathEffectProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!groupRef.current) return;

    const particles: Particle[] = [];
    const particleCount = 80;

    // Shared geometry — small voxel shards
    const geoSmall = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const geoMed = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    const geoLg = new THREE.BoxGeometry(0.12, 0.04, 0.06);

    const geos = [geoSmall, geoSmall, geoSmall, geoMed, geoMed, geoLg];

    for (let i = 0; i < particleCount; i++) {
      const geo = geos[Math.floor(Math.random() * geos.length)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6 + Math.random() * 0.8,
        roughness: 0.5,
        metalness: 0.6,
        transparent: true,
      });

      const mesh = new THREE.Mesh(geo, mat);

      // Distribute in humanoid silhouette
      let x = 0, y = 0, z = 0;
      const part = Math.random();

      if (part < 0.12) {
        // Head
        x = (Math.random() - 0.5) * 0.3;
        y = 1.6 + (Math.random() - 0.5) * 0.25;
        z = (Math.random() - 0.5) * 0.25;
      } else if (part < 0.42) {
        // Torso
        x = (Math.random() - 0.5) * 0.5;
        y = 0.8 + Math.random() * 0.7;
        z = (Math.random() - 0.5) * 0.3;
      } else if (part < 0.65) {
        // Arms
        const side = Math.random() < 0.5 ? -1 : 1;
        x = side * (0.3 + Math.random() * 0.35);
        y = 0.9 + Math.random() * 0.5;
        z = (Math.random() - 0.5) * 0.2;
      } else {
        // Legs
        const side = Math.random() < 0.5 ? -1 : 1;
        x = side * (0.05 + Math.random() * 0.18);
        y = Math.random() * 0.85;
        z = (Math.random() - 0.5) * 0.2;
      }

      mesh.position.set(x, y, z);

      // Outward burst — mostly horizontal with a small upward pop
      const burstStrength = 2.0 + Math.random() * 2.5;
      const dirX = x * 2 + (Math.random() - 0.5) * 1.0;
      const dirY = 0.5 + Math.random() * 1.5; // small upward pop, gravity does the rest
      const dirZ = z * 2 + (Math.random() - 0.5) * 1.0;
      const dir = new THREE.Vector3(dirX, dirY, dirZ).normalize().multiplyScalar(burstStrength);

      const rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );

      const initialScale = 0.7 + Math.random() * 0.6;
      mesh.scale.setScalar(initialScale);

      const maxLifetime = 0.6 + Math.random() * 0.5;

      particles.push({
        mesh,
        velocity: dir,
        lifetime: 0,
        maxLifetime,
        rotationSpeed,
        initialScale,
      });

      groupRef.current.add(mesh);
    }

    particlesRef.current = particles;

    return () => {
      particles.forEach((p) => {
        groupRef.current?.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });
    };
  }, [color]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    let allDead = true;

    for (const p of particlesRef.current) {
      if (p.lifetime >= p.maxLifetime) continue;
      allDead = false;

      p.lifetime += delta;
      const t = p.lifetime / p.maxLifetime; // 0→1

      // Apply gravity to velocity
      p.velocity.y += GRAVITY * delta;

      // Drag — slow down over time
      p.velocity.multiplyScalar(1 - 1.2 * delta);

      // Move
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Spin
      p.mesh.rotation.x += p.rotationSpeed.x * delta;
      p.mesh.rotation.y += p.rotationSpeed.y * delta;
      p.mesh.rotation.z += p.rotationSpeed.z * delta;

      // Shrink + fade: fast at the end
      const fade = t < 0.3 ? 1 : 1 - ((t - 0.3) / 0.7);
      const scale = p.initialScale * Math.max(0, fade);
      p.mesh.scale.setScalar(scale);

      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, fade);
      // Emissive pulse at start, then dim
      mat.emissiveIntensity = (1 - t) * 1.5;

      if (p.lifetime >= p.maxLifetime) {
        p.mesh.visible = false;
      }
    }

    if (allDead || elapsed > EFFECT_DURATION) {
      onComplete?.();
    }
  });

  return <group ref={groupRef} position={position} />;
}
