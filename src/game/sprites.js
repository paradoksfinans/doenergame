// sprites.js – aus der Einzeldatei extrahiert

import {
  FRY,
  FRY_MAX,
  ROAD_CAR,
  ROAD_MOPED,
  SP,
  SPECS,
  SP_MAX,
  ST,
  TRAY_MAX,
  cityOf,
  ctx,
  shade,
  specOf,
} from './config.js';
import { G, padPrice } from './state.js';
import { P, box, chip, ell, poly, rr } from './iso.js';
import { t as T, fmt } from './i18n.js';

export function drawDoner(x, y) {
  rr(x - 8, y - 3, 16, 7, 3, '#f4ead6');
  rr(x - 7, y - 6, 14, 5, 2.5, '#c98a4a');
  ctx.fillStyle = '#d8342b';
  ctx.fillRect(x - 4, y - 6, 2, 2);
  ctx.fillStyle = '#5da049';
  ctx.fillRect(x + 1, y - 6, 3, 2);
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.fillRect(x - 8, y + 2, 16, 1.5);
}

export function drawFries(x, y) {
  ctx.fillStyle = '#f2c94c';
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 2.3 - 1, y - 11 + Math.abs(i) * 1.2, 2, 8);
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 5);
  ctx.lineTo(x + 7, y - 5);
  ctx.lineTo(x + 5, y + 3);
  ctx.lineTo(x - 5, y + 3);
  ctx.closePath();
  ctx.fillStyle = '#d8342b';
  ctx.fill();
  ctx.fillStyle = '#fff6e8';
  ctx.fillRect(x - 3, y - 2, 6, 2);
}

export function drawTrash(x, y) {
  ell(x, y, 8, 3.5, '#f7f3ea');
  ctx.strokeStyle = '#cdbfae';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ell(x - 2, y - 2, 3.5, 2.2, '#c9a77a');
  ell(x + 3, y - 1.5, 2.5, 1.6, '#d8342b');
}

export function drawSpecial(x, y) {
  const k = G.city % SPECS.length;
  if (k === 0) {
    rr(x - 8, y - 3, 16, 6, 2, '#f7f3ea');
    ctx.fillStyle = '#8a3a1e';
    for (let i = -1; i <= 1; i++) rr(x + i * 5 - 2, y - 6, 4.5, 4, 2, '#8a3a1e');
    ctx.fillStyle = '#d8342b';
    ctx.fillRect(x - 7, y - 4, 14, 1.6);
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(x - 5, y - 6.5, 1, 1);
    ctx.fillRect(x + 3, y - 7, 1, 1);
  } else if (k === 1) {
    ell(x, y - 2, 9, 4, '#d6a15a');
    ell(x, y - 4, 8, 2.5, '#c7ced2');
    ctx.fillStyle = '#9aa3a8';
    ctx.fillRect(x - 7, y - 5, 14, 1);
    ell(x - 3, y - 6, 2.2, 1.2, '#f7f3ea');
    ell(x + 3, y - 6, 2.2, 1.2, '#c24d78');
    ell(x, y - 7, 9, 3.2, '#e3b06a');
  } else if (k === 2) {
    ctx.strokeStyle = '#8a4a1e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x - 3.5, y - 3, 4, Math.PI * 0.2, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 3.5, y - 3, 4, Math.PI * -0.9, Math.PI * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 1);
    ctx.lineTo(x + 6, y - 6);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 4, y - 6, 1, 1);
    ctx.fillRect(x + 3, y - 3, 1, 1);
    ctx.fillRect(x, y - 1, 1, 1);
  } else if (k === 3) {
    for (let i = 0; i < 2; i++) ell(x, y - 2 - i * 3, 8, 3.4, i ? '#e0a24a' : '#b8772a');
    ell(x + 4, y - 6, 2.5, 1.4, '#f7f3ea');
  } else {
    ell(x, y - 2, 10, 4, '#e8c9a0');
    ell(x, y - 3, 8.5, 3.2, '#c0392f');
    ctx.fillStyle = '#4fae62';
    ctx.fillRect(x - 4, y - 4, 2, 1.2);
    ctx.fillRect(x + 2, y - 3, 2, 1.2);
    ell(x + 6, y - 5, 2.4, 1.6, '#f2e04c');
  }
}

export function drawSpecStand(t, body = null) {
  const sp = specOf(),
    x = SP.x,
    y = SP.y;
  const pre = body && body(sp);
  if (!pre) {
    box(x, y, 1, 1, 32, '#e8e1d6', sp.awn, shade(sp.awn, -30));
    const q = P(x + 0.5, y + 0.5, 32);
    ell(q.x, q.y, 16, 8, '#3a3438');
    ell(q.x, q.y - 1, 13, 6.5, 'rgba(255,140,60,' + (0.35 + 0.12 * Math.sin(t * 5)) + ')');
    box(x - 0.05, y - 0.05, 1.1, 0.25, 8, sp.awn, shade(sp.awn, -40), shade(sp.awn, -20), 70);
  }
  for (let i = 0; i < 5 && !pre; i++) {
    const a = P(x - 0.05 + i * 0.22, y + 0.2, 70),
      b = P(x + 0.17 + i * 0.22, y + 0.2, 70);
    ctx.fillStyle = i % 2 ? '#fff6e8' : sp.awn;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x, b.y + 7);
    ctx.lineTo(a.x, a.y + 7);
    ctx.fill();
  }
  const st = P(x + 0.5, y + 0.5, 34);
  for (let i = 0; i < G.special.stock; i++) drawSpecial(st.x, st.y - i * 5);
  const f = Math.min(1, G.special.t / G.specTime),
    r = P(x + 0.1, y + 0.9, 50);
  ctx.beginPath();
  ctx.arc(r.x, r.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(35,26,36,.75)';
  ctx.fill();
  if (G.special.stock < SP_MAX) {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.arc(r.x, r.y, 5, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
    ctx.fillStyle = '#f2b134';
    ctx.fill();
  }
  const c = P(x + 0.5, y + 0.5, 96);
  chip(c.x, c.y, T(sp.name).toUpperCase(), sp.awn, '#fff6e8', '9px Bungee, Impact, sans-serif');
}

export function drawItem(t, x, y) {
  if (t === 's') {
    drawSpecial(x, y);
    return;
  }
  if (t === 'f') drawFries(x, y);
  else if (t === 't') drawTrash(x, y);
  else drawDoner(x, y);
}

export function drawCrate(c, t) {
  if (c.life < 5 && Math.floor(t * 6) % 2) return;
  const bob = Math.sin(t * 4) * 3,
    p = P(c.x, c.y);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 18 + Math.sin(t * 6) * 2, 9, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(242,177,52,.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  box(c.x - 0.22, c.y - 0.22, 0.44, 0.44, 20, '#c98a4a', '#8a5a2e', '#a86e3a', 6 + bob);
  const a = P(c.x - 0.22, c.y, 26 + bob),
    b = P(c.x + 0.22, c.y, 26 + bob);
  ctx.strokeStyle = '#f2b134';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  const e = P(c.x, c.y + 0.22, 6 + bob),
    f = P(c.x, c.y + 0.22, 26 + bob);
  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(f.x, f.y);
  ctx.stroke();
  const q = P(c.x, c.y, 34 + bob);
  ell(q.x - 4, q.y, 4, 3, '#f2b134');
  ell(q.x + 4, q.y, 4, 3, '#f2b134');
}

export function drawPlant(x, y) {
  const p = P(x, y);
  ell(p.x, p.y, 10, 5, 'rgba(20,10,20,.2)');
  box(x - 0.15, y - 0.15, 0.3, 0.3, 14, '#b86b3e', '#8a4a24', '#a05a30');
  const q = P(x, y, 22);
  ell(q.x, q.y - 4, 11, 8, '#3f7a3a');
  ell(q.x - 5, q.y - 10, 7, 6, '#5da049');
  ell(q.x + 5, q.y - 12, 6, 6, '#4f9a58');
  ell(q.x, q.y - 17, 5, 5, '#6fb35a');
}

export function drawFryer(t, body = null) {
  const x = FRY.x;
  const pre = body && body();
  if (!pre) {
    box(x + 0.05, 0.05, 0.9, 0.12, 72, '#7b8489', '#50585d', '#626b70', 0);
    box(x, 0.15, 1, 0.85, 30, '#b9c1c5', '#6d767c', '#8d969b');
    const a = P(x + 0.15, 0.3, 30),
      b = P(x + 0.85, 0.3, 30),
      c = P(x + 0.85, 0.85, 30),
      e = P(x + 0.15, 0.85, 30);
    poly([a, b, c, e], '#d9a22a');
  }
  for (let i = 0; i < 4; i++) {
    const q = P(x + 0.3 + ((i * 0.19 + t * 0.13) % 0.5), 0.4 + ((i * 0.23) % 0.4), 30);
    ell(q.x, q.y, 2.2, 1.1, 'rgba(255,240,180,.8)');
  }
  const h = P(x + 0.5, 0.55, 44);
  ctx.strokeStyle = '#50585d';
  ctx.lineWidth = 2;
  if (!pre) {
    ctx.beginPath();
    ctx.moveTo(h.x - 8, h.y + 10);
    ctx.lineTo(h.x - 8, h.y);
    ctx.lineTo(h.x + 8, h.y);
    ctx.lineTo(h.x + 8, h.y + 10);
    ctx.stroke();
  }
  const s = P(x + 0.5, 0.1, 62);
  chip(s.x, s.y, T('POMMES'), '#231a24', '#f2c94c', '9px Bungee, Impact, sans-serif');
}

export function drawFryTray() {
  const fr = G.fryer;
  box(FRY.x + 0.05, 1.0, 0.9, 0.55, 22, '#d9dee0', '#8d969b', '#a8b0b4');
  const p = P(FRY.x + 0.5, 1.27, 22);
  for (let i = 0; i < fr.stock; i++) drawFries(p.x, p.y - i * 5);
  const f = Math.min(1, fr.T / G.fryTime),
    q = P(FRY.x + 0.95, 1.3, 42);
  ctx.beginPath();
  ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(35,26,36,.75)';
  ctx.fill();
  if (fr.stock < FRY_MAX) {
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.arc(q.x, q.y, 5, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
    ctx.fillStyle = '#f2c94c';
    ctx.fill();
  }
}

export function diamond(x, y, rx, ry) {
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.lineTo(x, y - ry);
  ctx.lineTo(x + rx, y);
  ctx.lineTo(x, y + ry);
  ctx.closePath();
}

export function drawBill(x, y) {
  diamond(x, y + 2, 10, 5);
  ctx.fillStyle = '#2c6b3b';
  ctx.fill();
  diamond(x, y, 10, 5);
  ctx.fillStyle = '#4fae62';
  ctx.fill();
  ctx.strokeStyle = '#2c6b3b';
  ctx.lineWidth = 1;
  ctx.stroke();
  ell(x, y, 3, 1.5, '#a7dfb0');
}

export function drawPerson(c) {
  const p = P(c.x, c.y, c.z || 0),
    b = c.moving ? Math.abs(Math.sin(c.phase)) * 2 : 0,
    lg = c.moving ? Math.sin(c.phase) * 3 : 0,
    sy = c.sitting ? 6 : 0;
  if (!c.z) ell(p.x, p.y, 11, 5.5, 'rgba(20,10,20,.22)');
  if (c.sitting && !c.z) ell(p.x, p.y - 9, 9, 4.5, '#b3332b');
  ctx.fillStyle = c.pants || '#3b3440';
  ctx.fillRect(p.x - 6, p.y - 12 - Math.max(0, lg), 5, 12 - sy);
  ctx.fillRect(p.x + 1, p.y - 12 - Math.max(0, -lg), 5, 12 - sy);
  rr(p.x - 9, p.y - 31 - b + sy, 18, 21, 6, c.shirt);
  if (c.staff) rr(p.x - 6, p.y - 25 - b + sy, 12, 14, 3, '#f7f3ea');
  ell(p.x, p.y - 39 - b + sy, 8, 8, c.skin);
  ctx.beginPath();
  ctx.arc(p.x, p.y - 40 - b + sy, 8.4, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fillStyle = c.hair;
  ctx.fill();
  if (c.long) {
    ctx.fillStyle = c.hair;
    ctx.fillRect(p.x - 8.4, p.y - 41 - b + sy, 3, 12);
    ctx.fillRect(p.x + 5.4, p.y - 41 - b + sy, 3, 12);
  }
  if (c.cap) {
    rr(p.x - 8.5, p.y - 50 - b + sy, 17, 6, 3, c.capCol || '#d8342b');
    rr(p.x + (c.fx > 0 ? 2 : -12), p.y - 46 - b + sy, 10, 3, 1.5, shade(c.capCol || '#d8342b', -40));
  }
  drawHats(c, p, b, sy);
  ctx.fillStyle = '#231a24';
  ctx.fillRect(p.x + c.fx * 2 - 3.5, p.y - 40 - b + sy, 2, 2.4);
  ctx.fillRect(p.x + c.fx * 2 + 1.5, p.y - 40 - b + sy, 2, 2.4);
  if (c.happy > 0) {
    ctx.strokeStyle = '#231a24';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.x + c.fx * 2, p.y - 36.5 - b + sy, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  if (c.carry > 0) {
    ell(p.x + c.fx * 9, p.y - 22 - b, 3, 3, c.skin);
    for (let i = 0; i < c.carry; i++) drawItem(c.items[i], p.x + c.fx * 5, p.y - 22 - b - i * 5);
    if (c.max && c.carry >= c.max)
      chip(
        p.x + c.fx * 5,
        p.y - 38 - b - c.carry * 5,
        T('MAX'),
        '#d8342b',
        '#fff6e8',
        '10px Bungee, Impact, sans-serif',
      );
  }
}

/** Hüte, Accessoires und Effekte – auch über den Blender-Figuren genutzt. */
export function drawHats(c, p, b, sy) {
  const hy = p.y - 46 - b + sy;
  if (c.partyHat) {
    // Partyhütchen (Berlin, Köln)
    ctx.beginPath();
    ctx.moveTo(p.x - 6, hy + 1);
    ctx.lineTo(p.x + 6, hy + 1);
    ctx.lineTo(p.x + 1, hy - 12);
    ctx.closePath();
    ctx.fillStyle = c.partyHat;
    ctx.fill();
    ctx.fillStyle = '#fff6e8';
    ctx.fillRect(p.x - 3.5, hy - 4, 8, 1.6);
    ell(p.x + 1, hy - 12, 2.2, 2.2, '#fff6e8');
  }
  if (c.tyrol) {
    // Trachtenhut mit Feder (München)
    ell(p.x, hy + 1, 10, 3.2, '#3f5a2e');
    rr(p.x - 6, hy - 6, 12, 7, 3, '#4f6b3a');
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(p.x - 6, hy - 1.5, 12, 2);
    ctx.strokeStyle = '#e8e1d6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x + 5, hy - 3);
    ctx.lineTo(p.x + 9, hy - 12);
    ctx.stroke();
  }
  if (c.sunhat) {
    // Sonnenhut (Istanbul-Touristen)
    ell(p.x, hy + 1, 12, 4, '#e8cf8a');
    rr(p.x - 6, hy - 5, 12, 6, 3, '#f2dc9a');
    ctx.fillStyle = '#d8342b';
    ctx.fillRect(p.x - 6, hy - 1.5, 12, 1.8);
  }
  if (c.crown) {
    ctx.beginPath();
    const cy = p.y - 47 - b + sy;
    ctx.moveTo(p.x - 7, cy + 4);
    ctx.lineTo(p.x - 7, cy - 3);
    ctx.lineTo(p.x - 3.5, cy + 1);
    ctx.lineTo(p.x, cy - 5);
    ctx.lineTo(p.x + 3.5, cy + 1);
    ctx.lineTo(p.x + 7, cy - 3);
    ctx.lineTo(p.x + 7, cy + 4);
    ctx.closePath();
    ctx.fillStyle = '#f2c75a';
    ctx.fill();
    ctx.strokeStyle = '#a87a1a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (c.pumpkin) {
    const hy = p.y - 49 - b + sy;
    ell(p.x - 5, hy, 5.5, 5, '#c9531f');
    ell(p.x + 5, hy, 5.5, 5, '#c9531f');
    ell(p.x, hy, 6.5, 6, '#e0742a');
    ctx.fillStyle = '#4f6b2a';
    ctx.fillRect(p.x - 1, hy - 9, 2.5, 4);
  }
  if (c.shades) {
    rr(p.x + c.fx * 2 - 6, p.y - 41.5 - b + sy, 12, 4, 1.5, '#111');
  }
  if (c.book) {
    rr(p.x + c.fx * 8 - 4, p.y - 26 - b + sy, 8, 10, 1, '#8a5a2e');
    ctx.fillStyle = '#fff6e8';
    ctx.fillRect(p.x + c.fx * 8 - 3, p.y - 25 - b + sy, 6, 8);
  }
  if (c.toque) {
    rr(p.x - 7, p.y - 56 - b + sy, 14, 10, 2, '#ffffff');
    ell(p.x - 4, p.y - 57 - b + sy, 6, 5, '#ffffff');
    ell(p.x + 4, p.y - 57 - b + sy, 6, 5, '#ffffff');
    ell(p.x, p.y - 60 - b + sy, 6, 5, '#ffffff');
    ctx.fillStyle = '#e2dbd0';
    ctx.fillRect(p.x - 7, p.y - 48 - b + sy, 14, 2);
  }
  if (c.bandana) {
    rr(p.x - 8.6, p.y - 47 - b + sy, 17.2, 5, 2, '#f2b134');
    ctx.fillStyle = '#f2b134';
    ctx.beginPath();
    ctx.moveTo(p.x - c.fx * 8, p.y - 45 - b + sy);
    ctx.lineTo(p.x - c.fx * 15, p.y - 41 - b + sy);
    ctx.lineTo(p.x - c.fx * 13, p.y - 47 - b + sy);
    ctx.closePath();
    ctx.fill();
  }
  if (c.sparkle) {
    for (let i = 0; i < 3; i++) {
      const an = G.time * 2 + i * 2.1,
        sx = p.x + Math.cos(an) * 16,
        sy2 = p.y - 40 - b + Math.sin(an) * 9;
      ctx.fillStyle = 'rgba(255,230,140,' + (0.5 + 0.5 * Math.sin(G.time * 6 + i)) + ')';
      ctx.beginPath();
      ctx.moveTo(sx, sy2 - 4);
      ctx.lineTo(sx + 1.2, sy2 - 1.2);
      ctx.lineTo(sx + 4, sy2);
      ctx.lineTo(sx + 1.2, sy2 + 1.2);
      ctx.lineTo(sx, sy2 + 4);
      ctx.lineTo(sx - 1.2, sy2 + 1.2);
      ctx.lineTo(sx - 4, sy2);
      ctx.lineTo(sx - 1.2, sy2 - 1.2);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (c.trail && c.moving) {
    ctx.strokeStyle = 'rgba(143,212,143,.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x - c.fx * (14 + i * 2), p.y - 30 + i * 8);
      ctx.lineTo(p.x - c.fx * (26 + i * 4), p.y - 30 + i * 8);
      ctx.stroke();
    }
  }
  if (c.helmet) {
    ctx.beginPath();
    ctx.arc(p.x, p.y - 41 - b + sy, 9.5, Math.PI, 0);
    ctx.fillStyle = c.helmet;
    ctx.fill();
  }
}

export function drawBubble(x, y, ld, lf = 0, vip = false, ls = 0) {
  const bg = vip === 'critic' ? '#d9c8ff' : vip ? '#f2c75a' : '#fff6e8';
  const parts = [];
  if (ld > 0) parts.push(['d', ld]);
  if (lf > 0) parts.push(['f', lf]);
  if (ls > 0) parts.push(['s', ls]);
  if (!parts.length) return;
  const w = 10 + parts.length * 32;
  rr(x - w / 2, y - 14, w, 20, 8, bg);
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 6);
  ctx.lineTo(x, y + 11);
  ctx.lineTo(x + 4, y + 6);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();
  parts.forEach((pt, i) => {
    const px = x - w / 2 + 7 + i * 32;
    ctx.save();
    ctx.translate(px + 6, y - 2);
    ctx.scale(0.7, 0.7);
    drawItem(pt[0], 0, pt[0] === 'f' ? 4 : 2);
    ctx.restore();
    ctx.fillStyle = '#231a24';
    ctx.font = '12px Bungee, Impact, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('×' + pt[1], px + 13, y - 3);
  });
}

export function drawSpit(s, t) {
  const x = s.x,
    gold = G.unlocked.has('golden'),
    big = G.unlocked.has('spitSpeed');
  box(
    x,
    0.05,
    1,
    0.9,
    14,
    gold ? '#f2c75a' : '#9aa3a8',
    gold ? '#a87a1a' : '#646d72',
    gold ? '#c9971f' : '#7b8489',
  );
  box(x + 0.05, 0.05, 0.9, 0.14, 72, '#7b8489', '#50585d', '#626b70', 14);
  const e = P(x + 0.05, 0.19, 14),
    c = P(x + 0.95, 0.19, 14),
    glow = 0.32 + 0.1 * Math.sin(t * 5 + x) + (big ? 0.12 : 0);
  poly([e, c, { x: c.x, y: c.y - 72 }, { x: e.x, y: e.y - 72 }], `rgba(255,110,40,${glow})`);
  ctx.strokeStyle = 'rgba(255,170,90,.7)';
  ctx.lineWidth = 1.5;
  for (let k = 1; k < 6; k++) {
    ctx.beginPath();
    ctx.moveTo(e.x + 4, e.y - k * 12);
    ctx.lineTo(c.x - 4, c.y - k * 12);
    ctx.stroke();
  }
  const m = P(x + 0.5, 0.55, 0),
    z0 = 20,
    z1 = 76,
    r0 = big ? 9 : 8,
    r1 = big ? 17 : 15,
    spd = big ? 24 : 14;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(m.x - r0, m.y - z0);
  ctx.lineTo(m.x - r1, m.y - z1);
  ctx.lineTo(m.x + r1, m.y - z1);
  ctx.lineTo(m.x + r0, m.y - z0);
  ctx.ellipse(m.x, m.y - z0, r0, r0 * 0.45, 0, 0, Math.PI);
  ctx.closePath();
  const g = ctx.createLinearGradient(m.x - r1, 0, m.x + r1, 0);
  g.addColorStop(0, '#6e3a1d');
  g.addColorStop(0.45, gold ? '#d99a4a' : '#c47a3e');
  g.addColorStop(1, '#7e4322');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(60,25,10,.35)';
  for (let k = 0; k < 6; k++) {
    const sx = m.x - r1 + ((k * 5.5 + t * spd) % (2 * r1));
    ctx.fillRect(sx, m.y - z1, 1.6, z1 - z0 + 8);
  }
  ctx.fillStyle = gold ? 'rgba(255,215,90,.35)' : 'rgba(255,210,150,.18)';
  for (let k = 0; k < 5; k++) ctx.fillRect(m.x - r1, m.y - z0 - 8 - k * 11, 2 * r1, 1.2);
  ctx.restore();
  ell(m.x, m.y - z1, r1, r1 * 0.45, gold ? '#e0a64a' : '#a8653a');
  ctx.strokeStyle = gold ? '#f2c75a' : '#c9d0d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(m.x, m.y - z1);
  ctx.lineTo(m.x, m.y - z1 - 10);
  ctx.stroke();
}

export function drawTray(s) {
  box(s.x + 0.05, 1.0, 0.9, 0.55, 22, '#d9dee0', '#8d969b', '#a8b0b4');
  const p = P(s.x + 0.5, 1.27, 22);
  for (let i = 0; i < s.stock; i++) drawDoner(p.x, p.y - i * 5);
  const f = Math.min(1, s.T / G.spitTime),
    q = P(s.x + 0.95, 1.3, 42);
  ctx.beginPath();
  ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(35,26,36,.75)';
  ctx.fill();
  if (s.stock < TRAY_MAX) {
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.arc(q.x, q.y, 5, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
    ctx.fillStyle = '#f2b134';
    ctx.fill();
  }
}

export function drawStock(k) {
  const s = ST[k],
    n = G.stock[k],
    per = s.max / 2;
  for (let c = 0; c < 2; c++) {
    const cnt = Math.max(0, Math.min(per, n - c * per)),
      p = P(s.cols[c][0], s.cols[c][1], s.z);
    for (let i = 0; i < cnt; i++) drawDoner(p.x, p.y - i * 5);
  }
}

export function stackTop(k, idx) {
  const s = ST[k],
    per = s.max / 2,
    c = idx < per ? 0 : 1;
  return { x: s.cols[c][0], y: s.cols[c][1], z: s.z + (idx % per) * 5 };
}

export function drawCar(c) {
  const x = ROAD_CAR - 0.42,
    y = c.y - 0.8,
    p = P(ROAD_CAR, c.y);
  ell(p.x, p.y + 4, 34, 17, 'rgba(10,5,10,.28)');
  box(x, y, 0.84, 1.6, 15, c.col, shade(c.col, -45), shade(c.col, -25), 6);
  box(x + 0.07, y + 0.35, 0.7, 0.8, 13, shade(c.col, 10), '#3b5068', '#48607a', 21);
  const r = P(x + 0.07, y + 1.15, 21),
    r2 = P(x + 0.77, y + 1.15, 21);
  ctx.fillStyle = '#d8342b';
  ctx.fillRect(r.x + 3, r.y - 2, 6, 3);
  ctx.fillRect(r2.x - 9, r2.y - 2, 6, 3);
  for (const wy of [0.3, 1.25]) {
    const w = P(x + 0.84, y + wy, 6);
    ell(w.x, w.y, 5, 6, '#1b1b1f');
    ell(w.x, w.y, 2.2, 2.6, '#8d969b');
  }
}

export function drawMoped(m) {
  const y = m.y;
  ell(P(ROAD_MOPED, y).x, P(ROAD_MOPED, y).y, 16, 8, 'rgba(10,5,10,.25)');
  box(ROAD_MOPED - 0.13, y - 0.35, 0.26, 0.7, 10, '#d8342b', '#a8261f', '#bf2e25', 5);
  box(ROAD_MOPED - 0.2, y + 0.1, 0.4, 0.35, 15, '#f2b134', '#b27a17', '#d8961f', 15);
  for (const wy of [-0.35, 0.35]) {
    const w = P(ROAD_MOPED + 0.13, y + wy, 5);
    ell(w.x, w.y, 4, 5, '#1b1b1f');
  }
  drawPerson({
    x: ROAD_MOPED,
    y: y - 0.1,
    z: 14,
    shirt: '#d8342b',
    skin: '#d9a47a',
    hair: '#2b1d16',
    helmet: '#f7f3ea',
    fx: 1,
    sitting: true,
  });
}

export function drawPadFloor(pad, t) {
  const pp = padPrice(pad),
    paid = G.paid[pad.id] || 0,
    frac = Math.min(1, paid / pp);
  const x0 = pad.x - 0.5,
    x1 = pad.x + 0.5,
    y0 = pad.y - 0.5,
    y1 = pad.y + 0.5,
    sq = [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
  poly(sq, 'rgba(35,26,36,.32)');
  if (frac > 0) poly([P(x0, y1 - frac), P(x1, y1 - frac), P(x1, y1), P(x0, y1)], 'rgba(242,177,52,.9)');
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -t * 18;
  poly(sq, null, G.money >= pp - paid - 0.01 ? '#f2b134' : '#fff6e8', 2.5);
  ctx.setLineDash([]);
}

export function padDesc(p) {
  if (p.id !== 'city') return T(p.desc);
  const G2 = { city: G.city + 1 };
  return T('Preise ×{m} · alte Filiale verdient weiter', { m: fmt(1 + 0.6 * G2.city, 1) });
}

export function drawPadLabel(pad) {
  const paid = G.paid[pad.id] || 0,
    c = P(pad.x, pad.y),
    rest = fmt(Math.ceil(padPrice(pad) - paid)) + ' €',
    desc = padDesc(pad),
    name =
      pad.id === 'city'
        ? T('Filiale {c}', { c: T(cityOf(G.city + 1).name) })
        : pad.id === 'special'
          ? T(specOf().stand)
          : T(pad.name);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '13px Bungee, Impact, sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#231a24';
  ctx.strokeText(rest, c.x, c.y + 1);
  ctx.fillStyle = '#fff6e8';
  ctx.fillText(rest, c.x, c.y + 1);
  ctx.font = '800 11px Figtree, system-ui, sans-serif';
  const w = Math.max(ctx.measureText(name).width, ctx.measureText(desc).width * 0.9) + 16;
  rr(c.x - w / 2, c.y - 50, w, 32, 8, 'rgba(35,26,36,.94)');
  ctx.fillStyle = '#fff6e8';
  ctx.fillText(name, c.x, c.y - 40);
  ctx.font = '700 10px Figtree, system-ui, sans-serif';
  ctx.fillStyle = '#f2b134';
  ctx.fillText(desc, c.x, c.y - 27);
}

export function floorLabel(x, y, text, col) {
  const sq = [P(x - 0.45, y - 0.4), P(x + 0.45, y - 0.4), P(x + 0.45, y + 0.4), P(x - 0.45, y + 0.4)];
  poly(sq, 'rgba(35,26,36,.10)');
  ctx.setLineDash([4, 4]);
  poly(sq, null, col, 2);
  ctx.setLineDash([]);
  const c = P(x, y);
  ctx.fillStyle = col;
  ctx.font = '9px Bungee, Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.x, c.y + 1);
}

export function initSprites() {}
