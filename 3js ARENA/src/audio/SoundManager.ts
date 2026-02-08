// =============================================================================
// SoundManager.ts — Web Audio API synthesized game sounds
// No external audio files — all sounds are generated procedurally.
// =============================================================================

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ---------------------------------------------------------------------------
// Sword Hit — metallic clang / impact
// Short burst of noise shaped with a resonant bandpass filter + fast decay.
// ---------------------------------------------------------------------------

export function playSwordHit(): void {
  const ac = getCtx();
  const now = ac.currentTime;

  // --- Noise burst (the "impact" body) ---
  const noiseDuration = 0.12;
  const bufferSize = Math.ceil(ac.sampleRate * noiseDuration);
  const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.8;
  }
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuffer;

  // Bandpass filter gives it a metallic ring
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(3200, now);
  bp.Q.setValueAtTime(8, now);

  // Sharp envelope
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.6, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

  noise.connect(bp).connect(noiseGain).connect(ac.destination);
  noise.start(now);
  noise.stop(now + noiseDuration);

  // --- Metallic ring (resonant sine) ---
  const ring = ac.createOscillator();
  ring.type = 'sine';
  ring.frequency.setValueAtTime(1800 + Math.random() * 600, now); // randomize slightly

  const ringGain = ac.createGain();
  ringGain.gain.setValueAtTime(0.15, now);
  ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  // High-pass to keep it thin / metallic
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(800, now);

  ring.connect(hp).connect(ringGain).connect(ac.destination);
  ring.start(now);
  ring.stop(now + 0.25);

  // --- Sub thud ---
  const thud = ac.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(120, now);
  thud.frequency.exponentialRampToValueAtTime(60, now + 0.08);

  const thudGain = ac.createGain();
  thudGain.gain.setValueAtTime(0.3, now);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  thud.connect(thudGain).connect(ac.destination);
  thud.start(now);
  thud.stop(now + 0.08);
}

// ---------------------------------------------------------------------------
// Sword Block — metallic clang, duller than hit
// ---------------------------------------------------------------------------

export function playSwordBlock(): void {
  const ac = getCtx();
  const now = ac.currentTime;

  const noiseDuration = 0.08;
  const bufferSize = Math.ceil(ac.sampleRate * noiseDuration);
  const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuffer;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1800, now);
  bp.Q.setValueAtTime(4, now);

  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

  noise.connect(bp).connect(noiseGain).connect(ac.destination);
  noise.start(now);
  noise.stop(now + noiseDuration);
}

// ---------------------------------------------------------------------------
// Sword Swing (miss) — whoosh
// ---------------------------------------------------------------------------

export function playSwordSwing(): void {
  const ac = getCtx();
  const now = ac.currentTime;

  const duration = 0.15;
  const bufferSize = Math.ceil(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    d[i] = (Math.random() * 2 - 1);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(400, now);
  bp.frequency.exponentialRampToValueAtTime(1200, now + duration * 0.3);
  bp.frequency.exponentialRampToValueAtTime(300, now + duration);
  bp.Q.setValueAtTime(2, now);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + duration * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(bp).connect(gain).connect(ac.destination);
  src.start(now);
  src.stop(now + duration);
}

// ---------------------------------------------------------------------------
// Sword Clash / Stun — bright metallic clash + electric crackle
// Louder and more dramatic than a regular hit — both swords collide.
// ---------------------------------------------------------------------------

export function playSwordClash(): void {
  const ac = getCtx();
  const now = ac.currentTime;

  // --- Heavy metallic impact (dual noise burst) ---
  const noiseDuration = 0.18;
  const bufferSize = Math.ceil(ac.sampleRate * noiseDuration);
  const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 1.0;
  }
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuffer;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(4500, now);
  bp.Q.setValueAtTime(12, now);

  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.7, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

  noise.connect(bp).connect(noiseGain).connect(ac.destination);
  noise.start(now);
  noise.stop(now + noiseDuration);

  // --- Bright metallic ring (high-pitched resonance) ---
  const ring = ac.createOscillator();
  ring.type = 'sine';
  ring.frequency.setValueAtTime(2800 + Math.random() * 800, now);

  const ringGain = ac.createGain();
  ringGain.gain.setValueAtTime(0.25, now);
  ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(1200, now);

  ring.connect(hp).connect(ringGain).connect(ac.destination);
  ring.start(now);
  ring.stop(now + 0.5);

  // --- Second harmonic ring (octave up, electric sparkle) ---
  const ring2 = ac.createOscillator();
  ring2.type = 'sawtooth';
  ring2.frequency.setValueAtTime(5600 + Math.random() * 1000, now);

  const ring2Gain = ac.createGain();
  ring2Gain.gain.setValueAtTime(0.08, now);
  ring2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  ring2.connect(ring2Gain).connect(ac.destination);
  ring2.start(now);
  ring2.stop(now + 0.35);

  // --- Deep sub thud (bigger than normal hit) ---
  const thud = ac.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(180, now);
  thud.frequency.exponentialRampToValueAtTime(40, now + 0.15);

  const thudGain = ac.createGain();
  thudGain.gain.setValueAtTime(0.5, now);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  thud.connect(thudGain).connect(ac.destination);
  thud.start(now);
  thud.stop(now + 0.15);
}

// ---------------------------------------------------------------------------
// KO / Round End — deep boom
// ---------------------------------------------------------------------------

export function playKO(): void {
  const ac = getCtx();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  // Distortion for punch
  const ws = ac.createWaveShaper();
  const k = 20;
  const n = 44100;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  ws.curve = curve;

  osc.connect(ws).connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}
