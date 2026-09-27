// branches.js – aus der Einzeldatei extrahiert

import { G } from './state.js';
import { audioInit, ching } from './audio.js';
import { $, bumpMoney, showBanner } from './hud.js';
import { burst } from './confetti.js';

export const branchPerSec = () => ((G.branches || []).reduce((a, b) => a + b.rate, 0) * 0.25) / 60;

export function collectBranches() {
  const a = Math.floor(G.branchCash || 0);
  if (a < 1) return;
  G.money += a;
  G.branchCash -= a;
  bumpMoney();
  ching();
  burst(30);
  showBanner(
    'Filial-Einnahmen',
    '+' + a.toLocaleString('de-DE') + ' € aus ' + G.branches.map(b => b.name).join(', '),
  );
}

export function initBranches() {
  $('branchBtn').onclick = () => {
    audioInit();
    collectBranches();
  };
}
