// =============================================================================
// DebugState.ts — Debug mode toggle (F3 or ?debug=1)
// Hides wire capsules, hitbox overlays, etc. unless debug is on.
// =============================================================================

import { create } from 'zustand';

function getInitialDebug(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

interface DebugState {
  debug: boolean;
  toggle: () => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  debug: getInitialDebug(),
  toggle: () => set((s) => ({ debug: !s.debug })),
}));

// Listen for F3 to toggle
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F3') {
      e.preventDefault();
      useDebugStore.getState().toggle();
    }
  });
}
