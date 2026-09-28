// update.js – aus der Einzeldatei extrahiert

import {
  BIN,
  SINK,
  CARCOLS,
  CRATE_SPOTS,
  D,
  ENTER,
  EXIT,
  FRY,
  FRY_MAX,
  FRY_PICK,
  HAIRS,
  PICK_Y,
  PILES,
  QSLOTS,
  REG,
  ROAD_CAR,
  ROAD_MOPED,
  SHIRTS,
  SKINS,
  SP,
  SP_MAX,
  SP_PICK,
  ST,
  TABLES,
  TH,
  TRAY_MAX,
  TW,
  dist,
  rnd,
} from './config.js';
import {
  G,
  STATIONS,
  friesPrice,
  newMission,
  padMul,
  padPrice,
  patMax,
  price,
  priceMul,
  relax,
  specPrice,
  staffMul,
  stat,
  stationOn,
} from './state.js';
import { P } from './iso.js';
import { stackTop } from './sprites.js';
import {
  accepts,
  activePads,
  blocked,
  dirtyCount,
  dropInto,
  friesTop,
  give,
  moveToward,
  obstacles,
  pickSource,
  rate,
  sale,
  specTop,
  unlock,
} from './world.js';
import { floatText, fly, flyers, texts } from './fx.js';
import { beep, ching, chord, sfx, popSfx, sizzleLevel } from './audio.js';
import { joy, keys } from './input.js';
import { bumpMoney, showBanner } from './hud.js';
import { M, addGems } from './meta.js';
import { PHASE_MSG, phaseNow } from './daynight.js';
import { life, lifeMax } from './achievements.js';
import { criticServed, newDayWeather, rainy, updateEvents } from './events.js';
import { v9Update } from './cutting.js';
import { evtPoints } from './festival.js';
import { mechDecorate, mechSale, mechSpawnMul, mechTick } from './citymech.js';
import { roomsTick, roomSpawnMul } from './rooms.js';
import { stage3Tick } from './stage3.js';
import { presTick } from './prestige.js';
import { t as T, fmt } from './i18n.js';

let sizT = 0;
export function update(dt) {
  sizT -= dt;
  if (sizT <= 0) {
    sizT = 1;
    sizzleLevel(G.spits.filter(s => s.on).length / 3);
  }
  G.time += dt;
  const pl = G.player,
    PR = price();
  for (const k in G.boost) if (G.boost[k] > 0) G.boost[k] = Math.max(0, G.boost[k] - dt);
  v9Update(dt);
  G.clock = (G.clock + dt * 6) % 1440;
  life('play', dt);
  {
    const ph = phaseNow();
    if (G.phaseId === null) G.phaseId = ph.id;
    if (ph.id !== G.phaseId) {
      G.phaseId = ph.id;
      if (ph.id === 'morgen') newDayWeather();
      const m = PHASE_MSG[ph.id];
      if (m && G.rush <= 0) showBanner(T(m[0]), T(m[1]));
    }
  }
  if (G.rating >= 4.99) lifeMax('stars5', 1);
  if (!G.mission) G.mission = newMission();
  if (G.tablesLv > 0) {
    if (G.rush > 0) {
      G.rush -= dt;
      if (G.rush <= 0) {
        G.rush = 0;
        G.rushNext = 80 + Math.random() * 40;
      }
    } else if (!relax()) {
      G.rushNext -= dt;
      if (G.rushNext <= 0) {
        G.rush = 20;
        showBanner(T('RUSH HOUR!'), T('20 Sekunden: doppelt so viele Gäste, Preise ×1,5'));
        sfx('rush', 0.7) || beep(880, 0.2, 'sawtooth', 0.03);
      }
    }
  }
  let dx = 0,
    dy = 0;
  if (joy) {
    const vx = joy.cx - joy.sx,
      vy = joy.cy - joy.sy,
      m = Math.hypot(vx, vy);
    if (m > 6) {
      dx = vx / m;
      dy = vy / m;
    }
  } else {
    if (keys.has('l')) dx--;
    if (keys.has('r')) dx++;
    if (keys.has('u')) dy--;
    if (keys.has('d')) dy++;
  }
  pl.moving = false;
  if (dx || dy) {
    let wx = dx / TW + dy / TH,
      wy = dy / TH - dx / TW;
    const m = Math.hypot(wx, wy);
    wx /= m;
    wy /= m;
    const sp =
        4.2 *
        (1 + 0.1 * G.lv.walk) *
        (1 + 0.08 * ((M.pres && M.pres.ups && M.pres.ups.pWalk) || 0)) *
        (G.boost.speed > 0 ? 1.5 : 1) *
        dt,
      obs = obstacles();
    const nx = pl.x + wx * sp;
    if (!blocked(nx, pl.y, obs)) pl.x = nx;
    const ny = pl.y + wy * sp;
    if (!blocked(pl.x, ny, obs)) pl.y = ny;
    pl.moving = true;
    pl.phase += dt * 15;
    if (Math.abs(dx) > 0.05) pl.fx = dx > 0 ? 1 : -1;
    G.hasMoved = true;
  }
  pl.max = G.cap;

  for (const s of G.spits) {
    if (!s.on) continue;
    if (s.stock < TRAY_MAX && !G.blackout) {
      s.t += dt * G.prodMul;
      if (s.t >= G.spitTime) {
        s.t = 0;
        s.stock++;
      }
    }
  }
  const fr = G.fryer;
  if (fr.on && fr.stock < FRY_MAX && !G.blackout) {
    fr.t += dt * G.prodMul;
    if (fr.t >= G.fryTime) {
      fr.t = 0;
      fr.stock++;
    }
  }
  const spc = G.special;
  if (spc.on && spc.stock < SP_MAX && !G.blackout) {
    spc.t += dt * G.prodMul;
    if (spc.t >= G.specTime) {
      spc.t = 0;
      spc.stock++;
    }
  }

  // player pickup / drop
  G.pickT -= dt;
  G.dropT -= dt;
  for (const s of G.spits) {
    if (
      s.on &&
      s.stock > 0 &&
      pl.carry < G.cap &&
      !pl.items.includes('t') &&
      G.pickT <= 0 &&
      dist(pl, { x: s.x + 0.5, y: PICK_Y }) < 0.85
    ) {
      s.stock--;
      give(pl, 'd');
      G.pickT = 0.09;
      fly('d', P(s.x + 0.5, 1.27, 22 + s.stock * 5), pl, 24 + pl.carry * 5);
      popSfx(pl.carry);
    }
  }
  // trash pickup & bin
  TABLES.forEach((tb, i) => {
    if (tb.lv > G.tablesLv || G.tableTrash[i] <= 0) return;
    if (pl.carry < G.cap && pl.items.every(t => t === 't') && G.pickT <= 0 && dist(pl, tb) < 1.0) {
      G.tableTrash[i]--;
      give(pl, 't');
      G.pickT = 0.1;
      fly('t', P(tb.x, tb.y, 28), pl, 24 + pl.carry * 5);
      sfx('pop', 0.6, 0.75 + pl.carry * 0.04) || beep(300 + pl.carry * 20);
    }
  });
  if (pl.items.includes('t') && G.dropT <= 0 && dist(pl, BIN) < 0.85) {
    const i = pl.items.lastIndexOf('t');
    pl.items.splice(i, 1);
    pl.carry = pl.items.length;
    G.dropT = 0.06;
    fly('t', P(pl.x, pl.y, 26 + pl.carry * 5), BIN, 26);
    sfx('trash', 0.7, 0.9 + Math.random() * 0.2) || beep(220, 0.05);
    rate(0.03);
    stat('clean', 1);
  }
  // Geschirr an der Spüle neben der Theke abgeben
  if (pl.items.includes('t') && G.dropT <= 0 && dist(pl, SINK) < 1.0) {
    const i = pl.items.lastIndexOf('t');
    pl.items.splice(i, 1);
    pl.carry = pl.items.length;
    G.dropT = 0.06;
    fly('t', P(pl.x, pl.y, 26 + pl.carry * 5), { x: SINK.x, y: SINK.y }, 20);
    sfx('stack', 0.5, 1.3) || beep(420, 0.04);
    rate(0.03);
    stat('clean', 1);
  }
  // Hände frei machen: am Mülleimer kurz stehen bleiben wirft auch Essen weg
  if (!pl.moving && pl.carry > 0 && dist(pl, BIN) < 0.85) {
    G.binHold = (G.binHold || 0) + dt;
    if (G.binHold > 0.9 && G.dropT <= 0) {
      const it = pl.items.pop();
      pl.carry = pl.items.length;
      G.dropT = 0.12;
      fly(it, P(pl.x, pl.y, 26 + pl.carry * 5), BIN, 26);
      sfx('trash', 0.5, 1.1) || beep(220, 0.05);
      if (!pl.carry) floatText(BIN.x, BIN.y, 60, T('Hände frei!'), '#cdbfae');
    }
  } else G.binHold = 0;
  if (
    spc.on &&
    spc.stock > 0 &&
    pl.carry < G.cap &&
    !pl.items.includes('t') &&
    G.pickT <= 0 &&
    dist(pl, SP_PICK) < 0.85
  ) {
    spc.stock--;
    give(pl, 's');
    G.pickT = 0.09;
    fly('s', P(SP.x + 0.5, SP.y + 0.5, 34 + spc.stock * 5), pl, 24 + pl.carry * 5);
    popSfx(pl.carry + 2);
  }
  if (
    fr.on &&
    fr.stock > 0 &&
    pl.carry < G.cap &&
    !pl.items.includes('t') &&
    G.pickT <= 0 &&
    dist(pl, FRY_PICK) < 0.85
  ) {
    fr.stock--;
    give(pl, 'f');
    G.pickT = 0.09;
    fly('f', P(FRY.x + 0.5, 1.27, 22 + fr.stock * 5), pl, 24 + pl.carry * 5);
    popSfx(pl.carry + 1);
  }
  for (const k of STATIONS) {
    if (!stationOn(k)) continue;
    const s = ST[k];
    if (pl.carry > 0 && G.dropT <= 0 && dist(pl, s.zone) < s.r) {
      if (dropInto(pl, k)) {
        G.dropT = 0.07;
        sfx('stack', 0.7, 0.9 + pl.carry * 0.03) || beep(360 + pl.carry * 18);
      }
    }
  }

  // workers
  G.workers.forEach((w, wi) => {
    if (w.role === 'cashier' || w.role === 'drive') {
      w.moving = false;
      w.fx = 1;
      return;
    }
    if (w.role === 'cleaner') {
      const sp = 3 * staffMul();
      w.max = 6 + G.lv.cap;
      if (w.state === 'toBin') {
        if (moveToward(w, BIN.x + 0.45, BIN.y - 0.35, sp, dt)) {
          w.t -= dt;
          if (w.t <= 0 && w.carry > 0) {
            w.items.pop();
            w.carry = w.items.length;
            w.t = 0.08;
            fly('t', P(w.x, w.y, 26 + w.carry * 5), BIN, 26);
            rate(0.03);
            stat('clean', 1);
          }
          if (!w.carry) w.state = 'idle';
        }
        return;
      }
      if (w.ti == null || G.tableTrash[w.ti] === 0) {
        const ti = G.tableTrash.findIndex((n, i) => n > 0 && TABLES[i].lv <= G.tablesLv);
        w.ti = ti < 0 ? null : ti;
      }
      if (w.ti != null && w.carry < w.max) {
        const tb = TABLES[w.ti];
        if (moveToward(w, tb.x + 0.4, tb.y + 0.45, sp, dt)) {
          w.t -= dt;
          if (w.t <= 0 && G.tableTrash[w.ti] > 0) {
            G.tableTrash[w.ti]--;
            give(w, 't');
            w.t = 0.12;
            fly('t', P(tb.x, tb.y, 28), w, 24 + w.carry * 5);
          }
          if (G.tableTrash[w.ti] === 0) w.ti = null;
        }
      } else if (w.carry > 0) w.state = 'toBin';
      else moveToward(w, BIN.x + 0.8, BIN.y - 0.9, 2, dt);
      return;
    }
    const off = (wi % 2) * 0.35 - 0.17;
    w.max = 5 + G.lv.cap;
    if (w.state === 'toSpit') {
      if (!w.src || (w.src.kind === 'd' && !w.src.spit.on)) w.src = pickSource(w);
      if (w.src.kind === 'wait') {
        moveToward(w, ST.counter.zone.x + off * 2, ST.counter.zone.y - 0.5, 2.4 * staffMul(), dt);
        w.t -= dt;
        if (w.t <= 0) {
          w.t = 0.8;
          w.src = pickSource(w);
        }
        return;
      }
      const src = w.src,
        store = src.kind === 'f' ? G.fryer : src.kind === 's' ? G.special : src.spit,
        sx = src.kind === 'f' ? FRY.x : src.kind === 's' ? SP.x : src.spit.x;
      const px = src.kind === 's' ? SP_PICK.x - 0.1 + off * 0.5 : sx + 0.5 + off,
        py = src.kind === 's' ? SP_PICK.y + off : PICK_Y + 0.15;
      if (moveToward(w, px, py, 3.2 * staffMul(), dt)) {
        w.t -= dt;
        if (w.t <= 0 && store.stock > 0 && w.carry < w.max) {
          store.stock--;
          give(w, src.kind);
          w.t = 0.14;
          fly(
            src.kind,
            src.kind === 's'
              ? P(SP.x + 0.5, SP.y + 0.5, 34 + store.stock * 5)
              : P(sx + 0.5, 1.27, 22 + store.stock * 5),
            w,
            24 + w.carry * 5,
          );
        }
        if (w.carry >= w.max || (store.stock === 0 && w.carry > 0)) {
          w.state = 'toDrop';
          w.target = w.home || 'counter';
          w.src = null;
        } else if (store.stock === 0) w.src = pickSource(w);
      }
    } else {
      const s = ST[w.target],
        zx = s.zone.x + (w.target === 'counter' ? off : 0),
        zy = s.zone.y + (w.target === 'counter' ? -0.1 : off * 0.6);
      if (moveToward(w, zx, zy, 3.2 * staffMul(), dt)) {
        w.t -= dt;
        if (w.t <= 0 && w.carry > 0 && dropInto(w, w.target)) w.t = 0.1;
        if (w.carry === 0) {
          w.state = 'toSpit';
          w.src = null;
          w.stuck = 0;
        } else if (!w.items.some(t => accepts(w.target, t))) {
          // Station voll: kurz warten, dann Ware zurück an die Quelle bringen statt ewig herumzustehen
          w.stuck = (w.stuck || 0) + dt;
          if (w.stuck > 2.5) {
            for (const it of w.items) {
              if (it === 's' && G.special.stock < SP_MAX) G.special.stock++;
              else if (it === 'f' && G.fryer.stock < FRY_MAX) G.fryer.stock++;
              else if (it === 'd') {
                const sp = G.spits.find(x => x.on && x.stock < TRAY_MAX);
                if (sp) sp.stock++;
              }
            }
            w.items.length = 0;
            w.carry = 0;
            w.stuck = 0;
            w.state = 'toSpit';
            w.src = pickSource(w);
          }
        } else w.stuck = 0;
      }
    }
  });

  // walk-in customers
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT =
      (relax() ? 1.6 : 1) *
      (3.0 /
        (1 + 0.45 * G.tablesLv) /
        (1 + 0.1 * G.lv.ads) /
        (G.rush > 0 ? 2.2 : 1) /
        (G.rating / 4) /
        phaseNow().mul /
        (rainy() ? 0.7 : 1)) *
      mechSpawnMul() *
      roomSpawnMul() *
      (0.7 + Math.random() * 0.6);
    if (G.queue.length < QSLOTS.length) {
      const vip = G.unlocked.has('tables2') && Math.random() < 0.12;
      let wd = 1 + Math.floor(Math.random() * (2 + Math.min(1, G.tablesLv))),
        wf = 0;
      if (G.fryer.on && Math.random() < 0.55) {
        wf = 1 + Math.floor(Math.random() * 2);
        if (Math.random() < 0.3) wd = 0;
      }
      let ws = 0;
      if (G.special.on && Math.random() < 0.4) {
        ws = 1 + (Math.random() < 0.3 ? 1 : 0);
        if (Math.random() < 0.25) wd = 0;
      }
      if (wd + wf + ws === 0) wd = 1;
      if (vip) wd += 1;
      const nightG = phaseNow().id === 'nacht';
      if (nightG) wd += 1;
      const c = {
        x: ENTER.x,
        y: ENTER.y,
        shirt: vip ? '#e6b422' : rnd(SHIRTS),
        skin: rnd(SKINS),
        hair: rnd(HAIRS),
        long: Math.random() < 0.4,
        crown: vip,
        vip,
        pants: rnd(['#3b3440', '#2f3d5c', '#5a4a3a']),
        fx: -1,
        moving: false,
        phase: 0,
        state: 'queue',
        wd,
        wf,
        ws,
        gd: 0,
        gf: 0,
        gs: 0,
        night: nightG,
        arr: false,
        happy: 0,
        pat: patMax(),
        patMax: patMax(),
      };
      mechDecorate(c);
      G.customers.push(c);
      G.queue.push(c);
    }
  }
  for (const c of G.customers) {
    c.happy = Math.max(0, c.happy - dt);
    if (c.state === 'queue') {
      const s = QSLOTS[G.queue.indexOf(c)];
      c.arr = moveToward(c, s[0], s[1], 2.6, dt);
      if (!relax()) c.pat -= dt;
      if (c.pat <= 0) {
        G.queue.splice(G.queue.indexOf(c), 1);
        c.state = 'out';
        c.angry = true;
        rate(-0.25);
        floatText(c.x, c.y, 70, T('Zu lange gewartet!'), '#ff8a7f');
        if (c.critic) {
          rate(-0.35);
          showBanner(T('Schlechte Kritik!'), T('Der Kritiker ist gegangen – Bewertung sinkt'));
        }
        sfx('bad', 0.7) || beep(160, 0.25, 'sawtooth', 0.03);
        continue;
      }
    } else if (c.state === 'seat') {
      if (moveToward(c, c.seat.x, c.seat.y, 2.6, dt)) {
        c.state = 'sit';
        c.sitting = true;
        c.t = 5 + Math.random() * 4;
        c.fx = c.seat.x < c.seat.tx ? 1 : -1;
      }
    } else if (c.state === 'sit') {
      c.moving = false;
      c.t -= dt;
      if (c.t <= 0) {
        c.seat.occ = null;
        c.sitting = false;
        c.state = 'out';
        G.tableTrash[c.seat.ti] = Math.min(4, G.tableTrash[c.seat.ti] + 1 + (Math.random() < 0.3 ? 1 : 0));
      }
    } else if (c.state === 'out') {
      if (moveToward(c, EXIT.x, EXIT.y, 2.8, dt)) c.dead = true;
    }
  }
  G.customers = G.customers.filter(c => !c.dead);

  const front = G.queue[0],
    atReg = G.unlocked.has('cashier') || dist(pl, REG) < 0.75;
  G.serveT -= dt;
  if (front && front.arr && atReg && G.serveT <= 0) {
    let t = null,
      tp = null;
    if (front.gd < front.wd && G.stock.counter > 0) {
      G.stock.counter--;
      front.gd++;
      t = 'd';
      tp = stackTop('counter', G.stock.counter);
    } else if (front.gf < front.wf && G.stock.fries > 0) {
      G.stock.fries--;
      front.gf++;
      t = 'f';
      tp = friesTop(G.stock.fries);
    } else if ((front.gs || 0) < (front.ws || 0) && G.stock.spec > 0) {
      G.stock.spec--;
      front.gs = (front.gs || 0) + 1;
      t = 's';
      tp = specTop(G.stock.spec);
    }
    if (t) {
      G.serveT = 0.2 / staffMul();
      fly(t, P(tp.x, tp.y, tp.z), front, 30);
      sfx('serve', 0.35, 0.95 + Math.random() * 0.1) || beep(700, 0.05);
    }
    if (front.gd >= front.wd && front.gf >= front.wf && (front.gs || 0) >= (front.ws || 0)) {
      let amt = front.wd * PR + front.wf * friesPrice() + (front.ws || 0) * specPrice(),
        label = '';
      if (front.wd > 0 && front.wf > 0 && G.unlocked.has('combo')) {
        amt += Math.round(3 * priceMul());
        label = T('Menü');
      }
      if (front.vip) {
        amt = Math.round(amt * 1.5);
        label = T('VIP');
      }
      const mm = mechSale(front);
      if (mm.mul !== 1) amt = Math.round(amt * mm.mul);
      if (mm.label) label = mm.label;
      sale('reg', amt, REG.x + 0.6, REG.y + 0.9, label);
      if (front.wd) stat('sell', front.wd);
      if (front.wf) stat('fries', front.wf);
      if (front.ws) stat('spec', front.ws);
      if (front.vip) life('vip', 1);
      if (front.critic) criticServed();
      if (front.night) life('night', 1);
      G.queue.shift();
      front.happy = 2;
      rate(front.patMax - front.pat < 15 ? 0.06 : 0.02);
      let seat = null;
      if (G.tablesLv > 0 && Math.random() < 0.7) {
        const open = G.seats.filter(s => !s.occ && s.lv <= G.tablesLv),
          free = open.filter(s => G.tableTrash[s.ti] === 0);
        if (free.length) seat = rnd(free);
        else if (open.length) {
          rate(-0.06);
          floatText(front.x, front.y, 70, T('Tische schmutzig!'), '#ff8a7f');
        }
      }
      if (seat) {
        seat.occ = front;
        front.seat = seat;
        front.state = 'seat';
      } else front.state = 'out';
    }
  }

  mechTick(dt);
  roomsTick(dt);
  stage3Tick(dt);
  presTick(dt);

  // rating drift
  const tgt = 4 + (G.unlocked.has('deco') ? 0.6 : 0) - (relax() ? 0 : 0.25 * dirtyCount());
  G.rating += (tgt - G.rating) * 0.015 * dt;
  G.rating = Math.max(1, Math.min(5, G.rating));

  // bonus crate
  if (G.unlocked.size >= 2) {
    if (!G.crate) {
      G.crateT -= dt;
      if (G.crateT <= 0) {
        const sp = rnd(CRATE_SPOTS);
        G.crate = { x: sp[0], y: sp[1], life: 25 };
      }
    } else {
      G.crate.life -= dt;
      if (dist(pl, G.crate) < 0.65) {
        const amt = Math.max(Math.round(25 * padMul()), Math.round(ratePerMin() / 4));
        G.money += amt;
        bumpMoney();
        ching();
        chord();
        floatText(G.crate.x, G.crate.y, 60, T('+{amt} €', { amt: fmt(amt) }), '#f2b134');
        life('crates', 1);
        evtPoints(10);
        const gem = Math.random() < 0.3;
        if (gem) addGems(1);
        showBanner(
          T('Bonus-Kiste!'),
          gem
            ? T('+{amt} € gefunden und 1 Goldmünze', { amt: fmt(amt) })
            : T('+{amt} € gefunden', { amt: fmt(amt) }),
        );
        G.crate = null;
        G.crateT = 50 + Math.random() * 30;
      } else if (G.crate.life <= 0) {
        G.crate = null;
        G.crateT = 50 + Math.random() * 30;
      }
    }
  }

  updateEvents(dt);

  // drive-in
  if (G.unlocked.has('drivein')) {
    G.carT -= dt;
    const waiting = G.cars.filter(c => c.state === 'wait');
    if (G.carT <= 0) {
      G.carT =
        ((relax() ? 1.6 : 1) * (5.5 + Math.random() * 3)) / (G.rush > 0 ? 1.8 : 1) / (rainy() ? 1.3 : 1);
      if (waiting.length < 3)
        G.cars.push({
          y: D + 5,
          col: rnd(CARCOLS),
          want: 3 + Math.floor(Math.random() * 3),
          got: 0,
          state: 'wait',
          arr: false,
        });
    }
    G.cars
      .filter(c => c.state === 'wait')
      .forEach((c, i) => {
        const ty = 2.0 + i * 1.9;
        const d = ty - c.y;
        c.arr = Math.abs(d) < 0.05;
        if (!c.arr) c.y += Math.sign(d) * Math.min(Math.abs(d), 4 * dt);
      });
    for (const c of G.cars) if (c.state === 'out') c.y -= 5 * dt;
    G.cars = G.cars.filter(c => c.y > -6);
    const fc = G.cars.find(c => c.state === 'wait');
    const atDrive = G.unlocked.has('driveStaff') || dist(pl, ST.drive.zone) < 0.75;
    G.driveT -= dt;
    if (fc && fc.arr && atDrive && G.stock.drive > 0 && G.driveT <= 0) {
      G.stock.drive--;
      fc.got++;
      G.driveT = 0.18 / staffMul();
      const tp = stackTop('drive', G.stock.drive);
      fly('doner', P(tp.x, tp.y, tp.z), { x: ROAD_CAR, y: fc.y }, 24);
      sfx('serve', 0.35, 1.05) || beep(760, 0.05);
      if (fc.got >= fc.want) {
        sale(
          'drive',
          Math.round(fc.want * (PR + Math.round(priceMul())) * (fc.korso ? 1.5 : 1)),
          ROAD_CAR,
          fc.y,
          fc.korso ? T('Autokorso') : T('Drive-In'),
        );
        fc.state = 'out';
        stat('cars', 1);
      }
    }
  }

  // delivery
  if (G.unlocked.has('delivery')) {
    const m = G.moped;
    if (m.state === 'park') {
      m.y = 5.6;
      if (G.stock.deliv >= 3) {
        m.t -= dt;
        if (m.t <= 0) {
          G.stock.deliv -= 3;
          m.state = 'out';
          sale(
            'deliv',
            Math.round(3 * (PR + Math.round(2 * priceMul())) * (rainy() ? 1.5 : 1)),
            ROAD_MOPED,
            5.6,
            rainy() ? T('Regen-Lieferung') : T('Lieferung'),
          );
          stat('deliv', 1);
          sfx('moped', 0.6) || beep(620, 0.12, 'sawtooth', 0.02);
        }
      } else m.t = 0.5;
    } else if (m.state === 'out') {
      m.y -= 5 * dt;
      if (m.y < -5) {
        m.state = 'back';
        m.y = D + 5;
      }
    } else if (m.state === 'back') {
      m.y -= 5 * dt;
      if (m.y <= 5.6) {
        m.state = 'park';
        m.t = 0.5;
      }
    }
  }

  // collect money
  for (const k in PILES) {
    const pile = G.piles[k];
    if (pile.amount > 0 && dist(pl, PILES[k]) < (M.pet === 'dog' ? 2.5 : 0.85)) {
      const n = Math.min(pile.count, 10),
        src = PILES[k];
      for (let i = 0; i < n; i++)
        setTimeout(
          () =>
            fly(
              'bill',
              P(src.x + (Math.random() - 0.5) * 0.3, src.y + (Math.random() - 0.5) * 0.3, i * 2),
              G.player,
              40,
            ),
          i * 35,
        );
      G.money += pile.amount;
      pile.amount = 0;
      pile.count = 0;
      ching();
      bumpMoney();
    }
  }

  // pads
  G.payFx -= dt;
  for (const pad of activePads()) {
    if (Math.abs(pl.x - pad.x) < 0.5 && Math.abs(pl.y - pad.y) < 0.5 && G.money >= 0.01) {
      const pp = padPrice(pad),
        paid = G.paid[pad.id] || 0,
        rest = pp - paid;
      const amt = Math.min(G.money, rest, Math.max(40, pp * 1.1) * dt);
      G.money -= amt;
      G.paid[pad.id] = paid + amt;
      if (G.payFx <= 0) {
        G.payFx = 0.07;
        fly('bill', P(pl.x, pl.y, 40), { x: pad.x, y: pad.y }, 4);
        sfx('coin', 0.35, 0.9 + Math.random() * 0.25) ||
          beep(900 + Math.random() * 200, 0.04, 'square', 0.015);
      }
      if (G.paid[pad.id] >= pp - 0.001) {
        G.paid[pad.id] = pp;
        unlock(pad.id);
        break;
      }
    }
  }

  while (G.sales.length && G.sales[0].t < G.time - 30) G.sales.shift();
  for (const f of flyers) f.t += dt / f.dur;
  for (let i = flyers.length - 1; i >= 0; i--) if (flyers[i].t >= 1) flyers.splice(i, 1);
  for (const t of texts) {
    t.life -= dt;
    t.y -= dt * 28;
  }
  for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
}

export const ratePerMin = () => {
  const span = Math.min(30, Math.max(8, G.time));
  return Math.round((G.sales.reduce((a, s) => a + s.a, 0) * 60) / span);
};

export function initUpdate() {}
