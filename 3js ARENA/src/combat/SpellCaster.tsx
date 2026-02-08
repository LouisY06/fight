// =============================================================================
// SpellCaster.tsx — Connects voice commands + keyboard to the spell system
// Starts/stops voice recognition based on game phase, casts spells from voice.
// Keyboard: Q = Fireball, E = Laser Beam, R = Ice Blast
// =============================================================================

import { useEffect, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { useSpellStore, fireSpellCast, clearDebuffs, type SpellType } from './SpellSystem';
import { startVoiceListening, stopVoiceListening, onVoiceSpell, isVoiceAvailable } from '../audio/VoiceCommands';
import { gameSocket } from '../networking/socket';

/** Key → spell mapping */
const KEY_SPELL_MAP: Record<string, SpellType> = {
  q: 'fireball',
  e: 'laser',
  r: 'ice_blast',
};

/**
 * R3F component that manages voice + keyboard spell casting.
 * Place inside the Canvas, it needs access to `camera` for aiming.
 */
export function SpellCaster() {
  const { camera } = useThree();
  const castSpell = useSpellStore((s) => s.castSpell);
  const isListeningRef = useRef(false);

  const doCast = useCallback(
    (spellType: SpellType) => {
      const store = useGameStore.getState();
      if (store.phase !== 'playing') return;

      const playerSlot = store.playerSlot ?? 'player1';

      // Get camera position and forward direction
      const origin = camera.position.clone();
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      forward.normalize();

      // Offset origin slightly forward so spell doesn't spawn inside player
      origin.add(forward.clone().multiplyScalar(0.5));

      const spell = castSpell(spellType, playerSlot, origin, forward);
      if (spell) {
        fireSpellCast(spell);

        // Send over network if multiplayer
        if (store.isMultiplayer) {
          gameSocket.send({
            type: 'spell_cast',
            spellType,
            origin: [origin.x, origin.y, origin.z] as [number, number, number],
            direction: [forward.x, forward.y, forward.z] as [number, number, number],
          });
        }

        console.log(`[SpellCaster] Cast ${spellType}!`);
      }
    },
    [camera, castSpell],
  );

  // Keyboard spell casting (Q / E / R)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const spell = KEY_SPELL_MAP[e.key.toLowerCase()];
      if (spell) doCast(spell);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [doCast]);

  // Start/stop voice recognition based on game phase (optional, may fail)
  useEffect(() => {
    const unsubStore = useGameStore.subscribe((state) => {
      const shouldListen = state.phase === 'playing' || state.phase === 'countdown';

      if (shouldListen && !isListeningRef.current && isVoiceAvailable()) {
        startVoiceListening();
        isListeningRef.current = true;
      } else if (!shouldListen && isListeningRef.current) {
        stopVoiceListening();
        isListeningRef.current = false;
      }
    });

    return () => {
      unsubStore();
      stopVoiceListening();
      isListeningRef.current = false;
    };
  }, []);

  // Listen for voice spells
  useEffect(() => {
    const unsub = onVoiceSpell(doCast);
    return unsub;
  }, [doCast]);

  // Clean up spells and debuffs on round change
  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      if (state.phase === 'countdown') {
        useSpellStore.getState().clearAll();
        clearDebuffs();
      }
    });
    return unsub;
  }, []);

  return null; // Pure logic component
}
