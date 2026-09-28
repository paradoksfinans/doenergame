// daynight.js – aus der Einzeldatei extrahiert

import { ctx, cv } from './config.js';
import { G } from './state.js';
import { P, ell } from './iso.js';
import { cam, dpr, vh, vw, zoom } from './render.js';

export let dk;

export const PHASES = [
  { id: 'nacht', from: 0, to: 6, name: 'Nacht', mul: 0.9 },
  { id: 'morgen', from: 6, to: 11, name: 'Morgen', mul: 0.8 },
  { id: 'mittag', from: 11, to: 14, name: 'Mittagspause', mul: 1.5 },
  { id: 'nachm', from: 14, to: 18, name: 'Nachmittag', mul: 1 },
  { id: 'abend', from: 18, to: 22, name: 'Abend', mul: 1.25 },
  { id: 'nacht', from: 22, to: 24, name: 'Nacht', mul: 0.9 },
];

export const PHASE_MSG = {
  morgen: ['Guten Morgen!', 'Ein neuer Tag – noch ist es ruhig'],
  mittag: ['Mittagspause!', 'Bis 14 Uhr kommen deutlich mehr Gäste'],
  nachm: ['Nachmittag', 'Normaler Betrieb'],
  abend: ['Feierabend!', 'Die Abendgäste strömen rein'],
  nacht: ['Späti-Zeit', 'Nachtschwärmer bestellen 1 Döner mehr'],
};

export function phaseNow() {
  const h = G.clock / 60;
  return PHASES.find(p => h >= p.from && h < p.to) || PHASES[0];
}

export function darkness() {
  const h = G.clock / 60;
  if (h >= 20 || h < 5) return 0.55;
  if (h >= 18) return (0.55 * (h - 18)) / 2;
  if (h < 7) return 0.55 * (1 - (h - 5) / 2);
  return 0;
}

export const clockStr = () => {
  const m = Math.floor(G.clock);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String((m % 60) - (m % 15)).padStart(2, '0');
};

export const LIGHTS = [
  [2.2, 1.8, 150],
  [5, 1.8, 150],
  [8, 1.8, 140],
  [4, 4.3, 150],
  [6.9, 4.3, 140],
  [2.4, 7, 170],
  [5.2, 7.9, 170],
  [9, 7.2, 160],
  [11.2, 2.2, 130],
  [10.9, 5.2, 120],
  [12.4, 0, 130],
  [12.4, 5, 130],
  [12.4, 10, 130],
  [12.4, 15, 130],
  [3, 11.5, 170],
  [8.5, 11.5, 160],
  [8.2, 0.4, 120],
];

export function toScreen(x, y, z) {
  const p = P(x, y, z);
  return { x: dpr * (vw / 2 + (p.x - cam.x) * zoom), y: dpr * (vh / 2 + (p.y - cam.y) * zoom) };
}

export function drawNight() {
  const d = darkness();
  if (d <= 0.01) return;
  if (dk.width !== cv.width || dk.height !== cv.height) {
    dk.width = cv.width;
    dk.height = cv.height;
  }
  const dc = dk.getContext('2d');
  dc.setTransform(1, 0, 0, 1, 0, 0);
  dc.globalCompositeOperation = 'source-over';
  dc.clearRect(0, 0, dk.width, dk.height);
  dc.fillStyle = `rgba(16,14,46,${d})`;
  dc.fillRect(0, 0, dk.width, dk.height);
  dc.globalCompositeOperation = 'destination-out';
  const ls = LIGHTS.concat([[G.player.x, G.player.y, 80]]);
  for (const L of ls) {
    const s = toScreen(L[0], L[1], 0),
      r = L[2] * zoom * dpr;
    dc.save();
    dc.translate(s.x, s.y);
    dc.scale(1, 0.6);
    const g = dc.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(0,0,0,.9)');
    g.addColorStop(0.6, 'rgba(0,0,0,.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    dc.fillStyle = g;
    dc.fillRect(-r, -r, 2 * r, 2 * r);
    dc.restore();
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(dk, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const L of LIGHTS) {
    const s = toScreen(L[0], L[1], 0),
      r = L[2] * 0.8 * zoom * dpr;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(1, 0.6);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255,170,80,${(0.16 * d) / 0.55})`);
    g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.restore();
  }
  ctx.restore();
}

export function drawLamp(y) {
  const d = darkness(),
    a = P(12.05, y, 0),
    b = P(12.05, y, 92);
  ctx.strokeStyle = '#4a4450';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(b.x + 10, b.y + 3);
  ctx.stroke();
  ell(b.x + 11, b.y + 5, 6, 3, d > 0.1 ? '#ffe39a' : '#8d8590');
  if (d > 0.1) {
    ctx.save();
    ctx.globalAlpha = d;
    ell(b.x + 11, b.y + 6, 14, 7, 'rgba(255,220,130,.45)');
    ctx.restore();
  }
}

export function initDaynight() {
  dk = document.createElement('canvas');
}
