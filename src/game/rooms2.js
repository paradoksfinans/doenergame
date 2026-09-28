// rooms2.js – der Anbau hinter VIP-Lounge und Hochzeitssaal: ein Flur mit sechs Plätzen.
//   überall:  Katzen-Lounge, Scharf-Challenge, Livestream-Studio
//   Berlin:   Handy-Reparatur, Döner-Tattoo          Hamburg: Arabesk-Karaoke, Mama-Küche
//   München:  Waschanlage, Fitness-Ecke, Riesenspieß  Köln:    Döner-Automat, Domblick-Terrasse, Kochschule
//   Istanbul: Hamam, Tavla-Ecke, Kedi-Garten (und Straßenkatzen im Gastraum)
// Möbel werden in Raumkoordinaten angegeben: u = Abstand von der Flurwand (Tür), v = Abstand von der
// Rückwand des Raums. So passen dieselben Maße links und rechts vom Flur.
import { G, price, relax } from './state.js';
import { D, W, FL0, FL1, FLX, FY, EXIT, dist, rnd, ctx } from './config.js';
import { P, box, ell, rr, poly, chip } from './iso.js';
import { drawDoner, drawPlant, stackTop } from './sprites.js';
import { moveToward, sale, rate } from './world.js';
import { floatText, fly } from './fx.js';
import { sfx } from './audio.js';
import { showBanner } from './hud.js';
import { t } from './i18n.js';
import { burst } from './confetti.js';
import { phaseNow } from './daynight.js';
import { wingRooms, roomOpen, FL_OUT, FL_IN } from './rooms.js';
import { TUBE, tubeStock, tubeTake } from './stage3.js';

let H = null;
/** rooms.js reicht seine Hilfsfunktionen herein (Gäste erzeugen, laufen, zeichnen …). */
export function setWingHelpers(h) {
  H = h;
}

// ---------------------------------------------------------------- Raumkoordinaten
const LX = (r, u) => (r.side < 0 ? FL0 - u : FL1 + u);
const L = (r, u, v) => ({ x: LX(r, u), y: r.y0 + v });
const LR = (r, u, v, w, d) => ({ x: r.side < 0 ? FL0 - u - w : FL1 + u, y: r.y0 + v, w, d });
function bx(r, u, v, w, d, h, top, left, right, z = 0) {
  const q = LR(r, u, v, w, d);
  box(q.x, q.y, w, d, h, top, left, right, z);
}
const dep = (r, u, v) => LX(r, u) + r.y0 + v;
const PL = () => G.player;
const plIn = r => H.inRoom(r, G.player.x, G.player.y);
function face(g, p) {
  const sx = p.x - g.x - (p.y - g.y);
  if (Math.abs(sx) > 0.01) g.fx = sx > 0 ? 1 : -1;
}
function takeD(pl) {
  const i = pl.items.lastIndexOf('d');
  if (i < 0) return false;
  pl.items.splice(i, 1);
  pl.carry = pl.items.length;
  return true;
}
const label = (x, y, z, text, bg = '#231a24') => {
  const c = P(x, y, z);
  chip(c.x, c.y, text, bg, '#fff6e8', '9px Bungee, Impact, sans-serif');
};
function bar(x, y, z, f, col = '#4fae62') {
  const c = P(x, y, z);
  rr(c.x - 18, c.y - 3, 36, 6, 3, 'rgba(35,26,36,.75)');
  rr(c.x - 17, c.y - 2, 34 * Math.max(0, Math.min(1, f)), 4, 2, col);
}
function bubble(g, z, icon, urgent) {
  const q = P(g.x, g.y, z);
  rr(q.x - 15, q.y - 12, 30, 18, 7, urgent ? '#ff8a7f' : '#fff6e8');
  if (icon) {
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, q.x - 7, q.y - 3);
    drawDoner(q.x + 6, q.y + 1);
  } else drawDoner(q.x, q.y);
}

// ---------------------------------------------------------------- Zustand
function WS() {
  const s = H.S();
  if (!s.wing) s.wing = {};
  return s.wing;
}
function ST(r) {
  const w = WS();
  if (!w[r.id]) {
    const c = CFG[r.id];
    w[r.id] = { guests: [], spawnT: 3, res: 1, resT: 0, fx: [], ...(c.init ? c.init(r) : {}) };
  }
  return w[r.id];
}
const openWing = () => wingRooms().filter(r => roomOpen(r.id));

// ---------------------------------------------------------------- Katzen (Lounge, Kedi-Garten, Istanbul)
const CATCOL = ['#e89a4a', '#3a3032', '#f2efe9', '#9a9aa3', '#c9a27a', '#e8c28a'];
function mkCats(n, box0) {
  return Array.from({ length: n }, (_, i) => ({
    x: box0.x0 + Math.random() * (box0.x1 - box0.x0),
    y: box0.y0 + Math.random() * (box0.y1 - box0.y0),
    tx: 0,
    ty: 0,
    t: Math.random() * 3,
    col: CATCOL[i % CATCOL.length],
    fx: 1,
    nap: Math.random() < 0.3,
    moving: false,
    path: [],
  }));
}
function roomBox(r, m = 0.7) {
  return { x0: r.x0 + m, x1: r.x1 - m, y0: r.y0 + m, y1: r.y1 - m };
}
function catWander(c, b, dt, guests) {
  if (c.path.length) {
    const p = c.path[0];
    if (moveToward(c, p.x, p.y, c.fast ? 2.4 : 0.9, dt)) c.path.shift();
    return;
  }
  c.t -= dt;
  if (c.t <= 0) {
    c.t = 3 + Math.random() * 5;
    c.nap = Math.random() < 0.25;
    const g = guests && guests.length && Math.random() < 0.4 ? rnd(guests) : null;
    const tx = g ? g.x + (Math.random() - 0.5) * 0.6 : b.x0 + Math.random() * (b.x1 - b.x0),
      ty = g ? g.y + 0.35 : b.y0 + Math.random() * (b.y1 - b.y0);
    if (!c.nap) c.path = [{ x: Math.max(b.x0, Math.min(b.x1, tx)), y: Math.max(b.y0, Math.min(b.y1, ty)) }];
  }
  c.moving = false;
}
function drawCat(c, tm, big = 1) {
  const p = P(c.x, c.y, c.z || 0),
    f = c.fx || 1,
    s = big;
  ell(p.x, p.y, 9 * s, 4 * s, 'rgba(20,10,20,.2)');
  if (c.nap) {
    ell(p.x, p.y - 4 * s, 8 * s, 5 * s, c.col);
    ell(p.x + f * 5 * s, p.y - 5 * s, 4 * s, 3.5 * s, c.col);
    ctx.fillStyle = 'rgba(35,26,36,.5)';
    ctx.font = '9px sans-serif';
    ctx.fillText('z', p.x + 8, p.y - 14 - ((tm * 6) % 6));
    return;
  }
  const b = c.moving ? Math.abs(Math.sin(tm * 14 + c.x)) * 1.5 : 0;
  // Schwanz
  ctx.strokeStyle = c.col;
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.moveTo(p.x - f * 7 * s, p.y - 6 * s);
  ctx.quadraticCurveTo(
    p.x - f * 12 * s,
    p.y - 12 * s + Math.sin(tm * 4 + c.y) * 3,
    p.x - f * 9 * s,
    p.y - 17 * s,
  );
  ctx.stroke();
  ctx.fillStyle = c.col;
  ctx.fillRect(p.x - 5 * s, p.y - 4 * s, 2 * s, 4 * s);
  ctx.fillRect(p.x + 3 * s, p.y - 4 * s, 2 * s, 4 * s);
  ell(p.x, p.y - 7 * s - b, 8 * s, 4.5 * s, c.col);
  const hx = p.x + f * 7 * s,
    hy = p.y - 11 * s - b;
  ell(hx, hy, 4.6 * s, 4.2 * s, c.col);
  poly(
    [
      { x: hx - 4 * s, y: hy - 2 * s },
      { x: hx - 3 * s, y: hy - 8 * s },
      { x: hx - 0.5 * s, y: hy - 3 * s },
    ],
    c.col,
  );
  poly(
    [
      { x: hx + 4 * s, y: hy - 2 * s },
      { x: hx + 3 * s, y: hy - 8 * s },
      { x: hx + 0.5 * s, y: hy - 3 * s },
    ],
    c.col,
  );
  ctx.fillStyle = '#231a24';
  ctx.fillRect(hx + f * 1.5 - 1, hy - 1, 1.6, 1.6);
  if (c.carry) drawDoner(hx + f * 5, hy + 2);
}
// Istanbul: Straßenkatzen dösen im Gastraum
let streetCats = null,
  streetCity = -1;
function streetCatsTick(dt) {
  if (G.city % 5 !== 4) {
    streetCats = null;
    return;
  }
  if (!streetCats || streetCity !== G.city) {
    streetCity = G.city;
    streetCats = mkCats(3, { x0: 1.2, x1: 8.5, y0: 6.5, y1: 15 });
  }
  for (const c of streetCats) catWander(c, { x0: 1.2, x1: 8.5, y0: 6.5, y1: 15 }, dt, null);
}

// ---------------------------------------------------------------- allgemeiner Gast-Ablauf
function spawnGuest(c, st, r) {
  const free = c.spots.findIndex((_, i) => !st.guests.some(o => o.spot === i));
  if (free < 0) return null;
  const sp = c.spots[free];
  const g = H.mkGuest(Object.assign({ spot: free, state: 'in', mood: 1 }, c.look ? c.look() : {}));
  g.path = H.goIn(r, L(r, sp.u, sp.v));
  st.guests.push(g);
  return g;
}
function resTick(c, st, r, dt, busy) {
  const rs = c.res,
    pl = PL(),
    at = L(r, rs.u, rs.v);
  if (rs.drain && busy) st.res = Math.max(0, st.res - dt / (rs.drain * (relax() ? 1.5 : 1)));
  st.resT -= dt;
  if (st.resT > 0 || !plIn(r)) return;
  if (rs.kind === 'stand') {
    if (dist(pl, at) < 1.0 && st.res < 0.95) {
      st.res = 1;
      st.resT = 1;
      floatText(at.x, at.y, 60, t(rs.done), '#f2b134');
      sfx('stack', 0.6, 0.8);
    }
  } else if (st.res < 0.99 && dist(pl, at) < 1.1 && takeD(pl)) {
    st.res = Math.min(1, st.res + rs.per);
    st.resT = 0.15;
    fly('d', P(pl.x, pl.y, 26 + pl.carry * 5), at, 24);
    sfx('stack', 0.6, 1.1);
  }
}
function serveReq(c, st, r, g, from) {
  fly('d', P(from.x, from.y, 26 + (from.carry || 0) * 5), g, 30);
  const m = c.req.mul;
  if (m) sale(r.slot, Math.round(price() * m), g.x, g.y, c.req.label || '');
  sfx('serve', 0.4);
  g.req = false;
  g.claim = null;
  g.happy = 2;
  g.mood = Math.min(1, g.mood + 0.2);
  if (c.onServed) c.onServed(g, st, r);
}
function reqTick(c, st, r, g, dt) {
  if (!c.req) return;
  if (g.wantIn != null && !g.req) {
    g.wantIn -= dt;
    if (g.wantIn <= 0) {
      g.wantIn = null;
      g.req = true;
      g.reqT = c.req.pat * (relax() ? 1.5 : 1);
    }
  }
  if (!g.req) return;
  g.reqT -= dt;
  const pl = PL();
  if (plIn(r) && dist(pl, g) < 1.4 && st.serveT <= 0 && takeD(pl)) {
    st.serveT = 0.3;
    serveReq(c, st, r, g, pl);
  } else if (g.reqT <= 0) {
    g.req = false;
    g.claim = null;
    floatText(g.x, g.y, 80, '😤', '#ff8a7f');
    rate(-0.03);
    if (c.onReqFail) c.onReqFail(g, st, r);
    else g.mood = Math.max(0, g.mood - 0.45);
  }
}
function leave(c, st, r, g, pay = true) {
  g.lie = false;
  g.hide = false;
  g.anim = false;
  if (pay && c.fee) {
    const fee = Math.round(c.fee * H.pm() * (0.4 + 0.6 * g.mood) * (c.feeMul ? c.feeMul(g, st, r) : 1));
    if (fee > 0) sale(r.slot, fee, g.x, g.y, c.icon || '');
  }
  if (c.spots[g.spot]) {
    const sp = c.spots[g.spot];
    if (sp.pose === 'lie') {
      const q = L(r, sp.u - 0.8, sp.v);
      g.x = q.x;
      g.y = q.y;
    }
  }
  H.goOut(g, r);
}
function genTick(c, st, r, dt) {
  st.serveT = (st.serveT || 0) - dt;
  st.spawnT -= dt;
  if (st.spawnT <= 0) {
    st.spawnT = c.spawn * (relax() ? 1.4 : 1) * (0.7 + Math.random() * 0.6);
    if (!c.canSpawn || c.canSpawn(st, r)) spawnGuest(c, st, r);
  }
  const busy = c.busy ? c.busy(st, r) : st.guests.some(g => g.state !== 'in' && g.state !== 'out');
  if (c.res) resTick(c, st, r, dt, busy);
  for (const g of st.guests) {
    g.phase += g.moving || g.anim ? dt * 12 : 0;
    if (g.state === 'in') {
      if (H.walk(g, dt)) {
        const sp = c.spots[g.spot];
        g.state = 'stay';
        g.sitting = sp.pose === 'sit' || sp.pose === 'lift';
        g.lie = sp.pose === 'lie';
        g.hide = g.lie;
        g.anim = sp.pose === 'run';
        if (sp.fu != null) face(g, L(r, sp.fu, sp.fv));
        g.T = c.stay[0] + Math.random() * (c.stay[1] - c.stay[0]);
        g.T0 = g.T;
        if (c.req && Math.random() < c.req.chance)
          g.wantIn = c.req.at ? c.req.at(g) : 3 + Math.random() * g.T * 0.4;
        if (c.onArrive) c.onArrive(g, st, r);
      }
    } else if (g.state === 'stay') {
      if (!c.noTimer && !(g.req || g.wantIn != null)) g.T -= dt;
      else if (!c.noTimer) g.T = Math.max(0.5, g.T - dt);
      if (c.res && !c.res.noMood && st.res <= 0) g.mood = Math.max(0, g.mood - dt / 25);
      reqTick(c, st, r, g, dt);
      if (g.state !== 'stay') continue;
      if (g.anim) g.moving = true;
      if (c.onStay) c.onStay(g, st, r, dt);
      if (g.state !== 'stay') continue;
      if (g.mood <= 0) {
        floatText(g.x, g.y, 80, '😤', '#ff8a7f');
        rate(-0.03);
        leave(c, st, r, g, false);
      } else if (!c.noTimer && g.T <= 0) leave(c, st, r, g, true);
    } else if (g.state === 'out') {
      if (H.walk(g, dt, 2.8)) g.dead = true;
    } else if (c.stateTick) c.stateTick(g, st, r, dt);
  }
  st.guests = st.guests.filter(g => !g.dead);
  for (const p of st.fx) {
    p.z += dt * (p.vz || 18);
    p.life -= dt / (p.dur || 1.4);
  }
  st.fx = st.fx.filter(p => p.life > 0);
  if (c.extra) c.extra(st, r, dt);
}
const heart = (st, x, y, z = 40, ch = '❤') => st.fx.push({ x, y, z, life: 1, ch });
function drawGuests(S0, st, r, extra) {
  for (const g of st.guests)
    S0.push({
      d: g.x + g.y + 0.02,
      f: () => {
        if (!g.hide) H.person(g);
        if (extra) extra(g);
        if (g.req) bubble(g, g.sitting ? 66 : 74, g.reqIcon || '', g.reqT < 10);
      },
    });
}
function drawFx(S0, st) {
  for (const p of st.fx)
    S0.push({
      d: 99,
      f: () => {
        const q = P(p.x, p.y, p.z);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.font = (p.size || 12) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = p.col || '#d8342b';
        ctx.fillText(p.ch, q.x, q.y);
        ctx.globalAlpha = 1;
      },
    });
}
function resChip(c, st, r, z = 50) {
  const rs = c.res,
    at = L(r, rs.u, rs.v);
  const low = st.res < 0.2;
  label(at.x, at.y, z, t(rs.name) + ' ' + Math.round(st.res * 100) + '%', low ? '#d8342b' : '#231a24');
}
function npc(x, y, look) {
  return Object.assign(
    {
      x,
      y,
      shirt: '#231a24',
      skin: '#d9a47a',
      hair: '#1b1b1f',
      staff: true,
      fx: -1,
      moving: false,
      phase: 0,
      carry: 0,
      items: [],
    },
    look,
  );
}
function lyingPerson(g) {
  const p = P(g.x, g.y, 14);
  ell(p.x, p.y + 2, 20, 7, 'rgba(20,10,20,.15)');
  rr(p.x - 16, p.y - 7, 26, 10, 5, g.skin);
  rr(p.x - 8, p.y - 7, 14, 10, 3, g.towel || '#c0392f');
  ell(p.x + 14, p.y - 4, 6, 6, g.skin);
  ctx.beginPath();
  ctx.arc(p.x + 14, p.y - 5, 6.3, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fillStyle = g.hair;
  ctx.fill();
}

// ================================================================ Räume
const CFG = {};

// ---------------------------------------------------------------- Katzen-Lounge
CFG.cat = {
  floor: (x, y) => ((x + y) % 2 ? '#f3d9d4' : '#f8e6df'),
  sign: ['🐱 KATZEN-LOUNGE', '#c24d78', '#fff6e8'],
  furn: [[6.8, 3.4, 0.9, 0.9]],
  spots: [
    { u: 2.8, v: 1.4, pose: 'sit', fu: 4, fv: 3.8 },
    { u: 4.6, v: 1.4, pose: 'sit', fu: 4, fv: 3.8 },
    { u: 6.4, v: 1.4, pose: 'sit', fu: 4, fv: 3.8 },
    { u: 2.8, v: 6.2, pose: 'sit', fu: 4, fv: 3.8 },
    { u: 4.6, v: 6.2, pose: 'sit', fu: 4, fv: 3.8 },
    { u: 6.4, v: 6.2, pose: 'sit', fu: 4, fv: 3.8 },
  ],
  spawn: 9,
  stay: [45, 70],
  fee: 14,
  icon: '🐱',
  res: { kind: 'item', u: 1.6, v: 1.1, per: 0.25, drain: 300, name: 'NAPF', done: '' },
  init: r => ({ cats: mkCats(G.city % 5 === 4 ? 9 : 5, roomBox(r)), thiefT: 50 }),
  onStay(g, st, r, dt) {
    if (st.res > 0 && Math.random() < dt * 0.25) heart(st, g.x, g.y, 48);
  },
  extra(st, r, dt) {
    const b = roomBox(r),
      seated = st.guests.filter(g => g.state === 'stay');
    for (const c of st.cats) if (!c.thief) catWander(c, b, dt, seated);
    if (st.res <= 0 && seated.length && Math.random() < dt * 0.2) {
      const c = rnd(st.cats);
      floatText(c.x, c.y, 40, t('Miau!'), '#ff8a7f');
    }
    // Katzendieb: ohne Katzenklappe schleicht sich ab und zu eine Katze an die Theke
    if (!G.unlocked.has('catFlap')) {
      st.thiefT -= dt;
      const th = st.cats.find(c => c.thief);
      if (!th && st.thiefT <= 0 && G.stock.counter > 0) {
        st.thiefT = relax() ? 90 : 55 + Math.random() * 25;
        const c = rnd(st.cats);
        c.thief = 'go';
        c.fast = true;
        c.nap = false;
        c.path = [H.doorIn(r), H.doorOut(r), FL_IN, FL_OUT, { x: 4.2, y: 5.05 }];
      }
      if (th && !th.path.length) {
        if (th.thief === 'go') {
          if (G.stock.counter > 0) {
            G.stock.counter--;
            th.carry = true;
            floatText(th.x, th.y, 60, t('Katze klaut Döner!'), '#ff8a7f');
            sfx('bad', 0.4, 1.6);
            rate(-0.02);
          }
          th.thief = 'back';
          th.path = [FL_OUT, FL_IN, H.doorOut(r), H.doorIn(r), L(r, 5, 3.8)];
        } else {
          th.thief = null;
          th.fast = false;
          th.carry = false;
        }
      }
      for (const c of st.cats)
        if (c.thief && c.path.length) {
          const p = c.path[0];
          if (moveToward(c, p.x, p.y, 2.4, dt)) c.path.shift();
        }
    } else
      for (const c of st.cats)
        if (c.thief) {
          c.thief = null;
          c.fast = false;
          c.carry = false;
          c.path = [L(r, 5, 3.8)];
        }
  },
  draw(S0, st, r, tm) {
    // Kissen
    for (const sp of CFG.cat.spots) {
      const q = L(r, sp.u, sp.v);
      S0.push({
        d: q.x + q.y - 0.3,
        f: () => {
          const p = P(q.x, q.y);
          ell(p.x, p.y, 16, 8, '#c24d78');
          ell(p.x, p.y - 2, 13, 6, '#e07aa0');
        },
      });
    }
    // Kratzbaum
    const kb = LR(r, 6.8, 3.4, 0.9, 0.9);
    S0.push({
      d: kb.x + kb.y + 0.9,
      f: () => {
        box(kb.x, kb.y, 0.9, 0.9, 8, '#c9a27a', '#a07e5a', '#b38e68');
        box(kb.x + 0.3, kb.y + 0.3, 0.3, 0.3, 70, '#e8d8b8', '#bca77f', '#cfbb92', 8);
        box(kb.x + 0.05, kb.y + 0.05, 0.8, 0.8, 5, '#c24d78', '#8f3a5a', '#a8456a', 40);
        box(kb.x + 0.1, kb.y + 0.1, 0.7, 0.7, 5, '#c24d78', '#8f3a5a', '#a8456a', 72);
      },
    });
    // Napf
    const n = L(r, CFG.cat.res.u, CFG.cat.res.v);
    S0.push({
      d: n.x + n.y,
      f: () => {
        const p = P(n.x, n.y);
        ell(p.x, p.y, 13, 6.5, '#2f5f93');
        ell(p.x, p.y - 2, 10, 4.5, st.res > 0 ? '#8a5a2e' : '#1b2f48');
        if (st.res > 0) ell(p.x, p.y - 3, 8 * st.res + 1, 3.5 * st.res + 0.5, '#b8773e');
        resChip(CFG.cat, st, r, 34);
      },
    });
    for (const c of st.cats)
      S0.push({ d: c.x + c.y + 0.03, f: () => drawCat(c, tm, G.city % 5 === 4 ? 1.25 : 1) });
    drawGuests(S0, st, r);
    drawFx(S0, st);
  },
  hud: (st, r) => (st.res <= 0 && st.guests.length ? t('Katzen haben Hunger!') : ''),
};

// ---------------------------------------------------------------- Scharf-Challenge
CFG.spicy = {
  floor: (x, y) => ((x + y) % 2 ? '#3a1414' : '#5a1c18'),
  sign: ['🌶 SCHARF-CHALLENGE', '#d8342b', '#fff6e8'],
  furn: [[3.2, 3.3, 2.0, 1.0]],
  spots: [
    { u: 2.7, v: 3.8, pose: 'sit', fu: 4.2, fv: 3.8 },
    { u: 5.7, v: 3.8, pose: 'sit', fu: 4.2, fv: 3.8 },
  ],
  spawn: 16,
  stay: [999, 999],
  noTimer: true,
  fee: 0,
  req: { chance: 1, mul: 0, pat: 80, at: () => 0.4 },
  init: () => ({ wins: 0 }),
  look: () => ({ reqIcon: '🌶' }),
  onServed(g) {
    g.state = 'eat';
    g.T = 7;
    g.heat = 0;
  },
  onReqFail(g, st, r) {
    leave(CFG.spicy, st, r, g, false);
  },
  stateTick(g, st, r, dt) {
    const c = CFG.spicy;
    if (g.state === 'eat') {
      g.T -= dt;
      g.heat = Math.min(1, g.heat + dt / 6);
      if (Math.random() < dt * 4) heart(st, g.x + (Math.random() - 0.5) * 0.3, g.y, 60, '🔥');
      if (g.T <= 0) {
        if (Math.random() < 0.4) {
          st.wins++;
          sale(r.slot, Math.round(price() * 2), g.x, g.y, t('LEGENDE!'));
          rate(0.04);
          burst(40);
          sfx('fanfare', 0.6);
          g.happy = 3;
          g.heat = 0.3;
          leave(c, st, r, g, false);
        } else {
          sale(r.slot, Math.round(price() * 6), g.x, g.y, t('ZU SCHARF!'));
          sfx('bad', 0.6, 0.8);
          g.sitting = false;
          if (G.unlocked.has('spicyMilk')) {
            g.state = 'milk';
            g.path = [L(r, 7.0, 6.2)];
          } else {
            g.state = 'run';
            g.path = [H.doorIn(r), H.doorOut(r), FL_IN, FL_OUT, { x: 5.6, y: 6.6 }];
          }
        }
      }
    } else if (g.state === 'milk') {
      if (H.walk(g, dt, 3.5)) {
        g.state = 'drink';
        g.T = 3;
      }
    } else if (g.state === 'drink') {
      g.T -= dt;
      g.heat = Math.max(0, g.heat - dt / 3);
      if (g.T <= 0) leave(c, st, r, g, false);
    } else if (g.state === 'run') {
      if (Math.random() < dt * 2) floatText(g.x, g.y, 70, t('WASSER!!!'), '#ff8a7f');
      if (H.walk(g, dt, 4.2)) {
        for (const q of G.customers) if (q.state === 'queue' && !relax()) q.pat -= 4;
        rate(-0.03);
        floatText(g.x, g.y, 80, t('Mein Mund brennt!'), '#ff8a7f');
        g.state = 'out';
        g.path = [
          { x: 10.4, y: D - 0.9 },
          { x: EXIT.x, y: EXIT.y },
        ];
      }
    }
  },
  draw(S0, st, r, tm) {
    const tb = LR(r, 3.2, 3.3, 2.0, 1.0);
    S0.push({
      d: tb.x + tb.y + 1.4,
      f: () => {
        box(tb.x, tb.y, 2, 1, 24, '#231a24', '#120c12', '#1b141b');
        const q = P(tb.x + 1, tb.y + 0.5, 24);
        ell(q.x, q.y, 14, 5, `rgba(216,52,43,${0.35 + 0.2 * Math.sin(tm * 5)})`);
      },
    });
    for (const sp of CFG.spicy.spots) {
      const q = L(r, sp.u, sp.v);
      S0.push({
        d: q.x + q.y - 0.2,
        f: () => box(q.x - 0.25, q.y - 0.25, 0.5, 0.5, 12, '#d8342b', '#8f2721', '#a8261f'),
      });
    }
    // Ruhmeswand der Sieger
    const wb = LR(r, 4.2, 0.2, 3.4, 0.15);
    S0.push({
      d: wb.x + wb.y + 1.7,
      f: () => {
        box(wb.x, wb.y, wb.w, 0.15, 78, '#231a24', '#3d2f3f', '#2a1f2a');
        const top = P(wb.x + 0.2, wb.y + 0.15, 72);
        const n = Math.min(12, st.wins);
        for (let i = 0; i < 12; i++) {
          const a = P(wb.x + 0.2 + (i % 6) * 0.52, wb.y + 0.16, 58 - Math.floor(i / 6) * 22);
          rr(a.x - 7, a.y - 9, 14, 16, 2, i < n ? '#fff6e8' : 'rgba(255,246,232,.15)');
          if (i < n) ell(a.x, a.y - 3, 3.5, 3.5, SKIN_OF(i));
        }
        chip(
          top.x + 40,
          top.y - 14,
          t('SIEGER') + ' ' + st.wins,
          '#d8342b',
          '#fff6e8',
          '9px Bungee, Impact, sans-serif',
        );
      },
    });
    if (G.unlocked.has('spicyMilk')) {
      const fr = LR(r, 7.1, 6.3, 0.8, 0.7);
      S0.push({
        d: fr.x + fr.y + 1.2,
        f: () => {
          box(fr.x, fr.y, 0.8, 0.7, 60, '#f7f3ea', '#d3c9bb', '#e8e1d6');
          const q = P(fr.x + 0.4, fr.y + 0.7, 44);
          chip(q.x, q.y, '🥛', '#2f5f93');
        },
      });
    }
    drawGuests(S0, st, r, g => {
      if (g.heat > 0) {
        const p = P(g.x, g.y, g.sitting ? 33 : 39);
        ell(p.x, p.y, 8, 8, `rgba(216,52,43,${0.55 * g.heat})`);
        if (g.heat > 0.5) {
          ctx.fillStyle = '#7fc8f0';
          ctx.fillRect(p.x + 7, p.y - 4 + ((tm * 20) % 8), 2, 3);
        }
      }
      if (g.state === 'eat') {
        const q = P(g.x, g.y, 28);
        drawDoner(q.x + g.fx * 10, q.y);
      }
    });
    drawFx(S0, st);
  },
  hud: st => (st.guests.some(g => g.req) ? t('Scharf-Challenge wartet auf Döner') : ''),
};
const SKIN_OF = i => ['#f1c9a5', '#d9a47a', '#b97a52', '#8d5a3b', '#f5d6bc'][i % 5];

// ---------------------------------------------------------------- Livestream-Studio
CFG.stream = {
  floor: (x, y) => ((x + y) % 2 ? '#1b2340' : '#212a4c'),
  sign: ['🔴 LIVESTREAM', '#8a5bb0', '#fff6e8'],
  furn: [[4.0, 1.0, 2.0, 0.9]],
  spots: [{ u: 5.0, v: 2.6, pose: 'sit', fu: 5.0, fv: 1.0 }],
  spawn: 14,
  stay: [140, 170],
  fee: 0,
  res: { kind: 'item', u: 3.4, v: 2.4, per: 1 / 6, name: 'TELLER', noMood: true },
  init: () => ({ res: 0, v: 0, eatT: 4, acc: 0, accT: 8, lagT: 30, lag: 0, viral: false }),
  look: () => ({ shirt: rnd(['#8a5bb0', '#c24d78', '#2f9a8a']), cap: true, capCol: '#231a24' }),
  onArrive(g, st) {
    st.viral = false;
    showBanner(
      t('Streamer ist live!'),
      t('Halte den Teller im Studio voll – beim Essen steigen die Zuschauer'),
    );
  },
  busy: () => false,
  extra(st, r, dt) {
    const g = st.guests.find(o => o.state === 'stay');
    st.lag = Math.max(0, st.lag - dt);
    if (!g) {
      st.v = Math.max(0, st.v - st.v * 0.2 * dt);
      return;
    }
    g.eat = Math.max(0, (g.eat || 0) - dt);
    st.eatT -= dt;
    if (st.eatT <= 0) {
      if (st.res >= 1 / 6 - 1e-6) {
        st.res = Math.max(0, st.res - 1 / 6);
        st.eatT = 9;
        g.eat = 2.5;
        const gain = Math.round((350 + 120 * G.cityLv) * (0.8 + Math.random() * 0.4));
        st.v += gain;
        st.last = 0;
        floatText(g.x, g.y, 90, '+' + gain + ' 👀', '#b48cff');
        for (let i = 0; i < 4; i++)
          heart(st, g.x + (Math.random() - 0.5) * 0.6, g.y, 60, rnd(['❤', '😂', '🔥', '👍']));
      } else st.eatT = 1;
    }
    st.last = (st.last || 0) + dt;
    if (st.last > 12) st.v = Math.max(0, st.v - st.v * 0.04 * dt);
    st.acc += (st.v / 2500) * H.pm() * dt;
    st.accT -= dt;
    if (st.accT <= 0) {
      st.accT = 8;
      if (st.acc >= 1) sale(r.slot, Math.floor(st.acc), g.x, g.y, '💸');
      st.acc = 0;
    }
    if (!G.unlocked.has('streamFiber')) {
      st.lagT -= dt;
      if (st.lagT <= 0) {
        st.lagT = 28 + Math.random() * 14;
        st.v = Math.round(st.v * 0.7);
        st.lag = 1.6;
        floatText(g.x, g.y, 90, t('LAG!'), '#ff8a7f');
      }
    }
    const goal = 10000 * (1 + 0.5 * G.city);
    if (!st.viral && st.v >= goal) {
      st.viral = true;
      H.S().viralT = Math.max(H.S().viralT, 40);
      burst(60);
      showBanner(t('Der Stream geht viral!'), t('40 Sekunden lang kommen doppelt so viele Gäste'));
    }
  },
  draw(S0, st, r, tm) {
    const dk = LR(r, 4.0, 1.0, 2.0, 0.9);
    // Rückwand mit Neon und Zuschauerzahl
    const bw = LR(r, 3.0, 0.2, 4.2, 0.15);
    S0.push({
      d: bw.x + bw.y + 2,
      f: () => {
        box(bw.x, bw.y, bw.w, 0.15, 84, '#2a1f3a', '#3a2f5a', '#2f254a');
        const c = P(bw.x + bw.w / 2, bw.y + 0.16, 60);
        chip(
          c.x,
          c.y - 10,
          '● LIVE',
          st.guests.some(g => g.state === 'stay') ? '#d8342b' : '#555',
          '#fff',
          '11px Bungee, Impact, sans-serif',
        );
        chip(
          c.x,
          c.y + 12,
          '👀 ' + Math.round(st.v).toLocaleString('de-DE'),
          '#8a5bb0',
          '#fff6e8',
          '10px Bungee, Impact, sans-serif',
        );
      },
    });
    S0.push({
      d: dk.x + dk.y + 1.4,
      f: () => {
        box(dk.x, dk.y, 2, 0.9, 26, '#e8e1d6', '#b9b0a3', '#cfc6b8');
        const m = P(dk.x + 1, dk.y + 0.2, 26);
        rr(m.x - 14, m.y - 26, 28, 20, 3, '#111');
        rr(
          m.x - 12,
          m.y - 24,
          24,
          16,
          2,
          st.lag > 0 ? `hsl(${(tm * 900) % 360},20%,${40 + Math.random() * 30}%)` : '#3a2f5a',
        );
        // Teller mit Dönern
        const pl = P(dk.x + 0.35, dk.y + 0.6, 26);
        ell(pl.x, pl.y, 12, 5, '#fff');
        const n = Math.round(st.res * 6);
        for (let i = 0; i < n; i++) drawDoner(pl.x - 6 + (i % 3) * 6, pl.y - 2 - Math.floor(i / 3) * 4);
        const at = L(r, CFG.stream.res.u, CFG.stream.res.v);
        label(at.x, at.y, 40, t('TELLER') + ' ' + n + '/6', n ? '#231a24' : '#d8342b');
      },
    });
    // Ringlicht und Kamera
    const rl = L(r, 6.5, 2.4);
    S0.push({
      d: rl.x + rl.y,
      f: () => {
        const p = P(rl.x, rl.y);
        ctx.fillStyle = '#555';
        ctx.fillRect(p.x - 1, p.y - 60, 2, 60);
        ctx.strokeStyle = '#fff6e8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 66, 9, 0, Math.PI * 2);
        ctx.stroke();
      },
    });
    const cm = L(r, 5.0, 4.4);
    S0.push({
      d: cm.x + cm.y,
      f: () => {
        const p = P(cm.x, cm.y);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1.5;
        for (const dx of [-6, 0, 6]) {
          ctx.beginPath();
          ctx.moveTo(p.x + dx, p.y);
          ctx.lineTo(p.x, p.y - 34);
          ctx.stroke();
        }
        rr(p.x - 7, p.y - 44, 14, 10, 2, '#231a24');
        if (Math.floor(tm * 2) % 2) ell(p.x + 5, p.y - 42, 1.8, 1.8, '#d8342b');
      },
    });
    drawGuests(S0, st, r, g => {
      if (g.eat > 0) {
        const q = P(g.x, g.y, 36);
        drawDoner(q.x + g.fx * 8, q.y + Math.sin(tm * 14) * 1.5);
      }
    });
    drawFx(S0, st);
  },
  hud: st => (st.guests.some(g => g.state === 'stay') && st.res < 0.01 ? t('Stream: Teller ist leer!') : ''),
};

// ---------------------------------------------------------------- Berlin: Handy-Reparatur
CFG.phone = {
  floor: (x, y) => ((x + y) % 2 ? '#d9dde0' : '#e6eaec'),
  sign: ['📱 HANDY-DOC', '#2f5f93', '#fff6e8'],
  furn: [[3.2, 0.9, 2.2, 0.8]],
  spots: [
    { u: 2.4, v: 6.3, pose: 'sit', fu: 4.2, fv: 1 },
    { u: 3.6, v: 6.3, pose: 'sit', fu: 4.2, fv: 1 },
    { u: 4.8, v: 6.3, pose: 'sit', fu: 4.2, fv: 1 },
    { u: 6.0, v: 6.3, pose: 'sit', fu: 4.2, fv: 1 },
  ],
  spawn: 11,
  stay: [150, 150],
  fee: 22,
  icon: '📱',
  req: { chance: 0.5, mul: 1.2, pat: 50, at: () => 5 + Math.random() * 20 },
  init: () => ({ cur: null, prog: 0, order: 0 }),
  onArrive(g, st) {
    g.no = st.order++;
  },
  onStay(g, st, r, dt) {
    if (g.T <= 1) {
      floatText(g.x, g.y, 70, t('Dauert zu lange!'), '#ff8a7f');
      rate(-0.03);
      leave(CFG.phone, st, r, g, false);
    }
  },
  stateTick(g, st, r, dt) {
    if (g.state === 'toBench') {
      if (H.walk(g, dt)) {
        g.state = 'fix';
        face(g, L(r, 4.2, 0.8));
      }
    } else if (g.state === 'fix') {
      const near = plIn(r) && dist(PL(), L(r, 3.0, 2.4)) < 1.2;
      st.prog += (dt * (near ? 3 : 1)) / 14;
      if (Math.random() < dt * (near ? 8 : 3)) heart(st, LX(r, 4.2), r.y0 + 1.2, 30, '✦');
      if (st.prog >= 1) {
        st.prog = 0;
        st.cur = null;
        g.happy = 2;
        leave(CFG.phone, st, r, g, true);
      }
    }
  },
  extra(st, r) {
    if (st.cur && !st.guests.includes(st.cur)) st.cur = null;
    if (!st.cur) {
      const w = st.guests.filter(g => g.state === 'stay' && !g.req).sort((a, b) => a.no - b.no)[0];
      if (w) {
        st.cur = w;
        w.state = 'toBench';
        w.sitting = false;
        w.path = [L(r, 4.2, 2.4)];
        st.prog = 0;
      }
    }
  },
  draw(S0, st, r, tm) {
    const b = LR(r, 3.2, 0.9, 2.2, 0.8);
    const tech = npc(LX(r, 4.2), r.y0 + 0.5, {
      shirt: '#2f5f93',
      name: 'Kerem',
      fx: 1,
      moving: !!st.cur,
      phase: tm * 6,
    });
    face(tech, L(r, 4.2, 3));
    S0.push({ d: tech.x + tech.y, f: () => H.person(tech) });
    S0.push({
      d: b.x + b.y + 1.5,
      f: () => {
        box(b.x, b.y, 2.2, 0.8, 26, '#e8e1d6', '#8d969b', '#a8b0b5');
        for (let i = 0; i < 4; i++) {
          const q = P(b.x + 0.3 + i * 0.5, b.y + 0.4, 26);
          rr(q.x - 3, q.y - 5, 6, 9, 1.5, i % 2 ? '#231a24' : '#3a4a5a');
        }
        if (st.cur && st.cur.state === 'fix') bar(b.x + 1.1, b.y + 0.4, 56, st.prog);
      },
    });
    for (const sp of CFG.phone.spots) {
      const q = L(r, sp.u, sp.v);
      S0.push({
        d: q.x + q.y - 0.3,
        f: () => box(q.x - 0.25, q.y - 0.2, 0.5, 0.45, 10, '#2f5f93', '#244a73', '#285283'),
      });
    }
    drawGuests(S0, st, r, g => {
      if (g.state === 'stay' && !g.req) {
        const q = P(g.x, g.y, 58);
        rr(q.x - 4, q.y - 7, 8, 12, 2, '#231a24');
        rr(q.x - 3, q.y - 6, 6, 8, 1, '#ff8a7f');
      }
    });
    drawFx(S0, st);
  },
};

// ---------------------------------------------------------------- Berlin: Döner-Tattoo
CFG.tattoo = {
  floor: (x, y) => ((x + y) % 2 ? '#2b2b30' : '#35353c'),
  sign: ['✒ DÖNER-TATTOO', '#231a24', '#f2b134'],
  furn: [[3.9, 1.8, 1.0, 0.9]],
  spots: [
    { u: 2.4, v: 6.3, pose: 'sit', fu: 4.4, fv: 2 },
    { u: 3.6, v: 6.3, pose: 'sit', fu: 4.4, fv: 2 },
    { u: 4.8, v: 6.3, pose: 'sit', fu: 4.4, fv: 2 },
  ],
  spawn: 14,
  stay: [150, 150],
  fee: 45,
  icon: '🎨',
  res: { kind: 'stand', u: 7.0, v: 5.6, drain: 240, name: 'TINTE', done: 'Tinte aufgefüllt', noMood: true },
  init: () => ({ cur: null, prog: 0, order: 0 }),
  busy: st => !!(st.cur && st.cur.state === 'ink'),
  onArrive(g, st) {
    g.no = st.order++;
  },
  onStay(g, st, r) {
    if (g.T <= 1) {
      rate(-0.03);
      floatText(g.x, g.y, 70, '😤', '#ff8a7f');
      leave(CFG.tattoo, st, r, g, false);
    }
  },
  stateTick(g, st, r, dt) {
    if (g.state === 'toChair') {
      if (H.walk(g, dt)) {
        g.state = 'ink';
        g.sitting = true;
        face(g, L(r, 5.6, 2.2));
      }
    } else if (g.state === 'ink') {
      if (st.res > 0) st.prog += dt / 16;
      else g.mood = Math.max(0.2, g.mood - dt / 30);
      if (st.prog >= 1) {
        st.prog = 0;
        st.cur = null;
        g.tat = true;
        g.happy = 3;
        if (Math.random() < 0.35) {
          H.S().viralT = Math.max(H.S().viralT, 12);
          floatText(g.x, g.y, 90, t('Neues Tattoo gepostet!'), '#b48cff');
        }
        leave(CFG.tattoo, st, r, g, true);
      }
    }
  },
  extra(st, r) {
    if (st.cur && !st.guests.includes(st.cur)) st.cur = null;
    if (!st.cur) {
      const w = st.guests.filter(g => g.state === 'stay').sort((a, b) => a.no - b.no)[0];
      if (w) {
        st.cur = w;
        w.state = 'toChair';
        w.sitting = false;
        w.path = [L(r, 4.4, 2.6)];
        st.prog = 0;
      }
    }
  },
  draw(S0, st, r, tm) {
    const ch = LR(r, 3.9, 1.8, 1.0, 0.9);
    S0.push({
      d: ch.x + ch.y + 0.8,
      f: () => {
        box(ch.x, ch.y, 1, 0.9, 12, '#231a24', '#111', '#1b1b1f');
        box(ch.x, ch.y, 0.25, 0.9, 30, '#231a24', '#111', '#1b1b1f');
      },
    });
    const busy = st.cur && st.cur.state === 'ink';
    const art = npc(LX(r, 5.6), r.y0 + 2.2, {
      shirt: '#231a24',
      long: true,
      hair: '#c24d78',
      name: 'Lena',
      moving: busy && st.res > 0,
      phase: tm * 30,
    });
    face(art, L(r, 4.4, 2.3));
    S0.push({ d: art.x + art.y, f: () => H.person(art) });
    // Regal mit Tinte
    const sh = LR(r, 6.6, 6.2, 1.0, 0.5);
    S0.push({
      d: sh.x + sh.y + 0.8,
      f: () => {
        box(sh.x, sh.y, 1, 0.5, 44, '#6e4430', '#5b3a28', '#6e4430');
        const cols = ['#d8342b', '#2f5f93', '#4fae62', '#f2b134'];
        for (let i = 0; i < 4; i++) {
          const q = P(sh.x + 0.15 + i * 0.22, sh.y + 0.5, 44);
          rr(q.x - 2.5, q.y - 8 * Math.max(0.15, st.res), 5, 8 * Math.max(0.15, st.res), 1, cols[i]);
        }
        resChip(CFG.tattoo, st, r, 64);
      },
    });
    for (const sp of CFG.tattoo.spots) {
      const q = L(r, sp.u, sp.v);
      S0.push({
        d: q.x + q.y - 0.3,
        f: () => box(q.x - 0.3, q.y - 0.2, 0.6, 0.45, 10, '#6b5a6d', '#3d2f3f', '#4a3a4c'),
      });
    }
    // Motivtafel
    const mb = LR(r, 2.2, 0.2, 2.8, 0.12);
    S0.push({
      d: mb.x + mb.y + 1.4,
      f: () => {
        box(mb.x, mb.y, mb.w, 0.12, 70, '#f7f3ea', '#d3c9bb', '#e8e1d6');
        for (let i = 0; i < 3; i++) {
          const q = P(mb.x + 0.5 + i * 0.9, mb.y + 0.13, 44);
          drawDoner(q.x, q.y);
          ell(q.x, q.y - 12, 6, 3, 'rgba(216,52,43,.5)');
        }
      },
    });
    if (busy) S0.push({ d: 99, f: () => bar(st.cur.x, st.cur.y, 70, st.prog, '#c24d78') });
    drawGuests(S0, st, r, g => {
      if (g.tat) {
        const q = P(g.x, g.y, 24);
        drawDoner(q.x - g.fx * 9, q.y);
      }
    });
    drawFx(S0, st);
  },
  hud: st => (st.cur && st.res <= 0 ? t('Tattoo: Tinte ist leer!') : ''),
};

// ---------------------------------------------------------------- Hamburg: Arabesk-Karaoke
CFG.karaoke = {
  floor: (x, y) => ((x + y) % 2 ? '#3a1a3a' : '#44204a'),
  sign: ['🎤 ARABESK', '#c24d78', '#fff6e8'],
  furn: [],
  spots: [
    { u: 2.2, v: 1.2, pose: 'sit', fu: 6.6, fv: 3.8 },
    { u: 2.2, v: 2.4, pose: 'sit', fu: 6.6, fv: 3.8 },
    { u: 2.2, v: 5.2, pose: 'sit', fu: 6.6, fv: 3.8 },
    { u: 2.2, v: 6.4, pose: 'sit', fu: 6.6, fv: 3.8 },
    { u: 3.7, v: 1.2, pose: 'sit', fu: 6.6, fv: 3.8 },
    { u: 3.7, v: 6.4, pose: 'sit', fu: 6.6, fv: 3.8 },
  ],
  spawn: 10,
  stay: [70, 100],
  fee: 12,
  icon: '🎤',
  req: { chance: 0.25, mul: 1.5, pat: 45, label: '😭' },
  look: () => ({ reqIcon: '😭' }),
  init: () => ({ singer: null, nextT: 6 }),
  extra(st, r, dt) {
    const s = st.singer;
    if (s && !st.guests.includes(s)) st.singer = null;
    if (!st.singer) {
      st.nextT -= dt;
      const cand = st.guests.find(g => g.state === 'stay' && !g.sang && !g.req);
      if (st.nextT <= 0 && cand) {
        st.singer = cand;
        cand.state = 'toStage';
        cand.sitting = false;
        cand.path = [L(r, 5.9, 3.8)];
      }
      return;
    }
    if (s.state === 'toStage' && H.walk(s, dt)) {
      s.state = 'sing';
      s.T2 = 16;
      face(s, L(r, 2, 3.8));
    } else if (s.state === 'sing') {
      s.T2 -= dt;
      s.anim = true;
      if (Math.random() < dt * 3) heart(st, s.x, s.y, 64, rnd(['♪', '♫']));
      for (const g of st.guests)
        if (g.state === 'stay' && Math.random() < dt * 0.15) heart(st, g.x, g.y, 50, '😭');
      if (s.T2 <= 0) {
        s.anim = false;
        s.sang = true;
        sale(r.slot, Math.round(8 * H.pm()), s.x, s.y, '🎤');
        for (const g of st.guests)
          if (g.state === 'stay' && g !== s && !g.req && Math.random() < 0.6)
            g.wantIn = 1 + Math.random() * 3;
        const sp = CFG.karaoke.spots[s.spot];
        s.state = 'back';
        s.path = [L(r, sp.u, sp.v)];
        st.nextT = 5;
      }
    } else if (s.state === 'back' && H.walk(s, dt)) {
      s.state = 'stay';
      s.sitting = true;
      face(s, L(r, 6.6, 3.8));
      st.singer = null;
    }
  },
  stateTick() {},
  draw(S0, st, r, tm) {
    const sg = LR(r, 5.2, 1.4, 2.8, 4.8);
    S0.push({
      d: sg.x + sg.y + 0.2,
      f: () => {
        box(sg.x, sg.y, sg.w, sg.d, 8, '#231a24', '#120c12', '#1b141b');
        const c = P(sg.x + sg.w / 2, sg.y + sg.d / 2, 8);
        ell(c.x, c.y, 50, 24, `hsla(${(tm * 60) % 360},80%,60%,.25)`);
      },
    });
    const mic = L(r, 6.4, 3.8);
    S0.push({
      d: mic.x + mic.y + 0.4,
      f: () => {
        const p = P(mic.x, mic.y, 8);
        ctx.fillStyle = '#8d969b';
        ctx.fillRect(p.x - 1, p.y - 38, 2, 38);
        ell(p.x, p.y - 40, 3, 3, '#231a24');
      },
    });
    const bd = LR(r, 5.0, 0.2, 3.2, 0.12);
    S0.push({
      d: bd.x + bd.y + 1.6,
      f: () => {
        box(bd.x, bd.y, bd.w, 0.12, 76, '#111', '#222', '#1a1a1a');
        const c = P(bd.x + bd.w / 2, bd.y + 0.13, 50);
        chip(c.x, c.y, '♪ Aşk acısı ♪', '#c24d78', '#fff6e8', '10px Bungee, Impact, sans-serif');
      },
    });
    for (const sp of CFG.karaoke.spots) {
      const q = L(r, sp.u, sp.v);
      S0.push({
        d: q.x + q.y - 0.3,
        f: () => {
          const p = P(q.x, q.y);
          ell(p.x, p.y, 13, 6.5, '#8a2f5a');
          ell(p.x, p.y - 3, 11, 5, '#c24d78');
        },
      });
    }
    drawGuests(S0, st, r, g => {
      if (g.state === 'sing') {
        const q = P(g.x, g.y, 36);
        ell(q.x + g.fx * 7, q.y, 2.5, 2.5, '#231a24');
      }
    });
    drawFx(S0, st);
  },
};

// ---------------------------------------------------------------- Hamburg: Mama-Küche
const MAMA_TALK = [
  'Iss was, du bist so dünn!',
  'Hast du Hunger, mein Sohn?',
  'Noch ein Teller!',
  'Wie bei Mama!',
];
CFG.mama = {
  floor: (x, y) => ((x * 2 + y) % 3 ? '#e8c9a0' : '#c0392f'),
  sign: ['👵 MAMA-KÜCHE', '#c0392f', '#fff6e8'],
  furn: [
    [5.0, 0.5, 2.2, 0.8],
    [3.0, 4.4, 2.0, 1.0],
  ],
  spots: [
    { u: 3.4, v: 3.9, pose: 'sit', fu: 4, fv: 4.9 },
    { u: 4.6, v: 3.9, pose: 'sit', fu: 4, fv: 4.9 },
    { u: 3.4, v: 5.9, pose: 'sit', fu: 4, fv: 4.9 },
    { u: 4.6, v: 5.9, pose: 'sit', fu: 4, fv: 4.9 },
  ],
  spawn: 12,
  stay: [35, 50],
  fee: 16,
  icon: '👵',
  init: () => ({ pot: 4, potT: 7, talkT: 12, pickT: 0 }),
  onArrive(g, st) {
    g.fed = false;
  },
  onStay(g, st, r, dt) {
    if (!g.fed) {
      if (st.pot > 0) {
        st.pot--;
        g.fed = true;
        fly('d', P(LX(r, 6), r.y0 + 1, 30), g, 26);
      } else {
        g.mood = Math.max(0, g.mood - dt / 30);
        g.T = Math.max(g.T, 5);
      }
    }
  },
  extra(st, r, dt) {
    if (st.pot < 8) {
      st.potT -= dt;
      if (st.potT <= 0) {
        st.potT = relax() ? 9 : 7;
        st.pot++;
      }
    }
    st.talkT -= dt;
    if (st.talkT <= 0) {
      st.talkT = 20 + Math.random() * 15;
      const m = L(r, 6, 1.9);
      floatText(m.x, m.y, 90, t(rnd(MAMA_TALK)), '#fff6e8');
    }
    // Döner aus dem Topf nehmen
    const pl = PL();
    st.pickT -= dt;
    if (
      st.pot > 0 &&
      plIn(r) &&
      st.pickT <= 0 &&
      pl.carry < G.cap &&
      !pl.items.includes('t') &&
      dist(pl, L(r, 4.4, 1.5)) < 0.9
    ) {
      st.pot--;
      pl.items.push('d');
      pl.carry = pl.items.length;
      st.pickT = 0.12;
      fly('d', P(LX(r, 5.6), r.y0 + 0.9, 30), pl, 24 + pl.carry * 5);
      sfx('pop', 0.5, 1 + pl.carry * 0.03);
    }
  },
  draw(S0, st, r, tm) {
    const sv = LR(r, 5.0, 0.5, 2.2, 0.8);
    S0.push({
      d: sv.x + sv.y + 1.4,
      f: () => {
        box(sv.x, sv.y, 2.2, 0.8, 28, '#5a6368', '#3b4247', '#4a5257');
        const q = P(sv.x + 0.8, sv.y + 0.4, 28);
        ell(q.x, q.y - 6, 14, 7, '#8d969b');
        rr(q.x - 14, q.y - 16, 28, 12, 3, '#a8b0b5');
        ell(q.x, q.y - 16, 14, 6, '#6e4430');
        for (let i = 0; i < Math.min(8, st.pot); i++)
          drawDoner(q.x - 9 + (i % 4) * 6, q.y - 20 - Math.floor(i / 4) * 4);
        for (let i = 0; i < 3; i++) {
          const z = ((tm * 18 + i * 12) % 36) + 20;
          ell(q.x - 6 + i * 6, q.y - z, 4 + z / 10, 3, `rgba(255,255,255,${0.4 - z / 120})`);
        }
        const at = L(r, 4.4, 1.5);
        label(at.x, at.y, 48, t('TOPF') + ' ' + st.pot + '/8', st.pot ? '#c0392f' : '#555');
      },
    });
    const mama = npc(LX(r, 6.0), r.y0 + 1.7, {
      shirt: '#6f7f3a',
      long: true,
      hair: '#6b6b6b',
      name: 'Mama',
      scarf: true,
      moving: true,
      phase: tm * 4,
    });
    face(mama, L(r, 6, 0.5));
    S0.push({
      d: mama.x + mama.y,
      f: () => {
        H.person(mama);
        const p = P(mama.x, mama.y, 40);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9.5, Math.PI * 1.0, Math.PI * 2.0);
        ctx.fillStyle = '#c24d78';
        ctx.fill();
      },
    });
    const tb = LR(r, 3.0, 4.4, 2.0, 1.0);
    S0.push({
      d: tb.x + tb.y + 1.5,
      f: () => {
        box(tb.x, tb.y, 2, 1, 22, '#f7f3ea', '#8a5a2e', '#a06a38');
        for (const g of st.guests)
          if (g.fed && g.state === 'stay') {
            const q = P(g.x + (tb.x + 1 - g.x) * 0.45, g.y + (tb.y + 0.5 - g.y) * 0.45, 22);
            ell(q.x, q.y, 7, 3, '#fff');
            drawDoner(q.x, q.y - 2);
          }
      },
    });
    drawGuests(S0, st, r);
    drawFx(S0, st);
  },
};

// ---------------------------------------------------------------- München: Waschanlage
const CARC = ['#3f7fbf', '#e0e0e0', '#2f9a8a', '#c24d78', '#f2b134', '#5a5a66'];
CFG.wash = {
  floor: (x, y) => ((x + y) % 2 ? '#8d969b' : '#9aa3a8'),
  sign: ['🚿 WASCHANLAGE', '#2f5f93', '#bff5ef'],
  furn: [[1.1, 6.3, 0.7, 0.7]],
  spots: [],
  spawn: 16,
  stay: [0, 0],
  fee: 30,
  res: { kind: 'stand', u: 1.45, v: 5.8, drain: 200, name: 'SEIFE', done: 'Seife aufgefüllt', noMood: true },
  init: () => ({ car: null, carT: 6, foam: [] }),
  busy: st => !!(st.car && st.car.state === 'wash'),
  extra(st, r, dt) {
    const lane = r.y0 + 3.8,
      spot = LX(r, 4.6),
      road = 12.8;
    st.carT -= dt;
    if (!st.car && st.carT <= 0) {
      st.car = { x: road, y: r.y1 + 12, col: rnd(CARC), dir: 'y', state: 'come', dirt: 1 };
    }
    const c = st.car;
    if (!c) return;
    if (c.state === 'come') {
      if (moveToward(c, road, lane, 5, dt)) c.state = 'in';
    } else if (c.state === 'in') {
      c.dir = 'x';
      if (moveToward(c, spot, lane, 2.5, dt)) {
        c.state = 'wash';
        c.T = 10;
      }
    } else if (c.state === 'wash') {
      if (st.res > 0) {
        c.T -= dt;
        c.dirt = Math.max(0, c.dirt - dt / 9);
        if (Math.random() < dt * 14)
          st.foam.push({
            x: c.x + (Math.random() - 0.5) * 1.6,
            y: c.y + (Math.random() - 0.5) * 0.9,
            z: 10 + Math.random() * 20,
            life: 1,
          });
      } else c.T -= dt * 0.5;
      if (c.T <= 0) {
        const ok = c.dirt < 0.3;
        sale(
          r.slot,
          Math.round(CFG.wash.fee * H.pm() * (ok ? 1 : 0.3)),
          c.x,
          c.y,
          ok ? '🚿' : t('Noch dreckig!'),
        );
        if (!ok) rate(-0.02);
        c.state = 'outX';
      }
    } else if (c.state === 'outX') {
      if (moveToward(c, road, lane, 2.5, dt)) {
        c.state = 'away';
        c.dir = 'y';
      }
    } else if (c.state === 'away') {
      if (moveToward(c, road, r.y0 - 30, 6, dt)) {
        st.car = null;
        st.carT = CFG.wash.spawn * (0.7 + Math.random() * 0.6);
      }
    }
    for (const f of st.foam) f.life -= dt / 1.5;
    st.foam = st.foam.filter(f => f.life > 0);
  },
  draw(S0, st, r, tm) {
    const lane = r.y0 + 3.8,
      spot = LX(r, 4.6);
    const washing = st.car && st.car.state === 'wash' && st.res > 0;
    for (const dv of [-1.25, 1.25]) {
      const q = { x: spot, y: lane + dv };
      S0.push({
        d: q.x + q.y,
        f: () => {
          box(q.x - 0.2, q.y - 0.2, 0.4, 0.4, 60, '#2f5f93', '#244a73', '#285283');
          const p = P(q.x, q.y, 10);
          for (let i = 0; i < 5; i++) {
            const z = i * 10 + ((washing ? tm * 60 : 0) % 10);
            ctx.fillStyle = i % 2 ? '#3fb6c8' : '#c24d78';
            ctx.fillRect(p.x - 8, p.y - z - 4, 16, 3);
          }
        },
      });
    }
    const bar0 = LR(r, 1.1, 5.4, 0.7, 0.7);
    S0.push({
      d: bar0.x + bar0.y + 0.7,
      f: () => {
        box(bar0.x, bar0.y, 0.7, 0.7, 34, '#4fae62', '#2f7a3f', '#3f8e4f');
        resChip(CFG.wash, st, r, 52);
      },
    });
    if (st.car) {
      const c = st.car;
      S0.push({ d: c.x + c.y + 0.5, f: () => drawCarDir(c) });
    }
    for (const f of st.foam)
      S0.push({
        d: 99,
        f: () => {
          const q = P(f.x, f.y, f.z);
          ell(q.x, q.y, 4, 4, `rgba(255,255,255,${0.8 * f.life})`);
        },
      });
  },
  hud: st => (st.car && st.car.state === 'wash' && st.res <= 0 ? t('Waschanlage: Seife ist leer!') : ''),
};
function drawCarDir(c) {
  const alongX = c.dir === 'x',
    w = alongX ? 1.6 : 0.84,
    d = alongX ? 0.84 : 1.6,
    x = c.x - w / 2,
    y = c.y - d / 2,
    p = P(c.x, c.y);
  const dk = (hex, a) => {
    const n = parseInt(hex.slice(1), 16),
      f = v => Math.max(0, Math.min(255, v + a));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };
  ell(p.x, p.y + 4, 34, 17, 'rgba(10,5,10,.28)');
  box(x, y, w, d, 15, c.col, dk(c.col, -45), dk(c.col, -25), 6);
  if (alongX) box(x + 0.35, y + 0.07, 0.8, 0.7, 13, dk(c.col, 10), '#3b5068', '#48607a', 21);
  else box(x + 0.07, y + 0.35, 0.7, 0.8, 13, dk(c.col, 10), '#3b5068', '#48607a', 21);
  if (c.dirt > 0.05) {
    ctx.globalAlpha = c.dirt * 0.6;
    box(x, y, w, d, 15, '#6e5a3a', '#5a4a2e', '#6e5a3a', 6);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- München: Fitness-Ecke
CFG.fitness = {
  floor: (x, y) => ((x + y) % 2 ? '#3b3440' : '#443c4a'),
  sign: ['💪 FITNESS', '#f2b134', '#231a24'],
  furn: [],
  spots: [
    { u: 2.6, v: 1.4, pose: 'lift', fu: 2.6, fv: 3 },
    { u: 4.6, v: 1.4, pose: 'lift', fu: 4.6, fv: 3 },
    { u: 6.6, v: 1.4, pose: 'lift', fu: 6.6, fv: 3 },
    { u: 3.0, v: 6.1, pose: 'run', fu: 3.0, fv: 3 },
    { u: 5.4, v: 6.1, pose: 'run', fu: 5.4, fv: 3 },
  ],
  spawn: 10,
  stay: [30, 45],
  fee: 10,
  icon: '💪',
  req: { chance: 0.85, mul: 2, pat: 60, label: '💪', at: g => g.T * 0.8 },
  look: () => ({ reqIcon: '💪', shirt: rnd(['#231a24', '#d8342b', '#2f5f93', '#4fae62']) }),
  onServed(g) {
    floatText(g.x, g.y, 80, '💪', '#f2b134');
  },
  onStay(g, st) {
    if (Math.random() < 0.02) heart(st, g.x, g.y, 46, '💦');
  },
  draw(S0, st, r, tm) {
    for (const sp of CFG.fitness.spots) {
      const q = L(r, sp.u, sp.v);
      if (sp.pose === 'lift')
        S0.push({
          d: q.x + q.y - 0.3,
          f: () => box(q.x - 0.25, q.y - 0.4, 0.5, 0.8, 10, '#231a24', '#111', '#1b1b1f'),
        });
      else
        S0.push({
          d: q.x + q.y - 0.3,
          f: () => {
            box(q.x - 0.35, q.y - 0.6, 0.7, 1.2, 6, '#3a3a40', '#222', '#2a2a30');
            box(q.x - 0.35, q.y - 0.6, 0.7, 0.1, 40, '#8d969b', '#6d767c', '#7b8489');
          },
        });
    }
    const mr = LR(r, 2.0, 0.2, 5.4, 0.1);
    S0.push({
      d: mr.x + mr.y + 2.5,
      f: () => {
        box(mr.x, mr.y, mr.w, 0.1, 70, '#bfe0f0', '#a9cde0', '#bfe0f0');
        const c = P(mr.x + mr.w / 2, mr.y + 0.1, 80);
        chip(c.x, c.y, t('NO PAIN NO DÖNER'), '#f2b134', '#231a24', '9px Bungee, Impact, sans-serif');
      },
    });
    drawGuests(S0, st, r, g => {
      if (g.state !== 'stay') return;
      const sp = CFG.fitness.spots[g.spot];
      if (sp.pose === 'lift') {
        const up = (Math.sin(tm * 3 + g.spot) + 1) / 2;
        const p = P(g.x, g.y, 44 + up * 12);
        ctx.fillStyle = '#8d969b';
        ctx.fillRect(p.x - 16, p.y - 1, 32, 2.5);
        rr(p.x - 19, p.y - 5, 4, 10, 1, '#231a24');
        rr(p.x + 15, p.y - 5, 4, 10, 1, '#231a24');
      }
    });
    drawFx(S0, st);
  },
};

// ---------------------------------------------------------------- München: Riesenspieß-Bühne
CFG.giant = {
  floor: (x, y) => ((x + y) % 2 ? '#3f7fbf' : '#f7f3ea'),
  sign: ['🎪 RIESENSPIESS', '#3f7fbf', '#fff6e8'],
  furn: [[5.9, 3.3, 1.0, 1.0]],
  spots: Array.from({ length: 8 }, (_, i) => ({
    u: 1.5 + (i % 2) * 1.1,
    v: 1.4 + Math.floor(i / 2) * 1.5,
    pose: 'stand',
    fu: 6.4,
    fv: 3.8,
  })),
  spawn: 9999,
  stay: [999, 999],
  noTimer: true,
  fee: 0,
  init: () => ({ nextT: 45, ev: null }),
  canSpawn: () => false,
  extra(st, r, dt) {
    if (!st.ev) {
      st.nextT -= dt;
      if (st.nextT <= 0) {
        st.ev = { T: relax() ? 90 : 60, prog: 0 };
        for (let i = 0; i < 8; i++) spawnGuest(CFG.giant, st, r);
        showBanner(
          t('Riesenspieß-Show!'),
          t('Stell dich an den Riesenspieß im Anbau und schneide für die Menge'),
        );
        sfx('fanfare', 0.7);
      }
      return;
    }
    const ev = st.ev;
    ev.T -= dt;
    const cut = L(r, 4.8, 3.8);
    if (plIn(r) && dist(PL(), cut) < 0.9) {
      ev.prog += dt / 8;
      if (Math.random() < dt * 6) heart(st, cut.x, cut.y, 50, '🥙');
    }
    for (const g of st.guests)
      if (g.state === 'stay' && Math.random() < dt * 0.3) heart(st, g.x, g.y, 60, rnd(['👏', '😋']));
    if (ev.prog >= 1) {
      sale(r.slot, Math.round(price() * 18), cut.x, cut.y, t('SHOW!'));
      rate(0.08);
      burst(80);
      sfx('party', 0.7);
      for (const g of st.guests) if (g.state !== 'out') leave(CFG.giant, st, r, g, false);
      st.ev = null;
      st.nextT = relax() ? 180 : 140;
    } else if (ev.T <= 0) {
      rate(-0.08);
      for (const g of st.guests) {
        if (g.state !== 'out') {
          floatText(g.x, g.y, 70, t('Buuh!'), '#ff8a7f');
          leave(CFG.giant, st, r, g, false);
        }
      }
      st.ev = null;
      st.nextT = relax() ? 180 : 140;
    }
  },
  draw(S0, st, r, tm) {
    const sg = LR(r, 5.0, 1.8, 3.0, 4.0);
    S0.push({
      d: sg.x + sg.y + 0.1,
      f: () => box(sg.x, sg.y, sg.w, sg.d, 10, '#6e4430', '#5b3a28', '#6e4430'),
    });
    const sp = L(r, 6.4, 3.8);
    S0.push({
      d: sp.x + sp.y + 0.6,
      f: () => {
        const p = P(sp.x, sp.y, 10);
        ctx.fillStyle = '#8d969b';
        ctx.fillRect(p.x - 2, p.y - 150, 4, 150);
        for (let i = 0; i < 12; i++) {
          const z = 20 + i * 9,
            rad = 24 - Math.abs(i - 5) * 1.6;
          const sh = Math.sin(tm * 2 + i) * 0.15;
          rr(p.x - rad, p.y - z - 10, rad * 2, 11, 5, i % 2 ? '#a0522d' : `rgb(${150 + sh * 100},90,45)`);
        }
        ctx.fillStyle = `rgba(255,${120 + 40 * Math.sin(tm * 6)},40,.35)`;
        ctx.fillRect(p.x + 26, p.y - 130, 8, 110);
      },
    });
    const cut = L(r, 4.8, 3.8);
    S0.push({
      d: cut.x + cut.y - 0.5,
      f: () => {
        const p = P(cut.x, cut.y);
        ctx.strokeStyle = st.ev ? '#f2b134' : 'rgba(255,246,232,.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 22, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        if (st.ev) {
          bar(cut.x, cut.y, 70, st.ev.prog, '#f2b134');
          label(cut.x, cut.y, 88, t('SCHNEIDEN') + ' · ' + Math.ceil(st.ev.T) + ' s', '#d8342b');
        } else label(cut.x, cut.y, 30, t('Show in {s} s', { s: Math.ceil(st.nextT) }), '#231a24');
      },
    });
    drawGuests(S0, st, r);
    drawFx(S0, st);
  },
  hud: st => (st.ev ? t('Riesenspieß-Show: schneiden! {s} s', { s: Math.ceil(st.ev.T) }) : ''),
};

// ---------------------------------------------------------------- Köln: Döner-Automat
CFG.automat = {
  floor: (x, y) => ((x + y) % 2 ? '#d9dde0' : '#c8ced2'),
  sign: ['🥙 24/7', '#8a2f5a', '#fff6e8'],
  furn: [[4.6, 0.4, 1.6, 0.8]],
  spots: [
    { u: 5.4, v: 2.6, pose: 'stand', fu: 5.4, fv: 0.5 },
    { u: 4.0, v: 3.0, pose: 'stand', fu: 5.4, fv: 0.5 },
    { u: 6.8, v: 3.0, pose: 'stand', fu: 5.4, fv: 0.5 },
  ],
  spawn: 9,
  stay: [3, 5],
  fee: 0,
  res: { kind: 'item', u: 5.4, v: 1.9, per: 1 / 12, name: 'AUTOMAT', noMood: true },
  init: () => ({ res: 0.5 }),
  onArrive(g, st, r) {
    const have = Math.round(st.res * 12),
      want = 1 + (Math.random() < 0.35 ? 1 : 0),
      n = Math.min(have, want);
    if (n <= 0) {
      floatText(g.x, g.y, 70, t('Leer?!'), '#ff8a7f');
      rate(-0.01);
      g.T = 1;
      g.mood = 0.01;
      return;
    }
    st.res = Math.max(0, st.res - n / 12);
    const night = ['nacht', 'abend'].includes(phaseNow().id);
    sale(r.slot, Math.round(price() * 1.2 * n * (night ? 1.3 : 1)), g.x, g.y, '🥙');
    sfx('coin', 0.4, 1.1);
  },
  draw(S0, st, r, tm) {
    const m = LR(r, 4.6, 0.4, 1.6, 0.8);
    S0.push({
      d: m.x + m.y + 1.2,
      f: () => {
        box(m.x, m.y, 1.6, 0.8, 76, '#8a2f5a', '#6e2447', '#7a2a50');
        const n = Math.round(st.res * 12);
        for (let i = 0; i < 12; i++) {
          const q = P(m.x + 0.25 + (i % 4) * 0.36, m.y + 0.8, 64 - Math.floor(i / 4) * 16);
          rr(q.x - 6, q.y - 7, 12, 12, 2, 'rgba(191,224,240,.55)');
          if (i < n) drawDoner(q.x, q.y);
        }
        const c = P(m.x + 0.8, m.y + 0.8, 86);
        chip(
          c.x,
          c.y,
          'DÖNER 24/7',
          `hsl(${330 + 20 * Math.sin(tm * 3)},80%,55%)`,
          '#fff',
          '9px Bungee, Impact, sans-serif',
        );
        const at = L(r, 5.4, 1.9);
        label(at.x, at.y, 24, n + '/12', n ? '#231a24' : '#d8342b');
      },
    });
    drawGuests(S0, st, r);
  },
  hud: (st, r) => (st.res <= 0 ? t('Döner-Automat ist leer') : ''),
};

// ---------------------------------------------------------------- Köln: Domblick-Terrasse
CFG.roof = {
  floor: (x, y) => ((x + y * 3) % 4 ? '#b88a5a' : '#a67a4c'),
  sign: ['⛪ DOMBLICK', '#8a2f5a', '#fff6e8'],
  furn: [],
  spots: [
    { u: 2.4, v: 2.4, pose: 'sit', fu: 2.4, fv: 0 },
    { u: 4.0, v: 2.4, pose: 'sit', fu: 4.0, fv: 0 },
    { u: 5.6, v: 2.4, pose: 'sit', fu: 5.6, fv: 0 },
    { u: 2.4, v: 5.4, pose: 'sit', fu: 2.4, fv: 0 },
    { u: 4.0, v: 5.4, pose: 'sit', fu: 4.0, fv: 0 },
    { u: 5.6, v: 5.4, pose: 'sit', fu: 5.6, fv: 0 },
  ],
  spawn: 9,
  stay: [50, 70],
  fee: 18,
  icon: '⛪',
  req: { chance: 0.6, mul: 1.3, pat: 55 },
  feeMul: () => (phaseNow().id === 'abend' ? 2 : 1),
  draw(S0, st, r, tm) {
    const bd = LR(r, 1.4, 0.2, 6.2, 0.12);
    S0.push({
      d: bd.x + bd.y + 3,
      f: () => {
        const h = G.clock / 60,
          sky =
            h >= 18 && h < 21
              ? ['#f2a65a', '#c24d78']
              : h >= 21 || h < 6
                ? ['#1b2340', '#2a1f3a']
                : ['#8fd0f0', '#bfe6f7'];
        const a = P(bd.x, bd.y + 0.12, 96),
          b = P(bd.x + bd.w, bd.y + 0.12, 96),
          c = P(bd.x + bd.w, bd.y + 0.12, 0),
          d = P(bd.x, bd.y + 0.12, 0);
        const gr = ctx.createLinearGradient(0, a.y, 0, d.y);
        gr.addColorStop(0, sky[0]);
        gr.addColorStop(1, sky[1]);
        poly([a, b, c, d], gr);
        // Dom-Silhouette
        const mx = bd.x + bd.w / 2;
        const S = (x, z) => P(x, bd.y + 0.12, z);
        const dom = '#3b3440';
        poly([S(mx - 1.4, 0), S(mx + 1.4, 0), S(mx + 1.4, 34), S(mx - 1.4, 34)], dom);
        for (const o of [-0.9, 0.9]) poly([S(mx + o - 0.35, 30), S(mx + o + 0.35, 30), S(mx + o, 92)], dom);
        poly([S(mx - 0.25, 34), S(mx + 0.25, 34), S(mx, 50)], dom);
        if (h >= 20 || h < 6)
          for (let i = 0; i < 6; i++) {
            const q = S(bd.x + 0.4 + i * 1.0, 80 + (i % 2) * 8);
            ell(q.x, q.y, 1, 1, '#fff');
          }
      },
    });
    for (const sp of CFG.roof.spots) {
      const q = L(r, sp.u, sp.v);
      S0.push({
        d: q.x + q.y - 0.3,
        f: () => box(q.x - 0.3, q.y - 0.2, 0.6, 0.55, 9, '#f7f3ea', '#d3c9bb', '#e8e1d6'),
      });
      const tq = L(r, sp.u + 0.7, sp.v);
      S0.push({
        d: tq.x + tq.y,
        f: () => {
          box(tq.x - 0.15, tq.y - 0.15, 0.3, 0.3, 16, '#6e4430', '#5b3a28', '#6e4430');
          const p = P(tq.x, tq.y, 16);
          ctx.fillStyle = '#f2c75a';
          ctx.fillRect(p.x - 2, p.y - 9, 4, 9);
        },
      });
    }
    S0.push({
      d: 99,
      f: () => {
        for (let i = 0; i <= 10; i++) {
          const q = P(LX(r, 1.4 + i * 0.6), r.y0 + 3.9, 90 - Math.sin((i / 10) * Math.PI) * 16);
          ell(q.x, q.y, 2.3, 2.3, `rgba(255,${210 + 30 * Math.sin(tm * 2 + i)},120,.95)`);
        }
      },
    });
    drawGuests(S0, st, r);
  },
};

// ---------------------------------------------------------------- Köln: Döner-Kochschule
CFG.school = {
  floor: (x, y) => ((x + y) % 2 ? '#f7f3ea' : '#e8e1d6'),
  sign: ['🎓 KOCHSCHULE', '#8a2f5a', '#fff6e8'],
  furn: [[5.4, 0.8, 2.0, 0.8]],
  spots: [
    { u: 2.6, v: 3.6, pose: 'stand', fu: 6.4, fv: 1 },
    { u: 4.4, v: 3.6, pose: 'stand', fu: 6.4, fv: 1 },
    { u: 2.6, v: 5.6, pose: 'stand', fu: 6.4, fv: 1 },
    { u: 4.4, v: 5.6, pose: 'stand', fu: 6.4, fv: 1 },
  ],
  spawn: 3,
  stay: [999, 999],
  noTimer: true,
  fee: 0,
  res: { kind: 'item', u: 6.4, v: 2.2, per: 0.25, name: 'ZUTATEN', noMood: true },
  init: () => ({ res: 0, phase: 'gather', T: 0, wait: 0 }),
  look: () => ({ cap: true, capCol: '#f7f3ea' }),
  canSpawn: st => st.phase === 'gather',
  extra(st, r, dt) {
    const here = st.guests.filter(g => g.state === 'stay');
    if (st.phase === 'gather') {
      if (here.length >= 4) {
        st.wait += dt;
        if (st.res >= 0.999) {
          st.res = 0;
          st.phase = 'lesson';
          st.T = relax() ? 30 : 40;
          st.wait = 0;
          floatText(LX(r, 6.4), r.y0 + 1, 80, t('Der Kurs beginnt!'), '#f2b134');
        } else if (st.wait > 90) {
          rate(-0.05);
          for (const g of here) {
            floatText(g.x, g.y, 70, '😤', '#ff8a7f');
            leave(CFG.school, st, r, g, false);
          }
          st.wait = 0;
          st.phase = 'pause';
          st.T = 20;
        }
      }
    } else if (st.phase === 'lesson') {
      st.T -= dt;
      for (const g of here) if (Math.random() < dt * 0.6) heart(st, g.x, g.y, 40, rnd(['🔪', '🥙', '🧅']));
      if (st.T <= 0) {
        sale(r.slot, Math.round(4 * 30 * H.pm()), LX(r, 4), r.y0 + 4.5, '🎓');
        rate(0.05);
        for (const g of here) {
          g.happy = 2;
          leave(CFG.school, st, r, g, false);
        }
        st.phase = 'pause';
        st.T = 20;
      }
    } else {
      st.T -= dt;
      if (st.T <= 0) st.phase = 'gather';
    }
  },
  draw(S0, st, r, tm) {
    const tb = LR(r, 5.4, 0.8, 2.0, 0.8);
    const teacher = npc(LX(r, 6.4), r.y0 + 0.45, {
      shirt: '#f7f3ea',
      name: 'Usta Hakan',
      cap: true,
      capCol: '#fff',
      moving: st.phase === 'lesson',
      phase: tm * 5,
    });
    face(teacher, L(r, 4, 4));
    S0.push({ d: teacher.x + teacher.y, f: () => H.person(teacher) });
    S0.push({
      d: tb.x + tb.y + 1.4,
      f: () => {
        box(tb.x, tb.y, 2, 0.8, 26, '#8d969b', '#6d767c', '#7b8489');
        const n = Math.round(st.res * 4);
        for (let i = 0; i < n; i++) {
          const q = P(tb.x + 0.35 + i * 0.4, tb.y + 0.4, 26);
          drawDoner(q.x, q.y);
        }
        const at = L(r, 6.4, 2.2);
        if (st.phase === 'gather')
          label(at.x, at.y, 44, t('ZUTATEN') + ' ' + n + '/4', n < 4 ? '#d8342b' : '#4fae62');
        else if (st.phase === 'lesson') bar(at.x, at.y, 50, 1 - st.T / 40, '#f2b134');
      },
    });
    for (const sp of CFG.school.spots) {
      const q = L(r, sp.u + 0.7, sp.v);
      S0.push({
        d: q.x + q.y,
        f: () => box(q.x - 0.3, q.y - 0.35, 0.6, 0.7, 22, '#f7f3ea', '#b9b0a3', '#cfc6b8'),
      });
    }
    drawGuests(S0, st, r);
    drawFx(S0, st);
  },
  hud: st =>
    st.phase === 'gather' && st.guests.filter(g => g.state === 'stay').length >= 4 && st.res < 1
      ? t('Kochschule braucht Döner {n}/4', { n: Math.round(st.res * 4) })
      : '',
};

// ---------------------------------------------------------------- Istanbul: Hamam
CFG.hamam = {
  floor: (x, y) => ((x + y) % 2 ? '#e8e1d6' : '#d3d8dc'),
  sign: ['♨ HAMAM', '#2f9a8a', '#fff6e8'],
  furn: [[3.0, 2.6, 2.6, 2.4]],
  spots: [
    { u: 3.6, v: 3.1, pose: 'lie' },
    { u: 5.0, v: 3.1, pose: 'lie' },
    { u: 3.6, v: 4.5, pose: 'lie' },
    { u: 5.0, v: 4.5, pose: 'lie' },
  ],
  spawn: 11,
  stay: [40, 55],
  fee: 24,
  icon: '♨',
  res: { kind: 'stand', u: 7.3, v: 6.3, drain: 220, name: 'KESSEL', done: 'Holz nachgelegt' },
  look: () => ({ towel: rnd(['#c0392f', '#2f5f93', '#4fae62']) }),
  init: () => ({ tel: { x: 0, y: 0, i: 0, t: 0 }, steam: [] }),
  extra(st, r, dt) {
    if (st.res > 0 && Math.random() < dt * 6)
      st.steam.push({
        x: LX(r, 3 + Math.random() * 2.6),
        y: r.y0 + 2.6 + Math.random() * 2.4,
        z: 16,
        life: 1,
      });
    for (const s of st.steam) {
      s.z += dt * 14;
      s.life -= dt / 2.2;
    }
    st.steam = st.steam.filter(s => s.life > 0);
  },
  draw(S0, st, r, tm) {
    const st0 = LR(r, 3.0, 2.6, 2.6, 2.4);
    S0.push({
      d: st0.x + st0.y + 0.6,
      f: () => {
        box(st0.x, st0.y, st0.w, st0.d, 14, st.res > 0 ? '#f3efe8' : '#d9dde0', '#bfc4c8', '#cfd4d8');
        for (const g of st.guests) if (g.state === 'stay') lyingPerson(g);
      },
    });
    for (let i = 0; i < 3; i++) {
      const k = LR(r, 1.8 + i * 2.1, 0.25, 0.7, 0.45);
      S0.push({
        d: k.x + k.y + 0.6,
        f: () => {
          box(k.x, k.y, 0.7, 0.45, 20, '#bfe0f0', '#bfc4c8', '#cfd4d8');
        },
      });
    }
    const kz = LR(r, 7.0, 6.0, 0.7, 0.7);
    S0.push({
      d: kz.x + kz.y + 0.7,
      f: () => {
        box(kz.x, kz.y, 0.7, 0.7, 40, '#b86b3e', '#8a4a24', '#a05a30');
        const q = P(kz.x + 0.35, kz.y + 0.7, 12);
        ell(q.x, q.y, 6, 4, st.res > 0.05 ? `rgba(255,${120 + 40 * Math.sin(tm * 8)},40,.95)` : '#2e3438');
        resChip(CFG.hamam, st, r, 60);
      },
    });
    // Tellak schrubbt reihum
    const lying = st.guests.filter(g => g.state === 'stay');
    const tl = st.tel;
    if (lying.length) {
      const g = lying[Math.floor(tm / 6) % lying.length];
      tl.x += (g.x + 0.5 - tl.x) * 0.05;
      tl.y += (g.y - tl.y) * 0.05;
    } else {
      tl.x = LX(r, 6.2);
      tl.y = r.y0 + 3.8;
    }
    const tel = npc(tl.x, tl.y, {
      shirt: '#f7f3ea',
      skin: '#b97a52',
      hair: '#1b1b1f',
      moving: lying.length > 0,
      phase: tm * 10,
      name: 'Tellak',
    });
    S0.push({ d: tel.x + tel.y + 0.5, f: () => H.person(tel) });
    for (const s of st.steam)
      S0.push({
        d: 99,
        f: () => {
          const q = P(s.x, s.y, s.z);
          ell(q.x, q.y, 8 + (1 - s.life) * 8, 5, `rgba(255,255,255,${0.35 * s.life})`);
        },
      });
    drawGuests(S0, st, r);
  },
  hud: st => (st.res <= 0 && st.guests.length ? t('Hamam: der Stein wird kalt!') : ''),
};

// ---------------------------------------------------------------- Istanbul: Tavla-Ecke
CFG.tavla = {
  floor: (x, y) => ((x + y) % 2 ? '#8a5a2e' : '#9c6b3e'),
  sign: ['🎲 TAVLA', '#6e4430', '#f2c75a'],
  furn: [
    [3.1, 1.6, 0.9, 0.8],
    [3.1, 5.0, 0.9, 0.8],
  ],
  spots: [
    { u: 2.5, v: 2.0, pose: 'sit', fu: 3.6, fv: 2.0 },
    { u: 4.6, v: 2.0, pose: 'sit', fu: 3.6, fv: 2.0 },
    { u: 2.5, v: 5.4, pose: 'sit', fu: 3.6, fv: 5.4 },
    { u: 4.6, v: 5.4, pose: 'sit', fu: 3.6, fv: 5.4 },
  ],
  spawn: 10,
  stay: [90, 130],
  fee: 6,
  icon: '🎲',
  res: { kind: 'stand', u: 6.8, v: 1.3, drain: 180, name: 'ÇAY', done: 'Çay ist fertig' },
  look: () => ({
    hair: rnd(['#cfcfcf', '#9a9aa3', '#eeeeee']),
    cap: Math.random() < 0.6,
    capCol: '#5a4a3a',
    shirt: rnd(['#5a4a3a', '#6f7f3a', '#3b3440']),
  }),
  init: () => ({ games: [18, 24], moanT: 10 }),
  extra(st, r, dt) {
    for (let k = 0; k < 2; k++) {
      const a = st.guests.find(g => g.spot === k * 2 && g.state === 'stay'),
        b = st.guests.find(g => g.spot === k * 2 + 1 && g.state === 'stay');
      if (!a || !b) continue;
      if (st.res > 0) st.games[k] -= dt;
      if (st.games[k] <= 0) {
        st.games[k] = 22 + Math.random() * 10;
        const w = Math.random() < 0.5 ? a : b;
        floatText(w.x, w.y, 80, t(rnd(['Mars!', 'Şeş beş!', 'Düşeş!'])), '#f2c75a');
        sale(r.slot, Math.round(6 * 2 * H.pm()), (a.x + b.x) / 2, (a.y + b.y) / 2, '🎲');
      }
    }
    if (st.res <= 0 && st.guests.some(g => g.state === 'stay')) {
      st.moanT -= dt;
      if (st.moanT <= 0) {
        st.moanT = 12;
        const g = rnd(st.guests.filter(o => o.state === 'stay'));
        floatText(g.x, g.y, 70, t('Çay yok mu?!'), '#ff8a7f');
      }
    }
  },
  draw(S0, st, r, tm) {
    for (let k = 0; k < 2; k++) {
      const tb = LR(r, 3.1, k ? 5.0 : 1.6, 0.9, 0.8);
      S0.push({
        d: tb.x + tb.y + 0.9,
        f: () => {
          box(tb.x, tb.y, 0.9, 0.8, 20, '#6e4430', '#5b3a28', '#6e4430');
          const q = P(tb.x + 0.45, tb.y + 0.4, 20);
          rr(q.x - 12, q.y - 6, 24, 11, 2, '#c9a27a');
          ctx.fillStyle = '#6e4430';
          ctx.fillRect(q.x - 0.5, q.y - 6, 1, 11);
          const busy = st.guests.filter(g => g.spot >> 1 === k && g.state === 'stay').length === 2;
          if (busy) {
            const j = Math.floor(tm * 4 + k) % 6;
            rr(q.x - 3 + (j % 3), q.y - 12, 5, 5, 1, '#fff');
            rr(q.x + 3, q.y - 11 + (j % 2), 5, 5, 1, '#fff');
          }
          if (st.res > 0) {
            const c = P(tb.x + 0.8, tb.y + 0.1, 20);
            rr(c.x - 2, c.y - 7, 4, 7, 1, 'rgba(192,57,47,.8)');
          }
        },
      });
    }
    const sm = L(r, 6.8, 0.7);
    S0.push({
      d: sm.x + sm.y + 0.3,
      f: () => {
        box(sm.x - 0.3, sm.y - 0.3, 0.6, 0.6, 20, '#6e4430', '#5b3a28', '#6e4430');
        const p = P(sm.x, sm.y, 20);
        rr(p.x - 7, p.y - 24, 14, 24, 5, '#d4a93f');
        ell(p.x, p.y - 26, 5, 3, '#b8912f');
        if (st.res > 0) ell(p.x, p.y - 34 - ((tm * 10) % 8), 3, 2, 'rgba(255,255,255,.5)');
        resChip(CFG.tavla, st, r, 58);
      },
    });
    drawGuests(S0, st, r);
  },
  hud: st => (st.res <= 0 && st.guests.some(g => g.state === 'stay') ? t('Tavla: Çay ist alle!') : ''),
};

// ---------------------------------------------------------------- Deko-Flächen
const deco = (withCats, extra) => ({
  floor: (x, y) => ((x * 7 + y * 3) % 5 ? '#6fa55a' : '#7db368'),
  deco: true,
  init: r => ({ cats: withCats ? mkCats(6, roomBox(r)) : [] }),
  extra(st, r, dt) {
    for (const c of st.cats) catWander(c, roomBox(r), dt, null);
  },
  draw(S0, st, r, tm) {
    for (const [u, v] of [
      [1.6, 1.2],
      [7.2, 1.2],
      [7.2, 6.4],
      [1.6, 6.4],
      [4.4, 1.0],
    ]) {
      const q = L(r, u, v);
      S0.push({
        d: q.x + q.y,
        f: () => {
          drawPlant(q.x, q.y);
          const p = P(q.x, q.y, 34);
          ell(p.x, p.y - 10, 16, 12, '#3f7a3a');
          ell(p.x - 6, p.y - 20, 10, 9, '#5da049');
        },
      });
    }
    const bn = LR(r, 3.4, 5.6, 2.0, 0.5);
    S0.push({
      d: bn.x + bn.y + 1,
      f: () => {
        box(bn.x, bn.y, 2, 0.5, 10, '#8a5a2e', '#5b3a28', '#6e4430');
        box(bn.x, bn.y + 0.4, 2, 0.1, 22, '#8a5a2e', '#5b3a28', '#6e4430');
      },
    });
    if (withCats)
      for (const [u, v] of [
        [2.6, 3.8],
        [6.0, 3.6],
      ]) {
        const q = LR(r, u, v, 0.8, 0.7);
        S0.push({
          d: q.x + q.y + 0.7,
          f: () => {
            box(q.x, q.y, 0.8, 0.7, 16, '#c0392f', '#8f2721', '#a8261f');
            const p = P(q.x + 0.4, q.y + 0.7, 8);
            ell(p.x, p.y, 5, 5, '#231a24');
          },
        });
      }
    for (const c of st.cats) S0.push({ d: c.x + c.y, f: () => drawCat(c, tm, 1.2) });
    if (extra) extra(S0, st, r, tm);
  },
});
CFG.garden = deco(false);
CFG.kedi = deco(true);

// ================================================================ Flur-Kellner Yusuf
const PICKUP = { x: 3.0, y: 5.1 };
function jobs() {
  const out = [];
  for (const r of openWing()) {
    const c = CFG[r.id],
      st = ST(r);
    if (c.req)
      for (const g of st.guests)
        if (g.req && !g.claim && g.state === 'stay') out.push({ r, g, n: 1, pri: 0 });
    if (c.res && c.res.kind === 'item') {
      const need = Math.ceil((0.999 - st.res) / c.res.per);
      const low =
        r.id === 'automat'
          ? st.res < 0.5
          : r.id === 'school'
            ? st.guests.length >= 2
            : r.id === 'stream'
              ? st.guests.length > 0 && st.res < 0.5
              : st.res < 0.5;
      if (need > 0 && low) out.push({ r, n: Math.min(4, need), pri: 1, res: true });
    }
  }
  return out.sort((a, b) => a.pri - b.pri);
}
function jobTarget(j) {
  return j.g ? { x: j.g.x + 0.5, y: j.g.y + 0.2 } : L(j.r, CFG[j.r.id].res.u, CFG[j.r.id].res.v);
}
// Weg von Raum a (oder Flur, a = null) zum Ziel des Auftrags j
function routeTo(a, j) {
  const r = j.r,
    tgt = jobTarget(j);
  if (a === r) return [tgt];
  const out = a ? [H.doorIn(a), H.doorOut(a)] : [];
  return [...out, { x: FLX, y: H.doorOut(r).y }, H.doorOut(r), H.doorIn(r), tgt];
}
function waiterTick(dt) {
  const ws = WS();
  if (!G.unlocked.has('wingWaiter')) {
    ws.yusuf = null;
    return;
  }
  let w = ws.yusuf;
  const home = { x: FLX, y: FY - 2.6 };
  if (!w)
    w = ws.yusuf = npc(home.x, home.y, {
      shirt: '#2f9a8a',
      name: 'Yusuf',
      state: 'idle',
      path: [],
      wait: 0,
      jobs: [],
    });
  w.phase += w.moving ? dt * 12 : 0;
  const walkW = () => H.walk(w, dt, 3.8);
  if (w.state === 'idle') {
    if (!walkW()) return;
    const all = jobs();
    if (!all.length) {
      moveToward(w, home.x, home.y, 3.8, dt);
      return;
    }
    // bis zu 5 Döner pro Gang: erst der dringendste Auftrag, dann weitere (gleicher Raum zuerst)
    const first = all[0],
      rest = all.slice(1).sort((a, b) => (a.r === first.r ? 0 : 1) - (b.r === first.r ? 0 : 1));
    w.jobs = [first];
    let n = first.n;
    for (const j of rest) if (n + j.n <= 5) (w.jobs.push(j), (n += j.n));
    for (const j of w.jobs) if (j.g) j.g.claim = 'yusuf';
    w.need = n;
    const mm = wingRooms().find(r => r.id === 'mama' && roomOpen(r.id));
    if (tubeStock() >= n) {
      w.src = 'tube';
      w.path = [
        { x: FLX, y: TUBE.y },
        { x: TUBE.x - 0.5, y: TUBE.y },
      ];
    } else if (mm && ST(mm).pot >= n) {
      w.src = mm;
      w.path = [{ x: FLX, y: H.doorOut(mm).y }, H.doorOut(mm), H.doorIn(mm), L(mm, 4.4, 1.6)];
    } else {
      w.src = null;
      w.path = [{ x: FLX, y: Math.max(D + 0.8, Math.min(w.y, FY)) }, FL_IN, FL_OUT, PICKUP];
    }
    w.state = 'fetch';
    w.wait = 0;
  } else if (w.state === 'fetch') {
    if (!walkW()) return;
    const stock = w.src === 'tube' ? tubeStock() : w.src ? ST(w.src).pot : G.stock.counter;
    if (stock > 0) {
      const n = Math.min(w.need, stock);
      if (w.src === 'tube') tubeTake(n);
      else if (w.src) ST(w.src).pot -= n;
      else {
        G.stock.counter -= n;
        const tp = stackTop('counter', G.stock.counter);
        fly('d', P(tp.x, tp.y, tp.z), w, 26);
      }
      w.items = Array(n).fill('d');
      w.carry = n;
      // nur so viele Aufträge behalten, wie Döner da sind
      let k = n;
      w.jobs = w.jobs.filter(j => {
        if (k >= j.n) return ((k -= j.n), true);
        if (j.res && k > 0) return ((j.n = k), (k = 0), true);
        if (j.g) j.g.claim = null;
        return false;
      });
      const from = w.src === 'tube' ? null : w.src;
      w.path = [...(w.src ? [] : [FL_OUT, FL_IN]), ...routeTo(from, w.jobs[0])];
      w.at = w.jobs[0].r;
      w.state = 'go';
    } else {
      w.wait += dt;
      if (w.wait > 8) {
        for (const j of w.jobs) if (j.g) j.g.claim = null;
        w.jobs = [];
        w.state = 'home';
        w.path =
          w.src === 'tube'
            ? [home]
            : w.src
              ? [H.doorIn(w.src), H.doorOut(w.src), home]
              : [FL_OUT, FL_IN, home];
      }
    }
  } else if (w.state === 'go') {
    if (!walkW()) return;
    const j = w.jobs.shift(),
      r = j.r,
      c = CFG[r.id],
      st = ST(r);
    if (j.g) {
      if (j.g.req && st.guests.includes(j.g) && w.carry > 0) {
        w.carry--;
        w.items.pop();
        serveReq(c, st, r, j.g, w);
      }
      j.g.claim = null;
    } else if (c.res && w.carry > 0) {
      const n = Math.min(w.carry, j.n);
      st.res = Math.min(1, st.res + c.res.per * n);
      w.carry -= n;
      w.items.length = w.carry;
      fly('d', P(w.x, w.y, 30), L(r, c.res.u, c.res.v), 24);
      sfx('stack', 0.5, 1.1);
    }
    if (w.jobs.length && w.carry > 0) {
      w.path = routeTo(r, w.jobs[0]);
      return;
    }
    for (const o of w.jobs) if (o.g) o.g.claim = null;
    w.jobs = [];
    w.items = [];
    w.carry = 0;
    w.state = 'home';
    w.path = [H.doorIn(r), H.doorOut(r), { x: FLX, y: H.doorOut(r).y }];
  } else if (w.state === 'home') {
    if (walkW()) w.state = 'idle';
  }
}

// ================================================================ Schnittstelle zu rooms.js
export function wingTick(dt) {
  streetCatsTick(dt);
  for (const r of wingRooms()) {
    if (r.deco) {
      if (CFG[r.id]) CFG[r.id].extra(ST(r), r, dt);
      continue;
    }
    if (!roomOpen(r.id)) continue;
    genTick(CFG[r.id], ST(r), r, dt);
  }
  waiterTick(dt);
}
export function wingDraw(S0, time) {
  for (const r of wingRooms()) {
    if (!(r.deco || roomOpen(r.id))) continue;
    CFG[r.id].draw(S0, ST(r), r, time);
  }
  const w = WS().yusuf;
  if (w) S0.push({ d: w.x + w.y + 0.02, f: () => H.person(w) });
  if (streetCats) for (const c of streetCats) S0.push({ d: c.x + c.y, f: () => drawCat(c, time, 1.1) });
  // Schild über der Flurtür
  if (G.cityLv >= 4)
    S0.push({
      d: FLX + D + 0.2,
      f: () => {
        const c = P(FLX, D, 58);
        chip(c.x, c.y, t('ANBAU') + ' ↓', '#6b5a6d', '#fff6e8', '9px Bungee, Impact, sans-serif');
      },
    });
}
export function wingFloor(r, ix, iy) {
  const c = CFG[r.id];
  return c ? c.floor(ix, iy) : '#40354a';
}
export function wingFloorDecor(r) {
  if (r.id === 'wash') {
    // Fahrspur zur Straße
    const y = r.y0 + 3.8;
    poly([P(FL1 + 1.5, y - 0.6), P(W, y - 0.6), P(W, y + 0.6), P(FL1 + 1.5, y + 0.6)], 'rgba(35,26,36,.18)');
    poly([P(W, y - 1.2), P(12.15, y - 1.2), P(12.15, y + 1.2), P(W, y + 1.2)], '#8d8590');
  }
}
export function wingWallDecor(r, wallSign) {
  const c = CFG[r.id];
  if (!c || !c.sign) return;
  wallSign(r.side < 0 ? r.x0 + 0.4 : FL1 + 0.5, r.y0, 'x', c.sign[0], c.sign[1], c.sign[2]);
}
export function wingObstacles(r) {
  const c = CFG[r.id];
  if (!c || !c.furn) return [];
  return c.furn.map(([u, v, w, d]) => LR(r, u, v, w, d));
}
export function wingHud() {
  for (const r of openWing()) {
    const c = CFG[r.id];
    if (c.hud) {
      const s = c.hud(ST(r), r);
      if (s) return s;
    }
  }
  return '';
}
