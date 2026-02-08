// =============================================================================
// WeaponState.ts — Zustand store for weapon selection (1=sword, 2=gun)
// =============================================================================

import { create } from 'zustand';

export type ActiveWeapon = 'sword' | 'gun';

interface WeaponState {
  activeWeapon: ActiveWeapon;
  setActiveWeapon: (weapon: ActiveWeapon) => void;
}

export const useWeaponStore = create<WeaponState>((set) => ({
  activeWeapon: 'sword', // default weapon
  setActiveWeapon: (weapon) => set({ activeWeapon: weapon }),
}));

/** Keyboard weapon switching hook — call once at app level. */
export function initWeaponKeyListener(): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    // Don't intercept if user is typing in an input field
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (e.key) {
      case '1':
        useWeaponStore.getState().setActiveWeapon('sword');
        break;
      case '2':
        useWeaponStore.getState().setActiveWeapon('gun');
        break;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
