// =============================================================================
// VoiceCommands.ts — ElevenLabs STT voice recognition for spell casting
//
// Uses the microphone via MediaRecorder + simple Voice Activity Detection.
// When speech is detected, sends the audio clip to ElevenLabs Scribe v2 API
// for transcription, then matches against spell trigger words.
// =============================================================================

import { SPELL_CONFIGS, type SpellType } from '../combat/SpellSystem';

type SpellCallback = (spell: SpellType) => void;
type CommandCallback = (command: string) => void;

const STT_ENDPOINT = 'https://api.elevenlabs.io/v1/speech-to-text';
const STT_MODEL = 'scribe_v2';

/** Wake word — all voice commands must start with "mechabot" */
const WAKE_WORD_FUZZY = ['mechabot', 'mecha bot', 'meca bot', 'mega bot', 'mechbot', 'mech bot', 'mecca bot', 'mechanic bot'];

// Spell keywords to bias ElevenLabs transcription toward (with mechabot prefix)
const KEYTERMS = [
  'mechabot', 'mecha bot',
  'mechabot fireball', 'mechabot fire', 'fireball', 'fire ball', 'fire',
  'mechabot laser', 'laser', 'laser beam', 'beam', 'electric', 'lightning', 'shock', 'zap',
  'mechabot ice blast', 'ice blast', 'ice', 'freeze', 'frost', 'blizzard', 'cold', 'icy', 'blast',
  'mechabot forcefield', 'forcefield', 'force field', 'shield', 'barrier', 'protect', 'defense',
  'mechabot turn around', 'turn around', 'turnaround', 'flip', 'about face',
  'mechabot aimlock', 'aimlock', 'aim lock', 'calibrate', 'recenter',
];

// Voice Activity Detection thresholds — tuned for fast spell detection
const SILENCE_THRESHOLD = 0.012;   // RMS below this = silence
const SPEECH_START_FRAMES = 2;     // consecutive loud frames to start recording (100ms)
const SILENCE_END_FRAMES = 5;      // consecutive quiet frames to stop (250ms of silence)
const MIN_RECORDING_MS = 200;      // ignore clips shorter than this
const MAX_RECORDING_MS = 2500;     // force-stop after this (spells are short words)
const COOLDOWN_MS = 300;           // min gap between transcription requests

let stream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let mediaRecorder: MediaRecorder | null = null;
let isListening = false;
let listeners: SpellCallback[] = [];
let commandListeners: CommandCallback[] = [];
let voiceStatus: 'idle' | 'active' | 'failed' = 'idle';

// VAD state
let speechFrameCount = 0;
let silenceFrameCount = 0;
let isRecording = false;
let recordingStartTime = 0;
let recordedChunks: Blob[] = [];
let lastTranscribeTime = 0;
let vadIntervalId: ReturnType<typeof setInterval> | null = null;

function getApiKey(): string {
  return import.meta.env.VITE_ELEVENLABS_API_KEY ?? '';
}

/** Check if ElevenLabs STT is available */
export function isVoiceAvailable(): boolean {
  if (voiceStatus === 'failed') return false;
  const key = getApiKey();
  return !!key && key !== 'your_elevenlabs_api_key_here';
}

export function isVoiceFailed(): boolean {
  return voiceStatus === 'failed';
}

export function isVoiceActive(): boolean {
  return voiceStatus === 'active';
}

/** Start listening for voice commands via microphone */
export async function startVoiceListening(): Promise<void> {
  if (isListening || voiceStatus === 'failed') return;
  if (!isVoiceAvailable()) {
    console.warn('[VoiceCmd] No ElevenLabs API key — voice spells disabled');
    voiceStatus = 'failed';
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
    });

    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    isListening = true;
    voiceStatus = 'active';
    console.log('[VoiceCmd] Microphone active — say spell names to cast');

    // Start VAD polling (every ~50ms — runs off main thread via setInterval)
    vadIntervalId = setInterval(vadTick, 50);
  } catch (err) {
    console.warn('[VoiceCmd] Microphone access denied:', err);
    voiceStatus = 'failed';
  }
}

/** Stop listening */
export function stopVoiceListening(): void {
  isListening = false;

  if (vadIntervalId) {
    clearInterval(vadIntervalId);
    vadIntervalId = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch { /* ignore */ }
  }
  mediaRecorder = null;

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }

  analyser = null;
  isRecording = false;
  recordedChunks = [];
  speechFrameCount = 0;
  silenceFrameCount = 0;
}

/** Register a callback for spell detection */
export function onVoiceSpell(cb: SpellCallback): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/** Register a callback for general voice commands (e.g. "aimlock") */
export function onVoiceCommand(cb: CommandCallback): () => void {
  commandListeners.push(cb);
  return () => {
    const i = commandListeners.indexOf(cb);
    if (i >= 0) commandListeners.splice(i, 1);
  };
}

// ---------------------------------------------------------------------------
// Voice Activity Detection tick
// ---------------------------------------------------------------------------

function vadTick(): void {
  if (!analyser || !isListening) return;

  const dataArray = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(dataArray);

  // Compute RMS energy
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);

  const isSpeech = rms > SILENCE_THRESHOLD;

  if (!isRecording) {
    // Waiting for speech to start
    if (isSpeech) {
      speechFrameCount++;
      if (speechFrameCount >= SPEECH_START_FRAMES) {
        startRecording();
      }
    } else {
      speechFrameCount = 0;
    }
  } else {
    // Currently recording — wait for silence to stop
    const now = Date.now();
    const elapsed = now - recordingStartTime;

    if (!isSpeech) {
      silenceFrameCount++;
      if (silenceFrameCount >= SILENCE_END_FRAMES || elapsed >= MAX_RECORDING_MS) {
        stopRecording();
      }
    } else {
      silenceFrameCount = 0;
    }

    // Force-stop if too long
    if (elapsed >= MAX_RECORDING_MS) {
      stopRecording();
    }
  }
}

function startRecording(): void {
  if (!stream || isRecording) return;

  isRecording = true;
  recordingStartTime = Date.now();
  recordedChunks = [];
  silenceFrameCount = 0;
  speechFrameCount = 0;

  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  } catch {
    // Fallback mime type
    try {
      mediaRecorder = new MediaRecorder(stream);
    } catch {
      isRecording = false;
      return;
    }
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const duration = Date.now() - recordingStartTime;
    if (duration >= MIN_RECORDING_MS && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType ?? 'audio/webm' });
      transcribeClip(blob);
    }
    recordedChunks = [];
    isRecording = false;
  };

  mediaRecorder.start(100); // collect data every 100ms
}

function stopRecording(): void {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    isRecording = false;
    return;
  }
  try {
    mediaRecorder.stop();
  } catch {
    isRecording = false;
  }
}

// ---------------------------------------------------------------------------
// Send audio to ElevenLabs STT
// ---------------------------------------------------------------------------

async function transcribeClip(audioBlob: Blob): Promise<void> {
  const now = Date.now();
  if (now - lastTranscribeTime < COOLDOWN_MS) return;
  lastTranscribeTime = now;

  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const formData = new FormData();
    formData.append('model_id', STT_MODEL);
    formData.append('file', audioBlob, 'spell.webm');
    formData.append('language_code', 'en');
    formData.append('tag_audio_events', 'false');
    formData.append('timestamps_granularity', 'none');

    // Add keyterms to bias transcription toward spell words
    for (const term of KEYTERMS) {
      formData.append('keyterms', term);
    }

    const response = await fetch(STT_ENDPOINT, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      console.warn(`[VoiceCmd] STT error ${response.status}`);
      return;
    }

    const data = await response.json();
    const transcript: string = (data.text ?? '').toLowerCase().trim();

    if (!transcript) return;

    console.log(`[VoiceCmd] Heard: "${transcript}"`);

    // Check for wake word "mechabot"
    const hasWakeWord = WAKE_WORD_FUZZY.some((w) => transcript.includes(w));
    if (!hasWakeWord) {
      console.log(`[VoiceCmd] No wake word "mechabot" — ignoring`);
      return;
    }

    // Strip the wake word to get the command portion
    let command = transcript;
    for (const w of WAKE_WORD_FUZZY) {
      command = command.replace(w, '').trim();
    }

    // Check for "aimlock" command first
    const matchedCommand = matchCommand(command);
    if (matchedCommand) {
      console.log(`[VoiceCmd] COMMAND: ${matchedCommand}!`);
      for (const cb of commandListeners) cb(matchedCommand);
      return;
    }

    // Check for spells
    const matched = matchSpell(command);
    if (matched) {
      console.log(`[VoiceCmd] SPELL: ${matched}!`);
      for (const cb of listeners) cb(matched);
    }
  } catch (err) {
    console.warn('[VoiceCmd] Transcription failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Command matching — "turn around" / "aimlock"
// ---------------------------------------------------------------------------

const TURN_AROUND_FUZZY = [
  'turn around', 'turnaround', 'turn round', 'turn-around',
  'flip', 'flip around', '180', 'one eighty', 'about face',
  'behind', 'look behind', 'look back',
];

const AIMLOCK_FUZZY = [
  'aimlock', 'aim lock', 'aim locked', 'aimlocked',
  'calibrate', 'recalibrate', 'recenter', 're-center', 're center',
  'lock on', 'lockon', 'lock-on',
];

function matchCommand(transcript: string): string | null {
  if (TURN_AROUND_FUZZY.some((w) => transcript.includes(w))) return 'turnaround';
  if (AIMLOCK_FUZZY.some((w) => transcript.includes(w))) return 'aimlock';
  return null;
}

// ---------------------------------------------------------------------------
// Spell matching — with fuzzy matching for common STT misrecognitions
// ---------------------------------------------------------------------------

/** Common misrecognitions for ice-related words */
const ICE_FUZZY = [
  'ice', 'ise', 'eyes', 'icy', 'iced', 'nice', 'mice', 'i\'s',
  'rice', 'ais', 'aice', 'is blast', 'i blast',
];

/** Common misrecognitions for "blast" */
const BLAST_FUZZY = [
  'blast', 'blasts', 'last', 'class', 'clasp', 'blas', 'glass',
];

function matchSpell(transcript: string): SpellType | null {
  // First try exact trigger matching (order: fireball first, then laser, then ice, then forcefield)
  // Check fireball triggers
  for (const trigger of SPELL_CONFIGS.fireball.voiceTriggers) {
    if (transcript.includes(trigger)) return 'fireball';
  }

  // Check laser triggers
  for (const trigger of SPELL_CONFIGS.laser.voiceTriggers) {
    if (transcript.includes(trigger)) return 'laser';
  }

  // Check ice_blast triggers
  for (const trigger of SPELL_CONFIGS.ice_blast.voiceTriggers) {
    if (transcript.includes(trigger)) return 'ice_blast';
  }

  // Check forcefield triggers
  for (const trigger of SPELL_CONFIGS.forcefield.voiceTriggers) {
    if (transcript.includes(trigger)) return 'forcefield';
  }

  // Fuzzy matching for ice blast (commonly misheard)
  const hasIceSound = ICE_FUZZY.some((w) => transcript.includes(w));
  const hasBlastSound = BLAST_FUZZY.some((w) => transcript.includes(w));

  // If both ice-like + blast-like words found, it's ice blast
  if (hasIceSound && hasBlastSound) return 'ice_blast';
  // If just ice-like word found alone, still ice blast (it's the only ice spell)
  if (hasIceSound) return 'ice_blast';
  // If "blast" alone and no other spell matched, assume ice blast
  if (hasBlastSound) return 'ice_blast';

  return null;
}
