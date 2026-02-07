// =============================================================================
// cvBridge.ts — Bridge for CV data into R3F Canvas (avoids invalid hook calls)
// Components inside R3F Canvas use a different React reconciler; useContext
// from the outer tree can throw "Invalid hook call". This module lets
// CVProvider register refs/callbacks that R3F components read without hooks.
// =============================================================================

import type { CVGameInput, CVInputMapper } from './CVInputMapper';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

const defaultCvInput: CVGameInput = {
  lookYaw: 0,
  lookPitch: 0,
  posOffsetX: 0,
  posOffsetZ: 0,
  swordOffsetX: 0,
  swordOffsetY: 0,
  swordRotX: 0,
  swordRotY: 0.3,
  swordRotZ: 0.4,
  isSwinging: false,
  isBlocking: false,
  isTracking: false,
};

let cvEnabled = false;
let isTracking = false;
let cvInputRef: { current: CVGameInput } = { current: { ...defaultCvInput } };
let worldLandmarksRef: { current: NormalizedLandmark[] | null } = { current: null };
let mapperRef: { current: CVInputMapper } | null = null;
const calibrateListeners = new Set<() => void>();

export const cvBridge = {
  get cvEnabled() {
    return cvEnabled;
  },
  set cvEnabled(value: boolean) {
    cvEnabled = value;
  },
  get isTracking() {
    return isTracking;
  },
  set isTracking(value: boolean) {
    isTracking = value;
  },
  get cvInputRef() {
    return cvInputRef;
  },
  get worldLandmarksRef() {
    return worldLandmarksRef;
  },
  get mapperRef() {
    return mapperRef;
  },
  /** Called by CVProvider on mount to register its refs */
  register(refs: {
    cvInputRef: { current: CVGameInput };
    worldLandmarksRef: { current: NormalizedLandmark[] | null };
    mapperRef: { current: CVInputMapper };
  }): void {
    cvInputRef = refs.cvInputRef;
    worldLandmarksRef = refs.worldLandmarksRef;
    mapperRef = refs.mapperRef;
  },
  onCalibrate(cb: () => void): () => void {
    calibrateListeners.add(cb);
    return () => calibrateListeners.delete(cb);
  },
  triggerCalibrate(): void {
    for (const cb of calibrateListeners) cb();
  },
};
