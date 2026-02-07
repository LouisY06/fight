// =============================================================================
// AudioManager.ts — Howler.js audio management
// =============================================================================

import { Howl } from 'howler';
import { SOUNDS, type SoundConfig } from './sounds';

class AudioManagerClass {
  private sounds: Map<string, Howl> = new Map();
  private initialized = false;

  /**
   * Pre-load all registered sounds.
   */
  init() {
    if (this.initialized) return;

    for (const [key, config] of Object.entries(SOUNDS)) {
      this.registerSound(key, config);
    }

    this.initialized = true;
  }

  /**
   * Register a single sound.
   */
  registerSound(key: string, config: SoundConfig) {
    const howl = new Howl({
      src: [config.src],
      volume: config.volume,
      loop: config.loop ?? false,
      preload: true,
    });
    this.sounds.set(key, howl);
  }

  /**
   * Play a sound by key.
   */
  play(key: string): number | undefined {
    const sound = this.sounds.get(key);
    if (!sound) {
      console.warn(`[AudioManager] Sound "${key}" not found.`);
      return undefined;
    }
    return sound.play();
  }

  /**
   * Stop a sound by key.
   */
  stop(key: string) {
    this.sounds.get(key)?.stop();
  }

  /**
   * Stop all sounds.
   */
  stopAll() {
    for (const sound of this.sounds.values()) {
      sound.stop();
    }
  }

  /**
   * Set master volume (0–1).
   */
  setMasterVolume(volume: number) {
    Howler.volume(volume);
  }

  /**
   * Mute/unmute all.
   */
  setMuted(muted: boolean) {
    Howler.mute(muted);
  }
}

// Singleton
export const AudioManager = new AudioManagerClass();
