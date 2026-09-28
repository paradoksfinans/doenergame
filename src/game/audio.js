// audio.js – Ton: vorberechnete Soundeffekte (art/audio/make_audio.py) mit Fallback auf einfache Pieptöne,
// leises Grill-Brutzeln im Hintergrund (keine Musik).
import { SOUNDS } from './sounddata.js';

export let actx = null,
  muted = false;

let sfxGain = null;
const bufs = {};
let loading = false;

function bus() {
  if (!sfxGain) {
    sfxGain = actx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(actx.destination);
  }
}

async function loadAll() {
  if (loading || !actx) return;
  loading = true;
  await Promise.all(
    Object.entries(SOUNDS).map(async ([k, uri]) => {
      try {
        const bin = atob(uri.slice(uri.indexOf(',') + 1));
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        bufs[k] = await actx.decodeAudioData(arr.buffer);
      } catch (e) {}
    }),
  );
  if (wantSizzle) startSizzle();
}

export function audioInit() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
    if (!actx) return;
    bus();
    loadAll();
  }
  if (actx.state === 'suspended' && !document.hidden) actx.resume().catch(() => {});
}

/** Soundeffekt abspielen. rate verändert Tonhöhe/Tempo (1 = normal). */
export function sfx(name, vol = 1, rate = 1) {
  if (muted || !actx) return false;
  const b = bufs[name];
  if (!b) return false;
  const s = actx.createBufferSource(),
    g = actx.createGain();
  s.buffer = b;
  s.playbackRate.value = rate;
  g.gain.value = vol;
  s.connect(g).connect(sfxGain);
  s.start();
  return true;
}

export const audioLoaded = () => ({
  state: actx && actx.state,
  loaded: Object.keys(bufs),
  sizzle: !!sizzleSrc,
});

export function beep(f, dur = 0.07, type = 'triangle', vol = 0.05) {
  if (muted || !actx) return;
  const now = actx.currentTime,
    o = actx.createOscillator(),
    g = actx.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g).connect(sfxGain || actx.destination);
  o.start(now);
  o.stop(now + dur + 0.02);
}

/** Plopp beim Aufnehmen: Tonhöhe steigt mit der Stapelhöhe (wie bisher die Pieptöne). */
export function popSfx(carry = 0) {
  if (!sfx('pop', 0.8, 0.9 + Math.min(12, carry) * 0.06)) beep(480 + carry * 30);
}

export function ching() {
  if (!sfx('cash', 0.7)) {
    beep(1320, 0.08, 'square', 0.025);
    setTimeout(() => beep(1760, 0.12, 'square', 0.02), 70);
  }
}

export function chord() {
  if (!sfx('fanfare', 0.8))
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle', 0.05), i * 80));
}

// ---------------------------------------------------------------- Grill-Brutzeln (Schleife)
let sizzleSrc = null,
  sizzleGain = null,
  wantSizzle = true;
function startSizzle() {
  if (!actx || sizzleSrc || !bufs.sizzle) return;
  sizzleSrc = actx.createBufferSource();
  sizzleSrc.buffer = bufs.sizzle;
  sizzleSrc.loop = true;
  sizzleGain = actx.createGain();
  sizzleGain.gain.value = muted ? 0 : 0.12;
  sizzleSrc.connect(sizzleGain).connect(actx.destination);
  sizzleSrc.start();
}
/** Lautstärke des Brutzelns (0..1), z. B. nach Anzahl laufender Spieße. */
export function sizzleLevel(v) {
  if (sizzleGain) sizzleGain.gain.setTargetAtTime(muted ? 0 : 0.05 + 0.1 * v, actx.currentTime, 0.3);
}

export function __set_muted(v) {
  muted = v;
  if (!actx) return;
  if (sizzleGain) sizzleGain.gain.value = v ? 0 : 0.12;
}

export function initAudio() {
  // App im Hintergrund (Handy gesperrt, anderes App geöffnet): Ton anhalten, danach fortsetzen
  addEventListener('visibilitychange', () => {
    if (!actx) return;
    if (document.hidden) actx.suspend().catch(() => {});
    else actx.resume().catch(() => {});
  });
}
