// =============================================================================
// NetworkOpponent.tsx — Renders the remote opponent using network state
// Position and rotation are interpolated from WebSocket updates.
// =============================================================================

import { useRef, useState, useEffect } from 'react';
import { useFrame, createPortal } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { DeathEffect } from './DeathEffect';
import { useNetwork } from '../networking/NetworkProvider';
import { useGameStore } from '../game/GameState';
import { OpponentHitbox } from './OpponentHitbox';
import { RobotEntity, type RobotEntityGraph } from '../avatars/RobotEntity';

/** Bone name aliases for right hand in biped_robot.glb (useGraph nodes). */
const RIGHT_HAND_ALIASES = ['RightHand', 'Hand_R', 'hand_r', 'RightWrist'];

function getRightHandBone(graph: RobotEntityGraph): THREE.Object3D | null {
  for (const name of RIGHT_HAND_ALIASES) {
    const bone = graph.nodes[name];
    if (bone) return bone;
  }
  return null;
}

/** Scale so sword fits the ~2-unit-tall robot and arena (blade ~0.25 units). */
const OPPONENT_SWORD_SCALE = 0.4;

/** Sword group (handle, guard, blade) with local rotation so blade points out of the fist. All meshes cast shadows. */
function OpponentSword() {
  return (
    <group position={[0, 0, 0]} rotation={[-0.4, 0, 0.2]} scale={[OPPONENT_SWORD_SCALE, OPPONENT_SWORD_SCALE, OPPONENT_SWORD_SCALE]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.02, 0.025, 0.18, 8]} />
        <meshStandardMaterial color="#5C3317" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.11, 0]} castShadow>
        <boxGeometry args={[0.12, 0.02, 0.04]} />
        <meshStandardMaterial color="#888" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.03, 0.55, 0.01]} />
        <meshStandardMaterial color="#ddd" roughness={0.1} metalness={0.95} />
      </mesh>
    </group>
  );
}

interface NetworkOpponentProps {
  color?: string;
}

export function NetworkOpponent({ color = '#ff4444' }: NetworkOpponentProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const phase = useGameStore((s) => s.phase);
  const { opponentState } = useNetwork();
  const player2 = useGameStore((s) => s.player2);
  
  const [isDead, setIsDead] = useState(false);
  const [deathPosition, setDeathPosition] = useState<[number, number, number]>([0, 0, 0]);
  const previousHealthRef = useRef(player2.health);

  // Detect when opponent dies or respawns
  useEffect(() => {
    // Check if opponent just died
    if (player2.health <= 0 && !isDead) {
      setIsDead(true);
      if (groupRef.current) {
        setDeathPosition([
          groupRef.current.position.x,
          groupRef.current.position.y,
          groupRef.current.position.z,
        ]);
      }
    }
    // Check if opponent respawned (health restored)
    else if (player2.health > 0 && isDead) {
      setIsDead(false);
    }
    previousHealthRef.current = player2.health;
  }, [player2.health, isDead]);

  // Reset death state when new round starts
  useEffect(() => {
    if (phase === 'countdown' && isDead) {
      setIsDead(false);
    }
  }, [phase, isDead]);

  // Smoothly interpolate opponent position/rotation
  // The opponent's position comes directly from network (their camera position).
  const targetPos = useRef(new THREE.Vector3());
  const targetRotY = useRef(0);
  const currentPos = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!groupRef.current || isDead) return;

    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'roundEnd';

    if (!isGameplay) return;

    // Update target from network
    targetPos.current.set(
      opponentState.position[0],
      0, // Keep on ground
      opponentState.position[2]
    );
    targetRotY.current = opponentState.rotation[1];

    // Lerp toward target for smooth movement
    currentPos.current.lerp(targetPos.current, 0.2);
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY.current + Math.PI, // Face toward us
      0.2
    );
  });

  const isSwinging = opponentState.isSwinging;
  const isMovingRef = useRef(false);
  const prevPos = useRef({ x: opponentState.position[0], z: opponentState.position[2] });
  useFrame(() => {
    const dx = opponentState.position[0] - prevPos.current.x;
    const dz = opponentState.position[2] - prevPos.current.z;
    isMovingRef.current = dx * dx + dz * dz > 0.0001;
    prevPos.current = { x: opponentState.position[0], z: opponentState.position[2] };
  });

  return (
    <>
      {/* Position/rotation set in useFrame — do not pass as props or R3F will overwrite and break MeleeCombat hit detection */}
      <group ref={groupRef} userData={{ isOpponent: true }}>
        {/* Only show opponent if not dead */}
        {!isDead && (
          <RigidBody type="kinematicPosition" colliders={false}>
            <CapsuleCollider args={[0.5, 0.3]} position={[0, 1, 0]} />

            {/* Robot from biped_robot.glb; RightHand found via useGraph, sword portaled into hand with createPortal */}
            <RobotEntity
              color={color}
              targetHeight={2}
              isWalkingRef={isMovingRef}
              isSwinging={isSwinging}
              children={(graph) => {
                const rightHand = getRightHandBone(graph);
                return rightHand ? createPortal(<OpponentSword />, rightHand) : null;
              }}
            />

            {/* Hitbox visualization */}
            <OpponentHitbox />
          </RigidBody>
        )}
      </group>
      
      {/* Death effect */}
      {isDead && (
        <DeathEffect 
          position={deathPosition}
          color={color}
        />
      )}
    </>
  );
}
