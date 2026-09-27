// tempo.js – aus der Einzeldatei extrahiert

import { G, relax } from './state.js';
import { $, showBanner } from './hud.js';
import { M, applyOutfit, saveMeta } from './meta.js';

export function tempoView() {
  const r = relax();
  $('relaxChip').textContent = r ? 'Tempo: Gemütlich' : 'Tempo: Normal';
  $('relaxChip').classList.toggle('on', r);
  $('tempoBtn').textContent = r ? 'Zurück zu Normal' : 'Gemütlich spielen';
  $('tempoDesc').textContent = r
    ? 'Gemütlich: weniger Gäste, niemand geht wütend, keine Rush Hour, Kritiker oder Kontrollen'
    : 'Normal: Rush Hour, Kritiker, Kontrollen und ungeduldige Gäste';
}

export function toggleTempo() {
  M.relax = !M.relax;
  saveMeta();
  tempoView();
  if (M.relax) {
    G.rush = 0;
    G.inspector = null;
    for (const c of G.customers)
      if (c.critic) {
        c.critic = false;
        c.shades = false;
        c.book = false;
      }
  }
  showBanner(
    M.relax ? 'Gemütlich-Modus' : 'Normales Tempo',
    M.relax
      ? 'Weniger Gäste, keine Hektik – nimm dir Zeit'
      : 'Volle Action: mehr Gäste, Events und Zeitdruck',
  );
}

export function initTempo() {
  $('relaxChip').onclick = toggleTempo;
  $('tempoBtn').onclick = toggleTempo;
  tempoView();
  applyOutfit();
}
