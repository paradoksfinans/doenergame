// citymech.js – jede Stadt hat ab Level 2 eine eigene Besonderheit, damit sich
// die Städte unterschiedlich spielen:
//   Berlin    – Partygruppen am Abend und in der Nacht (zahlen mehr)
//   Hamburg   – Hafen-Order: große Döner-Lieferung zur Hafenkiste bringen
//   München   – Wiesn-Zeit: mehr Gäste, jeder will zusätzlich eine Brezel
//   Köln      – Alaaf-Kette: schnell hintereinander bedienen erhöht den Bonus
//   Istanbul  – Bosporus-Fähre bringt ganze Touristengruppen
import { ENTER, HAIRS, QSLOTS, SHIRTS, SKINS, dist, rnd } from './config.js';
import { G, patMax, price, relax } from './state.js';
import { P, box, chip, ell } from './iso.js';
import { ctx } from './config.js';
import { fly, floatText } from './fx.js';
import { beep, chord, ching } from './audio.js';
import { $, bumpMoney, showBanner } from './hud.js';
import { burst } from './confetti.js';
import { phaseNow } from './daynight.js';
import { t, fmt } from './i18n.js';

export const HARBOR = { x: 5.3, y: 5.5 };

export const MECHS = [
  {
    id: 'party',
    name: () => t('Berliner Nächte'),
    desc: () => t('Abends und nachts kommen Partygruppen. Sie bestellen mehr und zahlen 30 % extra.'),
  },
  {
    id: 'harbor',
    name: () => t('Hafen-Order'),
    desc: () =>
      t('Wenn das Schiffshorn ertönt: Döner zur Hafenkiste bringen, bevor die Zeit abläuft – doppelter Preis.'),
  },
  {
    id: 'wiesn',
    name: () => t('Wiesn-Zeit'),
    desc: () => t('Immer wieder ist Wiesn: mehr Gäste, jeder will zusätzlich etwas, alles bringt 30 % mehr.'),
  },
  {
    id: 'alaaf',
    name: () => t('Alaaf-Kette'),
    desc: () => t('Bediene Gäste schnell hintereinander – jede Bestellung in der Kette bringt mehr (bis +60 %).'),
  },
  {
    id: 'ferry',
    name: () => t('Bosporus-Fähre'),
    desc: () => t('Die Fähre bringt ganze Touristengruppen auf einmal. Touristen zahlen 50 % mehr.'),
  },
];

/** Besonderheit der aktuellen Stadt (auch wenn noch nicht aktiv). */
export const mechOf = (city = G.city) => MECHS[city % MECHS.length];
/** Aktiv ab Stadt-Level 2 – Level 1 bleibt zum Ankommen ruhig. */
export const mechOn = () => G.cityLv >= 2;
const is = id => mechOn() && mechOf().id === id;

function M_() {
  if (!G.mech) G.mech = { t: 40, pending: [], pendT: 0, combo: 0, comboT: 0, wiesn: 0, harbor: null, uiT: 0 };
  return G.mech;
}

// ------------------------------------------------------------ Gäste
function makeGuest(extra) {
  const c = {
    x: ENTER.x + (Math.random() - 0.5) * 0.4,
    y: ENTER.y,
    shirt: rnd(SHIRTS),
    skin: rnd(SKINS),
    hair: rnd(HAIRS),
    long: Math.random() < 0.4,
    pants: rnd(['#3b3440', '#2f3d5c', '#5a4a3a']),
    fx: -1,
    moving: false,
    phase: 0,
    state: 'queue',
    wd: 1 + Math.floor(Math.random() * 2),
    wf: G.fryer.on && Math.random() < 0.5 ? 1 : 0,
    ws: 0,
    gd: 0,
    gf: 0,
    gs: 0,
    arr: false,
    happy: 0,
    pat: patMax() * 1.2,
    patMax: patMax() * 1.2,
  };
  return Object.assign(c, extra);
}
function queueGuests(n, extra) {
  const m = M_();
  for (let i = 0; i < n; i++) m.pending.push(extra);
}

/** Wird für jeden normal eintretenden Gast aufgerufen. */
export function mechDecorate(c) {
  if (!mechOn()) return;
  const id = mechOf().id;
  if (id === 'alaaf' && Math.random() < 0.55) c.partyHat = rnd(['#e0742a', '#4fae62', '#3f7fbf', '#d8342b', '#8a5bb0']);
  if (id === 'wiesn' && M_().wiesn > 0) {
    c.tyrol = true;
    c.wiesn = true;
    if (G.special.on) c.ws = (c.ws || 0) + 1;
    else c.wd += 1;
  }
}
/** Faktor für den Abstand zwischen normalen Gästen (kleiner = mehr Gäste). */
export function mechSpawnMul() {
  return is('wiesn') && M_().wiesn > 0 ? 1 / 1.6 : 1;
}

/** Aufschlag beim Bezahlen an der Kasse. */
export function mechSale(c) {
  let mul = 1,
    label = '';
  if (c.party) {
    mul *= 1.3;
    label = t('Party');
  }
  if (c.tourist) {
    mul *= 1.5;
    label = t('Tourist');
  }
  if (c.wiesn) {
    mul *= 1.3;
    label = t('Wiesn');
  }
  if (is('alaaf')) {
    const m = M_();
    m.combo = m.comboT > 0 ? Math.min(10, m.combo + 1) : 1;
    m.comboT = relax() ? 12 : 7;
    const k = 1 + 0.06 * m.combo;
    mul *= k;
    if (m.combo >= 2) label = t('Alaaf') + ' ×' + fmt(k, 2);
  }
  return { mul, label };
}

// ------------------------------------------------------------ Ablauf
export function mechTick(dt) {
  const m = M_();
  const slow = relax() ? 1.5 : 1;
  // wartende Gruppen nach und nach in die Schlange schicken
  if (m.pending.length) {
    m.pendT -= dt;
    if (m.pendT <= 0 && G.queue.length < QSLOTS.length) {
      const c = makeGuest(m.pending.shift());
      G.customers.push(c);
      G.queue.push(c);
      m.pendT = 0.7;
    }
  }
  if (m.comboT > 0) {
    m.comboT -= dt;
    if (m.comboT <= 0) m.combo = 0;
  }
  if (m.wiesn > 0) {
    m.wiesn -= dt;
    if (m.wiesn <= 0) showBanner(t('Wiesn vorbei'), t('Bis zum nächsten Mal – O’zapft is!'));
  }
  if (m.harbor) harborTick(m.harbor, dt);
  uiTick(dt);
  if (!mechOn() || G.tablesLv < 1) return;
  const id = mechOf().id;
  m.t -= dt;
  if (m.t > 0) return;
  if (id === 'party') {
    const ph = phaseNow().id;
    if (ph === 'abend' || ph === 'nacht') {
      queueGuests(3, { party: true, partyHat: '#f2b134', wd: 2 });
      showBanner(t('Partygruppe!'), t('3 Nachtschwärmer – sie zahlen 30 % extra'));
      beep(660, 0.12, 'square', 0.03);
      m.t = (50 + Math.random() * 20) * slow;
    } else m.t = 8;
  } else if (id === 'harbor') {
    if (!m.harbor) {
      const need = Math.min(24, 6 + 2 * G.cityLv);
      m.harbor = { need, have: 0, t: relax() ? 100 : 60, max: relax() ? 100 : 60, dropT: 0 };
      showBanner(t('Hafen-Order!'), t('Bring {n} Döner zur Hafenkiste – doppelter Preis', { n: need }));
      beep(110, 0.6, 'sawtooth', 0.05);
      setTimeout(() => beep(98, 0.5, 'sawtooth', 0.05), 700);
    }
    m.t = (110 + Math.random() * 40) * slow;
  } else if (id === 'wiesn') {
    m.wiesn = 30;
    showBanner(t('Wiesn-Zeit! O’zapft is!'), t('30 Sekunden: mehr Gäste, jeder bestellt mehr, +30 %'));
    chord();
    m.t = (100 + Math.random() * 40) * slow;
  } else if (id === 'ferry') {
    queueGuests(5, { tourist: true, sunhat: true, wd: 2 });
    showBanner(t('Die Fähre legt an!'), t('5 Touristen auf einmal – sie zahlen 50 % mehr'));
    beep(130, 0.5, 'sawtooth', 0.05);
    m.t = (80 + Math.random() * 30) * slow;
  } else m.t = 30;
}

function harborTick(h, dt) {
  const pl = G.player;
  h.t -= dt;
  h.dropT -= dt;
  if (h.have < h.need && h.dropT <= 0 && dist(pl, HARBOR) < 0.9) {
    const i = pl.items.lastIndexOf('d');
    if (i >= 0) {
      pl.items.splice(i, 1);
      pl.carry = pl.items.length;
      h.have++;
      h.dropT = 0.08;
      fly('d', P(pl.x, pl.y, 26 + pl.carry * 5), HARBOR, 26);
      beep(520 + h.have * 10, 0.04);
    }
  }
  if (h.have >= h.need) {
    const amt = h.need * price() * 2;
    G.money += amt;
    G.stats.earn = (G.stats.earn || 0) + amt;
    bumpMoney();
    ching();
    chord();
    burst(90);
    floatText(HARBOR.x, HARBOR.y, 70, '+' + fmt(amt) + ' €', '#f2b134');
    showBanner(t('Schiff beladen!'), t('+{a} € für die Hafen-Order', { a: fmt(amt) }));
    G.mech.harbor = null;
  } else if (h.t <= 0) {
    showBanner(t('Schiff abgefahren'), t('Die Hafen-Order ist verpasst – beim nächsten Horn klappt’s'));
    // bereits gelieferte Döner werden trotzdem bezahlt
    if (h.have > 0) {
      const amt = h.have * price();
      G.money += amt;
      bumpMoney();
    }
    G.mech.harbor = null;
  }
}

function uiTick(dt) {
  const m = M_();
  m.uiT -= dt;
  if (m.uiT > 0) return;
  m.uiT = 0.25;
  const el = $('mechChip');
  if (!el) return;
  let txt = '';
  if (m.harbor) txt = t('Hafen {h}/{n} · {s} s', { h: m.harbor.have, n: m.harbor.need, s: Math.ceil(m.harbor.t) });
  else if (m.wiesn > 0) txt = t('Wiesn · {s} s', { s: Math.ceil(m.wiesn) });
  else if (is('alaaf') && m.combo >= 2) txt = t('Alaaf ×{k}', { k: fmt(1 + 0.06 * m.combo, 2) });
  else if (m.pending.length) txt = mechOf().id === 'ferry' ? t('Fähre: {n} Touristen', { n: m.pending.length }) : t('Party: {n} Gäste', { n: m.pending.length });
  el.hidden = !txt;
  el.textContent = txt;
}

/** Wird beim Aufstieg auf Level 2 gezeigt. */
export function mechIntro() {
  const me = mechOf();
  showBanner(t('Neu: {n}', { n: me.name() }), me.desc());
}

// ------------------------------------------------------------ Zeichnen
export function mechDrawables(S, time) {
  const m = G.mech;
  if (!m || !m.harbor) return;
  const h = m.harbor;
  S.push({
    d: HARBOR.x + HARBOR.y,
    f: () => {
      const p = P(HARBOR.x, HARBOR.y);
      // Markierung auf dem Boden
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 5);
      ell(p.x, p.y, 30, 15, 'rgba(63,127,191,.45)');
      ctx.restore();
      box(HARBOR.x - 0.35, HARBOR.y - 0.3, 0.7, 0.6, 18, '#b07a45', '#7a5230', '#946238');
      const top = P(HARBOR.x, HARBOR.y, 18);
      ctx.fillStyle = '#5a3b22';
      ctx.fillRect(top.x - 14, top.y - 1, 28, 2);
      const c = P(HARBOR.x, HARBOR.y, 50);
      chip(c.x, c.y, `⚓ ${h.have}/${h.need}`, '#2f5f93', '#fff6e8', '10px Bungee, Impact, sans-serif');
      const r = P(HARBOR.x + 0.45, HARBOR.y + 0.3, 30),
        f = Math.max(0, h.t / h.max);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(35,26,36,.8)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.arc(r.x, r.y, 6, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
      ctx.fillStyle = f < 0.25 ? '#d8342b' : '#7fd4f0';
      ctx.fill();
    },
  });
}

export function initCitymech() {}
