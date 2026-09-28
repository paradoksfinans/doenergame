// world.js – aus der Einzeldatei extrahiert
import { MAX_LEVEL, padLevel } from './levels.js';

import {
  BIN,
  D,
  FRIES_MAX,
  FRY,
  HAIRS,
  MSG,
  PADS,
  REG,
  SKINS,
  SP,
  SPEC_MAX,
  ST,
  TABLES,
  W,
  cityOf,
  rnd,
  specOf,
} from './config.js';
import { G, STATIONS, __set_G, fresh, newMission, priceMul, specPrice, stat, stationOn } from './state.js';
import { P } from './iso.js';
import { stackTop } from './sprites.js';
import { floatText, fly, flyers, texts } from './fx.js';
import { chord, sfx } from './audio.js';
import { ratePerMin } from './update.js';
import { cam } from './render.js';
import { __set_bestRate, bestRate, lastRate, showBanner } from './hud.js';
import { applyCity, citySnap, fullCity, save } from './save.js';
import { t, fmt } from './i18n.js';
import { M, addGems, applyOutfit } from './meta.js';
import { lifeMax } from './achievements.js';
import { burst } from './confetti.js';
import { evtPoints } from './festival.js';
import { walkable, roomObstacles } from './rooms.js';

export function obstacles() {
  const o = [];
  G.spits.forEach(s => {
    if (s.on) o.push({ x: s.x, y: 0, w: 1, d: 1.6 });
  });
  if (G.fryer.on) o.push({ x: FRY.x, y: 0, w: 1, d: 1.6 });
  if (G.special.on) o.push({ x: SP.x, y: SP.y, w: 1, d: 1 });
  o.push({ x: 2.4, y: 3.9, w: 5, d: 0.7 });
  o.push({ x: 1.45, y: 3.95, w: 0.75, d: 0.6 }); // Spüle
  if (G.unlocked.has('drivein')) o.push({ x: 11.3, y: 1.2, w: 0.7, d: 1.6 });
  if (G.unlocked.has('delivery')) o.push({ x: 10.4, y: 5.3, w: 1, d: 0.6 });
  TABLES.forEach(t => {
    if (t.lv <= G.tablesLv) o.push({ x: t.x - 0.3, y: t.y - 0.3, w: 0.6, d: 0.6 });
  });
  o.push(...roomObstacles());
  return o;
}

export function blocked(x, y, obs) {
  const r = 0.28;
  if (!walkable(x, y)) return true;
  for (const o of obs) if (x > o.x - r && x < o.x + o.w + r && y > o.y - r && y < o.y + o.d + r) return true;
  return false;
}

export function unstick() {
  const pl = G.player,
    obs = obstacles();
  if (!blocked(pl.x, pl.y, obs)) return;
  for (let r = 0.2; r < 4; r += 0.2)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = pl.x + Math.cos(a) * r,
        y = pl.y + Math.sin(a) * r;
      if (!blocked(x, y, obs)) {
        pl.x = x;
        pl.y = y;
        return;
      }
    }
}

export function moveToward(c, tx, ty, sp, dt) {
  const dx = tx - c.x,
    dy = ty - c.y,
    m = Math.hypot(dx, dy);
  if (m < 0.04) {
    c.moving = false;
    return true;
  }
  const s = Math.min(m, sp * dt);
  c.x += (dx / m) * s;
  c.y += (dy / m) * s;
  c.moving = true;
  c.phase += dt * 13;
  const sx = dx - dy;
  if (Math.abs(sx) > 0.01) c.fx = sx > 0 ? 1 : -1;
  return false;
}

export function mkWorker(role, x, y, shirt, name, extra = {}) {
  return Object.assign(
    {
      role,
      x,
      y,
      shirt,
      name,
      skin: rnd(SKINS),
      hair: rnd(HAIRS),
      staff: true,
      carry: 0,
      items: [],
      max: 5,
      fx: -1,
      moving: false,
      phase: 0,
      state: 'toSpit',
      spit: null,
      t: 0,
      target: 'counter',
    },
    extra,
  );
}

export function activePads() {
  const out = [];
  for (const p of PADS) {
    if (G.unlocked.has(p.id)) continue;
    if (p.id === 'city' && (!G.unlocked.has('golden') || G.cityLv < MAX_LEVEL || G.city < (G.top ?? G.city)))
      continue;
    if (padLevel(p.id) > G.cityLv) continue;
    if (out.some(o => o.x === p.x && o.y === p.y)) continue;
    out.push(p);
    if (out.length === 3) break;
  }
  return out;
}

export function bestSpit(from) {
  let best = null;
  for (const s of G.spits) {
    if (!s.on) continue;
    if (
      !best ||
      s.stock > best.stock ||
      (s.stock === best.stock && Math.abs(s.x + 0.5 - from.x) < Math.abs(best.x + 0.5 - from.x))
    )
      best = s;
  }
  return best;
}

export function give(c, t) {
  c.items.push(t);
  c.carry = c.items.length;
}

export function accepts(k, t) {
  if (!stationOn(k)) return false;
  if (t === 'g') return false; // Gold-Döner nur für die VIP-Lounge
  if (t === 's') return k === 'counter' && G.special.on && G.stock.spec < SPEC_MAX;
  if (t === 'f') return k === 'counter' && G.fryer.on && G.stock.fries < FRIES_MAX;
  return G.stock[k] < ST[k].max;
}

export function friesTop(n) {
  return { x: 5.55, y: 4.25, z: 34 + n * 5 };
}

export function specTop(n) {
  return { x: 2.8, y: 4.25, z: 34 + n * 5 };
}

export function dropInto(c, k) {
  for (let i = c.items.length - 1; i >= 0; i--) {
    const t = c.items[i];
    if (!accepts(k, t)) continue;
    c.items.splice(i, 1);
    c.carry = c.items.length;
    let tp;
    if (c === G.player) G.tutFlags.drop = true;
    if (t === 's') {
      tp = specTop(G.stock.spec);
      G.stock.spec++;
    } else if (t === 'f') {
      tp = friesTop(G.stock.fries);
      G.stock.fries++;
    } else {
      tp = stackTop(k, G.stock[k]);
      G.stock[k]++;
    }
    fly(t, P(c.x, c.y, 26 + c.carry * 5), { x: tp.x, y: tp.y }, tp.z);
    return t;
  }
  return null;
}

export function pickSource(w) {
  if (w.home && w.home !== 'counter') return { kind: 'd', spit: bestSpit(w) };
  const fr = G.fryer,
    others = G.workers.some(o => o !== w && o.src && o.src.kind === 'f');
  if (fr.on && fr.stock > 0 && !others && G.stock.fries < FRIES_MAX * 0.5) return { kind: 'f' };
  const sp = G.special,
    so = G.workers.some(o => o !== w && o.src && o.src.kind === 's');
  if (sp.on && sp.stock > 0 && !so && G.stock.spec < SPEC_MAX * 0.5) return { kind: 's' };
  if (G.stock.counter >= ST.counter.max - 2) return { kind: 'wait' };
  return { kind: 'd', spit: bestSpit(w) };
}

export function needStation() {
  let best = 'counter',
    br = 9;
  for (const k of STATIONS) {
    if (!stationOn(k)) continue;
    let r = G.stock[k] / ST[k].max;
    if (k === 'drive' && G.cars.some(c => c.state === 'wait')) r -= 0.25;
    if (k === 'counter' && G.queue.length > 2) r -= 0.2;
    if (r < br) {
      br = r;
      best = k;
    }
  }
  return best;
}

export function unlock(id, silent) {
  if (id === 'city') {
    nextCity();
    return;
  }
  G.unlocked.add(id);
  switch (id) {
    case 'spit2':
      G.spits[1].on = true;
      break;
    case 'spit3':
      G.spits[2].on = true;
      break;
    case 'special':
      G.special.on = true;
      G.special.stock = Math.max(G.special.stock, 3);
      break;
    case 'fryer':
      G.fryer.on = true;
      G.fryer.stock = Math.max(G.fryer.stock, 3);
      break;
    case 'cashier':
      G.workers.push(mkWorker('cashier', REG.x, REG.y, '#3f7fbf', 'Zeynep', { long: true }));
      break;
    case 'runner':
      G.workers.push(mkWorker('runner', 8.9, 1.1, '#4f9a58', 'Ali'));
      break;
    case 'cleaner':
      G.workers.push(
        mkWorker('cleaner', BIN.x + 0.6, BIN.y - 0.6, '#c24d78', 'Hatice', { long: true, state: 'idle' }),
      );
      break;
    case 'runner2':
      G.workers.push(mkWorker('runner', 8.9, 1.1, '#8a5bb0', 'Mehmet'));
      break;
    case 'driveRunner':
      G.workers.push(mkWorker('runner', 9.7, 2.0, '#e07a3a', 'Can', { home: 'drive' }));
      break;
    case 'delivRunner':
      G.workers.push(mkWorker('runner', 8.2, 5.6, '#3f7fbf', 'Emre', { home: 'deliv' }));
      break;
    case 'driveStaff':
      G.workers.push(mkWorker('drive', 10.75, 1.5, '#2f9a8a', 'Elif', { long: true }));
      break;
    case 'tray':
      G.cap = 8;
      break;
    case 'tray2':
      G.cap = 12;
      break;
    case 'tables1':
      G.tablesLv = Math.max(G.tablesLv, 1);
      break;
    case 'tables2':
      G.tablesLv = Math.max(G.tablesLv, 2);
      break;
    case 'tables3':
      G.tablesLv = Math.max(G.tablesLv, 3);
      break;
    case 'spitSpeed':
      G.spitTime = 0.8;
      break;
    case 'golden':
      G.prodMul = 1.4;
      break;
    case 'drivein':
      G.carT = 1.5;
      break;
  }
  if (!silent) {
    const mm =
      id === 'special'
        ? [
            t('{n} eröffnet!', { n: t(specOf().stand) }),
            t('{n} – die Spezialität von {c}. Gäste zahlen {p} € pro Stück', {
              n: t(specOf().name),
              c: t(cityOf(G.city).name),
              p: specPrice(),
            }),
          ]
        : [t(MSG[id][0]), t(MSG[id][1])];
    showBanner(mm[0], mm[1]);
    unstick();
    sfx('buy', 0.8) || chord();
    save();
    burst(70);
  }
}

/** Gemeinsamer Teil von „neue Stadt“ und „Filiale besuchen“: Spielerfortschritt behalten, Stadt wechseln. */
function switchCity(to, citySnapOrNull, branches) {
  const keep = {
    top: Math.max(G.top ?? G.city, to),
    missionsDone: G.missionsDone,
    mission: G.mission,
    lv: G.lv,
    branches,
    bc: G.branchCash || 0,
    clock: G.clock,
    weather: G.weather,
    boost: G.boost,
  };
  __set_G(fresh(to));
  G.top = keep.top;
  G.missionsDone = keep.missionsDone;
  G.lv = keep.lv;
  G.branches = keep.branches;
  G.branchCash = keep.bc;
  G.clock = keep.clock;
  G.phaseId = null;
  G.weather = keep.weather;
  Object.assign(G.boost, keep.boost);
  if (citySnapOrNull) applyCity(citySnapOrNull);
  G.mission = citySnapOrNull ? keep.mission : newMission();
  cam.init = false;
  flyers.length = 0;
  texts.length = 0;
  __set_bestRate(0);
  applyOutfit();
}

function leaveEntry() {
  return {
    i: G.city,
    name: cityOf(G.city).name,
    rate: Math.max(ratePerMin(), lastRate, 300),
    snap: citySnap(),
  };
}

export function nextCity() {
  const branches = (G.branches || []).concat([leaveEntry()]);
  switchCity(G.city + 1, null, branches);
  const c = cityOf(G.city);
  addGems(5);
  lifeMax('cities', G.city + 1);
  burst(140);
  showBanner(
    t('Willkommen in {c}!', { c: t(c.name) }),
    t('Jeder Döner bringt ×{m} · +5 Goldmünzen', { m: fmt(priceMul(), 1) }),
  );
  chord();
  save();
}

/** Zu einer anderen eigenen Filiale reisen. Die aktuelle Stadt wird zur Filiale und verdient weiter. */
export function travelTo(i) {
  if (i === G.city) return;
  const target = (G.branches || []).find(b => b.i === i);
  if (!target) return;
  const branches = G.branches.filter(b => b !== target).concat([leaveEntry()]);
  branches.sort((a, b) => a.i - b.i);
  switchCity(i, target.snap || fullCity(i), branches);
  burst(80);
  showBanner(
    t('Zurück in {c}!', { c: t(cityOf(i).name) }),
    t('Deine anderen Filialen verdienen weiter'),
  );
  chord();
  save();
}

export function rate(d) {
  G.rating = Math.max(1, Math.min(5, G.rating + d));
}

export const dirtyCount = () => G.tableTrash.filter((n, i) => n > 0 && TABLES[i].lv <= G.tablesLv).length;

export function sale(pileKey, amt, wx, wy, label) {
  if (G.rating >= 4.5) amt = Math.round(amt * 1.1);
  if (typeof evtPoints === 'function') evtPoints(1);
  if (G.boost.cash > 0) amt *= 2;
  if (M.pet === 'parrot') amt = Math.round(amt * 1.05);
  if (G.rush > 0) amt = Math.round(amt * 1.5);
  const pile = G.piles[pileKey];
  pile.amount += amt;
  pile.count += Math.max(1, Math.round(amt / 6));
  G.sales.push({ t: G.time, a: amt });
  G.total += amt;
  floatText(
    wx,
    wy,
    70,
    (label ? label + ' ' : '') + t('+{amt} €', { amt: fmt(amt) }),
    G.rush > 0 ? '#ff8a7f' : '#f2b134',
  );
  stat('earn', amt);
}

export function initWorld() {}
