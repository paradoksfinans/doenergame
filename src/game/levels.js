// levels.js – Stadt-Level 1–10: Ausbaufelder werden pro Level freigegeben,
// ein Level steigt, wenn alle Felder des Levels gekauft sind UND das Level-Ziel erreicht ist.
import { PADS, cityOf, specOf } from './config.js';
import { G, priceMul, padPrice } from './state.js';
import { $, showBanner, bumpMoney } from './hud.js';
import { addGems, M } from './meta.js';
import { burst } from './confetti.js';
import { chord } from './audio.js';
import { ratePerMin } from './update.js';
import { save } from './save.js';

export const MAX_LEVEL = 10;

// Welche Ausbaustufe ab welchem Stadt-Level erscheint
export const PAD_LEVEL = {
  spit2: 1,
  tray: 1,
  tables1: 1,
  cashier: 1,
  sauce: 2,
  fryer: 2,
  runner: 2,
  tables2: 3,
  spit3: 3,
  cleaner: 3,
  drivein: 4,
  special: 4,
  ayran: 5,
  deco: 5,
  driveStaff: 5,
  driveRunner: 5,
  chili: 6,
  tray2: 6,
  tables3: 7,
  runner2: 7,
  combo: 7,
  delivery: 8,
  delivRunner: 8,
  spitSpeed: 9,
  golden: 10,
  city: 10,
};
export const padLevel = id => PAD_LEVEL[id] || 1;

// Ziel, um von Level n auf n+1 zu kommen (Zählung ab Ankunft in der Stadt)
const GOALS = {
  1: { stat: 'sell', n: 30, text: n => `${n} Döner verkaufen` },
  2: { stat: 'fries', n: 25, text: n => `${n} Pommes verkaufen` },
  3: { stat: 'clean', n: 20, text: n => `${n} Teller abräumen` },
  4: { stat: 'cars', n: 10, text: n => `${n} Autos am Drive-In bedienen` },
  5: { rating: 4.5, text: () => 'Bewertung von 4,5 Sternen erreichen' },
  6: { stat: 'spec', n: 40, text: n => `${n}× ${specOf().name} verkaufen` },
  7: {
    stat: 'earn',
    n: 4000,
    scale: true,
    text: n => `${n.toLocaleString('de-DE')} € in dieser Stadt verdienen`,
  },
  8: { stat: 'deliv', n: 15, text: n => `${n} Lieferungen rausschicken` },
  9: { rate: 700, text: n => `${n.toLocaleString('de-DE')} €/Min Umsatz erreichen` },
};

export function levelPads(lv) {
  return PADS.filter(p => padLevel(p.id) === lv && p.id !== 'city');
}
export function goalOf(lv) {
  const g = GOALS[lv];
  if (!g) return null;
  if (g.rating) {
    const cur = Math.min(g.rating, G.rating);
    return {
      text: g.text(),
      cur,
      goal: g.rating,
      done: G.rating >= g.rating,
      fmt: v => v.toFixed(1).replace('.', ','),
    };
  }
  if (g.rate) {
    const goal = Math.round((g.rate * priceMul()) / 10) * 10,
      cur = Math.min(goal, ratePerMin());
    return {
      text: g.text(goal),
      cur,
      goal,
      done: cur >= goal,
      fmt: v => Math.round(v).toLocaleString('de-DE'),
    };
  }
  const goal = g.scale ? Math.round((g.n * priceMul()) / 100) * 100 : g.n;
  const cur = Math.min(goal, Math.floor(G.stats[g.stat] || 0));
  return {
    text: g.text(goal),
    cur,
    goal,
    done: cur >= goal,
    fmt: v => Math.round(v).toLocaleString('de-DE'),
  };
}
export function levelProgress() {
  const lv = G.cityLv,
    pads = levelPads(lv),
    bought = pads.filter(p => G.unlocked.has(p.id)).length;
  const g = goalOf(lv);
  const padFrac = pads.length ? bought / pads.length : 1;
  if (!g) return { lv, pads, bought, g: null, frac: padFrac };
  return { lv, pads, bought, g, frac: padFrac * 0.5 + (g.cur / g.goal) * 0.5 };
}

// Level beim Laden eines alten Spielstands aus den gekauften Feldern ableiten
export function migrateLevel() {
  let lv = 1;
  while (lv < MAX_LEVEL && levelPads(lv).every(p => G.unlocked.has(p.id))) lv++;
  G.cityLv = lv;
}

let tickT = 0;
export function levelsTick(dt) {
  tickT -= dt;
  if (tickT > 0) return;
  tickT = 0.5;
  const pr = levelProgress();
  if (pr.lv >= MAX_LEVEL || pr.bought < pr.pads.length || !pr.g || !pr.g.done) return;
  G.cityLv++;
  const gems = 1 + Math.floor(G.cityLv / 3);
  addGems(gems);
  const next = levelPads(G.cityLv).map(p => padName(p));
  if (G.cityLv >= MAX_LEVEL) next.push('Filiale ' + cityOf(G.city + 1).name);
  showBanner(`${cityOf(G.city).name} – Level ${G.cityLv}!`, `+${gems} Goldmünzen · Neu: ${next.join(', ')}`);
  burst(110);
  chord();
  bumpMoney();
  save();
  if (!$level.hidden) renderLevel();
}

export function padName(p) {
  return p.id === 'special'
    ? specOf().stand
    : p.id === 'city'
      ? 'Filiale ' + cityOf(G.city + 1).name
      : p.name;
}

export function levelHint() {
  const pr = levelProgress();
  if (pr.lv >= MAX_LEVEL || pr.bought < pr.pads.length || !pr.g || pr.g.done) return null;
  return `Level-Ziel: <b>${pr.g.text}</b> · ${pr.g.fmt(pr.g.cur)}/${pr.g.fmt(pr.g.goal)}`;
}

// ---- Level-Fenster
export let $level;
function row(label, right, done, frac) {
  const r = document.createElement('div');
  r.className = 'up' + (done ? ' claimed' : '');
  const n = document.createElement('div');
  n.className = 'n';
  n.textContent = (done ? '✓ ' : '') + label;
  const b = document.createElement('span');
  b.className = 'lvtag';
  b.textContent = right;
  r.append(n, b);
  if (frac != null) {
    const d = document.createElement('div');
    d.className = 'd';
    const bar = document.createElement('span');
    bar.className = 'abar';
    const i = document.createElement('i');
    i.style.width = Math.min(100, frac * 100) + '%';
    bar.append(i);
    d.append(bar);
    r.append(d);
  }
  return r;
}
export function renderLevel() {
  const pr = levelProgress(),
    c = cityOf(G.city);
  $('levelTitle').textContent = `${c.name} · Level ${pr.lv} von ${MAX_LEVEL}`;
  const list = $('levelList');
  list.innerHTML = '';
  const intro = $('levelIntro');
  if (pr.lv >= MAX_LEVEL) {
    intro.textContent = `Höchstes Level erreicht. Der Goldene Spieß und die Filiale in ${cityOf(G.city + 1).name} sind freigeschaltet – ob und wann du umziehst, entscheidest du. Dieser Laden verdient danach weiter.`;
  } else {
    intro.textContent = `Für Level ${pr.lv + 1}: alle Ausbauten dieses Levels kaufen und das Level-Ziel erreichen.`;
  }
  for (const p of pr.pads) {
    const done = G.unlocked.has(p.id);
    list.append(row(padName(p), done ? 'gekauft' : padPrice(p).toLocaleString('de-DE') + ' €', done));
  }
  if (pr.g)
    list.append(
      row(
        'Ziel: ' + pr.g.text,
        `${pr.g.fmt(pr.g.cur)} / ${pr.g.fmt(pr.g.goal)}`,
        pr.g.done,
        pr.g.cur / pr.g.goal,
      ),
    );
  const nx = $('levelNext');
  if (pr.lv < MAX_LEVEL) {
    const next = levelPads(pr.lv + 1).map(padName);
    if (pr.lv + 1 >= MAX_LEVEL) next.push('Filiale ' + cityOf(G.city + 1).name);
    nx.textContent = `Level ${pr.lv + 1} bringt: ${next.join(', ')} und ${1 + Math.floor((pr.lv + 1) / 3)} Goldmünzen.`;
  } else nx.textContent = '';
}
export function initLevels() {
  $level = $('levelSheet');
  const open = () => {
    if (!$level.hidden) {
      document.querySelectorAll('.sheet').forEach(s => (s.hidden = true));
      $('hint').hidden = false;
      return;
    }
    renderLevel();
    document.querySelectorAll('.sheet').forEach(s => (s.hidden = s !== $level));
    $('hint').hidden = true;
  };
  const box = $('progBox');
  box.onclick = open;
  box.onkeydown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };
}
