// =============================================================================
// SettingsStore.ts — Centralized settings with localStorage persistence
// =============================================================================

import { create } from 'zustand';

interface SettingsState {
  // Audio
  masterVolume: number;
  sfxVolume: number;
  commentaryEnabled: boolean;

  // Controls
  headSensitivity: number;
  mouseSensitivity: number;
  invertY: boolean;

  // Camera
  cameraDeviceId: string; // '' = browser default

  // Display
  screenShakeIntensity: number;
  damageNumbersEnabled: boolean;
  postProcessingEnabled: boolean;

  // Actions
  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setCommentaryEnabled: (v: boolean) => void;
  setHeadSensitivity: (v: number) => void;
  setMouseSensitivity: (v: number) => void;
  setInvertY: (v: boolean) => void;
  setCameraDeviceId: (v: string) => void;
  setScreenShakeIntensity: (v: number) => void;
  setDamageNumbersEnabled: (v: boolean) => void;
  setPostProcessingEnabled: (v: boolean) => void;
}

const STORAGE_KEY = 'smf-settings';

function loadFromStorage(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function persist(state: Partial<SettingsState>) {
  try {
    const prev = loadFromStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...state }));
  } catch { /* ignore */ }
}

const saved = loadFromStorage();

export const useSettingsStore = create<SettingsState>((set) => ({
  masterVolume: saved.masterVolume ?? 0.8,
  sfxVolume: saved.sfxVolume ?? 0.8,
  commentaryEnabled: saved.commentaryEnabled ?? true,
  headSensitivity: saved.headSensitivity ?? 1.0,
  mouseSensitivity: saved.mouseSensitivity ?? 1.0,
  invertY: saved.invertY ?? false,
  cameraDeviceId: saved.cameraDeviceId ?? '',
  screenShakeIntensity: saved.screenShakeIntensity ?? 1.0,
  damageNumbersEnabled: saved.damageNumbersEnabled ?? true,
  postProcessingEnabled: saved.postProcessingEnabled ?? true,

  setMasterVolume: (v) => { persist({ masterVolume: v }); set({ masterVolume: v }); },
  setSfxVolume: (v) => { persist({ sfxVolume: v }); set({ sfxVolume: v }); },
  setCommentaryEnabled: (v) => { persist({ commentaryEnabled: v }); set({ commentaryEnabled: v }); },
  setHeadSensitivity: (v) => { persist({ headSensitivity: v }); set({ headSensitivity: v }); },
  setMouseSensitivity: (v) => { persist({ mouseSensitivity: v }); set({ mouseSensitivity: v }); },
  setInvertY: (v) => { persist({ invertY: v }); set({ invertY: v }); },
  setCameraDeviceId: (v) => { persist({ cameraDeviceId: v }); set({ cameraDeviceId: v }); },
  setScreenShakeIntensity: (v) => { persist({ screenShakeIntensity: v }); set({ screenShakeIntensity: v }); },
  setDamageNumbersEnabled: (v) => { persist({ damageNumbersEnabled: v }); set({ damageNumbersEnabled: v }); },
  setPostProcessingEnabled: (v) => { persist({ postProcessingEnabled: v }); set({ postProcessingEnabled: v }); },
}));
