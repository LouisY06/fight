// =============================================================================
// ElevenLabsService.ts — ElevenLabs TTS + Sound Effects with in-memory caching
// Priority-based voice queue: only one announcer line at a time, higher
// priority interrupts lower, minimum cooldown between lines.
// =============================================================================

const API_BASE = 'https://api.elevenlabs.io/v1';

// "Lily" — raspy, deep, middle-aged British female
// Low register with a gravelly edge — commanding and seductive.
const ANNOUNCER_VOICE_ID = 'pFZP5JQG7iQjIQuC4Bku';

const TTS_MODEL = 'eleven_flash_v2_5';

function getApiKey(): string {
  return import.meta.env.VITE_ELEVENLABS_API_KEY ?? '';
}

// ---------------------------------------------------------------------------
// Audio cache
// ---------------------------------------------------------------------------

const audioCache = new Map<string, HTMLAudioElement>();
const pendingRequests = new Map<string, Promise<HTMLAudioElement | null>>();

// ---------------------------------------------------------------------------
// Priority voice queue — prevents overlap
// ---------------------------------------------------------------------------

const Priority = { CRITICAL: 3, HIGH: 2, LOW: 1 } as const;
type PriorityLevel = (typeof Priority)[keyof typeof Priority];

let currentVoice: HTMLAudioElement | null = null;
let currentPriority: PriorityLevel = 0 as PriorityLevel;
let lastVoiceEndTime = 0;
const MIN_GAP_MS = 1200; // Minimum gap between voice lines

function playVoice(audio: HTMLAudioElement | null, priority: PriorityLevel, volume: number = 0.9): void {
  if (!audio) return;

  const now = Date.now();

  // If something is currently playing...
  if (currentVoice && !currentVoice.ended && !currentVoice.paused) {
    // Only interrupt if new line has HIGHER priority
    if (priority <= currentPriority) return;
    // Interrupt: stop current
    currentVoice.pause();
    currentVoice.currentTime = 0;
  } else {
    // Nothing playing — enforce cooldown for non-critical lines
    if (priority < Priority.CRITICAL && now - lastVoiceEndTime < MIN_GAP_MS) return;
  }

  const clone = audio.cloneNode(true) as HTMLAudioElement;
  clone.volume = volume;
  currentVoice = clone;
  currentPriority = priority;

  clone.addEventListener('ended', () => {
    lastVoiceEndTime = Date.now();
    if (currentVoice === clone) {
      currentVoice = null;
      currentPriority = 0 as PriorityLevel;
    }
  });

  clone.play().catch(() => {});
}

// SFX plays independently (not voice — doesn't conflict)
function playSFX(audio: HTMLAudioElement | null, volume: number = 0.7): void {
  if (!audio) return;
  const clone = audio.cloneNode(true) as HTMLAudioElement;
  clone.volume = volume;
  clone.play().catch(() => {});
}

// ---------------------------------------------------------------------------
// TTS generation
// ---------------------------------------------------------------------------

async function generateTTS(text: string): Promise<HTMLAudioElement | null> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') return null;

  try {
    const response = await fetch(`${API_BASE}/text-to-speech/${ANNOUNCER_VOICE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        text,
        model_id: TTS_MODEL,
        voice_settings: {
          stability: 0.75,          // Consistent voice
          similarity_boost: 0.9,    // Stays true to the voice
          style: 0.6,              // Moderate style = natural dramatic delivery
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      console.error(`[ElevenLabs] TTS failed: ${response.status}`);
      return null;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    return audio;
  } catch (err) {
    console.error('[ElevenLabs] TTS error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sound Effects generation
// ---------------------------------------------------------------------------

async function generateSoundEffect(prompt: string, durationSeconds?: number): Promise<HTMLAudioElement | null> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') return null;

  try {
    const body: Record<string, unknown> = { text: prompt };
    if (durationSeconds) body.duration_seconds = durationSeconds;

    const response = await fetch(`${API_BASE}/sound-generation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[ElevenLabs] SFX failed: ${response.status}`);
      return null;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return new Audio(url);
  } catch (err) {
    console.error('[ElevenLabs] SFX error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cache helper
// ---------------------------------------------------------------------------

async function getOrGenerate(
  key: string,
  gen: () => Promise<HTMLAudioElement | null>
): Promise<HTMLAudioElement | null> {
  const cached = audioCache.get(key);
  if (cached) return cached;

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const promise = gen().then((audio) => {
    if (audio) audioCache.set(key, audio);
    pendingRequests.delete(key);
    return audio;
  });

  pendingRequests.set(key, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const ElevenLabs = {
  // === CRITICAL priority — always plays, interrupts everything ===

  async announceRound(roundNumber: number): Promise<void> {
    const words = ['', 'One', 'Two', 'Three', 'Four', 'Five'];
    const word = words[roundNumber] ?? String(roundNumber);
    const audio = await getOrGenerate(`announce-round-${roundNumber}`, () =>
      generateTTS(`Round ${word}!`)
    );
    playVoice(audio, Priority.CRITICAL, 1.0);
  },

  async announceFight(): Promise<void> {
    const audio = await getOrGenerate('announce-fight', () => generateTTS('Fight!'));
    playVoice(audio, Priority.CRITICAL, 1.0);
  },

  async announceKO(): Promise<void> {
    const audio = await getOrGenerate('announce-ko', () => generateTTS('Kay, O!'));
    playVoice(audio, Priority.CRITICAL, 1.0);
  },

  async announceDraw(): Promise<void> {
    const audio = await getOrGenerate('announce-draw', () => generateTTS('Draw!'));
    playVoice(audio, Priority.CRITICAL, 1.0);
  },

  async announceYouWin(): Promise<void> {
    const audio = await getOrGenerate('announce-you-win', () => generateTTS('Victory!'));
    playVoice(audio, Priority.CRITICAL, 1.0);
  },

  async announceYouLose(): Promise<void> {
    const audio = await getOrGenerate('announce-you-lose', () => generateTTS('Defeated!'));
    playVoice(audio, Priority.CRITICAL, 1.0);
  },

  // === HIGH priority — plays if nothing critical is active ===

  async announceFlavorLine(line: string): Promise<void> {
    const key = `flavor-${line.toLowerCase().replace(/\s+/g, '-')}`;
    const audio = await getOrGenerate(key, () => generateTTS(line));
    playVoice(audio, Priority.HIGH, 0.85);
  },

  async announceCombo(hitCount: number): Promise<void> {
    if (hitCount >= 5) {
      const audio = await getOrGenerate('combo-5', () =>
        generateTTS('Unstoppable combo!')
      );
      playVoice(audio, Priority.HIGH, 0.9);
    }
  },

  async announceFirstBlood(): Promise<void> {
    const audio = await getOrGenerate('first-blood', () => generateTTS('First blood!'));
    playVoice(audio, Priority.HIGH, 0.9);
  },

  async announceSwordClash(): Promise<void> {
    const audio = await getOrGenerate('sword-clash', () =>
      generateTTS('Sword clash! Both stunned!')
    );
    playVoice(audio, Priority.HIGH, 0.95);
  },

  // === LOW priority — only if nothing else is queued ===

  async announceLowHealth(): Promise<void> {
    const audio = await getOrGenerate('finish-them', () => generateTTS('Finish them!'));
    playVoice(audio, Priority.LOW, 0.85);
  },

  async announceTimeWarning(): Promise<void> {
    const audio = await getOrGenerate('time-warning', () => generateTTS('Time is running out!'));
    playVoice(audio, Priority.LOW, 0.85);
  },

  // === SFX — play independently, no queue ===

  async playSwordClash(): Promise<void> {
    const audio = await getOrGenerate('sfx-sword-clash', () =>
      generateSoundEffect('Sharp metallic sword clash impact, close range combat', 1.0)
    );
    playSFX(audio, 0.7);
  },

  async playCrowdRoar(): Promise<void> {
    const audio = await getOrGenerate('sfx-crowd-roar', () =>
      generateSoundEffect('Excited arena crowd roaring and cheering after a knockout', 3.0)
    );
    playSFX(audio, 0.5);
  },

  // === Pre-warm ===

  preWarm(): void {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
      console.warn('[ElevenLabs] No API key — announcer disabled');
      return;
    }
    console.log('[ElevenLabs] Pre-warming voice lines...');

    // Stagger requests to avoid 429 rate limiting (2 per second)
    const lines: [string, string][] = [
      ['announce-round-1', 'Round One!'],
      ['announce-fight', 'Fight!'],
      ['announce-ko', 'Kay, O!'],
      ['announce-round-2', 'Round Two!'],
      ['announce-round-3', 'Round Three!'],
      ['announce-draw', 'Draw!'],
      ['announce-you-win', 'Victory!'],
      ['announce-you-lose', 'Defeated!'],
      ['first-blood', 'First blood!'],
      ['finish-them', 'Finish them!'],
      ['sword-clash', 'Sword clash! Both stunned!'],
    ];

    lines.forEach(([key, text], i) => {
      setTimeout(() => {
        getOrGenerate(key, () => generateTTS(text));
      }, i * 500); // 500ms between each request
    });
  },

  isAvailable(): boolean {
    const key = getApiKey();
    return !!key && key !== 'your_elevenlabs_api_key_here';
  },
} as const;
