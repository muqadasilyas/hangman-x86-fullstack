// Tiny synth using Web Audio API — no assets required.
let ctx: AudioContext | null = null;
let muted = false;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (musicGain) musicGain.gain.value = m ? 0 : 0.04;
}
export function isMuted() { return muted; }

function tone(freq: number, dur = 0.15, type: OscillatorType = "sine", vol = 0.18, attack = 0.005) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur + 0.02);
}

export const sfx = {
  click: () => tone(520, 0.06, "triangle", 0.1),
  hover: () => tone(880, 0.04, "sine", 0.05),
  correct: () => {
    tone(660, 0.1, "triangle", 0.18);
    setTimeout(() => tone(990, 0.14, "triangle", 0.18), 80);
  },
  wrong: () => {
    tone(220, 0.12, "sawtooth", 0.18);
    setTimeout(() => tone(160, 0.18, "sawtooth", 0.16), 90);
  },
  hint: () => {
    tone(880, 0.08, "sine", 0.14);
    setTimeout(() => tone(1320, 0.12, "sine", 0.14), 70);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.22), i * 110));
  },
  lose: () => {
    [392, 349, 311, 233].forEach((f, i) => setTimeout(() => tone(f, 0.22, "sawtooth", 0.2), i * 140));
  },
  level: () => {
    [659, 880, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.2), i * 90));
  },
};

/** Loop a gentle background music pattern. */
export function startMusic() {
  const a = ac(); if (!a) return;
  if (musicTimer != null) return;
  musicGain = a.createGain();
  musicGain.gain.value = muted ? 0 : 0.04;
  musicGain.connect(a.destination);
  const notes = [262, 330, 392, 523, 392, 330, 294, 349]; // C major-ish
  let i = 0;
  const playNote = () => {
    if (!musicGain || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = notes[i % notes.length];
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g).connect(musicGain);
    o.start();
    o.stop(ctx.currentTime + 0.55);
    i++;
  };
  playNote();
  musicTimer = window.setInterval(playNote, 600);
}
export function stopMusic() {
  if (musicTimer != null) { clearInterval(musicTimer); musicTimer = null; }
  if (musicGain) { musicGain.disconnect(); musicGain = null; }
}
