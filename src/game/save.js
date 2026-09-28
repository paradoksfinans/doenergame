// save.js – aus der Einzeldatei extrahiert
import { migrateLevel } from './levels.js';

import { PADS } from './config.js';
import { G, __set_G, fresh } from './state.js';
import { unlock, unstick } from './world.js';
import { lastRate, showBanner } from './hud.js';
import { t, fmt } from './i18n.js';
import { offerOffline } from './offers.js';

export const KEY = 'doener-palast-v11',
  OLDKEY = 'doener-palast-v10';

/** Alles, was zu EINER Stadt gehört (wird beim Reisen zwischen Filialen gespeichert). */
export function citySnap() {
  return {
    city: G.city,
    money: G.money,
    piles: G.piles,
    unlocked: [...G.unlocked],
    paid: G.paid,
    stock: G.stock,
    trays: G.spits.map(s => s.stock),
    carry: G.player.items,
    fryer: G.fryer,
    special: G.special,
    px: G.player.x,
    py: G.player.y,
    stats: G.stats,
    cityLv: G.cityLv,
    rating: G.rating,
    tableTrash: G.tableTrash,
    cuts: G.spits.map(x => x.cut || 0),
  };
}

/** Voll ausgebaute Stadt für alte Spielstände ohne gespeicherten Stadtzustand. */
export function fullCity(i) {
  return { city: i, unlocked: PADS.filter(p => p.id !== 'city').map(p => p.id), cityLv: 10, rating: 4.6 };
}

/** Stadtzustand auf das frisch erzeugte G anwenden. */
export function applyCity(s) {
  G.money = s.money || 0;
  if (s.stats) Object.assign(G.stats, s.stats);
  if (s.rating) G.rating = s.rating;
  if (s.piles)
    Object.keys(G.piles).forEach(k => {
      if (s.piles[k]) G.piles[k] = s.piles[k];
    });
  G.paid = s.paid || {};
  if (s.stock) Object.assign(G.stock, s.stock);
  (s.unlocked || []).forEach(id => {
    if (PADS.some(p => p.id === id) && id !== 'city') unlock(id, true);
  });
  if (Array.isArray(s.tableTrash))
    s.tableTrash.forEach((n, i) => {
      if (i < G.tableTrash.length) G.tableTrash[i] = n;
    });
  (s.trays || []).forEach((n, i) => {
    if (G.spits[i]) G.spits[i].stock = n;
  });
  const it = Array.isArray(s.carry) ? s.carry : Array(Math.min(s.carry || 0, G.cap)).fill('d');
  G.player.items = it.slice(0, G.cap);
  G.player.carry = G.player.items.length;
  if (s.cityLv) G.cityLv = s.cityLv;
  else migrateLevel();
  if (s.fryer && G.fryer.on) G.fryer.stock = s.fryer.stock || 0;
  if (s.special && G.special.on) G.special.stock = s.special.stock || 0;
  if (typeof s.px === 'number') {
    G.player.x = s.px;
    G.player.y = s.py;
  }
  G.hasMoved = true;
  unstick();
}

export function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(
        Object.assign(citySnap(), {
          rate: lastRate,
          t: Date.now(),
          top: G.top ?? G.city,
          lv: G.lv,
          missionsDone: G.missionsDone,
          mission: G.mission,
          rushNext: G.rushNext,
          boost: G.boost,
          clock: G.clock,
          weather: G.weather,
          branches: G.branches || [],
          branchCash: G.branchCash || 0,
        }),
      ),
    );
  } catch (e) {}
}

export let hadSave = false;

export function load() {
  __set_G(fresh());
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem(KEY) || 'null') || JSON.parse(localStorage.getItem(OLDKEY) || 'null');
  } catch (e) {}
  if (!s) return;
  hadSave = true;
  __set_G(fresh(s.city || 0));
  G.top = typeof s.top === 'number' ? s.top : G.city;
  if (s.lv) Object.assign(G.lv, s.lv);
  G.missionsDone = s.missionsDone || 0;
  G.mission = s.mission || null;
  if (s.rushNext) G.rushNext = s.rushNext;
  if (s.boost) Object.assign(G.boost, s.boost);
  G.savedRate = s.rate || 0;
  if (typeof s.clock === 'number') {
    G.clock = s.clock;
    G.phaseId = null;
  }
  if (s.weather) G.weather = s.weather;
  // Filialen: ältere Spielstände kennen den Stadt-Index noch nicht (Filialen entstanden der Reihe nach)
  G.branches = (s.branches || []).map((b, k) => (typeof b.i === 'number' ? b : Object.assign({}, b, { i: k })));
  G.branchCash = s.branchCash || 0;
  if (G.branches.length && s.t) {
    const sec = Math.min(7200, (Date.now() - s.t) / 1000);
    G.branchCash += ((G.branches.reduce((a, b) => a + b.rate, 0) * 0.25) / 60) * sec;
  }
  applyCity(s);
  if (G.unlocked.has('cashier') && G.unlocked.has('runner') && s.t && s.rate > 0) {
    const min = Math.min(30, (Date.now() - s.t) / 60000),
      earned = Math.floor(min * s.rate * 0.3);
    if (earned >= 5) setTimeout(() => offerOffline(earned), 500);
  }
}

export function initSave() {
  load();
  setInterval(save, 2000);
  addEventListener('visibilitychange', () => {
    if (document.hidden) save();
  });
  addEventListener('pagehide', save);
}
