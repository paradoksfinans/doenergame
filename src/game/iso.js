// iso.js – aus der Einzeldatei extrahiert

import { TH, TW, ctx } from './config.js';

export const P = (x, y, z = 0) => ({ x: ((x - y) * TW) / 2, y: ((x + y) * TH) / 2 - z });

export function path(pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

export function poly(pts, fill, stroke, lw = 1) {
  path(pts);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function box(x, y, w, d, h, top, left, right, z = 0) {
  const a = P(x, y, z),
    b = P(x + w, y, z),
    c = P(x + w, y + d, z),
    e = P(x, y + d, z),
    u = p => ({ x: p.x, y: p.y - h });
  poly([e, c, u(c), u(e)], left);
  poly([b, c, u(c), u(b)], right);
  poly([u(a), u(b), u(c), u(e)], top);
}

export function ell(x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function rr(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

export function chip(
  x,
  y,
  text,
  bg = '#231a24',
  fg = '#fff6e8',
  font = '800 11px Figtree, system-ui, sans-serif',
) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 14;
  rr(x - w / 2, y - 9, w, 18, 7, bg);
  ctx.fillStyle = fg;
  ctx.fillText(text, x, y + 0.5);
}

export function initIso() {}
