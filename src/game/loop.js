// loop.js – aus der Einzeldatei extrahiert

import { update } from './update.js';
import { render } from './render.js';
import { hud } from './hud.js';

export let last;

export let lastDt = 0;

export function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  lastDt = dt;
  update(dt);
  const g = render();
  hud(g, dt);
  requestAnimationFrame(frame);
}

export function initLoop() {
  last = performance.now();
  requestAnimationFrame(frame);
}
