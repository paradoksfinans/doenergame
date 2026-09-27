// state.js – aus der Einzeldatei extrahiert

import { SPIT_X, TABLES, TRAY_MAX, specOf } from './config.js';
import { chord } from './audio.js';
import { bumpMoney, showBanner } from './hud.js';
import { M, addGems } from './meta.js';
import { life } from './achievements.js';
import { burst } from './confetti.js';
import { t, fmt } from './i18n.js';

export let G;

export function fresh(city = 0) {
  return {
    city,
    lv: { walk: 0, staff: 0, cap: 0, ads: 0 },
    missionsDone: 0,
    mission: null,
    stats: { sell: 0, earn: 0, cars: 0, deliv: 0, fries: 0, clean: 0, spec: 0 },
    rating: 4,
    tableTrash: TABLES.map(() => 0),
    crate: null,
    crateT: 35,
    tutFlags: {},
    cityLv: 1,
    rush: 0,
    rushNext: 70,
    boost: { cash: 0, speed: 0 },
    clock: 540,
    phaseId: 'morgen',
    weather: 'sonne',
    eventT: 90,
    inspector: null,
    money: 0,
    piles: { reg: { amount: 0, count: 0 }, drive: { amount: 0, count: 0 }, deliv: { amount: 0, count: 0 } },
    unlocked: new Set(),
    paid: {},
    stock: { counter: 3, drive: 0, deliv: 0, fries: 0, spec: 0 },
    fryer: { on: false, stock: 0, t: 0 },
    fryTime: 1.0,
    special: { on: false, stock: 0, t: 0 },
    specTime: 1.4,
    spits: SPIT_X.map((x, i) => ({ x, on: i === 0, stock: i === 0 ? TRAY_MAX : 0, t: 0 })),
    cap: 5,
    spitTime: 1.2,
    prodMul: 1,
    tablesLv: 0,
    player: {
      x: 6.9,
      y: 3.3,
      carry: 0,
      items: [],
      fx: 1,
      moving: false,
      phase: 0,
      shirt: '#f2b134',
      skin: '#e0ac80',
      hair: '#2b1d16',
      staff: true,
      cap: true,
    },
    workers: [],
    customers: [],
    queue: [],
    cars: [],
    seats: TABLES.flatMap((t, i) => [
      { x: t.x - 0.55, y: t.y, tx: t.x, lv: t.lv, ti: i, occ: null },
      { x: t.x + 0.55, y: t.y, tx: t.x, lv: t.lv, ti: i, occ: null },
    ]),
    moped: { y: 5.6, state: 'park', t: 1 },
    spawnT: 0.8,
    carT: 2,
    serveT: 0,
    driveT: 0,
    pickT: 0,
    dropT: 0,
    payFx: 0,
    time: 0,
    hasMoved: false,
    sales: [],
    total: 0,
  };
}

export const priceMul = () => 1 + 0.6 * G.city,
  padMul = () => 1 + 0.45 * G.city;

export const basePrice = () =>
  5 +
  (G.unlocked.has('sauce') ? 2 : 0) +
  (G.unlocked.has('ayran') ? 2 : 0) +
  (G.unlocked.has('golden') ? 3 : 0);

export const price = () => Math.round(basePrice() * priceMul());

export const specPrice = () => Math.round(6 * priceMul());

export const friesPrice = () => Math.round((3 + (G.unlocked.has('chili') ? 2 : 0)) * priceMul());

export const padPrice = p => Math.round(p.price * padMul());

export const upCost = u => Math.round(u.base * Math.pow(1.8, G.lv[u.id]) * padMul());

export const patMax = () => 45 * (G.unlocked.has('deco') ? 1.25 : 1) * (M.pet === 'cat' ? 1.1 : 1);

export const relax = () => !!(typeof M !== 'undefined' && M.relax);

export const staffMul = () => 1 + 0.12 * G.lv.staff;

export function newMission() {
  const n = G.missionsDone,
    opts = ['sell', 'earn'];
  if (G.unlocked.has('drivein')) opts.push('cars');
  if (G.unlocked.has('delivery')) opts.push('deliv');
  if (G.fryer.on) opts.push('fries');
  if (G.special.on) opts.push('spec');
  if (G.tablesLv > 0 && !G.unlocked.has('cleaner')) opts.push('clean');
  let type = opts[Math.floor(Math.random() * opts.length)];
  if (G.mission && type === G.mission.type && opts.length > 1)
    type = opts[(opts.indexOf(type) + 1) % opts.length];
  const goal = {
    sell: 8 + n * 3,
    earn: Math.round(((60 + n * 50) * priceMul()) / 10) * 10,
    cars: 3 + Math.floor(n / 2),
    deliv: 2 + Math.floor(n / 3),
    fries: 6 + n * 2,
    clean: 4 + n,
    spec: 5 + n * 2,
  }[type];
  return { type, goal, start: G.stats[type], reward: Math.round(((30 + n * 30) * padMul()) / 5) * 5 };
}

export const MTEXT = {
  sell: g => t('{g} Döner an der Theke verkaufen', { g: fmt(g) }),
  earn: g => t('{g} € verdienen', { g: fmt(g) }),
  cars: g => t('{g} Autos am Drive-In bedienen', { g: fmt(g) }),
  deliv: g => t('{g} Lieferungen rausschicken', { g: fmt(g) }),
  fries: g => t('{g} Pommes verkaufen', { g: fmt(g) }),
  clean: g => t('{g} Teller abräumen', { g: fmt(g) }),
  spec: g => t('{g}× {s} verkaufen', { g: fmt(g), s: t(specOf().name) }),
};

export function stat(type, n) {
  G.stats[type] += n;
  life({ sell: 'doner', earn: 'earned' }[type] || type, n);
  const m = G.mission;
  if (m && m.type === type && G.stats[type] - m.start >= m.goal) {
    G.money += m.reward;
    G.missionsDone++;
    bumpMoney();
    chord();
    addGems(1);
    burst(40);
    showBanner(t('Aufgabe erledigt!'), t('+{r} € und 1 Goldmünze', { r: fmt(m.reward) }));
    G.mission = newMission();
  }
}

export const stationOn = k =>
  k === 'counter' ||
  (k === 'drive' && G.unlocked.has('drivein')) ||
  (k === 'deliv' && G.unlocked.has('delivery'));

export const STATIONS = ['counter', 'drive', 'deliv'];

export function __set_G(v) {
  G = v;
}

export function initState() {}
