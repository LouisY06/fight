// =============================================================================
// SpellCaster.tsx — Connects voice commands + keyboard to the spell system
// Starts/stops voice recognition based on game phase, casts spells from voice.
// Keyboard: E = Laser Beam, R = Ice Blast, F = Forcefield
// (Q is now weapon toggle — see WeaponState.ts)
// =============================================================================

import { useEffect, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/GameState';
import { useSpellStore, fireSpellCast, clearDebuffs, clearForceFields, activateForceField, type SpellType } from './SpellSystem';
import { startVoiceListening, stopVoiceListening, onVoiceSpell, isVoiceAvailable } from '../audio/VoiceCommands';
import { gameSocket } from '../networking/socket';

/** Key → spell mapping (Q is now weapon toggle, moved fireball to voice-only + T) */
const KEY_SPELL_MAP: Record<string, SpellType> = {
  t: 'fireball',
  e: 'laser',
  r: 'ice_blast',
  f: 'forcefield',
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

      const playerSlot = (store.playerSlot ?? 'player1') as 'player1' | 'player2';

      // Forcefield is a self-buff, not a projectile
      if (spellType === 'forcefield') {
        // Check cooldown manually
        const now = Date.now();
        const cooldowns = useSpellStore.getState().cooldowns;
        const config = { cooldownMs: 10000 }; // match SPELL_CONFIGS.forcefield.cooldownMs
        if (now - cooldowns.forcefield < config.cooldownMs) return;
        // Update cooldown
        useSpellStore.setState((s) => ({
          cooldowns: { ...s.cooldowns, forcefield: now },
        }));
        activateForceField(playerSlot);
        console.log(`[SpellCaster] Forcefield activated!`);
        return;
      }

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
    const tryStartStop = (phase: string) => {
      const shouldListen = phase === 'playing' || phase === 'countdown';

      if (shouldListen && !isListeningRef.current && isVoiceAvailable()) {
        startVoiceListening();
        isListeningRef.current = true;
      } else if (!shouldListen && isListeningRef.current) {
        stopVoiceListening();
        isListeningRef.current = false;
      }
    };

    // Check initial state (subscribe only fires on *changes*)
    tryStartStop(useGameStore.getState().phase);

    const unsubStore = useGameStore.subscribe((state) => {
      tryStartStop(state.phase);
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
        clearForceFields();
      }
    });
    return unsub;
  }, []);

  return null; // Pure logic component
}
