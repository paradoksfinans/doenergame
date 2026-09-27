// audio.js – aus der Einzeldatei extrahiert

export let actx = null,
  muted = false;

export function audioInit() {
  if (actx) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}
}

export function beep(f, dur = 0.07, type = 'triangle', vol = 0.05) {
  if (muted || !actx) return;
  const now = actx.currentTime,
    o = actx.createOscillator(),
    g = actx.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g).connect(actx.destination);
  o.start(now);
  o.stop(now + dur + 0.02);
}

export function ching() {
  beep(1320, 0.08, 'square', 0.025);
  setTimeout(() => beep(1760, 0.12, 'square', 0.02), 70);
}

export function chord() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle', 0.05), i * 80));
}

export function __set_muted(v) {
  muted = v;
}

export function initAudio() {}
