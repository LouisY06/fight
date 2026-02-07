// =============================================================================
// DeathEffect.tsx — Pixelated death effect with floating particles
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
}

/**
 * Creates a pixelated death effect where the player explodes into
 * voxel-like cubes that float upward and disappear.
 */
export function DeathEffect({ position, color, onComplete }: DeathEffectProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef(Date.now());

  // Create particles on mount
  useEffect(() => {
    if (!groupRef.current) return;

    const particles: Particle[] = [];
    const particleCount = 80; // Number of voxel particles
    const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.3,
      transparent: true,
    });

    // Create particles in a humanoid shape
    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      
      // Distribute particles in a humanoid volume
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.4;
      const height = Math.random() * 1.8;
      
      mesh.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      // Random velocity - upward and outward
      const explosionForce = 1.5 + Math.random() * 2;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * explosionForce,
        1.5 + Math.random() * 2, // Strong upward force
        (Math.random() - 0.5) * explosionForce
      );

      // Random rotation speed
      const rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );

      const maxLifetime = 1.5 + Math.random() * 0.5;

      particles.push({
        mesh,
        velocity,
        lifetime: 0,
        maxLifetime,
        rotationSpeed,
      });

      groupRef.current.add(mesh);
    }

    particlesRef.current = particles;

    // Cleanup
    return () => {
      particles.forEach(p => {
        groupRef.current?.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });
    };
  }, [color]);

  // Animate particles
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    let allDead = true;

    particlesRef.current.forEach((particle) => {
      if (particle.lifetime < particle.maxLifetime) {
        allDead = false;

        // Update lifetime
        particle.lifetime += delta;
        const lifeProgress = particle.lifetime / particle.maxLifetime;

        // Update position with velocity and gravity
        particle.velocity.y -= 2 * delta; // Gravity
        particle.mesh.position.add(
          particle.velocity.clone().multiplyScalar(delta)
        );

        // Rotate particle
        particle.mesh.rotation.x += particle.rotationSpeed.x * delta;
        particle.mesh.rotation.y += particle.rotationSpeed.y * delta;
        particle.mesh.rotation.z += particle.rotationSpeed.z * delta;

        // Fade out
        const material = particle.mesh.material as THREE.MeshStandardMaterial;
        material.opacity = Math.max(0, 1 - lifeProgress);

        // Scale down slightly as it fades
        const scale = 1 - lifeProgress * 0.3;
        particle.mesh.scale.setScalar(scale);

        // Hide when dead
        if (particle.lifetime >= particle.maxLifetime) {
          particle.mesh.visible = false;
        }
      }
    });

    // Notify completion
    if (allDead && elapsed > 2) {
      onComplete?.();
    }
  });

  return <group ref={groupRef} position={position} />;
}
