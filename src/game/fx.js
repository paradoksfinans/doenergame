// fx.js – aus der Einzeldatei extrahiert

import { P } from './iso.js';

export const flyers = [],
  texts = [];

export function fly(kind, from, to, z) {
  flyers.push({ kind, from, to, z, t: 0, dur: 0.3 });
}

export function floatText(x, y, z, text, col) {
  const p = P(x, y, z);
  texts.push({ x: p.x, y: p.y, text, col, life: 1.3 });
}

export function initFx() {}
