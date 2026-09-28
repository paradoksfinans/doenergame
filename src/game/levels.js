// levels.js – Stadt-Level 1–10: Ausbaufelder werden pro Level freigegeben,
// ein Level steigt, wenn alle Felder des Levels gekauft sind UND das Level-Ziel erreicht ist.
import { PADS, WING_DEF, cityOf, specOf, padHere } from './config.js';
import { G, priceMul, padPrice } from './state.js';
import { $, showBanner, bumpMoney } from './hud.js';
import { addGems, M } from './meta.js';
import { burst } from './confetti.js';
import { chord } from './audio.js';
import { ratePerMin } from './update.js';
import { save } from './save.js';
import { mechIntro, mechOf } from './citymech.js';
import { t, fmt } from './i18n.js';

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
  roomBarber: 3,
  roomGamer: 4,
  barberGlass: 5,
  roomShisha: 6,
  gamerSound: 6,
  shishaVent: 7,
  roomVip: 8,
  roomHall: 9,
  wingWaiter: 8,
  tubePost: 6,
  robot: 7,
  drone: 7,
  dolmus: 7,
  luxPark: 8,
};
let wingLv = null;
export const padLevel = id => {
  if (!wingLv) {
    wingLv = {};
    for (const w of WING_DEF) {
      if (w.deco) continue;
      wingLv['wing_' + w.id] = w.lv;
      if (w.fix) wingLv[w.fix.id] = w.fix.lv;
    }
  }
  return PAD_LEVEL[id] || wingLv[id] || 1;
};

// Ziel, um von Level n auf n+1 zu kommen (Zählung ab Ankunft in der Stadt)
const GOALS = {
  1: { stat: 'sell', n: 30, text: n => t('{n} Döner verkaufen', { n: fmt(n) }) },
  2: { stat: 'fries', n: 25, text: n => t('{n} Pommes verkaufen', { n: fmt(n) }) },
  3: { stat: 'clean', n: 20, text: n => t('{n} Teller abräumen', { n: fmt(n) }) },
  4: { stat: 'cars', n: 10, text: n => t('{n} Autos am Drive-In bedienen', { n: fmt(n) }) },
  5: { rating: 4.5, text: () => t('Bewertung von {r} Sternen erreichen', { r: fmt(4.5, 1) }) },
  6: {
    stat: 'spec',
    n: 40,
    text: n => t('{n}× {s} verkaufen', { n: fmt(n), s: t(specOf().name) }),
  },
  7: {
    stat: 'earn',
    n: 4000,
    scale: true,
    text: n => t('{n} € in dieser Stadt verdienen', { n: fmt(n) }),
  },
  8: { stat: 'deliv', n: 15, text: n => t('{n} Lieferungen rausschicken', { n: fmt(n) }) },
  9: { rate: 700, text: n => t('{n} €/Min Umsatz erreichen', { n: fmt(n) }) },
};

export function levelPads(lv) {
  return PADS.filter(p => padLevel(p.id) === lv && p.id !== 'city' && padHere(p));
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
      fmt: v => fmt(v, 1),
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
      fmt: v => fmt(Math.round(v)),
    };
  }
  const goal = g.scale ? Math.round((g.n * priceMul()) / 100) * 100 : g.n;
  const cur = Math.min(goal, Math.floor(G.stats[g.stat] || 0));
  return {
    text: g.text(goal),
    cur,
    goal,
    done: cur >= goal,
    fmt: v => fmt(Math.round(v)),
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
  if (G.cityLv >= MAX_LEVEL) next.push(t('Filiale {c}', { c: t(cityOf(G.city + 1).name) }));
  showBanner(
    t('{c} – Level {lv}!', { c: t(cityOf(G.city).name), lv: G.cityLv }),
    t('+{g} Goldmünzen · Neu: {list}', { g: gems, list: next.join(', ') }),
  );
  burst(110);
  chord();
  bumpMoney();
  save();
  if (G.cityLv === 2) setTimeout(mechIntro, 3200);
  if (!$level.hidden) renderLevel();
}

export function padName(p) {
  return p.id === 'special'
    ? t(specOf().stand)
    : p.id === 'city'
      ? t('Filiale {c}', { c: t(cityOf(G.city + 1).name) })
      : t(p.name);
}

export function levelHint() {
  const pr = levelProgress();
  if (pr.lv >= MAX_LEVEL || pr.bought < pr.pads.length || !pr.g || pr.g.done) return null;
  return t('Level-Ziel: <b>{text}</b> · {cur}/{goal}', {
    text: pr.g.text,
    cur: pr.g.fmt(pr.g.cur),
    goal: pr.g.fmt(pr.g.goal),
  });
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
  $('levelTitle').textContent = t('{c} · Level {lv} von {max}', { c: t(c.name), lv: pr.lv, max: MAX_LEVEL });
  const list = $('levelList');
  list.innerHTML = '';
  const intro = $('levelIntro');
  if (pr.lv >= MAX_LEVEL) {
    intro.textContent = t(
      'Höchstes Level erreicht. Der Goldene Spieß und die Filiale in {c} sind freigeschaltet – ob und wann du umziehst, entscheidest du. Dieser Laden verdient danach weiter.',
      { c: t(cityOf(G.city + 1).name) },
    );
  } else {
    intro.textContent = t(
      'Für Level {lv}: alle Ausbauten dieses Levels kaufen und das Level-Ziel erreichen.',
      {
        lv: pr.lv + 1,
      },
    );
  }
  for (const p of pr.pads) {
    const done = G.unlocked.has(p.id);
    list.append(row(padName(p), done ? t('gekauft') : t('{p} €', { p: fmt(padPrice(p)) }), done));
  }
  if (pr.g)
    list.append(
      row(
        t('Ziel: {text}', { text: pr.g.text }),
        t('{cur} / {goal}', { cur: pr.g.fmt(pr.g.cur), goal: pr.g.fmt(pr.g.goal) }),
        pr.g.done,
        pr.g.cur / pr.g.goal,
      ),
    );
  {
    const me = mechOf(),
      r = row((pr.lv >= 2 ? '★ ' : '🔒 ') + me.name(), pr.lv >= 2 ? t('aktiv') : t('ab Level 2'), false);
    const d = document.createElement('div');
    d.className = 'd';
    d.textContent = me.desc();
    r.append(d);
    list.prepend(r);
  }
  const nx = $('levelNext');
  if (pr.lv < MAX_LEVEL) {
    const next = levelPads(pr.lv + 1).map(padName);
    if (pr.lv + 1 >= MAX_LEVEL) next.push(t('Filiale {c}', { c: t(cityOf(G.city + 1).name) }));
    nx.textContent = t('Level {lv} bringt: {list} und {g} Goldmünzen.', {
      lv: pr.lv + 1,
      list: next.join(', '),
      g: 1 + Math.floor((pr.lv + 1) / 3),
    });
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
