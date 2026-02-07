// =============================================================================
// useInputSync.ts — Send local player state to the server at ~30fps
// =============================================================================

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useNetwork } from './NetworkProvider';
import { useGameStore } from '../game/GameState';

const SYNC_INTERVAL = 1 / 30; // 30fps

/**
 * Sends the local player's camera position/rotation and attack state
 * to the server at a throttled rate.
 */
export function useInputSync(isSwinging: boolean, isBlocking: boolean) {
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

    sendInput({
      position: [camera.position.x, camera.position.y, camera.position.z],
      rotation: [camera.rotation.x, camera.rotation.y],
      isSwinging,
      isBlocking,
    });
  });
}
