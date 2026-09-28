// festival.js – aus der Einzeldatei extrahiert

import { ctx, rnd } from './config.js';
import { P, ell } from './iso.js';
import { audioInit, chord } from './audio.js';
import { dpr, vh, vw } from './render.js';
import { $, showBanner } from './hud.js';
import { M, addGems, applyOutfit, closeSheets, giveBoost, openSheet, saveMeta } from './meta.js';
import { __set_lifeDirty, lifeDirty } from './achievements.js';
import { burst, reduceMotion } from './confetti.js';
import { t, fmt } from './i18n.js';

export let EVT_ID, $evt;

export const evtActive = () => {
  const m = new Date().getMonth();
  return m >= 8 && m <= 10;
};

export const EVT_TIERS = [
  { pts: 50, txt: '2 Goldmünzen', give: () => addGems(2) },
  { pts: 150, txt: '2× Umsatz für 3 Minuten', give: () => giveBoost('cash', 180) },
  { pts: 300, txt: '5 Goldmünzen', give: () => addGems(5) },
  {
    pts: 600,
    txt: 'Outfit „Kürbis-Chef“',
    give: () => {
      if (!M.owned.includes('kuerbis')) M.owned.push('kuerbis');
      M.outfit = 'kuerbis';
      saveMeta();
      applyOutfit();
    },
  },
  { pts: 1000, txt: '10 Goldmünzen', give: () => addGems(10) },
];

export function evtPoints(n) {
  if (!evtActive()) return;
  M.ev.pts += n;
  __set_lifeDirty(true);
}

export const evtClaimable = () =>
  EVT_TIERS.filter((t, i) => M.ev.pts >= t.pts && !M.ev.claimed.includes(i)).length;

export function renderEvent() {
  $('evtPts').textContent = fmt(M.ev.pts);
  const next = EVT_TIERS.find(tier => M.ev.pts < tier.pts);
  $('evtBar').style.width = (next ? Math.min(100, (M.ev.pts / next.pts) * 100) : 100) + '%';
  const list = $('evtList');
  list.innerHTML = '';
  EVT_TIERS.forEach((tier, i) => {
    const row = document.createElement('div');
    row.className = 'up' + (M.ev.claimed.includes(i) ? ' claimed' : '');
    const n = document.createElement('div');
    n.className = 'n';
    n.textContent = t('{pts} Kürbisse', { pts: fmt(tier.pts) });
    const d = document.createElement('div');
    d.className = 'd';
    d.textContent = t(tier.txt);
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'evt-' + i;
    if (M.ev.claimed.includes(i)) {
      b.textContent = t('Erhalten');
      b.disabled = true;
    } else if (M.ev.pts >= tier.pts) {
      b.textContent = t('Abholen');
      b.onclick = () => {
        M.ev.claimed.push(i);
        saveMeta();
        tier.give();
        chord();
        burst(80);
        showBanner(t('Herbstfest-Belohnung'), t(tier.txt));
        renderEvent();
      };
    } else {
      b.textContent = t('Noch {n}', { n: fmt(tier.pts - M.ev.pts) });
      b.disabled = true;
    }
    row.append(n, b, d);
    list.append(row);
  });
}

export const leaves = [];

export function drawLeaves(dt) {
  if (!evtActive() || reduceMotion) return;
  if (leaves.length < 14 && Math.random() < dt * 2)
    leaves.push({
      x: Math.random() * vw,
      y: -20,
      vx: 20 + Math.random() * 30,
      vy: 30 + Math.random() * 30,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 3,
      sw: Math.random() * 6,
      col: rnd(['#d8742b', '#c9531f', '#e6a22a', '#a8452a']),
    });
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const l of leaves) {
    l.sw += dt * 2;
    l.x += (l.vx + Math.sin(l.sw) * 25) * dt;
    l.y += l.vy * dt;
    l.r += l.vr * dt;
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.r);
    ctx.fillStyle = l.col;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  for (let i = leaves.length - 1; i >= 0; i--) if (leaves[i].y > vh + 20) leaves.splice(i, 1);
}

export function drawPumpkin(x, y) {
  const p = P(x, y);
  ell(p.x, p.y, 11, 5, 'rgba(20,10,20,.2)');
  ell(p.x - 5, p.y - 7, 6, 7, '#c9531f');
  ell(p.x + 5, p.y - 7, 6, 7, '#c9531f');
  ell(p.x, p.y - 7, 7, 8, '#e0742a');
  ctx.fillStyle = '#4f6b2a';
  ctx.fillRect(p.x - 1, p.y - 17, 2.5, 5);
}

export const PUMPKINS = [
  [0.5, 4.0],
  [11.5, 4.2],
  [11.5, 15.3],
  [2.6, 15.5],
  [8.9, 15.4],
];

export function v12Hud() {
  const eb = $('evtBtn');
  if (evtActive()) {
    eb.hidden = false;
    const c = evtClaimable();
    eb.textContent = c
      ? t('Herbstfest · {pts} · Belohnung!', { pts: fmt(M.ev.pts) })
      : t('Herbstfest · {pts}', { pts: fmt(M.ev.pts) });
    eb.classList.toggle('ready', c > 0);
  } else eb.hidden = true;
}

export function initFestival() {
  EVT_ID = 'herbst-' + new Date().getFullYear();
  if (!M.ev || M.ev.id !== EVT_ID) M.ev = { id: EVT_ID, pts: 0, claimed: [] };
  $evt = $('eventSheet');
  $('evtBtn').onclick = () => {
    audioInit();
    if (!$evt.hidden) {
      closeSheets();
      return;
    }
    renderEvent();
    openSheet($evt);
  };
}
