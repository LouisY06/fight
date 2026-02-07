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
    const particleCount = 120; // Number of voxel particles
    const geometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.3,
      transparent: true,
    });

    // Create particles in a clear humanoid shape (head, torso, arms, legs)
    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      
      // Distribute particles to form a humanoid shape
      let x = 0, y = 0, z = 0;
      const part = Math.random();
      
      if (part < 0.15) {
        // Head (15% of particles)
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.2;
        x = Math.cos(angle) * radius;
        y = 1.8 + (Math.random() - 0.5) * 0.3;
        z = Math.sin(angle) * radius;
      } else if (part < 0.45) {
        // Torso (30% of particles)
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.3;
        x = Math.cos(angle) * radius;
        y = 0.8 + Math.random() * 0.8;
        z = Math.sin(angle) * radius;
      } else if (part < 0.7) {
        // Arms (25% of particles)
        const side = Math.random() < 0.5 ? -1 : 1;
        x = side * (0.3 + Math.random() * 0.3);
        y = 1.0 + Math.random() * 0.6;
        z = (Math.random() - 0.5) * 0.25;
      } else {
        // Legs (30% of particles)
        const side = Math.random() < 0.5 ? -1 : 1;
        x = side * (0.1 + Math.random() * 0.15);
        y = Math.random() * 0.9;
        z = (Math.random() - 0.5) * 0.2;
      }
      
      mesh.position.set(x, y, z);

      // Velocity based on position - particles explode outward from their body part
      const explosionForce = 1.5 + Math.random() * 1.5;
      const velocity = new THREE.Vector3(
        x * explosionForce + (Math.random() - 0.5) * 0.5, // Outward from center
        4 + Math.random() * 2, // VERY strong upward force - minimum 4 units/sec
        z * explosionForce + (Math.random() - 0.5) * 0.5 // Outward from center
      );

      // Random rotation speed
      const rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );

      const maxLifetime = 2 + Math.random() * 0.5;

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

        // Update position with velocity - NO GRAVITY, only upward drift
        // Add continuous upward acceleration to ensure ALL particles float up
        particle.velocity.y += 1.5 * delta; // Strong upward acceleration
        
        // Apply velocity
        particle.mesh.position.add(
          particle.velocity.clone().multiplyScalar(delta)
        );
        
        // Safety check - never let particles fall below their starting Y position
        if (particle.mesh.position.y < 0) {
          particle.mesh.position.y = 0;
          particle.velocity.y = Math.abs(particle.velocity.y) + 2; // Bounce up with force
        }

        // Rotate particle
        particle.mesh.rotation.x += particle.rotationSpeed.x * delta;
        particle.mesh.rotation.y += particle.rotationSpeed.y * delta;
        particle.mesh.rotation.z += particle.rotationSpeed.z * delta;

        // Fade out
        const material = particle.mesh.material as THREE.MeshStandardMaterial;
        material.opacity = Math.max(0, 1 - lifeProgress);

        // Scale down as it fades
        const scale = Math.max(0, 1 - lifeProgress);
        particle.mesh.scale.setScalar(scale);

        // Hide when dead
        if (particle.lifetime >= particle.maxLifetime) {
          particle.mesh.visible = false;
        }
      }
    });

    // Notify completion
    if (allDead) {
      onComplete?.();
    }
  });

  return <group ref={groupRef} position={position} />;
}
