/**
 * sounds.ts — synthesized chime via WebAudio. No assets needed; we generate
 * two short sine bell tones at runtime. Audio context is unlocked on first
 * user gesture (Login button) to satisfy autoplay policies.
 */

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    type WindowWithWebkitAudio = Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    c.resume().catch(() => {});
  }
  if (unlocked) return;
  try {
    const buffer = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start(0);
    unlocked = true;
  } catch {
    // ignore — best-effort
  }
}

function tone(freq: number, startOffset: number, durationS: number, peak = 0.16) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationS);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durationS + 0.05);
}

export function chime(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    c.resume().catch(() => {});
  }
  tone(880, 0, 0.4, 0.14);
  tone(1320, 0.06, 0.55, 0.10);
}

export function softTick(): void {
  tone(540, 0, 0.18, 0.06);
}
