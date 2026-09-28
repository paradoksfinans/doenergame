// render.js – aus der Einzeldatei extrahiert
import { gfxOn, sprite, drawPersonSprite, drawCarSprite } from './gfx.js';
// Markisenfarben der Spezial-Stände in der Reihenfolge der Blender-Renderings stand0–stand4
const STAND_COLS = ['#d8342b', '#2f5f93', '#3f7fbf', '#8a2f5a', '#c0392f'];

import {
  BIN,
  D,
  FRY,
  PILES,
  PLANTS,
  REG,
  ROAD_CAR,
  ROAD_MOPED,
  SP,
  ST,
  TABLES,
  W,
  WALL,
  cityOf,
  ctx,
  cv,
  specOf,
} from './config.js';
import { G, friesPrice, price, relax, specPrice } from './state.js';
import { P, box, chip, ell, poly, rr } from './iso.js';
import { t as T, fmt } from './i18n.js';
import {
  diamond,
  drawBill,
  drawBubble,
  drawCar,
  drawCrate,
  drawFries,
  drawFryTray,
  drawFryer,
  drawItem,
  drawMoped,
  drawPadFloor,
  drawPadLabel,
  drawPerson,
  drawPlant,
  drawSpecStand,
  drawSpecial,
  drawSpit,
  drawStock,
  drawTrash,
  drawTray,
  floorLabel,
} from './sprites.js';
import { activePads } from './world.js';
import { flyers, texts } from './fx.js';
import { joy } from './input.js';
import { goal } from './goals.js';
import { M } from './meta.js';
import { drawLamp, drawNight } from './daynight.js';
import { drawConfetti } from './confetti.js';
import { drawRain } from './events.js';
import { drawPet, pet } from './pets.js';
import { decoFloor, decoNeon } from './decor.js';
import { PUMPKINS, drawLeaves, drawPumpkin, evtActive } from './festival.js';
import { lastDt } from './loop.js';
import { mechDrawables } from './citymech.js';

export let vw = 0,
  vh = 0,
  dpr = 1,
  zoom = 1;

export const cam = { x: 0, y: 0, init: false };

export function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  vw = innerWidth;
  vh = innerHeight;
  cv.width = Math.round(vw * dpr);
  cv.height = Math.round(vh * dpr);
  zoom = Math.max(0.8, Math.min(1.35, Math.min(vw * 1.05, vh * 0.9) / 430));
}

export function drawRoad() {
  poly([P(12.15, -4), P(14.6, -4), P(14.6, D + 6), P(12.15, D + 6)], '#3a3438');
  poly([P(12, -4), P(12.15, -4), P(12.15, D + 6), P(12, D + 6)], '#8d8590');
  ctx.strokeStyle = 'rgba(255,246,232,.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  let a = P(13.3, -4),
    b = P(13.3, D + 6);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (G.unlocked.has('drivein')) {
    a = P(12.3, 1.2);
    b = P(12.3, 2.8);
    ctx.strokeStyle = '#f2b134';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

export function drawWalls() {
  const CT = cityOf(G.city);
  poly([P(0, 0), P(0, D), P(0, D, WALL), P(0, 0, WALL)], '#e2dbd0');
  poly([P(0, 0), P(W, 0), P(W, 0, WALL), P(0, 0, WALL)], '#f3efe8');
  ctx.strokeStyle = 'rgba(60,40,50,.07)';
  ctx.lineWidth = 1;
  for (let z = 12; z < WALL; z += 12) {
    ctx.beginPath();
    let a = P(0, 0, z),
      b = P(W, 0, z);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    a = P(0, D, z);
    b = P(0, 0, z);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let i = 0; i <= W * 2; i++) {
    const a = P(i / 2, 0),
      b = P(i / 2, 0, WALL);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let i = 0; i <= D * 2; i++) {
    const a = P(0, i / 2),
      b = P(0, i / 2, WALL);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const NE = decoNeon(CT);
  poly([P(0, 0, 38), P(W, 0, 38), P(W, 0, 48), P(0, 0, 48)], NE.s1);
  poly([P(0, D, 38), P(0, 0, 38), P(0, 0, 48), P(0, D, 48)], NE.s2);
  poly(
    [P(0, D, WALL), P(0, 0, WALL), P(W, 0, WALL), P(W, 0, WALL + 6), P(0, 0, WALL + 6), P(0, D, WALL + 6)],
    '#3d2f3f',
  );
  ctx.save();
  let o = P(6.6, 0, WALL - 10);
  ctx.translate(o.x, o.y);
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  rr(0, 0, 124, 40, 5, '#231a24');
  ctx.strokeStyle = M.deco.neon !== 'city' ? NE.s1 : G.unlocked.has('golden') ? '#f2c75a' : '#f2b134';
  ctx.lineWidth = M.deco.neon !== 'city' ? 2.5 : 1.5;
  ctx.stroke();
  ctx.fillStyle = '#f2b134';
  ctx.font = '12px Bungee, Impact, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(T('DÖNER PALAST'), 10, 14);
  ctx.fillStyle = '#cdbfae';
  ctx.font = '800 9px Figtree, system-ui, sans-serif';
  ctx.fillText(T(CT.name).toUpperCase(), 10, 30);
  ctx.restore();
  ctx.save();
  o = P(0, 6.4, WALL - 8);
  ctx.translate(o.x, o.y);
  ctx.transform(1, -0.5, 0, 1, 0, 0);
  rr(0, 0, 132, 70, 5, '#231a24');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f2b134';
  ctx.font = '11px Bungee, Impact, sans-serif';
  ctx.fillText(T('MENÜ'), 9, 12);
  ctx.fillStyle = '#fff6e8';
  ctx.font = '700 9.5px Figtree, system-ui, sans-serif';
  ctx.fillText(T('Döner Kebap'), 9, 28, 72);
  ctx.textAlign = 'right';
  ctx.fillText(fmt(price(), 2) + ' €', 123, 28);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cdbfae';
  if (G.fryer.on) {
    ctx.fillStyle = '#fff6e8';
    ctx.fillText(G.unlocked.has('chili') ? T('Chili-Cheese-Pommes') : T('Pommes'), 9, 40, 72);
    ctx.textAlign = 'right';
    ctx.fillText(fmt(friesPrice(), 2) + ' €', 123, 40);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#cdbfae';
  const ex = [G.unlocked.has('sauce') && T('Soße'), G.unlocked.has('ayran') && T('Ayran')].filter(Boolean);
  if (G.special.on) {
    ctx.fillStyle = '#fff6e8';
    ctx.fillText(T(specOf().name), 9, 52, 72);
    ctx.textAlign = 'right';
    ctx.fillText(fmt(specPrice(), 2) + ' €', 123, 52);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cdbfae';
  } else ctx.fillText(ex.length ? '+ ' + ex.join(' · ') : T('mit alles, scharf?'), 9, 52);
  if (G.unlocked.has('combo')) {
    ctx.fillStyle = '#f2b134';
    ctx.fillText(T('Menü-Deal: +3 € Bonus'), 9, 63);
  }
  ctx.restore();
}

export function drawFloor() {
  const CT = cityOf(G.city),
    FL = decoFloor(CT);
  for (let x = 0; x < W; x++)
    for (let y = 0; y < D; y++) {
      const k = y < 4,
        alt = (x + y) % 2 === 0;
      poly(
        [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)],
        k ? (alt ? '#cfd5d6' : '#c2c9cb') : alt ? FL.a : FL.b,
      );
      if (!k && FL.speck) {
        for (let i = 0; i < 4; i++) {
          const q = P(x + 0.2 + ((i * 0.37 + x * 0.13) % 0.6), y + 0.2 + ((i * 0.29 + y * 0.17) % 0.6));
          ell(q.x, q.y, 1.6, 0.8, ['#d8342b', '#3f7fbf', '#4fae62', '#231a24'][(i + x + y) % 4]);
        }
      }
    }
  poly([P(5.5, D - 0.7), P(7.4, D - 0.7), P(7.4, D), P(5.5, D)], '#5a3b33');
  for (const s of G.spits)
    if (s.on)
      poly(
        [P(s.x + 0.1, 1.7), P(s.x + 0.9, 1.7), P(s.x + 0.9, 2.5), P(s.x + 0.1, 2.5)],
        'rgba(35,26,36,.08)',
      );
  floorLabel(ST.counter.zone.x, ST.counter.zone.y, T('THEKE'), '#6b5a6d');
  if (!G.unlocked.has('cashier')) floorLabel(REG.x, REG.y, T('KASSE'), '#6b5a6d');
  if (G.unlocked.has('drivein') && !G.unlocked.has('driveStaff'))
    floorLabel(ST.drive.zone.x, ST.drive.zone.y, T('FENSTER'), '#6b5a6d');
  if (G.unlocked.has('delivery')) floorLabel(ST.deliv.zone.x, ST.deliv.zone.y, T('REGAL'), '#6b5a6d');
}

export function drawPile(k) {
  const pile = G.piles[k],
    pos = PILES[k],
    n = Math.min(pile.count, 48),
    offs = [
      [-0.18, -0.18],
      [0.18, -0.18],
      [-0.18, 0.18],
      [0.18, 0.18],
    ];
  if (!n) {
    const q = P(pos.x, pos.y);
    ctx.strokeStyle = 'rgba(35,26,36,.25)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    diamond(q.x, q.y, 20, 10);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  offs.forEach((o, j) => {
    const cnt = Math.floor(n / 4) + (j < n % 4 ? 1 : 0),
      q = P(pos.x + o[0], pos.y + o[1]);
    for (let i = 0; i < cnt; i++) drawBill(q.x, q.y - i * 2.4);
  });
}

export function render() {
  const pl = G.player,
    tp = P(pl.x, pl.y, 20);
  if (!cam.init) {
    cam.x = tp.x;
    cam.y = tp.y;
    cam.init = true;
  }
  cam.x += (tp.x - cam.x) * 0.12;
  cam.y += (tp.y - cam.y) * 0.12;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#231a24';
  ctx.fillRect(0, 0, vw, vh);
  ctx.setTransform(
    dpr * zoom,
    0,
    0,
    dpr * zoom,
    dpr * (vw / 2 - cam.x * zoom),
    dpr * (vh / 2 - cam.y * zoom),
  );
  const t = G.time,
    pads = activePads();
  drawRoad();
  drawWalls();
  drawFloor();
  for (const pad of pads) drawPadFloor(pad, t);

  const S = [];
  G.spits.forEach(s => {
    if (s.on) {
      S.push({
        d: s.x + 1,
        f: () => (gfxOn() && sprite('spit' + (Math.floor(t * 5) % 4), s.x, 0)) || drawSpit(s, t),
      });
      S.push({ d: s.x + 0.5 + 1.27, f: () => drawTray(s) });
    }
  });
  if (G.special.on) {
    S.push({
      d: SP.x + SP.y + 1,
      f: () => drawSpecStand(t, sp => gfxOn() && sprite('stand' + Math.max(0, STAND_COLS.indexOf(sp.awn)), SP.x, SP.y)),
    });
    S.push({
      d: 2.8 + 4.25 + 0.02,
      f: () => {
        const p = P(2.8, 4.25, 34);
        for (let i = 0; i < G.stock.spec; i++) drawSpecial(p.x, p.y - i * 5);
      },
    });
  }
  if (G.fryer.on) {
    S.push({ d: FRY.x + 1, f: () => drawFryer(t, () => gfxOn() && sprite('fryer', FRY.x, 0)) });
    S.push({ d: FRY.x + 0.5 + 1.27, f: drawFryTray });
  }
  if (G.fryer.on)
    S.push({
      d: 5.9 + 4.25 + 0.02,
      f: () => {
        const p = P(5.55, 4.25, 34);
        for (let i = 0; i < G.stock.fries; i++) drawFries(p.x, p.y - i * 5);
      },
    });
  for (let i = 0; i < 5; i++) {
    const x = 2.4 + i;
    S.push({
      d: x + 0.5 + 4.25,
      f: () =>
        (gfxOn() && sprite('counter', x, 3.9)) || box(x, 3.9, 1, 0.7, 34, '#ece6dc', '#c0392f', '#962a22'),
    });
  }
  S.push({ d: 3.9 + 4.25 + 0.01, f: () => drawStock('counter') });
  S.push({
    d: 6.9 + 4.22 + 0.01,
    f: () => {
      box(6.65, 4.0, 0.5, 0.45, 14, '#3a3340', '#231a24', '#2e2733', 34);
      const q = P(6.9, 4.2, 48);
      rr(q.x - 7, q.y - 5, 14, 6, 2, '#4fae62');
    },
  });
  if (G.unlocked.has('sauce'))
    S.push({
      d: 4.9 + 4.25 + 0.01,
      f: () => {
        const q = P(4.9, 4.25, 34);
        rr(q.x - 9, q.y - 18, 6, 18, 2, '#f7f3ea');
        rr(q.x - 8, q.y - 21, 4, 4, 1, '#3f7fbf');
        rr(q.x + 2, q.y - 18, 6, 18, 2, '#d8342b');
        rr(q.x + 3, q.y - 21, 4, 4, 1, '#f2b134');
      },
    });
  if (G.unlocked.has('ayran'))
    S.push({
      d: 6.25 + 4.2 + 0.01,
      f: () => {
        const q = P(6.25, 4.2, 34);
        for (let i = 0; i < 3; i++) {
          rr(q.x - 10 + i * 7, q.y - 12, 6, 12, 1.5, '#f7f3ea');
          ctx.fillStyle = '#3f7fbf';
          ctx.fillRect(q.x - 10 + i * 7, q.y - 8, 6, 3);
        }
      },
    });
  for (const k in PILES) {
    if (k === 'drive' && !G.unlocked.has('drivein')) continue;
    if (k === 'deliv' && !G.unlocked.has('delivery')) continue;
    const p = PILES[k];
    S.push({ d: p.x + p.y, f: () => drawPile(k) });
  }
  if (G.unlocked.has('drivein')) {
    S.push({
      d: 11.65 + 2.0,
      f: () => {
        if (!(gfxOn() && sprite('drivewin', 11.3, 1.2))) box(11.3, 1.2, 0.7, 1.6, 34, '#ece6dc', '#c0392f', '#962a22');
      },
    });
    S.push({
      d: 11.65 + 2.0 + 0.01,
      f: () => {
        drawStock('drive');
        const q = P(11.65, 2.0, 108);
        chip(q.x, q.y, T('DRIVE-IN'), '#d8342b', '#fff6e8', '10px Bungee, Impact, sans-serif');
      },
    });
    for (const c of G.cars) S.push({ d: ROAD_CAR + c.y, f: () => drawCarSprite(c, ROAD_CAR) || drawCar(c) });
  }
  if (G.unlocked.has('delivery')) {
    S.push({
      d: 10.9 + 5.6,
      f: () => (gfxOn() && sprite('delivshelf', 10.4, 5.3)) || box(10.4, 5.3, 1, 0.6, 30, '#e8e1d6', '#3f7fbf', '#2f5f93'),
    });
    S.push({
      d: 10.9 + 5.6 + 0.01,
      f: () => {
        drawStock('deliv');
        const q = P(10.9, 5.6, 62);
        chip(q.x, q.y, T('LIEFERDIENST'), '#3f7fbf', '#fff6e8', '10px Bungee, Impact, sans-serif');
      },
    });
    S.push({ d: ROAD_MOPED + G.moped.y, f: () => drawMoped(G.moped) });
  }
  TABLES.forEach(tb => {
    if (tb.lv > G.tablesLv) return;
    S.push({
      d: tb.x + tb.y,
      f: () => {
        const p = P(tb.x, tb.y);
        if (!(gfxOn() && sprite('table', tb.x, tb.y))) {
          ell(p.x, p.y, 16, 8, 'rgba(20,10,20,.18)');
          ctx.fillStyle = '#5b3a28';
          ctx.fillRect(p.x - 2, p.y - 24, 4, 24);
          ell(p.x, p.y - 24, 19, 9.5, '#6e4430');
          ell(p.x, p.y - 26, 19, 9.5, '#9a6444');
        }
        const n = G.tableTrash[TABLES.indexOf(tb)];
        if (!n) rr(p.x - 3, p.y - 36, 6, 9, 1.5, '#f7f3ea');
        for (let i = 0; i < n; i++) drawTrash(p.x + (i % 2 ? 6 : -6), p.y - 28 - Math.floor(i / 2) * 4);
      },
    });
  });
  if (G.tablesLv > 0)
    S.push({
      d: BIN.x + BIN.y,
      f: () => {
        if (!(gfxOn() && sprite('bin', BIN.x, BIN.y))) {
          box(BIN.x - 0.25, BIN.y - 0.25, 0.5, 0.5, 26, '#5a6368', '#3b4247', '#4a5257');
          const q = P(BIN.x, BIN.y, 26);
          ell(q.x, q.y, 15, 7.5, '#2e3438');
        }
        const c = P(BIN.x, BIN.y, 52);
        chip(c.x, c.y, T('MÜLL'), '#3b4247', '#fff6e8', '9px Bungee, Impact, sans-serif');
      },
    });
  if (evtActive()) PUMPKINS.forEach(pp => S.push({ d: pp[0] + pp[1], f: () => drawPumpkin(pp[0], pp[1]) }));
  if (G.unlocked.has('deco'))
    PLANTS.forEach(pp =>
      S.push({ d: pp[0] + pp[1], f: () => (gfxOn() && sprite('plant', pp[0], pp[1])) || drawPlant(pp[0], pp[1]) }),
    );
  if (G.crate) S.push({ d: G.crate.x + G.crate.y, f: () => drawCrate(G.crate, t) });
  mechDrawables(S, t);
  G.seats.forEach(s => {
    if (s.lv > G.tablesLv) return;
    if (!s.occ || s.occ.state !== 'sit' || gfxOn())
      S.push({
        d: s.x + s.y - 0.01,
        f: () => {
          if (gfxOn() && sprite('stool', s.x, s.y)) return;
          const p = P(s.x, s.y);
          ell(p.x, p.y, 8, 4, 'rgba(20,10,20,.18)');
          ctx.fillStyle = '#6b3a30';
          ctx.fillRect(p.x - 1.5, p.y - 10, 3, 10);
          ell(p.x, p.y - 10, 8, 4, '#b3332b');
        },
      });
  });
  S.push({ d: pl.x + pl.y, f: () => drawPersonSprite(pl) || drawPerson(pl) });
  if (M.pet) S.push({ d: pet.x + pet.y, f: () => drawPet(t) });
  for (const w of G.workers) S.push({ d: w.x + w.y, f: () => drawPersonSprite(w) || drawPerson(w) });
  for (const c of G.customers) S.push({ d: c.x + c.y, f: () => drawPersonSprite(c) || drawPerson(c) });
  if (G.inspector) {
    const I = G.inspector;
    S.push({ d: I.x + I.y, f: () => drawPerson(I) });
  }
  for (const ly of [0, 5, 10]) S.push({ d: 12.05 + ly, f: () => drawLamp(ly) });
  S.sort((a, b) => a.d - b.d);
  for (const s of S) s.f();
  drawNight();
  if (G.inspector && G.inspector.state === 'check') {
    const q = P(G.inspector.x, G.inspector.y);
    chip(
      q.x,
      q.y - 60,
      T('Kontrolle {n} s', { n: Math.ceil(G.inspector.t) }),
      '#5a3bb0',
      '#fff6e8',
      '800 10px Figtree, system-ui, sans-serif',
    );
  }
  for (const c of G.customers)
    if (c.critic && c.state === 'queue') {
      const q = P(c.x, c.y);
      chip(
        q.x,
        q.y - (c === G.queue[0] && c.arr ? 86 : 60),
        T('KRITIKER'),
        '#5a3bb0',
        '#fff6e8',
        '9px Bungee, Impact, sans-serif',
      );
    }
  drawRain(lastDt);

  // overlay layer
  const front = G.queue[0];
  if (front && front.arr) {
    const p = P(front.x, front.y);
    drawBubble(
      p.x,
      p.y - (front.crown ? 70 : 62),
      front.wd - front.gd,
      front.wf - front.gf,
      front.critic ? 'critic' : front.vip,
      (front.ws || 0) - (front.gs || 0),
    );
  }
  for (const c of G.customers) {
    const p = P(c.x, c.y);
    if (c.state === 'queue' && !relax() && (c.critic || c.pat / c.patMax < 0.6)) {
      const fr = Math.max(0, c.pat / c.patMax),
        x = p.x + (c === front && c.arr ? 30 : 0),
        y = p.y - (c === front && c.arr ? 66 : 62);
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(35,26,36,.85)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, 6, -Math.PI / 2, -Math.PI / 2 + fr * Math.PI * 2);
      ctx.fillStyle = fr > 0.3 ? '#f2b134' : '#d8342b';
      ctx.fill();
    }
    if (c.angry) chip(p.x, p.y - 60, '!', '#d8342b', '#fff6e8', '12px Bungee, Impact, sans-serif');
  }
  TABLES.forEach((tb, i) => {
    if (tb.lv <= G.tablesLv && G.tableTrash[i] >= 2 && !G.unlocked.has('cleaner')) {
      const p = P(tb.x, tb.y, 58 + Math.sin(G.time * 5) * 3);
      chip(p.x, p.y, T('Abräumen'), '#d8342b', '#fff6e8', '800 10px Figtree, system-ui, sans-serif');
    }
  });
  const fc = G.cars.find(c => c.state === 'wait' && c.arr);
  if (fc) {
    const p = P(ROAD_CAR, fc.y, 50);
    drawBubble(p.x, p.y, fc.want - fc.got);
  }
  for (const w of G.workers) {
    const p = P(w.x, w.y);
    chip(p.x, p.y + 13, w.name, 'rgba(35,26,36,.8)', '#fff6e8', '800 10px Figtree, system-ui, sans-serif');
  }
  for (const pad of pads) drawPadLabel(pad);

  const g = goal();
  const showArrow = g.x != null && (!(G.unlocked.has('cashier') && G.unlocked.has('runner')) || g.pad);
  if (showArrow) {
    const q = P(g.x, g.y, (g.pad ? 92 : 78) + Math.sin(t * 6) * 6);
    ctx.beginPath();
    ctx.moveTo(q.x - 11, q.y - 14);
    ctx.lineTo(q.x + 11, q.y - 14);
    ctx.lineTo(q.x, q.y);
    ctx.closePath();
    ctx.fillStyle = '#f2b134';
    ctx.fill();
    ctx.strokeStyle = '#231a24';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  for (const f of flyers) {
    const e = P(f.to.x, f.to.y, f.z),
      k = f.t,
      x = f.from.x + (e.x - f.from.x) * k,
      y = f.from.y + (e.y - f.from.y) * k - Math.sin(Math.PI * k) * 28;
    if (f.kind === 'bill') drawBill(x, y);
    else drawItem(f.kind, x, y);
  }
  for (const tx of texts) {
    ctx.globalAlpha = Math.min(1, tx.life * 2);
    ctx.font = '15px Bungee, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#231a24';
    ctx.strokeText(tx.text, tx.x, tx.y);
    ctx.fillStyle = tx.col;
    ctx.fillText(tx.text, tx.x, tx.y);
    ctx.globalAlpha = 1;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (joy) {
    let vx = joy.cx - joy.sx,
      vy = joy.cy - joy.sy;
    const m = Math.hypot(vx, vy);
    if (m > 46) {
      vx = (vx / m) * 46;
      vy = (vy / m) * 46;
    }
    ctx.beginPath();
    ctx.arc(joy.sx, joy.sy, 48, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,246,232,.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,232,.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(joy.sx + vx, joy.sy + vy, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(242,177,52,.85)';
    ctx.fill();
  }
  drawLeaves(lastDt);
  drawConfetti(lastDt);
  return g;
}

export function initRender() {
  addEventListener('resize', resize);
  resize();
}
