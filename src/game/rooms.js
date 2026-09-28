// rooms.js – Nebenräume des Döner Palasts, jeder hinter einer eigenen Tür und mit eigener Nebenwirkung:
//   Barbershop      – Haarschnitt, danach oft ein Döner. Ohne Glaswand fliegen Haare ins Essen.
//   Zocker-Lounge   – Gamer wollen Döner an die Couch. Ohne Schallschutz stört das Torgebrüll den Gastraum.
//   Shisha-Whirlpool – Kohle nachlegen, sonst kippt die Stimmung. Ohne Lüftung zieht Rauch in den Gastraum.
//   Gold-VIP-Lounge – Döner mit Blattgold veredeln, VIPs zahlen das Achtfache. Influencer bringen Ruhm oder Shitstorm.
//   Hochzeitssaal   – Großaufträge: viele Döner in kurzer Zeit ans Buffet.
// Der Gastraum liegt bei x 0…W, y 0…D; die Räume links davon (x < 0) und vorne (y > D).
import { G, price, priceMul, patMax, relax } from './state.js';
import { W, D, BX0, BD, ENTER, EXIT, QSLOTS, SKINS, HAIRS, SHIRTS, TABLES, rnd, dist, ctx } from './config.js';
import { P, box, ell, rr, poly, chip } from './iso.js';
import { drawPerson, drawDoner, drawGold } from './sprites.js';
import { drawPersonSprite } from './gfx.js';
import { moveToward, sale, rate } from './world.js';
import { floatText, fly } from './fx.js';
import { sfx } from './audio.js';
import { $, showBanner } from './hud.js';
import { t, fmt } from './i18n.js';
import { burst } from './confetti.js';
import { addGems } from './meta.js';

// ---------------------------------------------------------------- Grundriss
export const ROOMS = [
  { id: 'barber', pad: 'roomBarber', fix: 'barberGlass', name: 'Barbershop', lv: 3,
    x0: BX0, x1: 0, y0: 0, y1: 4.6, door: { s: 'x', a: 3.65, b: 4.65 } },
  { id: 'gamer', pad: 'roomGamer', fix: 'gamerSound', name: 'Zocker-Lounge', lv: 4,
    x0: BX0, x1: 0, y0: 4.6, y1: 9.3, door: { s: 'x', a: 7.5, b: 8.5 } },
  { id: 'shisha', pad: 'roomShisha', fix: 'shishaVent', name: 'Shisha-Whirlpool', lv: 6,
    x0: BX0, x1: 0, y0: 9.3, y1: 14, door: { s: 'x', a: 12.3, b: 13.3 } },
  { id: 'vip', pad: 'roomVip', name: 'Gold-VIP-Lounge', lv: 8,
    x0: BX0, x1: 2, y0: 14, y1: BD, door: { s: 'y', a: 0.5, b: 1.7 } },
  { id: 'hall', pad: 'roomHall', name: 'Hochzeitssaal', lv: 9,
    x0: 2, x1: 8.6, y0: 14, y1: BD, door: { s: 'y', a: 4.8, b: 6.2 } },
];
const R = id => ROOMS.find(r => r.id === id);
export const roomOpen = id => G.unlocked.has(R(id).pad);
export const ROOM_PILES = {
  barber: { x: -1.1, y: 4.05 },
  gamer: { x: -1.1, y: 8.7 },
  shisha: { x: -1.1, y: 13.4 },
  vip: { x: 0.4, y: 14.9 },
  hall: { x: 7.0, y: 14.9 },
};
const inRoom = (r, x, y) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
const mid = r => (r.door.a + r.door.b) / 2;
const doorOut = r => (r.door.s === 'x' ? { x: 0.75, y: mid(r) } : { x: mid(r), y: D - 0.75 });
const doorIn = r => (r.door.s === 'x' ? { x: -0.75, y: mid(r) } : { x: mid(r), y: D + 0.75 });

/** Darf man an (x, y) stehen? Gastraum, geöffnete Räume und ihre Türen. */
export function walkable(x, y) {
  const m = 0.35;
  if (x >= m && x <= W - m && y >= m && y <= D - m) return true;
  for (const r of ROOMS) {
    if (!roomOpen(r.id)) continue;
    if (x >= r.x0 + m && x <= r.x1 - m && y >= r.y0 + m && y <= r.y1 - m) return true;
    const d = r.door;
    if (d.s === 'x' && x > -m - 0.1 && x < m + 0.1 && y > d.a + 0.2 && y < d.b - 0.2) return true;
    if (d.s === 'y' && y > D - m - 0.1 && y < D + m + 0.1 && x > d.a + 0.2 && x < d.b - 0.2) return true;
  }
  return false;
}

// feste Möbel als Hindernisse
const FURN = {
  barber: [
    { x: -4.9, y: 1.3, w: 0.6, d: 0.6 },
    { x: -2.9, y: 1.3, w: 0.6, d: 0.6 },
    { x: -5.6, y: 3.3, w: 2.2, d: 0.5 },
  ],
  gamer: [
    { x: -4.3, y: 5.5, w: 0.7, d: 1.4 },
    { x: -4.3, y: 7.4, w: 0.7, d: 1.4 },
    { x: -5.9, y: 5.8, w: 0.4, d: 2.8 },
  ],
  shisha: [{ x: -4.7, y: 10.2, w: 2.6, d: 2.4 }],
  vip: [{ x: -3.1, y: 16.4, w: 1.0, d: 0.8 }],
  hall: [{ x: 3.4, y: 18.7, w: 4.0, d: 0.7 }],
};
export function roomObstacles() {
  const o = [];
  for (const r of ROOMS) if (roomOpen(r.id)) o.push(...FURN[r.id]);
  return o;
}

// ---------------------------------------------------------------- Zustand
function S() {
  if (!G.rooms)
    G.rooms = {
      barber: { guests: [], spawnT: 4, cuts: 0 },
      gamer: { guests: [], spawnT: 5, shoutT: 25 },
      shisha: { guests: [], spawnT: 5, coal: 1, coalT: 0, smoke: [], coughT: 8, badT: 10 },
      vip: { guests: [], spawnT: 8, goldT: 0, inflT: 70 },
      hall: { ev: null, nextT: 25, dancers: [] },
      viralT: 0,
    };
  return G.rooms;
}
/** Einfluss auf das Tempo der normalen Laufkundschaft (viraler Influencer-Post). */
export const roomSpawnMul = () => (G.rooms && G.rooms.viralT > 0 ? 0.5 : 1);

function mkGuest(extra) {
  return Object.assign(
    {
      x: ENTER.x + (Math.random() - 0.5) * 0.5,
      y: ENTER.y,
      shirt: rnd(SHIRTS),
      skin: rnd(SKINS),
      hair: rnd(HAIRS),
      long: Math.random() < 0.35,
      pants: rnd(['#3b3440', '#2f3d5c', '#5a4a3a']),
      fx: -1,
      moving: false,
      phase: 0,
      path: [],
      state: 'in',
      T: 0,
    },
    extra,
  );
}
/** Läuft die Wegpunkte ab. true, wenn angekommen. */
function walk(g, dt, sp = 2.5) {
  while (g.path.length) {
    const p = g.path[0];
    if (moveToward(g, p.x, p.y, sp, dt)) g.path.shift();
    else return false;
  }
  g.moving = false;
  return true;
}
const goIn = (r, spot) => [doorOut(r), doorIn(r), spot];
const goOut = (g, r) => {
  g.path = [doorIn(r), doorOut(r), { x: EXIT.x, y: EXIT.y }];
  g.state = 'out';
  g.sitting = false;
};
const pm = () => priceMul();
const plIn = r => inRoom(r, G.player.x, G.player.y);

// ---------------------------------------------------------------- Barbershop
const CHAIRS = [
  { x: -4.6, y: 1.9 },
  { x: -2.6, y: 1.9 },
];
const BENCH = [
  { x: -3.2, y: 3.95 },
  { x: -4.0, y: 3.95 },
  { x: -4.8, y: 3.95 },
];
const NEW_HAIR = ['#1b1b1f', '#e6b422', '#c24d78', '#2f5f93', '#f7f3ea'];
function barberTick(dt) {
  const s = S().barber,
    r = R('barber');
  s.spawnT -= dt;
  if (s.spawnT <= 0) {
    s.spawnT = (relax() ? 16 : 11) * (0.7 + Math.random() * 0.6);
    if (s.guests.length < CHAIRS.length + BENCH.length) {
      const g = mkGuest({ state: 'in', chair: -1, bench: -1 });
      s.guests.push(g);
    }
  }
  for (const g of s.guests) {
    g.phase += g.moving ? dt * 12 : 0;
    if (g.state === 'in') {
      // freien Stuhl wählen, sonst Platz auf der Wartebank, sonst wieder gehen
      const c = CHAIRS.findIndex((_, i) => !s.guests.some(o => o.chair === i));
      if (c >= 0) {
        g.chair = c;
        g.path = goIn(r, CHAIRS[c]);
        g.state = 'toChair';
      } else {
        const b = BENCH.findIndex((_, i) => !s.guests.some(o => o.bench === i));
        if (b < 0) {
          g.state = 'out';
          g.path = [{ x: EXIT.x, y: EXIT.y }];
          continue;
        }
        g.bench = b;
        g.path = goIn(r, BENCH[b]);
        g.state = 'toBench';
      }
    } else if (g.state === 'toBench') {
      if (!g.sitting && walk(g, dt)) {
        g.sitting = true;
        g.fx = -1;
      }
    } else if (g.state === 'toChair') {
      if (walk(g, dt)) {
        g.state = 'cut';
        g.sitting = true;
        g.fx = -1;
        g.T = relax() ? 9 : 7;
      }
    } else if (g.state === 'cut') {
      g.T -= dt;
      if (Math.random() < dt * 3) hairBits.push({ x: g.x + (Math.random() - 0.5) * 0.4, y: g.y, z: 44, v: 0, life: 1 });
      if (g.T <= 0) {
        g.hair = rnd(NEW_HAIR);
        g.long = false;
        g.fresh = true;
        s.cuts++;
        sale('barber', Math.round(12 * pm()), g.x, g.y, '✂');
        sfx('ding', 0.4, 1.3);
        if (!G.unlocked.has('barberGlass') && Math.random() < 0.45) hairMess();
        // viele gehen danach direkt an die Theke
        g.chair = -1;
        g.sitting = false;
        if (Math.random() < 0.6 && G.queue.length < QSLOTS.length) {
          g.state = 'toQueue';
          g.path = [doorIn(r), doorOut(r)];
        } else goOut(g, r);
      }
    } else if (g.state === 'toQueue') {
      if (walk(g, dt)) {
        if (G.queue.length < QSLOTS.length) {
          g.dead = true;
          joinQueue(g);
        } else {
          g.state = 'out';
          g.path = [{ x: EXIT.x, y: EXIT.y }];
        }
      }
    } else if (g.state === 'out') {
      if (walk(g, dt, 2.8)) g.dead = true;
    }
  }
  // Wartende auf der Bank rücken auf einen freien Stuhl
  for (const g of s.guests) {
    if (g.state !== 'toBench' || !g.sitting) continue;
    const c = CHAIRS.findIndex((_, i) => !s.guests.some(o => o.chair === i));
    if (c < 0) break;
    g.sitting = false;
    g.chair = c;
    g.bench = -1;
    g.path = [CHAIRS[c]];
    g.state = 'toChair';
  }
  s.guests = s.guests.filter(g => !g.dead);
}
function hairMess() {
  const idx = TABLES.map((tb, i) => i).filter(i => TABLES[i].lv <= G.tablesLv);
  if (idx.length) {
    const i = rnd(idx);
    G.tableTrash[i] = Math.min(4, G.tableTrash[i] + 1);
    floatText(TABLES[i].x, TABLES[i].y, 60, t('Haare im Essen!'), '#ff8a7f');
  } else floatText(0.8, mid(R('barber')), 60, t('Haare im Essen!'), '#ff8a7f');
  rate(-0.03);
}
/** Frisch frisierter Gast stellt sich an der Theke an. */
function joinQueue(g) {
  const c = {
    x: g.x,
    y: g.y,
    shirt: g.shirt,
    skin: g.skin,
    hair: g.hair,
    long: g.long,
    pants: g.pants,
    fx: -1,
    moving: false,
    phase: 0,
    state: 'queue',
    wd: 1 + Math.floor(Math.random() * 2),
    wf: G.fryer.on && Math.random() < 0.4 ? 1 : 0,
    ws: 0,
    gd: 0,
    gf: 0,
    gs: 0,
    arr: false,
    happy: 0,
    pat: patMax(),
    patMax: patMax(),
    fresh: true,
  };
  G.customers.push(c);
  G.queue.push(c);
}
const hairBits = [];

// ---------------------------------------------------------------- Zocker-Lounge
const SOFA = [
  { x: -3.5, y: 5.85 },
  { x: -3.5, y: 6.55 },
  { x: -3.5, y: 7.75 },
  { x: -3.5, y: 8.45 },
];
function gamerTick(dt) {
  const s = S().gamer,
    r = R('gamer'),
    pl = G.player;
  s.spawnT -= dt;
  if (s.spawnT <= 0) {
    s.spawnT = (relax() ? 18 : 12) * (0.7 + Math.random() * 0.6);
    const free = SOFA.findIndex((_, i) => !s.guests.some(o => o.seat === i));
    if (free >= 0) {
      const g = mkGuest({ seat: free, state: 'in', cap: Math.random() < 0.5, capCol: rnd(['#231a24', '#d8342b', '#f7f3ea']) });
      g.path = goIn(r, SOFA[free]);
      s.guests.push(g);
    }
  }
  const served = [];
  for (const g of s.guests) {
    g.phase += g.moving ? dt * 12 : 0;
    if (g.state === 'in') {
      if (walk(g, dt)) {
        g.state = 'play';
        g.sitting = true;
        g.fx = -1;
        g.T = 70 + Math.random() * 40;
        g.reqT = 0;
        g.wantIn = 6 + Math.random() * 8;
      }
    } else if (g.state === 'play') {
      g.T -= dt;
      if (!g.req) {
        g.wantIn -= dt;
        if (g.wantIn <= 0) {
          g.req = true;
          g.reqT = relax() ? 45 : 28;
        }
      } else {
        g.reqT -= dt;
        // Döner im Arm und nah genug? Dann wird serviert.
        const i = pl.items.lastIndexOf('d');
        if (i >= 0 && dist(pl, g) < 1.3 && plIn(r) && !served.length) {
          pl.items.splice(i, 1);
          pl.carry = pl.items.length;
          fly('d', P(pl.x, pl.y, 26 + pl.carry * 5), g, 30);
          sale('gamer', Math.round(price() * 1.4), g.x, g.y, 'GG!');
          sfx('serve', 0.4);
          g.req = false;
          g.wantIn = 14 + Math.random() * 12;
          g.happy = 2;
          served.push(g);
        } else if (g.reqT <= 0) {
          floatText(g.x, g.y, 80, t('RAGE QUIT!'), '#ff8a7f');
          sfx('bad', 0.6);
          rate(-0.1);
          g.rage = 1;
          goOut(g, r);
          continue;
        }
      }
      if (g.T <= 0) {
        sale('gamer', Math.round(10 * pm()), g.x, g.y, '🎮');
        goOut(g, r);
      }
    } else if (g.state === 'out') {
      if (walk(g, dt, 2.8)) g.dead = true;
    }
  }
  s.guests = s.guests.filter(g => !g.dead);
  // Torgebrüll
  if (s.guests.some(g => g.state === 'play')) {
    s.shoutT -= dt;
    if (s.shoutT <= 0) {
      s.shoutT = 22 + Math.random() * 16;
      floatText(-3, 7, 90, t('TOOOR!'), '#f2b134');
      sfx('party', 0.55, 1.1);
      if (!G.unlocked.has('gamerSound')) {
        floatText(1.5, 7.5, 70, t('Zu laut!'), '#ff8a7f');
        for (const c of G.customers) if (c.state === 'queue' && !relax()) c.pat -= 4;
        rate(-0.02);
      }
    }
  }
}

// ---------------------------------------------------------------- Shisha-Whirlpool
const POOL = { x: -3.4, y: 11.4 };
const SPOTS = [0, 1, 2, 3].map(i => {
  const a = -Math.PI / 2 + (i * Math.PI) / 2 + 0.4;
  return { x: POOL.x + Math.cos(a) * 0.8, y: POOL.y + Math.sin(a) * 0.65 };
});
const OVEN = { x: -5.25, y: 13.3 };
const HOOKAHS = [
  { x: -4.9, y: 10.0 },
  { x: -1.9, y: 12.7 },
];
function shishaTick(dt) {
  const s = S().shisha,
    r = R('shisha'),
    pl = G.player;
  s.spawnT -= dt;
  if (s.spawnT <= 0) {
    s.spawnT = (relax() ? 16 : 11) * (0.7 + Math.random() * 0.6);
    const free = SPOTS.findIndex((_, i) => !s.guests.some(o => o.spot === i));
    if (free >= 0) {
      const g = mkGuest({ spot: free, state: 'in' });
      const sp = SPOTS[free];
      g.path = goIn(r, { x: sp.x + (sp.x > POOL.x ? 0.7 : -0.7), y: sp.y });
      s.guests.push(g);
    }
  }
  const bathing = s.guests.filter(g => g.state === 'bath').length;
  if (bathing) s.coal = Math.max(0, s.coal - dt / (relax() ? 70 : 50));
  // Kohle nachlegen am Ofen
  s.coalT -= dt;
  if (dist(pl, OVEN) < 0.9 && s.coal < 0.95 && s.coalT <= 0) {
    s.coal = 1;
    s.coalT = 1;
    floatText(OVEN.x, OVEN.y, 60, t('Kohle nachgelegt'), '#f2b134');
    sfx('stack', 0.6, 0.8);
  }
  for (const g of s.guests) {
    g.phase += g.moving ? dt * 12 : 0;
    if (g.state === 'in') {
      if (walk(g, dt)) {
        const sp = SPOTS[g.spot];
        g.x = sp.x;
        g.y = sp.y;
        g.state = 'bath';
        g.T = 55 + Math.random() * 25;
        g.mood = 1;
      }
    } else if (g.state === 'bath') {
      g.T -= dt;
      if (s.coal <= 0) g.mood = Math.max(0, g.mood - dt / 20);
      if (g.T <= 0) {
        const sp = SPOTS[g.spot];
        g.x = sp.x + (sp.x > POOL.x ? 0.7 : -0.7);
        const fee = Math.round(16 * pm() * (0.5 + 0.5 * g.mood));
        sale('shisha', fee, g.x, g.y, '💨');
        goOut(g, r);
      }
    } else if (g.state === 'out') {
      if (walk(g, dt, 2.8)) g.dead = true;
    }
  }
  s.guests = s.guests.filter(g => !g.dead);
  if (s.coal <= 0 && bathing) {
    s.badT -= dt;
    if (s.badT <= 0) {
      s.badT = 12;
      floatText(POOL.x, POOL.y, 70, t('Kohle ist aus!'), '#ff8a7f');
      rate(-0.03);
    }
  }
  // Rauch
  const vent = G.unlocked.has('shishaVent');
  if (bathing && Math.random() < dt * 3) {
    const h = rnd(HOOKAHS);
    s.smoke.push({ x: h.x, y: h.y, z: 50, vx: vent ? 0 : 0.35 + Math.random() * 0.3, vy: (Math.random() - 0.5) * 0.2, life: 1, r: 6 });
  }
  for (const p of s.smoke) {
    // ohne Lüftung zieht der Rauch zur Tür und in den Gastraum
    if (!vent && p.x < -0.6) p.vy += (mid(r) - p.y) * dt * 0.8;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += dt * 6;
    p.r += dt * 4;
    p.life -= dt / (vent ? 2.5 : 7);
  }
  s.smoke = s.smoke.filter(p => p.life > 0);
  if (!vent && bathing) {
    // Rauch im Gastraum: wartende Gäste verlieren schneller die Geduld
    for (const c of G.customers) if (c.state === 'queue' && !relax()) c.pat -= dt * 0.25;
    s.coughT -= dt;
    if (s.coughT <= 0) {
      s.coughT = 14 + Math.random() * 8;
      floatText(1.6, 11.8, 60, t('*hust*'), '#cdbfae');
      rate(-0.02);
    }
  }
}

// ---------------------------------------------------------------- Gold-VIP-Lounge
const VIPSEATS = [
  { x: -3.5, y: 16.8 },
  { x: -1.7, y: 16.8 },
];
const GOLDST = { x: -5.0, y: 15.1 };
function vipTick(dt) {
  const s = S().vip,
    r = R('vip'),
    pl = G.player,
    all = S();
  s.spawnT -= dt;
  s.inflT -= dt;
  const wantInfl = s.inflT <= 0 && !s.guests.some(g => g.infl);
  if (s.spawnT <= 0 || wantInfl) {
    s.spawnT = (relax() ? 26 : 18) * (0.7 + Math.random() * 0.6);
    const free = VIPSEATS.findIndex((_, i) => !s.guests.some(o => o.seat === i));
    if (free >= 0) {
      const infl = wantInfl;
      if (infl) s.inflT = 110 + Math.random() * 60;
      const g = mkGuest({
        seat: free,
        state: 'in',
        vip: true,
        crown: !infl,
        infl,
        shirt: infl ? '#c24d78' : '#e6b422',
        shades: true,
      });
      g.path = goIn(r, VIPSEATS[free]);
      s.guests.push(g);
      if (infl) {
        showBanner(t('Influencerin im Anmarsch!'), t('Bring ihr einen Gold-Döner, bevor ihr Live-Stream endet'));
        sfx('ding', 0.6, 1.2);
      }
    }
  }
  // Blattgold-Station: Döner im Arm werden veredelt
  s.goldT -= dt;
  if (dist(pl, GOLDST) < 0.9 && s.goldT <= 0) {
    const i = pl.items.indexOf('d');
    if (i >= 0) {
      pl.items[i] = 'g';
      s.goldT = 0.25;
      floatText(GOLDST.x, GOLDST.y, 60, t('Blattgold!'), '#f2c75a');
      sfx('coin', 0.4, 1.3);
    }
  }
  let servedOne = false;
  for (const g of s.guests) {
    g.phase += g.moving ? dt * 12 : 0;
    if (g.state === 'in') {
      if (walk(g, dt)) {
        g.state = 'wait';
        g.sitting = true;
        g.fx = g.seat === 0 ? 1 : -1;
        g.reqT = (g.infl ? 40 : 50) * (relax() ? 1.5 : 1);
      }
    } else if (g.state === 'wait') {
      g.reqT -= dt;
      const i = pl.items.lastIndexOf('g');
      if (!servedOne && i >= 0 && dist(pl, g) < 1.5 && plIn(r)) {
        servedOne = true;
        pl.items.splice(i, 1);
        pl.carry = pl.items.length;
        fly('g', P(pl.x, pl.y, 26 + pl.carry * 5), g, 30);
        sale('vip', Math.round(price() * 8), g.x, g.y, t('GOLD!'));
        sfx('cash', 0.7);
        g.state = 'eat';
        g.T = 10;
        g.happy = 3;
        if (g.infl) {
          all.viralT = 60;
          rate(0.2);
          burst(80);
          showBanner(t('Das Video geht viral!'), t('60 Sekunden lang strömen doppelt so viele Gäste herein'));
        }
      } else if (g.reqT <= 0) {
        rate(g.infl ? -0.3 : -0.1);
        if (g.infl) {
          showBanner(t('Schlechte Presse!'), t('Die Influencerin ist ohne Gold-Döner gegangen'));
          sfx('bad', 0.8);
        } else floatText(g.x, g.y, 80, t('Unerhört!'), '#ff8a7f');
        goOut(g, r);
      }
    } else if (g.state === 'eat') {
      g.T -= dt;
      if (g.T <= 0) goOut(g, r);
    } else if (g.state === 'out') {
      if (walk(g, dt, 2.8)) g.dead = true;
    }
  }
  s.guests = s.guests.filter(g => !g.dead);
}

// ---------------------------------------------------------------- Hochzeitssaal
const BUFFET = { x: 5.4, y: 18.2 };
const FLOOR_C = { x: 5.2, y: 16.3 };
function hallTick(dt) {
  const s = S().hall,
    pl = G.player;
  if (!s.ev) {
    s.nextT -= dt;
    if (s.nextT <= 0) {
      const need = Math.min(70, 16 + 4 * G.cityLv);
      s.ev = { need, have: 0, T: relax() ? 220 : 160, max: relax() ? 220 : 160, dropT: 0 };
      s.dancers = Array.from({ length: 10 }, (_, i) =>
        mkGuest({ a: (i / 10) * Math.PI * 2, x: FLOOR_C.x, y: FLOOR_C.y, shirt: rnd(['#c24d78', '#e6b422', '#f7f3ea', '#2f9a8a', '#8a5bb0', '#d8342b']) }),
      );
      showBanner(t('Hochzeit!'), t('Bring {n} Döner ans Buffet im Hochzeitssaal', { n: need }));
      sfx('fanfare', 0.8);
      setTimeout(() => sfx('party', 0.6), 700);
    }
    return;
  }
  const e = s.ev;
  e.T -= dt;
  for (const d of s.dancers) {
    d.a += dt * 0.6;
    d.x = FLOOR_C.x + Math.cos(d.a) * 1.3;
    d.y = FLOOR_C.y + Math.sin(d.a) * 0.9;
    d.fx = Math.sin(d.a) > 0 ? -1 : 1;
    d.moving = true;
    d.phase += dt * 10;
  }
  e.dropT -= dt;
  if (dist(pl, BUFFET) < 1.1 && e.dropT <= 0 && e.have < e.need) {
    const i = pl.items.lastIndexOf('d');
    if (i >= 0) {
      pl.items.splice(i, 1);
      pl.carry = pl.items.length;
      e.have++;
      e.dropT = 0.08;
      fly('d', P(pl.x, pl.y, 26 + pl.carry * 5), BUFFET, 30);
      sfx('stack', 0.5, 1 + e.have * 0.005);
    }
  }
  if (e.have >= e.need) {
    const amt = Math.round(e.need * price() * 2.5);
    sale('hall', amt, BUFFET.x, BUFFET.y, '💍');
    addGems(1);
    burst(140);
    sfx('fanfare', 0.9);
    showBanner(t('Hochzeit gerettet!'), t('+{a} € und 1 Goldmünze – das Brautpaar tanzt', { a: fmt(amt) }));
    s.ev = null;
    s.nextT = (relax() ? 240 : 170) + Math.random() * 60;
    setTimeout(() => (s.dancers = []), 6000);
  } else if (e.T <= 0) {
    if (e.have > 0) sale('hall', Math.round(e.have * price()), BUFFET.x, BUFFET.y, '');
    showBanner(t('Die Gäste sind hungrig gegangen'), t('Nächstes Mal mehr Döner vorbereiten'));
    rate(-0.1);
    s.ev = null;
    s.dancers = [];
    s.nextT = (relax() ? 240 : 170) + Math.random() * 60;
  }
}

// ---------------------------------------------------------------- Takt
export function roomsTick(dt) {
  const s = S();
  if (s.viralT > 0) s.viralT -= dt;
  if (roomOpen('barber')) barberTick(dt);
  if (roomOpen('gamer')) gamerTick(dt);
  if (roomOpen('shisha')) shishaTick(dt);
  if (roomOpen('vip')) vipTick(dt);
  if (roomOpen('hall')) hallTick(dt);
  for (const h of hairBits) {
    h.v += dt * 60;
    h.z -= h.v * dt;
    h.life -= dt;
  }
  for (let i = hairBits.length - 1; i >= 0; i--) if (hairBits[i].life <= 0 || hairBits[i].z < 0) hairBits.splice(i, 1);
  roomsHud(dt);
}

let hudT = 0;
function roomsHud(dt) {
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.25;
  const el = $('roomChip');
  if (!el) return;
  const s = S();
  let txt = '';
  const hall = s.hall.ev;
  const infl = roomOpen('vip') && s.vip.guests.find(g => g.infl && g.state === 'wait');
  const vipWait = roomOpen('vip') && s.vip.guests.filter(g => g.state === 'wait').length;
  const gamers = roomOpen('gamer') && s.gamer.guests.filter(g => g.req).length;
  if (hall) txt = t('Hochzeit {h}/{n} · {s} s', { h: hall.have, n: hall.need, s: Math.ceil(hall.T) });
  else if (infl) txt = t('Influencerin wartet · {s} s', { s: Math.ceil(infl.reqT) });
  else if (roomOpen('shisha') && s.shisha.coal <= 0.15 && s.shisha.guests.some(g => g.state === 'bath'))
    txt = t('Shisha: Kohle nachlegen!');
  else if (gamers) txt = t('Zocker wollen Döner: {n}', { n: gamers });
  else if (vipWait) txt = t('VIP wartet auf Gold-Döner');
  else if (s.viralT > 0) txt = t('Viral! {s} s', { s: Math.ceil(s.viralT) });
  el.hidden = !txt;
  el.textContent = txt;
}

// ---------------------------------------------------------------- Zeichnen: Böden
const FLOORS = {
  barber: (x, y) => ((x + y) % 2 ? '#2b2b30' : '#ecebe6'),
  gamer: (x, y) => ((x + y) % 2 ? '#2b2440' : '#322a4c'),
  shisha: (x, y) => ((x * 3 + y) % 4 === 0 ? '#2f8f8a' : (x + y) % 2 ? '#3aa6a0' : '#44b3ad'),
  vip: (x, y) => ((x + y) % 2 ? '#4a1822' : '#551c28'),
  hall: (x, y) => ((x + (y >> 1)) % 2 ? '#c89a62' : '#bb8c55'),
};
export function drawRoomFloors() {
  // Gehweg vor dem Eingang
  for (let x = 8.6; x < W; x += 0.85)
    for (let y = D; y < BD; y += 1)
      poly([P(x, y), P(Math.min(W, x + 0.85), y), P(Math.min(W, x + 0.85), y + 1), P(x, y + 1)], (Math.floor(x) + y) % 2 ? '#9b949f' : '#928b97');
  for (const r of ROOMS) {
    const open = roomOpen(r.id);
    for (let x = r.x0; x < r.x1; x++)
      for (let y = r.y0; y < r.y1; y += 1) {
        const x1 = Math.min(r.x1, x + 1),
          y1 = Math.min(r.y1, y + 1);
        poly([P(x, y), P(x1, y), P(x1, y1), P(x, y1)], open ? FLOORS[r.id](Math.floor(x - r.x0), Math.floor(y - r.y0)) : (Math.floor(x) + Math.floor(y)) % 2 ? '#3a3040' : '#40354a');
      }
    if (open) drawRoomFloorDecor(r);
  }
}
function drawRoomFloorDecor(r) {
  const tm = G.time;
  if (r.id === 'vip') {
    // roter Teppich von der Tür zum Tisch
    poly([P(0.7, D), P(1.5, D), P(-1.8, 16.5), P(-2.6, 16.5)], '#c0392f');
    poly([P(-5.6, 14.5), P(-4.4, 14.5), P(-4.4, 15.7), P(-5.6, 15.7)], 'rgba(242,199,90,.35)');
  }
  if (r.id === 'hall') {
    // Tanzfläche mit Lichterkette-Schein
    ell(P(FLOOR_C.x, FLOOR_C.y).x, P(FLOOR_C.x, FLOOR_C.y).y, 78, 40, 'rgba(255,230,160,.25)');
  }
  if (r.id === 'gamer') {
    poly([P(-5.9, 5.3), P(-5.6, 5.3), P(-5.6, 8.9), P(-5.9, 8.9)], `rgba(140,90,255,${0.35 + 0.15 * Math.sin(tm * 3)})`);
  }
  if (r.id === 'shisha') {
    const o = P(OVEN.x, OVEN.y);
    ell(o.x, o.y, 22, 11, 'rgba(255,120,40,.18)');
  }
}

// ---------------------------------------------------------------- Zeichnen: Wände (Trennwände, niedrig)
const PH = 36;
function wallSegs() {
  const segs = [];
  const add = (x0, y0, x1, y1, h = PH, gap = null) => {
    const len = Math.hypot(x1 - x0, y1 - y0),
      n = Math.ceil(len / 0.5);
    for (let i = 0; i < n; i++) {
      const a = i / n,
        b = (i + 1) / n,
        sx = x0 + (x1 - x0) * a,
        sy = y0 + (y1 - y0) * a,
        ex = x0 + (x1 - x0) * b,
        ey = y0 + (y1 - y0) * b;
      const m = x0 === x1 ? (sy + ey) / 2 : (sx + ex) / 2;
      if (gap && m > gap[0] && m < gap[1]) continue;
      segs.push({ sx, sy, ex, ey, h });
    }
  };
  const gap = id => (roomOpen(id) ? [R(id).door.a, R(id).door.b] : null);
  add(0, 0, 0, 4.6, PH, gap('barber'));
  add(0, 4.6, 0, 9.3, PH, gap('gamer'));
  add(0, 9.3, 0, D, PH, gap('shisha'));
  add(BX0, 4.6, 0, 4.6);
  add(BX0, 9.3, 0, 9.3);
  add(BX0, D, 0, D);
  add(0, D, 2, D, PH, gap('vip'));
  add(2, D, 8.6, D, PH, gap('hall'));
  add(2, D, 2, BD);
  add(8.6, D, 8.6, BD, 14);
  add(BX0, BD, 8.6, BD, 10);
  return segs;
}
function drawSeg(s) {
  const top = '#3d2f3f',
    f1 = '#e8e1d6',
    f2 = '#d3c9bb';
  if (s.sx === s.ex) box(s.sx - 0.06, Math.min(s.sy, s.ey), 0.12, Math.abs(s.ey - s.sy), s.h, top, f1, f2);
  else box(Math.min(s.sx, s.ex), s.sy - 0.06, Math.abs(s.ex - s.sx), 0.12, s.h, top, f2, f1);
}

/** Deko an den Außenwänden der Räume (Spiegel, Fernseher, Schilder). */
export function drawRoomWallDecor() {
  const tm = G.time || 0;
  if (roomOpen('barber')) {
    // Spiegel an der Rückwand
    for (const cx of [-4.9, -2.9]) {
      poly([P(cx, 0, 90), P(cx + 0.7, 0, 90), P(cx + 0.7, 0, 45), P(cx, 0, 45)], '#bfe0f0');
      poly([P(cx + 0.1, 0, 86), P(cx + 0.25, 0, 86), P(cx + 0.1, 0, 60)], 'rgba(255,255,255,.6)');
    }
    wallSign(-5.8, 0, 'x', '✂ BARBER', '#231a24', '#fff6e8');
  }
  if (roomOpen('gamer')) {
    // großer Fernseher an der linken Außenwand mit Fußballspiel
    const a = P(BX0, 5.9, 95),
      b = P(BX0, 8.3, 95),
      c = P(BX0, 8.3, 45),
      d = P(BX0, 5.9, 45);
    poly([a, b, c, d], '#111');
    const q = [P(BX0, 6.05, 90), P(BX0, 8.15, 90), P(BX0, 8.15, 50), P(BX0, 6.05, 50)];
    poly(q, '#3e8e41');
    const bx = 6.3 + ((Math.sin(tm * 0.9) + 1) / 2) * 1.6,
      bz = 60 + ((Math.cos(tm * 1.3) + 1) / 2) * 20;
    const ball = P(BX0, bx, bz);
    ell(ball.x, ball.y, 3, 3, '#fff');
    wallSign(BX0, 9.1, 'y', '🎮 GAMING', '#2b2440', '#b48cff');
  }
  if (roomOpen('shisha')) wallSign(BX0, 13.8, 'y', '💨 SHISHA SPA', '#1e5e5a', '#bff5ef');
  if (roomOpen('vip')) wallSign(BX0, 19.2, 'y', '👑 VIP', '#4a1822', '#f2c75a');
}
function wallSign(x, y, dir, text, bg, fg) {
  ctx.save();
  const o = P(x, y, 112);
  ctx.translate(o.x, o.y);
  ctx.transform(1, dir === 'x' ? 0.5 : -0.5, 0, 1, 0, 0);
  ctx.font = '12px Bungee, Impact, sans-serif';
  const w = ctx.measureText(text).width + 16;
  rr(0, 0, w, 20, 5, bg);
  ctx.fillStyle = fg;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 8, 11);
  ctx.restore();
}

// ---------------------------------------------------------------- Zeichnen: Möbel, Personen, Effekte
const person = g => drawPersonSprite(g) || drawPerson(g);
function lockedLabel(r) {
  const c = P((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,246,232,.6)';
  ctx.font = '15px Bungee, Impact, sans-serif';
  ctx.fillText('🔒 ' + t(r.name).toUpperCase(), c.x, c.y - 8);
  ctx.font = '800 12px Figtree, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,246,232,.5)';
  ctx.fillText(G.cityLv >= r.lv ? t('Jetzt freischaltbar') : t('Ab Level {l}', { l: r.lv }), c.x, c.y + 12);
}
export function roomDrawables(S0, time) {
  for (const r of ROOMS) if (!roomOpen(r.id)) S0.push({ d: 98, f: () => lockedLabel(r) });
  for (const s of wallSegs()) S0.push({ d: (s.sx + s.ex) / 2 + (s.sy + s.ey) / 2 + 0.01, f: () => drawSeg(s) });
  const st = S();
  if (roomOpen('barber')) {
    CHAIRS.forEach((c, i) =>
      S0.push({ d: c.x + c.y - 0.05, f: () => barberChair(c) }),
    );
    S0.push({ d: -5.6 + 3.3 + 0.2, f: () => box(-5.6, 3.55, 2.2, 0.35, 16, '#8a5a2e', '#5b3a28', '#6e4430') });
    // Barbiere
    [{ x: -4.0, y: 2.1, n: 'Murat' }, { x: -2.0, y: 2.1, n: 'Kemal' }].forEach((b, i) => {
      const busy = st.barber.guests.some(g => g.chair === i && g.state === 'cut');
      const nb = { x: b.x + (busy ? Math.sin(time * 6) * 0.08 : 0), y: b.y, shirt: '#231a24', skin: i ? '#b97a52' : '#d9a47a', hair: '#1b1b1f', staff: true, fx: -1, moving: busy, phase: time * 8, carry: 0, items: [] };
      S0.push({ d: b.x + b.y, f: () => person(nb) });
    });
    // Barber-Pole an der Tür
    S0.push({ d: -0.3 + 3.4, f: () => barberPole(-0.3, 3.4, time) });
    for (const g of st.barber.guests) S0.push({ d: g.x + g.y + 0.01, f: () => person(g) });
    for (const h of hairBits) S0.push({ d: h.x + h.y + 0.02, f: () => { const p = P(h.x, h.y, h.z); ctx.fillStyle = '#231a24'; ctx.fillRect(p.x, p.y, 2, 1); } });
  }
  if (roomOpen('gamer')) {
    for (const y0 of [5.5, 7.4]) S0.push({ d: -4.3 + y0 + 1.4, f: () => sofa(-4.3, y0) });
    S0.push({ d: -5.9 + 5.8 + 1.5, f: () => box(-5.9, 6.4, 0.4, 1.6, 22, '#231a24', '#1b1b1f', '#2a2a30') });
    for (const g of st.gamer.guests)
      S0.push({
        d: g.x + g.y + 0.02,
        f: () => {
          person(g);
          const p = P(g.x, g.y, 30);
          if (g.state === 'play') rr(p.x - 5, p.y - 2 + Math.sin(time * 20 + g.x) * 0.8, 10, 5, 2, '#1b1b1f');
          if (g.req) {
            const q = P(g.x, g.y, 72);
            rr(q.x - 14, q.y - 12, 28, 18, 7, g.reqT < 8 ? '#ff8a7f' : '#fff6e8');
            drawDoner(q.x, q.y);
          }
        },
      });
  }
  if (roomOpen('shisha')) {
    S0.push({ d: POOL.x + POOL.y - 1.2, f: () => pool(time, st.shisha) });
    for (const h of HOOKAHS) S0.push({ d: h.x + h.y + 0.1, f: () => hookah(h, st.shisha.coal) });
    S0.push({ d: OVEN.x + OVEN.y, f: () => oven(st.shisha.coal, time) });
    for (const g of st.shisha.guests)
      if (g.state !== 'bath') S0.push({ d: g.x + g.y + 0.02, f: () => person(g) });
    for (const p of st.shisha.smoke)
      S0.push({
        d: 99,
        f: () => {
          const q = P(p.x, p.y, p.z);
          ctx.fillStyle = `rgba(230,230,235,${0.28 * p.life})`;
          ctx.beginPath();
          ctx.arc(q.x, q.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        },
      });
  }
  if (roomOpen('vip')) {
    S0.push({ d: -3.1 + 16.4 + 0.8, f: () => goldTable(time) });
    S0.push({ d: GOLDST.x + GOLDST.y, f: () => goldStation(time) });
    S0.push({ d: 1.9 + 14.3, f: () => ropes() });
    for (const g of st.vip.guests)
      S0.push({
        d: g.x + g.y + 0.02,
        f: () => {
          person(g);
          if (g.infl) ringLight(g, time);
          if (g.state === 'wait') {
            const q = P(g.x, g.y, 76);
            rr(q.x - 14, q.y - 12, 28, 18, 7, g.reqT < 10 ? '#ff8a7f' : '#f2c75a');
            drawGold(q.x, q.y);
          }
        },
      });
  }
  if (roomOpen('hall')) {
    S0.push({ d: 3.4 + 18.7 + 0.7, f: () => buffet(st.hall.ev) });
    S0.push({ d: 7.8 + 15.1, f: () => musicians(time, !!st.hall.ev) });
    for (const d of st.hall.dancers) S0.push({ d: d.x + d.y, f: () => person(d) });
    S0.push({ d: 99, f: () => lights(time) });
  }
}

function barberChair(c) {
  const p = P(c.x, c.y);
  ell(p.x, p.y, 12, 6, 'rgba(20,10,20,.2)');
  box(c.x - 0.1, c.y - 0.1, 0.2, 0.2, 10, '#8d969b', '#6d767c', '#7b8489');
  box(c.x - 0.28, c.y - 0.28, 0.56, 0.56, 8, '#c0392f', '#8f2721', '#a8261f', 10);
  box(c.x - 0.3, c.y + 0.22, 0.6, 0.08, 22, '#c0392f', '#8f2721', '#a8261f', 18);
}
function barberPole(x, y, tm) {
  box(x - 0.08, y - 0.08, 0.16, 0.16, 40, '#fff', '#e8e1d6', '#f7f3ea', 10);
  const p = P(x, y, 10);
  for (let i = 0; i < 5; i++) {
    const z = ((i * 8 + tm * 20) % 40) + 10;
    const q = P(x, y, z);
    ctx.fillStyle = i % 2 ? '#d8342b' : '#2f5f93';
    ctx.fillRect(q.x - 3, q.y - 3, 6, 3);
  }
  ell(p.x, p.y - 42, 5, 3, '#c0392f');
}
function sofa(x, y) {
  box(x, y, 0.7, 1.4, 14, '#5a3fa0', '#3f2a73', '#4a3288');
  box(x, y, 0.2, 1.4, 30, '#6b4ab8', '#3f2a73', '#4a3288');
}
function pool(tm, s) {
  const c = P(POOL.x, POOL.y);
  ell(c.x, c.y + 2, 98, 50, '#e8e1d6');
  ell(c.x, c.y, 90, 45, '#3fb6c8');
  ell(c.x, c.y, 80, 39, `rgba(120,220,235,${0.5 + 0.2 * Math.sin(tm * 3)})`);
  for (let i = 0; i < 10; i++) {
    const a = i * 2.3 + tm * 1.7,
      rx = Math.cos(a) * 60 * ((i % 3) / 3 + 0.3),
      ry = Math.sin(a * 1.3) * 26 * ((i % 4) / 4 + 0.3);
    ell(c.x + rx, c.y + ry, 3 + (i % 2), 1.6, 'rgba(255,255,255,.7)');
  }
  // Badegäste: nur Kopf und Schultern schauen aus dem Wasser
  for (const g of s.guests) {
    if (g.state !== 'bath') continue;
    const q = P(g.x, g.y);
    ell(q.x, q.y - 4, 10, 5, 'rgba(0,60,80,.25)');
    rr(q.x - 8, q.y - 14, 16, 10, 5, g.skin);
    ell(q.x, q.y - 22, 7, 7, g.skin);
    ctx.beginPath();
    ctx.arc(q.x, q.y - 23, 7.3, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fillStyle = g.hair;
    ctx.fill();
    if (g.mood < 0.5) floatMood(q, '😤');
  }
}
function floatMood(q, s) {
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(s, q.x, q.y - 36);
}
function hookah(h, coal) {
  const p = P(h.x, h.y);
  ell(p.x, p.y, 8, 4, 'rgba(20,10,20,.2)');
  ell(p.x, p.y - 6, 7, 6, '#4fae62');
  ctx.fillStyle = '#b9c1c5';
  ctx.fillRect(p.x - 1.5, p.y - 34, 3, 28);
  ell(p.x, p.y - 36, 5, 3, '#8a5a2e');
  ell(p.x, p.y - 38, 3.5, 2, coal > 0 ? '#ff7a2a' : '#555');
}
function oven(coal, tm) {
  box(OVEN.x - 0.3, OVEN.y - 0.3, 0.6, 0.6, 26, '#5a6368', '#3b4247', '#4a5257');
  const q = P(OVEN.x, OVEN.y, 26);
  ell(q.x, q.y, 12, 6, coal > 0.2 ? `rgba(255,${120 + 40 * Math.sin(tm * 8)},40,.9)` : '#2e3438');
  const c = P(OVEN.x, OVEN.y, 52);
  chip(c.x, c.y, t('KOHLE') + ' ' + Math.round(coal * 100) + '%', coal < 0.2 ? '#d8342b' : '#231a24', '#fff6e8', '9px Bungee, Impact, sans-serif');
}
function goldTable(tm) {
  box(-3.1, 16.4, 1.0, 0.8, 22, '#f2c75a', '#b8912f', '#d4a93f');
  const q = P(-2.6, 16.8, 22);
  ell(q.x, q.y, 9, 4, `rgba(255,255,255,${0.4 + 0.3 * Math.sin(tm * 4)})`);
  for (const s of VIPSEATS) box(s.x - 0.25, s.y - 0.25, 0.5, 0.5, 12, '#8a1f2e', '#5a1420', '#6e1826');
}
function goldStation(tm) {
  box(GOLDST.x - 0.35, GOLDST.y - 0.3, 0.7, 0.6, 30, '#f2c75a', '#b8912f', '#d4a93f');
  const c = P(GOLDST.x, GOLDST.y, 56);
  chip(c.x, c.y, t('BLATTGOLD'), '#b8912f', '#fff6e8', '9px Bungee, Impact, sans-serif');
  for (let i = 0; i < 3; i++) {
    const a = tm * 2 + i * 2.1,
      q = P(GOLDST.x + Math.cos(a) * 0.3, GOLDST.y + Math.sin(a) * 0.3, 34 + Math.sin(a * 2) * 4);
    ctx.fillStyle = '#fff2b0';
    ctx.fillRect(q.x - 1, q.y - 1, 2, 2);
  }
}
function ropes() {
  for (const x of [0.35, 1.85]) box(x - 0.05, D + 0.2, 0.1, 0.1, 22, '#f2c75a', '#b8912f', '#d4a93f');
}
function ringLight(g, tm) {
  const p = P(g.x + g.fx * 0.35, g.y, 44);
  ctx.strokeStyle = '#fff6e8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
  ctx.stroke();
  if (Math.floor(tm * 2) % 2) ell(p.x + 9, p.y - 8, 2.5, 2.5, '#d8342b');
}
function buffet(ev) {
  box(3.4, 18.7, 4.0, 0.7, 24, '#f7f3ea', '#d3c9bb', '#e8e1d6');
  const n = ev ? Math.min(40, ev.have) : 0;
  for (let i = 0; i < n; i++) {
    const q = P(3.6 + (i % 10) * 0.37, 19.05, 24 + Math.floor(i / 10) * 5);
    drawDoner(q.x, q.y);
  }
  const c = P(BUFFET.x, BUFFET.y + 0.8, 60);
  if (ev) chip(c.x, c.y, t('BUFFET') + ' ' + ev.have + '/' + ev.need, '#c24d78', '#fff6e8', '10px Bungee, Impact, sans-serif');
  else chip(c.x, c.y, t('BUFFET'), '#6b5a6d', '#fff6e8', '9px Bungee, Impact, sans-serif');
}
function musicians(tm, on) {
  const a = { x: 7.8, y: 15.2, shirt: '#2f5f93', skin: '#b97a52', hair: '#2b1d16', fx: -1, moving: on, phase: tm * 10, carry: 0, items: [] },
    b = { x: 7.9, y: 16.2, shirt: '#8a2f5a', skin: '#d9a47a', hair: '#6b6b6b', fx: -1, moving: on, phase: tm * 10 + 1, carry: 0, items: [] };
  person(a);
  person(b);
  // Davul
  const p = P(a.x - 0.25, a.y, 24);
  ell(p.x, p.y, 8, 8, '#c0392f');
  ell(p.x, p.y, 6, 6, '#f7f3ea');
  if (on && Math.floor(tm * 4) % 2) ell(p.x, p.y, 9, 9, 'rgba(255,255,255,.25)');
}
function lights(tm) {
  if (!roomOpen('hall')) return;
  // Lichterkette quer durch den Saal
  const pts = [];
  for (let i = 0; i <= 12; i++) pts.push(P(2.3 + i * 0.5, 16.8, 104 - Math.sin((i / 12) * Math.PI) * 22));
  ctx.strokeStyle = 'rgba(35,26,36,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.stroke();
  pts.forEach((q, i) => ell(q.x, q.y + 2, 2.6, 2.6, `hsla(${(i * 40 + tm * 60) % 360},90%,70%,.95)`));
}

export function initRooms() {}
