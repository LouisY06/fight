// =============================================================================
// OpponentSwordState.ts — Bot sword positions for hit detection on player
// BotOpponent's weapon publishes here; MeleeCombat reads when in practice mode.
// =============================================================================

import * as THREE from 'three';

/** World-space bot sword endpoints, updated every frame by BotOpponent's Weapon. */
export const botSwordHilt = new THREE.Vector3();
export const botSwordTip = new THREE.Vector3();

/** Whether the bot is currently swinging. */
export let botSwordActive = false;

/** Speed of the bot sword tip in world units/second. */
export let botSwordSpeed = 0;

const _prevBotTip = new THREE.Vector3();
let _hasPrevBot = false;
let _prevBotTime = 0;

export function setBotSwordState(hilt: THREE.Vector3, tip: THREE.Vector3, active: boolean): void {
  botSwordHilt.copy(hilt);
  botSwordTip.copy(tip);
  botSwordActive = active;

  // Compute tip speed
  const now = performance.now() / 1000;
  if (_hasPrevBot) {
    const dt = now - _prevBotTime;
    if (dt > 0 && dt < 0.2) {
      botSwordSpeed = _prevBotTip.distanceTo(tip) / dt;
    }
  }
  _prevBotTip.copy(tip);
  _prevBotTime = now;
  _hasPrevBot = true;
}

/** Blade length for bot weapon (hilt to tip in local +Y). */
export const BOT_BLADE_LENGTH = 0.95;
