// achievements.js – aus der Einzeldatei extrahiert

import { audioInit, chord } from './audio.js';
import { $, showBanner } from './hud.js';
import { M, addGems, closeSheets, openSheet, saveMeta } from './meta.js';
import { burst } from './confetti.js';
import { t, fmt } from './i18n.js';

export let $ach;

export let lifeDirty = false;

export function life(k, n) {
  M.life[k] = (M.life[k] || 0) + n;
  lifeDirty = true;
}

export function lifeMax(k, v) {
  if ((M.life[k] || 0) < v) {
    M.life[k] = v;
    lifeDirty = true;
  }
}

export const ACH = [
  { id: 'd100', name: 'Döner-Lehrling', desc: '100 Döner verkaufen', k: 'doner', goal: 100, g: 2 },
  { id: 'd1000', name: 'Döner-Meister', desc: '1.000 Döner verkaufen', k: 'doner', goal: 1000, g: 5 },
  { id: 'd10000', name: 'Döner-Legende', desc: '10.000 Döner verkaufen', k: 'doner', goal: 10000, g: 15 },
  { id: 'f250', name: 'Pommes-Profi', desc: '250 Pommes verkaufen', k: 'fries', goal: 250, g: 3 },
  { id: 'e10k', name: 'Erste Zehntausend', desc: '10.000 € verdienen', k: 'earned', goal: 10000, g: 3 },
  { id: 'e1m', name: 'Döner-Millionär', desc: '1.000.000 € verdienen', k: 'earned', goal: 1e6, g: 15 },
  { id: 'car50', name: 'Drive-In-Held', desc: '50 Autos bedienen', k: 'cars', goal: 50, g: 4 },
  { id: 'del50', name: 'Lieferkönig', desc: '50 Lieferungen rausschicken', k: 'deliv', goal: 50, g: 4 },
  { id: 'vip25', name: 'VIP-Service', desc: '25 VIP-Gäste bedienen', k: 'vip', goal: 25, g: 4 },
  { id: 'cl200', name: 'Blitzblank', desc: '200 Teller abräumen', k: 'clean', goal: 200, g: 3 },
  { id: 'cr10', name: 'Schatzsucher', desc: '10 Bonus-Kisten finden', k: 'crates', goal: 10, g: 3 },
  { id: 'night', name: 'Nachteule', desc: '100 Gäste nachts bedienen', k: 'night', goal: 100, g: 3 },
  { id: 'stars', name: 'Fünf Sterne', desc: 'Bewertung von 5,0 erreichen', k: 'stars5', goal: 1, g: 4 },
  {
    id: 'critic5',
    name: 'Liebling der Kritiker',
    desc: '5 Kritiker begeistern',
    k: 'critics',
    goal: 5,
    g: 5,
  },
  { id: 'hyg5', name: 'Hygiene-Siegel', desc: '5 Kontrollen bestehen', k: 'hygiene', goal: 5, g: 4 },
  { id: 'spec100', name: 'Lokalheld', desc: '100 Stadt-Spezialitäten verkaufen', k: 'spec', goal: 100, g: 4 },
  { id: 'cut25', name: 'Meisterschnitt', desc: '25 perfekte Schnitte', k: 'perfect', goal: 25, g: 4 },
  { id: 'city3', name: 'Expansion', desc: '3 Städte erreichen', k: 'cities', goal: 3, g: 6 },
];

export const achDone = a => (M.life[a.k] || 0) >= a.goal;

export const achClaimable = () => ACH.filter(a => achDone(a) && !M.achClaimed.includes(a.id));

export function checkAch() {
  for (const a of ACH) {
    if (achDone(a) && !M.achSeen.includes(a.id)) {
      M.achSeen.push(a.id);
      lifeDirty = true;
      showBanner(
        t('Erfolg: {n}', { n: t(a.name) }),
        t('Im Erfolge-Menü abholen: {g} Münzen', { g: a.g }),
      );
      burst(50);
    }
  }
}

export function fmtTime(sec) {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60);
  return h ? t('{h} Std {m} Min', { h, m }) : t('{m} Min', { m });
}

export function renderAch() {
  const L = M.life;
  $('lifeStats').textContent = t('Gespielt {t} · {d} Döner · {f} Pommes · {e} € Umsatz', {
    t: fmtTime(L.play || 0),
    d: fmt(L.doner || 0),
    f: fmt(L.fries || 0),
    e: fmt(Math.round(L.earned || 0)),
  });
  const list = $('achList');
  list.innerHTML = '';
  const sorted = ACH.slice().sort((a, b) => {
    const r = x => (M.achClaimed.includes(x.id) ? 2 : achDone(x) ? 0 : 1);
    return r(a) - r(b);
  });
  for (const a of sorted) {
    const cur = Math.min(a.goal, M.life[a.k] || 0),
      claimed = M.achClaimed.includes(a.id);
    const row = document.createElement('div');
    row.className = 'up' + (claimed ? ' claimed' : '');
    const n = document.createElement('div');
    n.className = 'n';
    n.textContent = t(a.name);
    const d = document.createElement('div');
    d.className = 'd';
    d.textContent =
      t(a.desc) +
      (a.goal > 1 ? ' · ' + t('{c}/{g}', { c: fmt(Math.floor(cur)), g: fmt(a.goal) }) : '');
    const bar = document.createElement('span');
    bar.className = 'abar';
    const fill = document.createElement('i');
    fill.style.width = (cur / a.goal) * 100 + '%';
    bar.append(fill);
    d.append(bar);
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'ach-' + a.id;
    if (claimed) {
      b.textContent = t('Erledigt');
      b.disabled = true;
    } else if (achDone(a)) {
      b.textContent = t('+{g} Münzen', { g: a.g });
      b.onclick = () => {
        M.achClaimed.push(a.id);
        saveMeta();
        addGems(a.g);
        chord();
        burst(80);
        renderAch();
      };
    } else {
      b.textContent = t('{g} Münzen', { g: a.g });
      b.disabled = true;
    }
    row.append(n, b, d);
    list.append(row);
  }
}

export function __set_lifeDirty(v) {
  lifeDirty = v;
}

export function initAchievements() {
  if (!M.life) M.life = {};
  if (!M.achClaimed) M.achClaimed = [];
  if (!M.achSeen) M.achSeen = [];
  $ach = $('achSheet');
  $('achBtn').onclick = () => {
    audioInit();
    if (!$ach.hidden) {
      closeSheets();
      return;
    }
    renderAch();
    openSheet($ach);
  };
}
