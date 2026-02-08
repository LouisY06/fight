// =============================================================================
// InputSyncBridge.tsx — R3F component that syncs local input to the server
// Must be inside Canvas since it uses useFrame.
// =============================================================================

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useNetwork } from './NetworkProvider';
import { useGameStore } from '../game/GameState';
import { keyboardSwingActive, swordSpeed } from '../combat/SwordState';

const SYNC_INTERVAL = 1 / 30; // 30 updates per second

/**
 * Runs inside the R3F Canvas. Sends camera position/rotation to the server
 * at a throttled rate when in a multiplayer game.
 */
export function InputSyncBridge() {
  const { camera } = useThree();
  const { sendInput, isConnected } = useNetwork();
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const phase = useGameStore((s) => s.phase);
  const timeSinceLastSend = useRef(0);

  useFrame((_, delta) => {
    if (!isMultiplayer || !isConnected) return;

    const isGameplay =
      phase === 'playing' ||
      phase === 'countdown' ||
      phase === 'roundEnd';
    if (!isGameplay) return;

    timeSinceLastSend.current += delta;
    if (timeSinceLastSend.current < SYNC_INTERVAL) return;
    timeSinceLastSend.current = 0;

    // Sword is active if keyboard swing is in progress or CV arm is moving fast
    const isSwinging = keyboardSwingActive || swordSpeed > 1.5;

    sendInput({
      position: [camera.position.x, camera.position.y, camera.position.z],
      rotation: [camera.rotation.x, camera.rotation.y],
      isSwinging,
      isBlocking: false,
    });
  });

  return null;
}
