// =============================================================================
// opencvLoader.ts — Async loader for OpenCV.js (from public/opencv/opencv.js)
//
// Loads OpenCV via dynamic script tag so it doesn't bloat the main bundle.
// Falls back gracefully: getCv() returns null until loaded.
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

let cvInstance: any = null;
let loadPromise: Promise<any> | null = null;

/**
 * Kick off OpenCV loading. Safe to call multiple times (idempotent).
 * Returns a promise that resolves with the cv object once WASM is ready.
 */
export function loadOpenCV(): Promise<any> {
  if (cvInstance) return Promise.resolve(cvInstance);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<any>((resolve, reject) => {
    // OpenCV.js sets window.cv; hook into its Module.onRuntimeInitialized
    const w = window as any;

    // Pre-configure the Module so OpenCV calls us when WASM is ready
    w.Module = {
      onRuntimeInitialized() {
        cvInstance = w.cv;
        console.log('[OpenCV] Runtime initialized');
        resolve(cvInstance);
      },
    };

    const script = document.createElement('script');
    script.src = new URL('opencv/opencv.js', window.location.href).href;
    script.async = true;
    script.onerror = () => {
      console.warn('[OpenCV] Failed to load opencv.js — falling back to manual detection');
      loadPromise = null;
      reject(new Error('Failed to load opencv.js'));
    };
    document.head.appendChild(script);

    // Safety timeout — if OpenCV doesn't init in 30s, give up
    setTimeout(() => {
      if (!cvInstance) {
        console.warn('[OpenCV] Timed out waiting for WASM init');
        loadPromise = null;
        reject(new Error('OpenCV WASM init timed out'));
      }
    }, 30000);
  });

  return loadPromise;
}

/**
 * Get the cv object synchronously. Returns null if not loaded yet.
 */
export function getCv(): any {
  return cvInstance;
}
