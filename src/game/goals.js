// goals.js – aus der Einzeldatei extrahiert
import { levelHint } from './levels.js';

import {
  BIN,
  FRY_PICK,
  PADS,
  PICK_Y,
  PILES,
  REG,
  SP_PICK,
  ST,
  TABLES,
  cityOf,
  dist,
  specOf,
} from './config.js';
import { G, STATIONS, padPrice, stationOn } from './state.js';
import { activePads, bestSpit, dirtyCount } from './world.js';
import { t, fmt } from './i18n.js';

export function goal() {
  const pl = G.player,
    pads = activePads();
  const aff = pads
    .filter(p => G.money >= padPrice(p) - (G.paid[p.id] || 0) - 0.01)
    .sort((a, b) => a.price - b.price)[0];
  if (aff) {
    const nm =
      aff.id === 'city'
        ? t('Filiale {c}', { c: t(cityOf(G.city + 1).name) })
        : aff.id === 'special'
          ? t(specOf().stand)
          : t(aff.name);
    return {
      t: t('<b>{n}</b> freischalten – stell dich aufs Feld', { n: nm }),
      x: aff.x,
      y: aff.y,
      pad: true,
    };
  }
  let pk = null,
    pd = 1e9;
  for (const k in PILES) {
    if (G.piles[k].amount > 0) {
      const d = dist(pl, PILES[k]);
      if (d < pd) {
        pd = d;
        pk = k;
      }
    }
  }
  if (pk)
    return {
      t: t('<b>{a} €</b> einsammeln', { a: fmt(G.piles[pk].amount) }),
      x: PILES[pk].x,
      y: PILES[pk].y,
    };
  const carWait = G.cars.find(c => c.state === 'wait' && c.arr);
  if (pl.items.includes('t'))
    return { t: t('Müll zum <b>Mülleimer</b> bringen'), x: BIN.x, y: BIN.y };
  if (G.inspector && G.inspector.state !== 'out' && dirtyCount() > 0 && !pl.items.some(t => t !== 't')) {
    const di2 = G.tableTrash.findIndex((n, i) => n > 0 && TABLES[i].lv <= G.tablesLv);
    return { t: t('<b>Kontrolle!</b> Schnell Tische abräumen'), x: TABLES[di2].x, y: TABLES[di2].y };
  }
  if (G.crate && dist(pl, G.crate) < 5)
    return { t: t('<b>Bonus-Kiste</b> einsammeln!'), x: G.crate.x, y: G.crate.y };
  if (pl.carry > 0) {
    let k = 'counter';
    if (pl.items.every(t => t === 's'))
      return {
        t: t('{s} zur <b>Theke</b> bringen', { s: t(specOf().name) }),
        x: ST.counter.zone.x,
        y: ST.counter.zone.y,
      };
    if (pl.items.every(t => t === 'f' || t === 's'))
      return { t: t('Pommes zur <b>Theke</b> bringen'), x: ST.counter.zone.x, y: ST.counter.zone.y };
    if (carWait && G.stock.drive < carWait.want - carWait.got) k = 'drive';
    else if (G.stock.counter >= ST.counter.max)
      k = STATIONS.find(s => stationOn(s) && G.stock[s] < ST[s].max) || 'counter';
    const dest =
      k === 'counter'
        ? t('Döner zur <b>Theke</b> bringen')
        : k === 'drive'
          ? t('Döner zum <b>Drive-In</b> bringen')
          : t('Döner zum <b>Lieferregal</b> bringen');
    return { t: dest, x: ST[k].zone.x, y: ST[k].zone.y };
  }
  if (carWait && G.stock.drive > 0 && !G.unlocked.has('driveStaff'))
    return {
      t: t('Auto wartet – stell dich ans <b>Drive-In-Fenster</b>'),
      x: ST.drive.zone.x,
      y: ST.drive.zone.y,
    };
  if (G.queue[0] && !G.unlocked.has('cashier') && G.stock.counter > 0)
    return { t: t('An die <b>Kasse</b> stellen und verkaufen'), x: REG.x, y: REG.y };
  const di = G.tableTrash.findIndex((n, i) => n > 0 && TABLES[i].lv <= G.tablesLv);
  if (di >= 0 && !G.unlocked.has('cleaner') && pl.carry === 0 && (G.tableTrash[di] >= 2 || dirtyCount() > 1))
    return { t: t('Schmutziger Tisch – <b>abräumen</b>'), x: TABLES[di].x, y: TABLES[di].y };
  const fq = G.queue[0];
  if (
    G.special.on &&
    G.special.stock > 0 &&
    pl.carry < G.cap &&
    (G.stock.spec < 2 || (fq && (fq.ws || 0) > (fq.gs || 0) && G.stock.spec < fq.ws - fq.gs))
  )
    return {
      t: t('{s} am <b>{stand}</b> abholen', { s: t(specOf().name), stand: t(specOf().stand) }),
      x: SP_PICK.x,
      y: SP_PICK.y,
    };
  if (
    G.fryer.on &&
    G.fryer.stock > 0 &&
    pl.carry < G.cap &&
    (G.stock.fries < 2 || (fq && fq.wf > fq.gf && G.stock.fries < fq.wf - fq.gf))
  )
    return { t: t('Pommes an der <b>Fritteuse</b> abholen'), x: FRY_PICK.x, y: FRY_PICK.y };
  const s = bestSpit(pl);
  if (s && s.stock > 0 && pl.carry < G.cap)
    return { t: t('Döner am <b>Spieß</b> abholen'), x: s.x + 0.5, y: PICK_Y };
  const lh = levelHint();
  if (lh) return { t: lh, x: null };
  if (G.unlocked.size === PADS.length)
    return { t: t('<b>Döner Palast komplett!</b> Sammle weiter ein.'), x: null };
  return { t: t('Der Spieß brutzelt … gleich gibt es Nachschub'), x: null };
}

export function initGoals() {}
