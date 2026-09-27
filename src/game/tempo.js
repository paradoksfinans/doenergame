// tempo.js – aus der Einzeldatei extrahiert

import { G, relax } from './state.js';
import { $, showBanner } from './hud.js';
import { M, applyOutfit, saveMeta } from './meta.js';
import { t } from './i18n.js';

export function tempoView() {
  const r = relax();
  $('relaxChip').textContent = r ? t('Tempo: Gemütlich') : t('Tempo: Normal');
  $('relaxChip').classList.toggle('on', r);
  $('tempoBtn').textContent = r ? t('Zurück zu Normal') : t('Gemütlich spielen');
  $('tempoDesc').textContent = r
    ? t('Gemütlich: weniger Gäste, niemand geht wütend, keine Rush Hour, Kritiker oder Kontrollen')
    : t('Normal: Rush Hour, Kritiker, Kontrollen und ungeduldige Gäste');
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
    M.relax ? t('Gemütlich-Modus') : t('Normales Tempo'),
    M.relax
      ? t('Weniger Gäste, keine Hektik – nimm dir Zeit')
      : t('Volle Action: mehr Gäste, Events und Zeitdruck'),
  );
}

export function initTempo() {
  $('relaxChip').onclick = toggleTempo;
  $('tempoBtn').onclick = toggleTempo;
  tempoView();
  applyOutfit();
}
