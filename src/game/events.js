// events.js – aus der Einzeldatei extrahiert

import { ENTER, EXIT, HAIRS, QSLOTS, SKINS, ctx, rnd } from './config.js';
import { G, relax } from './state.js';
import { dirtyCount, moveToward, rate } from './world.js';
import { actx, audioInit, beep, chord, muted } from './audio.js';
import { dpr, vh, vw } from './render.js';
import { $, bumpMoney, showBanner } from './hud.js';
import { M, addGems, cashFor, saveMeta } from './meta.js';
import { life } from './achievements.js';
import { burst, reduceMotion } from './confetti.js';
import { t, fmt } from './i18n.js';

export let $music;

export function spawnCritic() {
  if (G.queue.length >= QSLOTS.length) return false;
  const c = {
    x: ENTER.x,
    y: ENTER.y,
    shirt: '#231a24',
    skin: rnd(SKINS),
    hair: rnd(HAIRS),
    pants: '#231a24',
    fx: -1,
    moving: false,
    phase: 0,
    state: 'queue',
    wd: 2,
    wf: G.fryer.on ? 1 : 0,
    gd: 0,
    gf: 0,
    arr: false,
    happy: 0,
    pat: 35,
    patMax: 35,
    critic: true,
    shades: true,
    book: true,
  };
  G.customers.push(c);
  G.queue.splice(Math.min(1, G.queue.length), 0, c);
  showBanner(t('Restaurantkritiker!'), t('Bedien ihn in 35 Sekunden – er drängelt nach vorn'));
  beep(520, 0.15, 'square', 0.03);
  return true;
}

export function startInspector() {
  G.inspector = {
    x: ENTER.x,
    y: ENTER.y,
    shirt: '#5a6368',
    skin: rnd(SKINS),
    hair: '#6b6b6b',
    pants: '#3b4247',
    fx: -1,
    moving: false,
    phase: 0,
    t: 15,
    state: 'in',
    book: true,
  };
  showBanner(t('Hygiene-Kontrolle!'), t('Gleich wird geprüft – alle Tische müssen sauber sein'));
  beep(300, 0.2, 'square', 0.03);
}

export function updateEvents(dt) {
  if (G.unlocked.has('cashier') && !relax()) {
    G.eventT -= dt;
    if (G.eventT <= 0 && !G.inspector && !G.customers.some(c => c.critic && c.state === 'queue')) {
      G.eventT = 70 + Math.random() * 50;
      if (G.tablesLv > 0 && Math.random() < 0.45) startInspector();
      else if (!spawnCritic()) G.eventT = 10;
    }
  }
  const I = G.inspector;
  if (I) {
    if (I.state === 'in') {
      if (moveToward(I, 4.6, 5.9, 2.4, dt)) I.state = 'check';
    } else if (I.state === 'check') {
      I.moving = false;
      I.t -= dt;
      if (I.t <= 0) {
        const d = dirtyCount();
        if (d === 0) {
          addGems(2);
          rate(0.3);
          life('hygiene', 1);
          showBanner(t('Hygiene-Siegel!'), t('Alles sauber: +2 Goldmünzen, bessere Bewertung'));
          burst(80);
          chord();
        } else {
          const fine = Math.min(Math.floor(G.money * 0.1), cashFor(2));
          G.money -= fine;
          rate(-0.3);
          showBanner(
            t('Bußgeld!'),
            d > 1
              ? t('{d} schmutzige Tische: −{fine} €', { d, fine: fmt(fine) })
              : t('{d} schmutziger Tisch: −{fine} €', { d, fine: fmt(fine) }),
          );
          beep(140, 0.4, 'sawtooth', 0.04);
        }
        I.state = 'out';
      }
    } else if (I.state === 'out') {
      if (moveToward(I, EXIT.x, EXIT.y, 2.6, dt)) G.inspector = null;
    }
  }
}

export function criticServed() {
  const a = cashFor(3);
  G.money += a;
  bumpMoney();
  addGems(2);
  rate(0.5);
  life('critics', 1);
  showBanner(t('Top-Kritik! ★★★★★'), t('+{a} € und 2 Goldmünzen', { a: fmt(a) }));
  burst(90);
  chord();
}

export const rainy = () => G.weather === 'regen';

export const drops = [];

export function drawRain(dt) {
  if (!rainy()) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = 'rgba(40,52,84,.14)';
  ctx.fillRect(0, 0, vw, vh);
  if (!drops.length)
    for (let i = 0; i < 110; i++)
      drops.push({
        x: Math.random() * vw,
        y: Math.random() * vh,
        s: 500 + Math.random() * 300,
        l: 10 + Math.random() * 10,
      });
  ctx.strokeStyle = 'rgba(200,215,255,.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const d of drops) {
    if (!reduceMotion) {
      d.y += d.s * dt;
      d.x -= d.s * 0.18 * dt;
    }
    if (d.y > vh) {
      d.y = -20;
      d.x = Math.random() * (vw + 100);
    }
    if (d.x < -20) d.x = vw + Math.random() * 50;
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.l * 0.18, d.y + d.l);
  }
  ctx.stroke();
  ctx.restore();
}

export function newDayWeather() {
  G.weather = Math.random() < 0.35 ? 'regen' : 'sonne';
  if (rainy())
    setTimeout(
      () => showBanner(t('Regentag'), t('Weniger Laufkundschaft – Lieferungen bringen 50 % mehr, mehr Autos')),
      2900,
    );
}

export let musicGain = null,
  noiseBuf = null,
  musicTimer = null,
  nextNoteT = 0,
  mStep = 0;

export const MEL = [
  4, -1, 3, 2, 1, -1, 2, -1, 3, 4, 5, 4, 3, -1, -1, -1, 4, -1, 5, 6, 7, -1, 6, 5, 4, 3, 2, 1, 0, -1, -1, -1,
];

export const HICAZ = [62, 63, 66, 67, 69, 70, 72, 74];

export const midi = n => 440 * Math.pow(2, (n - 69) / 12);

export function mTone(f, t, dur, type, vol) {
  const o = actx.createOscillator(),
    g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function mDrum(t, low) {
  if (low) {
    const o = actx.createOscillator(),
      g = actx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + 0.22);
    return;
  }
  const s = actx.createBufferSource(),
    f = actx.createBiquadFilter(),
    g = actx.createGain();
  s.buffer = noiseBuf;
  f.type = 'highpass';
  f.frequency.value = 2500;
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  s.connect(f).connect(g).connect(musicGain);
  s.start(t);
  s.stop(t + 0.08);
}

export function musicTick() {
  if (!actx || !M.music) return;
  const dur = 60 / 112 / 2;
  while (nextNoteT < actx.currentTime + 0.25) {
    const t = nextNoteT,
      st = mStep % 32,
      b = mStep % 8;
    if (!muted) {
      if (b === 0) mTone(midi(38), t, 0.34, 'triangle', 0.22);
      if (b === 4) mTone(midi(45), t, 0.34, 'triangle', 0.18);
      if (b === 0 || b === 4) mDrum(t, true);
      if (b === 1 || b === 3 || b === 6) mDrum(t, false);
      if (MEL[st] >= 0) {
        mTone(midi(HICAZ[MEL[st]]), t, 0.22, 'sawtooth', 0.045);
        mTone(midi(HICAZ[MEL[st]] + 12), t, 0.12, 'triangle', 0.03);
      }
    }
    nextNoteT += dur;
    mStep++;
  }
}

export function startMusic() {
  audioInit();
  if (!actx) return;
  if (!musicGain) {
    musicGain = actx.createGain();
    musicGain.gain.value = 0.35;
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    musicGain.connect(lp).connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.2, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (actx.state === 'suspended') actx.resume();
  nextNoteT = actx.currentTime + 0.05;
  if (!musicTimer) musicTimer = setInterval(musicTick, 80);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function musicLabel() {
  $music.textContent = M.music ? t('Musik: an') : t('Musik: aus');
}

export function v8Hud() {
  const w = $('weatherChip');
  w.hidden = !rainy();
  const e = $('eventChip'),
    I = G.inspector,
    cr = G.customers.find(c => c.critic && c.state === 'queue');
  if (I && I.state === 'check') {
    e.hidden = false;
    e.textContent = t('Kontrolle {s} s', { s: Math.ceil(I.t) });
  } else if (cr) {
    e.hidden = false;
    e.textContent = t('Kritiker {s} s', { s: Math.ceil(cr.pat) });
  } else e.hidden = true;
}

export function initEvents() {
  $music = $('musicBtn');
  $music.onclick = () => {
    M.music = !M.music;
    saveMeta();
    musicLabel();
    if (M.music) startMusic();
    else stopMusic();
  };
  musicLabel();
  if (M.music) {
    const kick = () => {
      startMusic();
      removeEventListener('pointerdown', kick);
      removeEventListener('keydown', kick);
    };
    addEventListener('pointerdown', kick);
    addEventListener('keydown', kick);
  }
}
