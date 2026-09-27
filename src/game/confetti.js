// confetti.js – aus der Einzeldatei extrahiert

import { ctx, rnd } from './config.js';
import { G } from './state.js';
import { vh, vw } from './render.js';
import { $ } from './hud.js';
import { saveMeta } from './meta.js';
import { clockStr, phaseNow } from './daynight.js';
import {
  $ach,
  __set_lifeDirty,
  achClaimable,
  checkAch,
  lifeDirty,
  lifeMax,
  renderAch,
} from './achievements.js';
import { v8Hud } from './events.js';
import { v9Hud } from './cutting.js';
import { v12Hud } from './festival.js';

export let confetti, reduceMotion;

export const CCOL = ['#f2b134', '#d8342b', '#4fae62', '#3f7fbf', '#fff6e8', '#8a5bb0'];

export function burst(n = 60) {
  if (reduceMotion) return;
  for (let i = 0; i < n; i++)
    confetti.push({
      x: vw / 2 + (Math.random() - 0.5) * 80,
      y: vh * 0.3,
      vx: (Math.random() - 0.5) * 520,
      vy: -Math.random() * 420 - 120,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 14,
      col: rnd(CCOL),
      life: 1.6 + Math.random() * 0.9,
      w: 5 + Math.random() * 5,
    });
}

export function drawConfetti(dt) {
  for (const c of confetti) {
    c.vy += 760 * dt;
    c.vx *= 0.985;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.vr * dt;
    c.life -= dt;
    ctx.save();
    ctx.globalAlpha = Math.min(1, c.life * 2);
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.col;
    ctx.fillRect(-c.w / 2, -c.w / 4, c.w, c.w / 2);
    ctx.restore();
  }
  for (let i = confetti.length - 1; i >= 0; i--) if (confetti[i].life <= 0) confetti.splice(i, 1);
}

export function v7Hud(dt) {
  $('clockChip').textContent =
    clockStr() + ' · ' + phaseNow().name.replace('Mittagspause', 'Mittag').replace('Nachmittag', 'Nachm.');
  v8Hud();
  v9Hud();
  v12Hud();
  const cl = achClaimable().length;
  $('achLbl').textContent = cl ? `Erfolge (${cl})` : 'Erfolge';
  $('achBtn').classList.toggle('hot', cl > 0);
  if (!$ach.hidden) {
    achT -= dt;
    if (achT <= 0) {
      achT = 1;
      renderAch();
    }
  }
}

export let achT = 0;

export function initConfetti() {
  confetti = [];
  reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setInterval(() => {
    checkAch();
    if (lifeDirty) {
      __set_lifeDirty(false);
      saveMeta();
    }
  }, 1500);
  lifeMax('cities', G.city + 1);
}
