// =============================================================================
// sounds.ts — Sound registry: maps event names to audio file paths
// =============================================================================

export interface SoundConfig {
  src: string;
  volume: number;
  loop?: boolean;
}

export const SOUNDS: Record<string, SoundConfig> = {
  swordClash: {
    src: '/assets/audio/sword-clash.mp3',
    volume: 0.7,
  },
  swordSwing: {
    src: '/assets/audio/sword-swing.mp3',
    volume: 0.5,
  },
  gunshot: {
    src: '/assets/audio/gunshot.mp3',
    volume: 0.8,
  },
  hitImpact: {
    src: '/assets/audio/hit-impact.mp3',
    volume: 0.6,
  },
  crowdAmbience: {
    src: '/assets/audio/crowd-ambience.mp3',
    volume: 0.3,
    loop: true,
  },
  announcerRound1: {
    src: '/assets/audio/announcer/round-1.mp3',
    volume: 0.9,
  },
  announcerFight: {
    src: '/assets/audio/announcer/fight.mp3',
    volume: 1.0,
  },
  announcerKO: {
    src: '/assets/audio/announcer/ko.mp3',
    volume: 1.0,
  },
};
