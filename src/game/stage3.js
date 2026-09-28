// stage3.js – Events und Technik (Stufe 3)
//   Events überall:  Mega-Schlange (Berlin zuerst), Autokorso (mit Drive-In)
//   Stadt-Events:    Hamburg Stromausfall · München Public Viewing · Köln Rekordversuch · Istanbul Onkel aus dem Dorf
//   Technik überall: Rohrpost von der Theke in den Flur zum Anbau
//   Stadt-Technik:   Berlin Roboter-Kellner · Hamburg Döner-Drohne (mit Möwe) · München Luxusauto-Parkplatz · Istanbul Dolmuş
import { G, price, priceMul, relax, patMax } from './state.js';
import { D, ROAD_CAR, SHIRTS, SKINS, HAIRS, QSLOTS, ENTER, EXIT, dist, rnd, ctx } from './config.js';
import { P, box, ell, rr, poly, chip } from './iso.js';
import { drawDoner, drawPerson, stackTop } from './sprites.js';
import { drawPersonSprite } from './gfx.js';
import { moveToward, sale, rate, give } from './world.js';
import { floatText, fly } from './fx.js';
import { sfx, ching, chord } from './audio.js';
import { $, showBanner, bumpMoney } from './hud.js';
import { t, fmt } from './i18n.js';
import { burst } from './confetti.js';
import { addGems } from './meta.js';
import { addGroup } from './citymech.js';

const city = () => G.city % 5; // 0 Berlin, 1 Hamburg, 2 München, 3 Köln, 4 Istanbul
const person = g => drawPersonSprite(g) || drawPerson(g);
function E() {
  if (!G.ev3) G.ev3 = { t: 70, cur: null, uiT: 0, served: 0 };
  return G.ev3;
}
const slow = () => (relax() ? 1.5 : 1);
function npc(x, y, look) {
  return Object.assign(
    {
      x,
      y,
      shirt: rnd(SHIRTS),
      skin: rnd(SKINS),
      hair: rnd(HAIRS),
      fx: -1,
      moving: false,
      phase: 0,
      carry: 0,
      items: [],
    },
    look,
  );
}
function takeD(pl) {
  const i = pl.items.lastIndexOf('d');
  if (i < 0) return false;
  pl.items.splice(i, 1);
  pl.carry = pl.items.length;
  return true;
}

// ================================================================ Rohrpost
// Station im Flur, kurz vor dem Anbau. Die Rohrpost zieht Döner von der Theke dorthin.
export const TUBE = { x: 3.25, y: 21.3 };
const TUBE_FROM = { x: 3.2, y: 4.2 };
export const tubeOn = () => G.unlocked.has('tubePost');
function tube() {
  if (!G.tube) G.tube = { stock: 0, t: 1, caps: [], pickT: 0 };
  return G.tube;
}
function tubeTick(dt) {
  if (!tubeOn()) return;
  const tb = tube();
  tb.t -= dt;
  const inFlight = tb.caps.length;
  if (tb.t <= 0 && tb.stock + inFlight < 8 && G.stock.counter > 2) {
    tb.t = 1.6;
    G.stock.counter--;
    tb.caps.push({ f: 0 });
    sfx('pop', 0.3, 0.6);
  }
  for (const c of tb.caps) c.f += dt / 1.6;
  const arrived = tb.caps.filter(c => c.f >= 1).length;
  if (arrived) {
    tb.stock += arrived;
    tb.caps = tb.caps.filter(c => c.f < 1);
    sfx('stack', 0.35, 1.3);
  }
  // Spieler nimmt Döner aus der Station
  const pl = G.player;
  tb.pickT -= dt;
  if (tb.stock > 0 && tb.pickT <= 0 && pl.carry < G.cap && !pl.items.includes('t') && dist(pl, TUBE) < 0.9) {
    tb.stock--;
    give(pl, 'd');
    tb.pickT = 0.1;
    fly('d', P(TUBE.x, TUBE.y, 30), pl, 24 + pl.carry * 5);
    sfx('pop', 0.5, 1 + pl.carry * 0.03);
  }
}
/** Für Yusuf im Anbau: Döner aus der Rohrpost-Station nehmen (liefert die Anzahl). */
export function tubeTake(n) {
  if (!tubeOn()) return 0;
  const tb = tube(),
    k = Math.min(n, tb.stock);
  tb.stock -= k;
  return k;
}
export const tubeStock = () => (tubeOn() ? tube().stock : 0);
function tubeDraw(S, tm) {
  if (!tubeOn()) return;
  const tb = tube();
  // Leitung unter der Decke: Theke → hoch → quer → Flur
  const Z = 118;
  const pts = [
    [TUBE_FROM.x, TUBE_FROM.y, 40],
    [TUBE_FROM.x, TUBE_FROM.y, Z],
    [TUBE.x, TUBE_FROM.y, Z],
    [TUBE.x, TUBE.y, Z],
    [TUBE.x, TUBE.y, 44],
  ];
  const len = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      l = Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] - a[2]) / 32);
    len.push(l);
    L += l;
  }
  const at = f => {
    let d = f * L;
    for (let i = 0; i < len.length; i++) {
      if (d <= len[i]) {
        const a = pts[i],
          b = pts[i + 1],
          k = d / len[i];
        return P(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
      }
      d -= len[i];
    }
    const e = pts[pts.length - 1];
    return P(e[0], e[1], e[2]);
  };
  S.push({
    d: 99.5,
    f: () => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [w, col] of [
        [9, 'rgba(35,26,36,.35)'],
        [7, '#9fd3e8'],
      ]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        pts.forEach((q, i) => {
          const p = P(q[0], q[1], q[2]);
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        });
        ctx.stroke();
      }
      for (const c of tb.caps) {
        const p = at(c.f);
        rr(p.x - 5, p.y - 4, 10, 8, 4, '#f2b134');
      }
      ctx.lineCap = 'butt';
    },
  });
  // Station im Flur
  S.push({
    d: TUBE.x + TUBE.y + 0.3,
    f: () => {
      box(TUBE.x, TUBE.y - 0.35, 0.3, 0.7, 44, '#8d969b', '#6d767c', '#7b8489');
      const q = P(TUBE.x + 0.1, TUBE.y, 44);
      for (let i = 0; i < Math.min(8, tb.stock); i++)
        drawDoner(q.x - 6 + (i % 2) * 10, q.y - 2 - Math.floor(i / 2) * 5);
      const c = P(TUBE.x, TUBE.y, 70);
      chip(
        c.x,
        c.y,
        t('ROHRPOST') + ' ' + tb.stock + '/8',
        '#2f5f93',
        '#fff6e8',
        '9px Bungee, Impact, sans-serif',
      );
    },
  });
  // Einwurf an der Theke
  S.push({
    d: TUBE_FROM.x + TUBE_FROM.y + 0.4,
    f: () => {
      const p = P(TUBE_FROM.x, TUBE_FROM.y, 34);
      rr(p.x - 6, p.y - 10, 12, 10, 3, '#8d969b');
      ell(p.x, p.y - 10, 5, 2.5, '#231a24');
    },
  });
}

// ================================================================ Events
const EV = {};
function start(id) {
  const e = E();
  e.cur = { id, T: 0 };
  EV[id].start(e.cur);
}
function end() {
  const e = E();
  e.cur = null;
  e.t = (150 + Math.random() * 60) * slow();
}
function pool() {
  const out = [],
    lv = G.cityLv;
  if (lv >= (city() === 0 ? 3 : 5)) out.push('mega');
  if (city() === 0 && lv >= 3) out.push('mega');
  if (G.unlocked.has('drivein')) out.push('korso');
  if (lv >= 3) {
    const c = ['', 'blackout', 'pv', 'record', 'uncle'][city()];
    if (c) out.push(c, c);
  }
  return out;
}

// ---------------------------------------------------------------- Mega-Schlange
EV.mega = {
  start(ev) {
    ev.n = Math.min(18, 8 + G.cityLv);
    ev.served = 0;
    ev.T = 150 * slow();
    E().megaServed = 0;
    addGroup(ev.n, { mega: true, wd: 1 + (Math.random() < 0.5 ? 1 : 0) });
    showBanner(
      t('Mega-Schlange!'),
      t('{n} Leute stehen bis auf die Straße – alle bedienen gibt einen Bonus', { n: ev.n }),
    );
    sfx('rush', 0.8);
  },
  tick(ev, dt) {
    ev.T -= dt;
    ev.served = E().megaServed || 0;
    if (ev.served >= ev.n) {
      const amt = Math.round(ev.n * price() * 1.5);
      G.money += amt;
      bumpMoney();
      addGems(2);
      burst(100);
      chord();
      showBanner(t('Mega-Schlange geschafft!'), t('+{a} € Bonus und 2 Goldmünzen', { a: fmt(amt) }));
      return end();
    }
    if (ev.T <= 0) {
      const m = G.mech;
      if (m) m.pending = m.pending.filter(p => !p.mega);
      rate(-0.1);
      showBanner(
        t('Die Schlange löst sich auf'),
        t('{s} von {n} bedient – beim nächsten Mal schneller!', { s: ev.served, n: ev.n }),
      );
      return end();
    }
  },
  hud: ev => t('Mega-Schlange {s}/{n} · {x} s', { s: ev.served, n: ev.n, x: Math.ceil(ev.T) }),
  draw(ev, S, tm) {
    // die Wartenden draußen auf dem Gehweg
    const m = G.mech,
      n = m ? Math.min(14, m.pending.filter(p => p.mega).length) : 0;
    if (!ev.line)
      ev.line = Array.from({ length: 18 }, (_, i) =>
        npc(10.9 + (i % 2) * 0.35, D + 1.8 + i * 0.5, { fx: -1 }),
      );
    for (let i = 0; i < n; i++) {
      const g = ev.line[i];
      g.moving = false;
      S.push({ d: g.x + g.y, f: () => person(g) });
    }
  },
};

// ---------------------------------------------------------------- Autokorso
const FLAGS = [
  ['#d8342b', '#fff'],
  ['#231a24', '#d8342b', '#f2c75a'],
];
EV.korso = {
  start(ev) {
    ev.T = 60;
    ev.hornT = 0;
    const n = 5;
    for (let i = 0; i < n; i++)
      G.cars.push({
        y: D + 6 + i * 2.2,
        col: rnd(['#f7f3ea', '#231a24', '#d8342b', '#3f7fbf', '#8d969b']),
        want: 2 + Math.floor(Math.random() * 3),
        got: 0,
        state: 'wait',
        arr: false,
        korso: true,
        flag: i % 2,
      });
    showBanner(t('Autokorso!'), t('Hupende Autos mit Fahnen am Drive-In – sie zahlen 50 % mehr'));
    sfx('carhorn', 0.9);
  },
  tick(ev, dt) {
    ev.T -= dt;
    const left = G.cars.filter(c => c.korso && c.state === 'wait').length;
    ev.hornT -= dt;
    if (left && ev.hornT <= 0) {
      ev.hornT = 2.5 + Math.random() * 2;
      sfx('carhorn', 0.5, 0.9 + Math.random() * 0.3);
      const c = rnd(G.cars.filter(o => o.korso && o.state === 'wait'));
      floatText(ROAD_CAR, c.y, 50, t('Hup hup!'), '#f2b134');
    }
    if (!left || ev.T <= 0) {
      for (const c of G.cars) if (c.korso && c.state === 'wait') c.state = 'out';
      if (!left) rate(0.05);
      end();
    }
  },
  hud: ev => t('Autokorso · {n} Autos', { n: G.cars.filter(c => c.korso && c.state === 'wait').length }),
  draw(ev, S, tm) {
    for (const c of G.cars)
      if (c.korso)
        S.push({
          d: ROAD_CAR + c.y + 0.3,
          f: () => {
            const p = P(ROAD_CAR + 0.2, c.y + 0.4, 34);
            ctx.fillStyle = '#6b6b6b';
            ctx.fillRect(p.x - 1, p.y - 26, 2, 26);
            const cols = FLAGS[c.flag],
              w = Math.sin(tm * 10 + c.y) * 2;
            cols.forEach((col, i) => {
              ctx.fillStyle = col;
              ctx.fillRect(
                p.x + 1,
                p.y - 26 + (i * 12) / cols.length + w * 0.2,
                16 + w,
                12 / cols.length + 0.5,
              );
            });
            if (c.flag === 0) {
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(p.x + 8, p.y - 20, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          },
        });
  },
};

// ---------------------------------------------------------------- Hamburg: Stromausfall
export const FUSE = { x: 9.8, y: 0.3 };
EV.blackout = {
  start(ev) {
    G.blackout = true;
    ev.fix = 0;
    ev.T = 0;
    showBanner(
      t('Stromausfall!'),
      t('Spieße und Fritteuse stehen still – schnell zum Sicherungskasten hinten rechts'),
    );
    sfx('bad', 0.9, 0.6);
  },
  tick(ev, dt) {
    ev.T += dt;
    const near = dist(G.player, { x: FUSE.x, y: 0.95 }) < 0.9;
    ev.fix = near ? ev.fix + dt / 3 : Math.max(0, ev.fix - dt / 6);
    if (ev.T > 20 && Math.random() < dt * 0.05) rate(-0.02);
    if (ev.fix >= 1) {
      G.blackout = false;
      sfx('fanfare', 0.6);
      showBanner(t('Licht ist wieder an!'), t('Die Spieße drehen sich wieder'));
      end();
    }
  },
  hud: () => t('Stromausfall! Sicherungskasten hinten rechts'),
  draw(ev, S, tm) {
    S.push({
      d: FUSE.x + FUSE.y + 0.8,
      f: () => {
        box(FUSE.x - 0.3, 0.02, 0.6, 0.25, 44, '#5a6368', '#3b4247', '#4a5257', 36);
        const c = P(FUSE.x, 0.3, 60);
        if (Math.floor(tm * 6) % 2) {
          ctx.fillStyle = '#f2c75a';
          ctx.fillRect(c.x - 6 + Math.random() * 12, c.y + 4, 2, 2);
        }
        chip(
          c.x,
          c.y - 30,
          '⚡ ' + Math.round(ev.fix * 100) + '%',
          '#d8342b',
          '#fff6e8',
          '10px Bungee, Impact, sans-serif',
        );
      },
    });
  },
  stop() {
    G.blackout = false;
  },
};

// ---------------------------------------------------------------- München: Public Viewing
EV.pv = {
  start(ev) {
    ev.T = 75 * slow();
    ev.goalT = 14 + Math.random() * 10;
    ev.score = [0, 0];
    addGroup(8, { fan: true, wd: 2, jersey: true, shirt: '#f7f3ea' });
    showBanner(
      t('Public Viewing!'),
      t('Das Spiel läuft auf der Leinwand – 8 Fans wollen Döner, sie zahlen 30 % mehr'),
    );
    sfx('party', 0.7);
  },
  tick(ev, dt) {
    ev.T -= dt;
    ev.goalT -= dt;
    if (ev.goalT <= 0) {
      ev.goalT = 16 + Math.random() * 14;
      const home = Math.random() < 0.65;
      ev.score[home ? 0 : 1]++;
      ev.flash = 2;
      if (home) {
        showBanner(t('TOOOR!'), t('Die Fans rasten aus – alle in der Schlange warten gern noch länger'));
        for (const c of G.customers) if (c.state === 'queue') c.pat = Math.min(c.patMax, c.pat + 12);
        burst(50);
        sfx('party', 0.8);
        rate(0.03);
      } else floatText(9.5, 1, 120, t('Oh nein, Gegentor …'), '#ff8a7f');
    }
    ev.flash = Math.max(0, (ev.flash || 0) - dt);
    if (ev.T <= 0) {
      showBanner(t('Abpfiff!'), t('Endstand {a}:{b}', { a: ev.score[0], b: ev.score[1] }));
      end();
    }
  },
  hud: ev => t('Public Viewing {a}:{b} · {s} s', { a: ev.score[0], b: ev.score[1], s: Math.ceil(ev.T) }),
  draw(ev, S, tm) {
    // Leinwand an der Rückwand über dem Drive-In
    S.push({
      d: -1,
      f: () => {
        const x0 = 8.4,
          x1 = 11.6,
          z0 = 64,
          z1 = 124;
        poly([P(x0, 0.05, z1), P(x1, 0.05, z1), P(x1, 0.05, z0), P(x0, 0.05, z0)], '#111');
        poly(
          [
            P(x0 + 0.1, 0.06, z1 - 4),
            P(x1 - 0.1, 0.06, z1 - 4),
            P(x1 - 0.1, 0.06, z0 + 4),
            P(x0 + 0.1, 0.06, z0 + 4),
          ],
          ev.flash > 0 && Math.floor(tm * 8) % 2 ? '#f2c75a' : '#3e8e41',
        );
        const bx = x0 + 0.5 + ((Math.sin(tm * 1.1) + 1) / 2) * (x1 - x0 - 1),
          b = P(bx, 0.07, 84 + Math.abs(Math.sin(tm * 3)) * 18);
        ell(b.x, b.y, 3, 3, '#fff');
        const c = P((x0 + x1) / 2, 0.07, z1 + 10);
        chip(
          c.x,
          c.y,
          ev.score[0] + ' : ' + ev.score[1],
          '#231a24',
          '#fff6e8',
          '11px Bungee, Impact, sans-serif',
        );
      },
    });
  },
};

// ---------------------------------------------------------------- Köln: Rekordversuch
EV.record = {
  start(ev) {
    ev.need = 14 + 2 * G.cityLv;
    ev.base = G.stats.sell || 0;
    ev.T = 120 * slow();
    ev.judge = npc(8.9, 6.4, { shirt: '#231a24', hair: '#6b6b6b', fx: -1 });
    showBanner(
      t('Rekordversuch!'),
      t('Verkaufe {n} Döner in {s} Sekunden – die Jury schaut zu', { n: ev.need, s: Math.round(ev.T) }),
    );
    sfx('fanfare', 0.7);
  },
  tick(ev, dt) {
    ev.T -= dt;
    ev.have = (G.stats.sell || 0) - ev.base;
    if (ev.have >= ev.need) {
      const amt = Math.round(ev.need * price() * 2);
      G.money += amt;
      bumpMoney();
      ching();
      addGems(3);
      burst(140);
      rate(0.15);
      showBanner(t('Weltrekord!'), t('+{a} € und 3 Goldmünzen – Köln feiert dich', { a: fmt(amt) }));
      return end();
    }
    if (ev.T <= 0) {
      showBanner(
        t('Knapp daneben!'),
        t('{h} von {n} Dönern – nächstes Mal klappt der Rekord', { h: ev.have, n: ev.need }),
      );
      end();
    }
  },
  hud: ev => t('Rekord {h}/{n} · {s} s', { h: ev.have || 0, n: ev.need, s: Math.ceil(ev.T) }),
  draw(ev, S, tm) {
    const j = ev.judge;
    S.push({
      d: j.x + j.y,
      f: () => {
        person(j);
        const p = P(j.x, j.y, 26);
        rr(p.x - 11, p.y - 6, 7, 9, 1, '#f7f3ea');
        const c = P(j.x, j.y, 70);
        chip(
          c.x,
          c.y,
          '🏆 ' + (ev.have || 0) + '/' + ev.need,
          '#8a2f5a',
          '#fff6e8',
          '10px Bungee, Impact, sans-serif',
        );
      },
    });
  },
};

// ---------------------------------------------------------------- Istanbul: Onkel aus dem Dorf
const UNCLE_TALK = [
  'Oğlum, der Laden ist aber groß geworden!',
  'Zu meiner Zeit kostete ein Döner eine Lira!',
  'Wann heiratest du endlich?',
  'Im Dorf machen wir das Fleisch selbst!',
];
EV.uncle = {
  start(ev) {
    ev.u = npc(ENTER.x, ENTER.y, {
      shirt: '#6e4430',
      hair: '#cfcfcf',
      cap: true,
      capCol: '#3b3440',
      fx: -1,
      path: [
        { x: 10.4, y: D - 0.9 },
        { x: 6.2, y: 13.2 },
      ],
    });
    ev.need = 3;
    ev.got = 0;
    ev.T = 100 * slow();
    ev.talkT = 6;
    ev.dropT = 0;
    showBanner(
      t('Der Onkel aus dem Dorf!'),
      t('Er setzt sich an einen Tisch – bring ihm 3 Döner, dann gibt es Harçlık'),
    );
    sfx('ding', 0.7, 0.8);
  },
  tick(ev, dt) {
    const u = ev.u;
    if (u.path.length) {
      const p = u.path[0];
      if (moveToward(u, p.x, p.y, 2.2, dt)) u.path.shift();
      if (!u.path.length && ev.state !== 'leave') u.sitting = true;
      if (!u.path.length && ev.state === 'leave') return end();
      return;
    }
    if (ev.state === 'leave') return;
    ev.T -= dt;
    ev.talkT -= dt;
    if (ev.talkT <= 0) {
      ev.talkT = 12 + Math.random() * 6;
      floatText(u.x, u.y, 90, t(rnd(UNCLE_TALK)), '#fff6e8');
    }
    ev.dropT -= dt;
    if (ev.dropT <= 0 && dist(G.player, u) < 1.3 && takeD(G.player)) {
      ev.got++;
      ev.dropT = 0.3;
      fly('d', P(G.player.x, G.player.y, 30), u, 24);
      sfx('serve', 0.5);
    }
    const leave = () => {
      ev.state = 'leave';
      u.sitting = false;
      u.path = [
        { x: 10.4, y: D - 0.9 },
        { x: EXIT.x, y: EXIT.y },
      ];
    };
    if (ev.got >= ev.need) {
      const amt = Math.round(20 * price());
      G.money += amt;
      bumpMoney();
      ching();
      addGems(2);
      burst(60);
      u.happy = 3;
      floatText(u.x, u.y, 90, t('Al oğlum, harçlık!'), '#f2b134');
      showBanner(t('Harçlık vom Onkel!'), t('+{a} € und 2 Goldmünzen', { a: fmt(amt) }));
      leave();
    } else if (ev.T <= 0) {
      rate(-0.1);
      floatText(u.x, u.y, 90, t('Der Onkel ist beleidigt!'), '#ff8a7f');
      leave();
    }
  },
  hud: ev =>
    ev.state === 'leave'
      ? ''
      : t('Onkel will Döner {g}/{n} · {s} s', { g: ev.got, n: ev.need, s: Math.ceil(ev.T) }),
  draw(ev, S, tm) {
    const u = ev.u;
    S.push({
      d: u.x + u.y + 0.05,
      f: () => {
        person(u);
        // Schnurrbart und Sack
        const p = P(u.x, u.y, u.sitting ? 31 : 37);
        ctx.fillStyle = '#9a9aa3';
        ctx.fillRect(p.x - 4 + u.fx * 2, p.y, 8, 2);
        if (ev.state !== 'leave' && !u.path.length) {
          const q = P(u.x, u.y, 76);
          rr(q.x - 18, q.y - 12, 36, 18, 7, ev.T < 15 ? '#ff8a7f' : '#fff6e8');
          drawDoner(q.x - 6, q.y);
          ctx.fillStyle = '#231a24';
          ctx.font = '800 10px Figtree, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(ev.got + '/' + ev.need, q.x + 9, q.y + 1);
        }
      },
    });
  },
};

// ================================================================ Stadt-Technik
const TECH_PAD = { x: 10.9, y: 10.4 };
// ---------------------------------------------------------------- Berlin: Roboter-Kellner
function robot() {
  if (!G.robot) G.robot = npc(TECH_PAD.x, TECH_PAD.y, { state: 'idle', path: [], carry: 0 });
  return G.robot;
}
function robotTick(dt) {
  if (!G.unlocked.has('robot')) return;
  const r = robot();
  r.phase += dt * 10;
  if (r.state === 'idle') {
    moveToward(r, TECH_PAD.x, TECH_PAD.y, 2.4, dt);
    const c = G.customers.find(o => o.state === 'sit' && !o.nach && o.t > 3.5);
    if (c && G.stock.counter > 0) {
      c.nach = true;
      r.target = c;
      r.state = 'fetch';
    }
  } else if (r.state === 'fetch') {
    if (moveToward(r, 6.2, 5.0, 2.8, dt)) {
      if (G.stock.counter > 0) {
        G.stock.counter--;
        const tp = stackTop('counter', G.stock.counter);
        fly('d', P(tp.x, tp.y, tp.z), r, 30);
        r.carry = 1;
        r.items = ['d'];
        r.state = 'go';
      } else r.state = 'idle';
    }
  } else if (r.state === 'go') {
    const c = r.target;
    if (!c || c.state !== 'sit') {
      if (r.carry) G.stock.counter = Math.min(G.stock.counter + 1, 16);
      r.carry = 0;
      r.items = [];
      r.state = 'idle';
      return;
    }
    if (moveToward(r, c.x + 0.5, c.y + 0.3, 2.8, dt)) {
      r.carry = 0;
      r.items = [];
      c.happy = 2;
      c.t += 3;
      fly('d', P(r.x, r.y, 30), c, 24);
      sale('reg', Math.round(price() * 1.2), c.x, c.y, t('Robo'));
      if (Math.random() < 0.15) {
        floatText(c.x, c.y, 80, t('📱 Der Roboter geht viral!'), '#b48cff');
        rate(0.02);
      }
      r.state = 'idle';
    }
  }
}
function drawRobot(r, tm) {
  const p = P(r.x, r.y);
  ell(p.x, p.y, 12, 6, 'rgba(20,10,20,.22)');
  const b = Math.sin(tm * 8) * 1;
  rr(p.x - 9, p.y - 26 + b, 18, 22, 6, '#f7f3ea');
  rr(p.x - 7, p.y - 40 + b, 14, 12, 4, '#231a24');
  ctx.fillStyle = '#7fd4f0';
  ctx.fillRect(p.x - 4, p.y - 36 + b, 2.5, 3);
  ctx.fillRect(p.x + 1.5, p.y - 36 + b, 2.5, 3);
  ctx.strokeStyle = '#8d969b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 40 + b);
  ctx.lineTo(p.x, p.y - 47 + b);
  ctx.stroke();
  ell(p.x, p.y - 48 + b, 2.2, 2.2, '#d8342b');
  ell(p.x, p.y - 3, 7, 3, '#3b3440');
  rr(p.x + r.fx * 6 - 7, p.y - 22 + b, 14, 3, 1, '#8d969b');
  if (r.carry) drawDoner(p.x + r.fx * 6, p.y - 26 + b);
}

// ---------------------------------------------------------------- Hamburg: Döner-Drohne mit Möwe
function drone() {
  if (!G.drone) G.drone = { x: TECH_PAD.x, y: TECH_PAD.y, z: 0, state: 'pad', t: 3, load: 0, gull: false };
  return G.drone;
}
function droneTick(dt) {
  if (!G.unlocked.has('drone')) return;
  const d = drone();
  const fly3 = (tx, ty, tz, sp) => {
    const dx = tx - d.x,
      dy = ty - d.y,
      dz = (tz - d.z) / 40,
      m = Math.hypot(dx, dy, dz);
    if (m < 0.05) return true;
    const s = Math.min(m, sp * dt);
    d.x += (dx / m) * s;
    d.y += (dy / m) * s;
    d.z += (dz / m) * s * 40;
    return false;
  };
  if (d.state === 'pad') {
    d.t -= dt;
    fly3(TECH_PAD.x, TECH_PAD.y, 0, 3);
    if (d.t <= 0 && G.stock.counter >= 3) d.state = 'toCounter';
  } else if (d.state === 'toCounter') {
    if (fly3(5.2, 4.2, 80, 4)) {
      const n = Math.min(2, G.stock.counter);
      G.stock.counter -= n;
      d.load = n;
      d.gull = Math.random() < 0.3;
      d.state = 'out';
      sfx('pop', 0.5, 0.7);
    }
  } else if (d.state === 'out') {
    if (fly3(20, -10, 170, 5)) {
      d.state = 'away';
      d.t = 10;
    }
  } else if (d.state === 'away') {
    d.t -= dt;
    if (d.t <= 0) {
      d.state = 'back';
      d.x = 20;
      d.y = -10;
      d.z = 170;
    }
  } else if (d.state === 'back') {
    if (fly3(TECH_PAD.x, TECH_PAD.y, 0, 5)) {
      if (d.gull) {
        floatText(d.x, d.y, 70, t('Möwe hat die Lieferung geklaut!'), '#ff8a7f');
        sfx('bad', 0.5, 1.4);
      } else if (d.load) sale('deliv', Math.round(d.load * price() * 1.6), d.x, d.y, t('Drohne'));
      d.load = 0;
      d.state = 'pad';
      d.t = 6;
    }
  }
}
function drawDrone(d, tm) {
  const p = P(d.x, d.y, d.z);
  if (d.z > 2) {
    const s = P(d.x, d.y, 0);
    ell(s.x, s.y, 12, 5, 'rgba(20,10,20,.15)');
  }
  rr(p.x - 10, p.y - 8, 20, 7, 3, '#231a24');
  for (const dx of [-13, 13]) {
    ctx.fillStyle = '#555';
    ctx.fillRect(p.x + dx - 1, p.y - 10, 2, 4);
    const w = 7 * Math.abs(Math.sin(tm * 40 + dx));
    ell(p.x + dx, p.y - 11, w + 1, 1.5, 'rgba(200,200,210,.8)');
  }
  if (d.load) drawDoner(p.x, p.y + 4);
  // Möwe jagt die Drohne
  if (d.gull && (d.state === 'out' || d.state === 'back')) {
    const g = { x: p.x - 26 + Math.sin(tm * 5) * 6, y: p.y - 14 + Math.cos(tm * 7) * 4 };
    const fl = Math.sin(tm * 18) * 6;
    ctx.fillStyle = '#f7f3ea';
    ctx.beginPath();
    ctx.moveTo(g.x - 12, g.y - fl);
    ctx.quadraticCurveTo(g.x - 5, g.y - 5, g.x, g.y);
    ctx.quadraticCurveTo(g.x + 5, g.y - 5, g.x + 12, g.y - fl);
    ctx.lineTo(g.x, g.y + 3);
    ctx.fill();
    ell(g.x + 2, g.y, 4, 3, '#fff');
    ctx.fillStyle = '#f2b134';
    ctx.fillRect(g.x + 5, g.y - 1, 4, 2);
    if (d.state === 'back') drawDoner(g.x + 9, g.y + 3);
  }
}

// ---------------------------------------------------------------- München: Luxusauto-Parkplatz
const LUXBAY = { x: 12.8, y: 19.5 };
function luxTick(dt) {
  if (!G.unlocked.has('luxPark')) return;
  if (!G.lux) G.lux = { car: null, t: 20, snapT: 3 };
  const L = G.lux;
  if (!L.car) {
    L.t -= dt;
    if (L.t <= 0)
      L.car = { y: LUXBAY.y + 28, col: rnd(['#f2c75a', '#231a24', '#d8342b', '#f7f3ea']), state: 'come' };
    return;
  }
  const c = L.car;
  if (c.state === 'come') {
    const d = LUXBAY.y - c.y;
    c.y += Math.sign(d) * Math.min(Math.abs(d), 6 * dt);
    if (Math.abs(d) < 0.05) {
      c.state = 'park';
      sale('reg', Math.round(8 * priceMul()), ROAD_CAR, c.y, t('Parken'));
      const o = {
        x: 11.6,
        y: LUXBAY.y - 0.5,
        shirt: '#231a24',
        skin: rnd(SKINS),
        hair: rnd(HAIRS),
        crown: true,
        vip: true,
        lux: true,
        shades: true,
        pants: '#231a24',
        fx: -1,
        moving: false,
        phase: 0,
        state: 'queue',
        wd: 3,
        wf: G.fryer.on ? 1 : 0,
        ws: 0,
        gd: 0,
        gf: 0,
        gs: 0,
        arr: false,
        happy: 0,
        pat: patMax() * 1.5,
        patMax: patMax() * 1.5,
      };
      if (G.queue.length < QSLOTS.length) {
        G.customers.push(o);
        G.queue.push(o);
        c.owner = o;
      } else c.owner = null;
      c.parkT = c.owner ? 999 : 8;
    }
  } else if (c.state === 'park') {
    L.snapT -= dt;
    if (L.snapT <= 0) {
      L.snapT = 5 + Math.random() * 4;
      floatText(ROAD_CAR, c.y, 60, '📸', '#fff6e8');
      rate(0.01);
    }
    c.parkT -= dt;
    if ((c.owner && !G.customers.includes(c.owner)) || c.parkT <= 0) {
      c.state = 'go';
      sfx('carhorn', 0.3, 1.4);
    }
  } else if (c.state === 'go') {
    c.y -= 7 * dt;
    if (c.y < -8) {
      L.car = null;
      L.t = (55 + Math.random() * 30) * slow();
    }
  }
}
function drawLux(c) {
  const x = ROAD_CAR - 0.45,
    y = c.y - 0.95,
    p = P(ROAD_CAR, c.y);
  ell(p.x, p.y + 3, 36, 16, 'rgba(10,5,10,.3)');
  box(x, y, 0.9, 1.9, 9, c.col, '#1b1b1f', '#2a2a30', 4);
  box(x + 0.12, y + 0.7, 0.66, 0.6, 7, '#3b5068', '#2a3a4c', '#314356', 13);
  const s = P(x + 0.45, y + 1.9, 12);
  rr(s.x - 9, s.y - 2, 18, 3, 1, '#231a24');
  for (const wy of [0.35, 1.5]) {
    const w = P(x + 0.9, y + wy, 5);
    ell(w.x, w.y, 5, 5, '#111');
    ell(w.x, w.y, 2.5, 2.5, '#f2c75a');
  }
}

// ---------------------------------------------------------------- Istanbul: Dolmuş
function dolmusTick(dt) {
  if (!G.unlocked.has('dolmus')) return;
  if (!G.dolmus) G.dolmus = { bus: null, t: 25 };
  const DM = G.dolmus;
  if (!DM.bus) {
    DM.t -= dt;
    if (DM.t <= 0) DM.bus = { y: D + 28, state: 'come' };
    return;
  }
  const b = DM.bus;
  if (b.state === 'come') {
    const d = D + 3.2 - b.y;
    b.y += Math.sign(d) * Math.min(Math.abs(d), 6 * dt);
    if (Math.abs(d) < 0.05) {
      b.state = 'stop';
      b.T = 6;
      const n = 5 + Math.floor(Math.random() * 3);
      addGroup(n, { dolmus: true, wd: 1 + (Math.random() < 0.4 ? 1 : 0) });
      floatText(ROAD_CAR, b.y, 70, t('Dolmuş! {n} Fahrgäste', { n }), '#f2c75a');
      sfx('carhorn', 0.6, 0.8);
    }
  } else if (b.state === 'stop') {
    b.T -= dt;
    if (b.T <= 0) b.state = 'go';
  } else {
    b.y -= 6 * dt;
    if (b.y < -10) {
      DM.bus = null;
      DM.t = (45 + Math.random() * 20) * slow();
    }
  }
}
function drawDolmus(b) {
  const x = ROAD_CAR - 0.5,
    y = b.y - 1.4,
    p = P(ROAD_CAR, b.y);
  ell(p.x, p.y + 4, 44, 20, 'rgba(10,5,10,.28)');
  box(x, y, 1.0, 2.8, 30, '#f2c75a', '#b8912f', '#d4a93f', 6);
  for (let i = 0; i < 4; i++) {
    const w = P(x + 1.0, y + 0.3 + i * 0.6, 26);
    rr(w.x - 1, w.y - 1, 12, 9, 2, '#3b5068');
  }
  const s = P(x + 0.5, y + 1.0, 36);
  rr(s.x - 16, s.y - 8, 32, 10, 3, '#231a24');
  ctx.fillStyle = '#f2c75a';
  ctx.font = '8px Bungee, Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DOLMUŞ', s.x, s.y - 1);
  for (const wy of [0.4, 2.4]) {
    const w = P(x + 1.0, y + wy, 6);
    ell(w.x, w.y, 5, 6, '#1b1b1f');
  }
}

// ================================================================ Schnittstellen
/** Aufschlag beim Bezahlen (wird in citymech.mechSale ergänzt). */
export function ev3Sale(c) {
  let mul = 1,
    label = '';
  if (c.mega) {
    mul *= 1.25;
    label = t('Mega');
    const e = E();
    e.megaServed = (e.megaServed || 0) + 1;
  }
  if (c.fan) {
    mul *= 1.3;
    label = t('Fan');
  }
  if (c.dolmus) {
    mul *= 1.2;
    label = t('Dolmuş');
  }
  if (c.lux) {
    mul *= 2;
    label = t('Luxus');
  }
  return { mul, label };
}
export function stage3Tick(dt) {
  const e = E();
  tubeTick(dt);
  robotTick(dt);
  droneTick(dt);
  luxTick(dt);
  dolmusTick(dt);
  if (e.cur) EV[e.cur.id].tick(e.cur, dt);
  else if (G.cityLv >= 3 && G.tablesLv >= 1) {
    e.t -= dt;
    if (e.t <= 0) {
      const p = pool();
      if (p.length) start(rnd(p));
      else e.t = 30;
    }
  }
  if (!e.cur && G.blackout) G.blackout = false;
  e.uiT -= dt;
  if (e.uiT <= 0) {
    e.uiT = 0.25;
    const el = $('evChip');
    if (el) {
      const txt = e.cur ? EV[e.cur.id].hud(e.cur) : '';
      el.hidden = !txt;
      el.textContent = txt;
    }
  }
}
export function stage3Drawables(S, time) {
  const e = E();
  if (e.cur && EV[e.cur.id].draw) EV[e.cur.id].draw(e.cur, S, time);
  tubeDraw(S, time);
  if (
    G.unlocked.has('robot') ||
    G.unlocked.has('drone') ||
    G.unlocked.has('dolmus') ||
    G.unlocked.has('luxPark')
  )
    S.push({
      d: TECH_PAD.x + TECH_PAD.y - 0.6,
      f: () => {
        const q = [
          P(TECH_PAD.x - 0.5, TECH_PAD.y - 0.5),
          P(TECH_PAD.x + 0.5, TECH_PAD.y - 0.5),
          P(TECH_PAD.x + 0.5, TECH_PAD.y + 0.5),
          P(TECH_PAD.x - 0.5, TECH_PAD.y + 0.5),
        ];
        if (G.unlocked.has('drone')) {
          poly(q, 'rgba(47,95,147,.35)');
          const c = P(TECH_PAD.x, TECH_PAD.y);
          ctx.fillStyle = '#fff6e8';
          ctx.font = '14px Bungee, Impact, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('H', c.x, c.y + 5);
        } else if (G.unlocked.has('robot')) poly(q, 'rgba(127,212,240,.25)');
      },
    });
  if (G.unlocked.has('robot')) {
    const r = robot();
    S.push({ d: r.x + r.y, f: () => drawRobot(r, time) });
  }
  if (G.unlocked.has('drone')) {
    const d = drone();
    S.push({ d: d.z > 20 ? 99.4 : d.x + d.y, f: () => drawDrone(d, time) });
  }
  if (G.lux && G.lux.car) {
    const c = G.lux.car;
    S.push({ d: ROAD_CAR + c.y, f: () => drawLux(c) });
  }
  if (G.unlocked.has('luxPark'))
    S.push({
      d: 0,
      f: () => {
        poly(
          [
            P(12.2, LUXBAY.y - 1.3),
            P(13.4, LUXBAY.y - 1.3),
            P(13.4, LUXBAY.y + 1.3),
            P(12.2, LUXBAY.y + 1.3),
          ],
          null,
          '#f2c75a',
          2,
        );
        const c = P(12.8, LUXBAY.y + 1.1);
        chip(c.x, c.y, 'VIP PARKING', '#231a24', '#f2c75a', '8px Bungee, Impact, sans-serif');
      },
    });
  if (G.dolmus && G.dolmus.bus) {
    const b = G.dolmus.bus;
    S.push({ d: ROAD_CAR + b.y + 0.5, f: () => drawDolmus(b) });
  }
}
/** Wird beim Stadtwechsel gerufen. */
export function stage3Reset() {
  G.blackout = false;
}
/** Test-Hilfe (nur mit ?debug erreichbar): Event sofort starten. */
export function debugStart(id) {
  if (E().cur && EV[E().cur.id].stop) EV[E().cur.id].stop();
  start(id);
}
