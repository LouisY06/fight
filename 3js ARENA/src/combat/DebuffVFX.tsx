// =============================================================================
// DebuffVFX.tsx — 3D visual effects for stun/slow debuffs on characters
//
// StunVFX: Bright electric arcs + large spark particles around the target
// SlowVFX: Large frost crystals + visible icy ring orbiting the target
//
// Attach as a child of the character group. Renders at origin of parent.
// =============================================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDebuff, type SpellDebuff } from './SpellSystem';

// ---------------------------------------------------------------------------
// Main component — picks the right VFX based on the target's debuff
// ---------------------------------------------------------------------------

interface DebuffVFXProps {
  target: 'player1' | 'player2';
}

export function DebuffVFX({ target }: DebuffVFXProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const debuffRef = useRef<SpellDebuff>('none');

  useFrame(() => {
    debuffRef.current = getDebuff(target);
    if (groupRef.current) {
      groupRef.current.visible = debuffRef.current !== 'none';
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <StunVFX targetRef={debuffRef} />
      <SlowVFX targetRef={debuffRef} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Stun VFX — Bright electric arcs + big sparks
// ---------------------------------------------------------------------------

interface ArcData {
  startAngle: number;
  height: number;
  radius: number;
  speed: number;
  phaseOffset: number;
  length: number;
}

function StunVFX({ targetRef }: { targetRef: React.MutableRefObject<SpellDebuff> }) {
  const groupRef = useRef<THREE.Group>(null!);

  const arcs = useMemo<ArcData[]>(() => {
    const out: ArcData[] = [];
    for (let i = 0; i < 8; i++) {
      out.push({
        startAngle: (Math.PI * 2 * i) / 8,
        height: 0.3 + Math.random() * 1.6,
        radius: 0.4 + Math.random() * 0.4,
        speed: 3 + Math.random() * 4,
        phaseOffset: Math.random() * Math.PI * 2,
        length: 0.3 + Math.random() * 0.4,
      });
    }
    return out;
  }, []);

  const sparkRefs = useRef<THREE.Mesh[]>([]);
  const sparkData = useMemo(() => {
    const out: { angle: number; height: number; speed: number; flickerSpeed: number }[] = [];
    for (let i = 0; i < 14; i++) {
      out.push({
        angle: Math.random() * Math.PI * 2,
        height: 0.2 + Math.random() * 1.8,
        speed: 2 + Math.random() * 5,
        flickerSpeed: 8 + Math.random() * 12,
      });
    }
    return out;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isStun = targetRef.current === 'stun';
    groupRef.current.visible = isStun;
    if (!isStun) return;

    const t = performance.now() * 0.001;

    sparkRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const sd = sparkData[i];
      const angle = sd.angle + t * sd.speed;
      const r = 0.5 + Math.sin(t * 3 + i) * 0.15;
      mesh.position.set(
        Math.cos(angle) * r,
        sd.height + Math.sin(t * 4 + i * 0.7) * 0.2,
        Math.sin(angle) * r
      );
      const flicker = Math.sin(t * sd.flickerSpeed + i) > 0;
      mesh.visible = flicker;
      mesh.scale.setScalar(flicker ? 0.04 + Math.random() * 0.06 : 0);
    });

    groupRef.current.rotation.y += delta * 2;
  });

  return (
    <group ref={groupRef} visible={false}>
      {arcs.map((arc, i) => (
        <StunArc key={i} arc={arc} />
      ))}

      {sparkData.map((_, i) => (
        <mesh
          key={`spark-${i}`}
          ref={(el) => { if (el) sparkRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.06, 4, 4]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#00ccff"
            emissiveIntensity={10}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Big electric ring at waist height */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.8, 0]}>
        <ringGeometry args={[0.5, 0.55, 16]} />
        <meshStandardMaterial
          color="#00ccff"
          emissive="#44eeff"
          emissiveIntensity={6}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Second ring at shoulder height */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.4, 0]}>
        <ringGeometry args={[0.35, 0.4, 16]} />
        <meshStandardMaterial
          color="#00ccff"
          emissive="#44eeff"
          emissiveIntensity={4}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function StunArc({ arc }: { arc: ArcData }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(() => {
    if (!meshRef.current) return;
    const t = performance.now() * 0.001;
    const angle = arc.startAngle + t * arc.speed;

    const x = Math.cos(angle) * arc.radius;
    const z = Math.sin(angle) * arc.radius;
    const jitterX = Math.sin(t * 15 + arc.phaseOffset) * 0.12;
    const jitterZ = Math.cos(t * 18 + arc.phaseOffset) * 0.12;

    meshRef.current.position.set(x + jitterX, arc.height, z + jitterZ);
    meshRef.current.rotation.set(
      Math.sin(t * 10) * 0.8,
      t * 5,
      Math.cos(t * 12) * 0.8
    );

    if (matRef.current) {
      matRef.current.emissiveIntensity = 5 + Math.random() * 8;
      matRef.current.opacity = 0.5 + Math.random() * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.015, 0.015, arc.length, 3]} />
      <meshStandardMaterial
        ref={matRef}
        color="#00ddff"
        emissive="#44eeff"
        emissiveIntensity={8}
        transparent
        opacity={0.7}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Slow VFX — Big frost crystals + visible icy ring + ground frost
// ---------------------------------------------------------------------------

interface CrystalData {
  angle: number;
  height: number;
  radius: number;
  size: number;
  rotSpeed: number;
  orbitSpeed: number;
}

function SlowVFX({ targetRef }: { targetRef: React.MutableRefObject<SpellDebuff> }) {
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  const crystals = useMemo<CrystalData[]>(() => {
    const out: CrystalData[] = [];
    for (let i = 0; i < 10; i++) {
      out.push({
        angle: (Math.PI * 2 * i) / 10 + Math.random() * 0.3,
        height: 0.2 + Math.random() * 1.6,
        radius: 0.4 + Math.random() * 0.35,
        size: 0.08 + Math.random() * 0.1,
        rotSpeed: 1 + Math.random() * 2,
        orbitSpeed: 0.3 + Math.random() * 0.5,
      });
    }
    return out;
  }, []);

  const crystalRefs = useRef<THREE.Mesh[]>([]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isSlow = targetRef.current === 'slow';
    groupRef.current.visible = isSlow;
    if (!isSlow) return;

    const t = performance.now() * 0.001;

    crystalRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const cd = crystals[i];
      const angle = cd.angle + t * cd.orbitSpeed;
      mesh.position.set(
        Math.cos(angle) * cd.radius,
        cd.height + Math.sin(t * 1.5 + i * 0.8) * 0.15,
        Math.sin(angle) * cd.radius
      );
      mesh.rotation.x += delta * cd.rotSpeed;
      mesh.rotation.z += delta * cd.rotSpeed * 0.7;
    });

    if (ringRef.current) {
      const pulse = 0.9 + Math.sin(t * 2) * 0.1;
      ringRef.current.scale.set(pulse, 1, pulse);
      (ringRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.3 + Math.sin(t * 3) * 0.1;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Large icy ground ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.6, 1.0, 24]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#aaddff"
          emissiveIntensity={3}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Inner frost circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[0.6, 24]} />
        <meshStandardMaterial
          color="#aaddff"
          emissive="#88ccff"
          emissiveIntensity={1.5}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Floating ice crystals — bigger and more visible */}
      {crystals.map((cd, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) crystalRefs.current[i] = el; }}
        >
          <octahedronGeometry args={[cd.size, 0]} />
          <meshStandardMaterial
            color="#bbddff"
            emissive="#88ccff"
            emissiveIntensity={5}
            transparent
            opacity={0.8}
            roughness={0.05}
            metalness={0.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
