// meta.js – aus der Einzeldatei extrahiert

import { G, padMul } from './state.js';
import { audioInit, beep, ching, chord, sfx } from './audio.js';
import { ratePerMin } from './update.js';
import { $, $h, bumpMoney, lastRate, showBanner } from './hud.js';
import { burst } from './confetti.js';
import { PETS } from './pets.js';
import { renderPets } from './cutting.js';
import { renderDeco } from './decor.js';
import { t, fmt, nextLang, langName } from './i18n.js';
import { save } from './save.js';

export let $shop, $shopList, $daily, $wheel, wc, wx;

export const MKEY = 'doener-palast-meta';

export const M = {
  gems: 0,
  owned: ['klassik'],
  outfit: 'klassik',
  lastDay: null,
  streak: 0,
  claimed: true,
  wheelAt: 0,
};

export function saveMeta() {
  try {
    localStorage.setItem(MKEY, JSON.stringify(M));
  } catch (e) {}
}

export function addGems(n) {
  M.gems += n;
  saveMeta();
  $('gems').textContent = fmt(M.gems);
}

export const OUTFITS = [
  { id: 'klassik', name: 'Klassik', price: 0, shirt: '#f2b134', capCol: '#d8342b', hat: 'cap' },
  { id: 'chef', name: 'Chefkoch', price: 3, shirt: '#f7f3ea', hat: 'toque' },
  { id: 'nacht', name: 'Nachtschicht', price: 4, shirt: '#2f3d5c', capCol: '#231a24', hat: 'cap' },
  { id: 'mint', name: 'Minze', price: 5, shirt: '#2f9a8a', capCol: '#f7f3ea', hat: 'cap' },
  { id: 'grill', name: 'Grillmeister', price: 6, shirt: '#d8342b', capCol: '#f2b134', hat: 'bandana' },
  {
    id: 'lila',
    name: 'Turbo-Lila',
    price: 8,
    shirt: '#8a5bb0',
    capCol: '#4fae62',
    hat: 'cap',
    trail: true,
    extra: 'mit Tempo-Streifen',
  },
  {
    id: 'gold',
    name: 'Goldener Chef',
    price: 12,
    shirt: '#e6b422',
    hat: 'crown',
    sparkle: true,
    extra: 'mit Glitzer',
  },
  {
    id: 'kuerbis',
    name: 'Kürbis-Chef',
    price: null,
    shirt: '#e0742a',
    hat: 'pumpkin',
    event: true,
    extra: '– nur beim Herbstfest',
  },
];

export function applyOutfit() {
  const o = OUTFITS.find(o => o.id === M.outfit) || OUTFITS[0],
    p = G.player;
  p.shirt = o.shirt;
  p.capCol = o.capCol;
  p.cap = o.hat === 'cap';
  p.toque = o.hat === 'toque';
  p.bandana = o.hat === 'bandana';
  p.crown = o.hat === 'crown';
  p.pumpkin = o.hat === 'pumpkin';
  p.trail = !!o.trail;
  p.sparkle = !!o.sparkle;
}

export function cashFor(min) {
  return Math.max(
    Math.round(30 * padMul() * min),
    Math.round(Math.max(ratePerMin(), lastRate, G.savedRate || 0) * min),
  );
}

export function giveBoost(kind, sec) {
  G.boost[kind] = Math.max(G.boost[kind] || 0, 0) + sec;
}

export const BOOSTNAME = { cash: '2× Umsatz', speed: 'Turbo' }; // t() beim Anzeigen (siehe metaHud)

export function openSheet(el) {
  for (const s of document.querySelectorAll('.sheet')) s.hidden = s !== el;
  el.hidden = false;
  $h.hidden = true;
}

export function closeSheets() {
  for (const s of document.querySelectorAll('.sheet')) s.hidden = true;
  $h.hidden = false;
}

export function renderShop() {
  $shopList.innerHTML = '';
  renderPets();
  if (typeof renderDeco === 'function') renderDeco();
  for (const o of OUTFITS) {
    const row = document.createElement('div');
    row.className = 'up';
    const n = document.createElement('div');
    n.className = 'n';
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = o.shirt;
    const cap = document.createElement('span');
    cap.className = 'swcap';
    cap.style.background = o.hat === 'toque' ? '#ffffff' : o.hat === 'crown' ? '#f2c75a' : o.capCol;
    sw.append(cap);
    n.append(sw, document.createTextNode(t(o.name)));
    const d = document.createElement('div');
    d.className = 'd';
    d.textContent = t(
      o.hat === 'pumpkin'
        ? 'Kürbis-Mütze'
        : o.hat === 'toque'
          ? 'Weiße Kochmütze'
          : o.hat === 'bandana'
            ? 'Kopftuch'
            : o.hat === 'crown'
              ? 'Goldene Krone'
              : 'Kappe',
    );
    if (o.extra) d.textContent += ' ' + t(o.extra);
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'outfit-' + o.id;
    const own = M.owned.includes(o.id);
    if (o.event && !own) {
      b.textContent = t('Herbstfest');
      b.disabled = true;
      row.append(n, b, d);
      $shopList.append(row);
      continue;
    }
    if (M.outfit === o.id) {
      b.textContent = t('Getragen');
      b.disabled = true;
    } else if (own) {
      b.textContent = t('Anziehen');
      b.onclick = () => {
        M.outfit = o.id;
        saveMeta();
        applyOutfit();
        renderShop();
        sfx('buy', 0.7) || beep(880, 0.08);
      };
    } else {
      b.textContent = t('{p} Münzen', { p: fmt(o.price) });
      b.disabled = M.gems < o.price;
      b.onclick = () => {
        if (M.gems < o.price) return;
        M.gems -= o.price;
        M.owned.push(o.id);
        M.outfit = o.id;
        saveMeta();
        $('gems').textContent = fmt(M.gems);
        applyOutfit();
        chord();
        renderShop();
        showBanner(t('{n} freigeschaltet!', { n: t(o.name) }), t('Steht dir gut'));
      };
    }
    row.append(n, b, d);
    $shopList.append(row);
  }
}

export const DAILY = [
  { g: 1, c: 2 },
  { c: 4 },
  { g: 2 },
  { boost: 120 },
  { g: 3 },
  { c: 8 },
  { g: 5, c: 15 },
];

export const dayStr = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function dailyText(r) {
  const a = [];
  if (r.c) a.push('+' + fmt(cashFor(r.c)) + ' €');
  if (r.g) a.push(t(r.g > 1 ? '+{g} Münzen' : '+{g} Münze', { g: r.g }));
  if (r.boost) a.push(t('2× Umsatz {m} Min', { m: r.boost / 60 }));
  return a;
}

export function renderDaily() {
  const grid = $('dailyGrid');
  grid.innerHTML = '';
  DAILY.forEach((r, i) => {
    const day = i + 1,
      dayEl = document.createElement('div');
    dayEl.className =
      'day' +
      (day < M.streak || (day === M.streak && M.claimed) ? ' done' : '') +
      (day === M.streak && !M.claimed ? ' today' : '') +
      (day === 7 ? ' big' : '');
    const h = document.createElement('b');
    h.textContent = t('Tag {d}', { d: day });
    dayEl.append(h);
    for (const line of dailyText(r)) {
      const s = document.createElement('span');
      s.textContent = line;
      dayEl.append(s);
    }
    grid.append(dayEl);
  });
  const btn = $('claimDaily');
  btn.disabled = M.claimed;
  btn.textContent = M.claimed ? t('Morgen wiederkommen') : t('Tag {d} abholen', { d: M.streak });
  $('streakInfo').textContent = t(
    M.streak === 1 ? 'Login-Serie: {n} Tag in Folge' : 'Login-Serie: {n} Tage in Folge',
    { n: M.streak },
  );
}

export const WHEEL = [
  {
    label: '1 Min Umsatz',
    w: 20,
    col: '#f2b134',
    do: () => {
      const a = cashFor(1);
      G.money += a;
      bumpMoney();
      return '+' + fmt(a) + ' €';
    },
  },
  {
    label: '2× Umsatz',
    w: 14,
    col: '#4fae62',
    do: () => {
      giveBoost('cash', 60);
      return t('2× Umsatz für 60 Sekunden');
    },
  },
  {
    label: '1 Münze',
    w: 14,
    col: '#fff6e8',
    do: () => {
      addGems(1);
      return t('+1 Goldmünze');
    },
  },
  {
    label: '3 Min Umsatz',
    w: 12,
    col: '#d8342b',
    do: () => {
      const a = cashFor(3);
      G.money += a;
      bumpMoney();
      return '+' + fmt(a) + ' €';
    },
  },
  {
    label: 'Turbo',
    w: 14,
    col: '#3f7fbf',
    do: () => {
      giveBoost('speed', 60);
      return t('Turbo-Laufen für 60 Sekunden');
    },
  },
  {
    label: '2 Münzen',
    w: 8,
    col: '#fff6e8',
    do: () => {
      addGems(2);
      return t('+2 Goldmünzen');
    },
  },
  {
    label: '1 Min Umsatz',
    w: 20,
    col: '#f2b134',
    do: () => {
      const a = cashFor(1);
      G.money += a;
      bumpMoney();
      return '+' + fmt(a) + ' €';
    },
  },
  {
    label: 'JACKPOT',
    w: 3,
    col: '#231a24',
    do: () => {
      const a = cashFor(10);
      G.money += a;
      bumpMoney();
      addGems(3);
      burst(150);
      return t('JACKPOT! +{a} € und 3 Münzen', { a: fmt(a) });
    },
  },
];

export const WHEEL_COOLDOWN = 20 * 60 * 1000;

export let wRot = 0,
  spinning = false;

export function drawWheel() {
  const S = wc.width,
    R = S / 2 - 10,
    c = S / 2,
    a = (Math.PI * 2) / WHEEL.length;
  wx.clearRect(0, 0, S, S);
  WHEEL.forEach((sg, i) => {
    const a0 = -Math.PI / 2 + wRot + i * a;
    wx.beginPath();
    wx.moveTo(c, c);
    wx.arc(c, c, R, a0, a0 + a);
    wx.closePath();
    wx.fillStyle = sg.col;
    wx.fill();
    wx.strokeStyle = '#231a24';
    wx.lineWidth = 5;
    wx.stroke();
    wx.save();
    wx.translate(c, c);
    wx.rotate(a0 + a / 2);
    wx.textAlign = 'right';
    wx.textBaseline = 'middle';
    wx.fillStyle =
      sg.col === '#231a24' || sg.col === '#d8342b' || sg.col === '#3f7fbf' || sg.col === '#4fae62'
        ? '#fff6e8'
        : '#231a24';
    wx.font = (sg.label === 'JACKPOT' ? '30px' : '23px') + ' Bungee, Impact, sans-serif';
    wx.fillText(t(sg.label), R - 22, 0);
    wx.restore();
  });
  wx.beginPath();
  wx.arc(c, c, R, 0, Math.PI * 2);
  wx.strokeStyle = '#f2b134';
  wx.lineWidth = 10;
  wx.stroke();
  wx.beginPath();
  wx.arc(c, c, 38, 0, Math.PI * 2);
  wx.fillStyle = '#231a24';
  wx.fill();
  wx.strokeStyle = '#f2b134';
  wx.lineWidth = 3;
  wx.stroke();
}

export function wheelReady() {
  return Date.now() >= M.wheelAt;
}

export function fmtWait(ms) {
  const s = Math.ceil(ms / 1000),
    m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}

export function renderWheelBtn() {
  const b = $('spinBtn');
  if (spinning) {
    b.disabled = true;
    b.textContent = t('Dreht …');
    return;
  }
  b.disabled = !wheelReady();
  b.textContent = wheelReady() ? t('Drehen!') : t('Wieder in {t}', { t: fmtWait(M.wheelAt - Date.now()) });
}

export function metaHud(dt) {
  const wb = $('wheelBtn'),
    ready = wheelReady();
  $('wheelLbl').textContent = ready ? t('Drehen!') : fmtWait(M.wheelAt - Date.now());
  wb.classList.toggle('hot', ready);
  $('shopBtn').classList.toggle(
    'hot',
    OUTFITS.some(o => o.price != null && !M.owned.includes(o.id) && M.gems >= o.price) ||
      (typeof PETS !== 'undefined' && PETS.some(p => !M.pets.includes(p.id) && M.gems >= p.price)),
  );
  if (!$wheel.hidden) renderWheelBtn();
  const bs = [];
  for (const k in G.boost) {
    if (G.boost[k] > 0) bs.push(t(BOOSTNAME[k]) + ' ' + Math.ceil(G.boost[k]) + ' s');
  }
  const bc = $('boostChip');
  if (bs.length) {
    bc.hidden = false;
    bc.textContent = bs.join(' · ');
  } else bc.hidden = true;
}

export function initMeta() {
  try {
    Object.assign(M, JSON.parse(localStorage.getItem(MKEY) || '{}'));
  } catch (e) {}
  document.querySelectorAll('[data-close]').forEach(b => (b.onclick = closeSheets));
  // Sprache umschalten: Spielstand sichern und neu laden, damit alle Texte neu aufgebaut werden
  const lb = $('langBtn');
  if (lb) {
    lb.textContent = t('Sprache: {l}', { l: langName() });
    lb.onclick = () => {
      M.lang = nextLang().id;
      saveMeta();
      try {
        save();
      } catch (e) {}
      location.reload();
    };
  }
  $shop = $('shopSheet');
  $shopList = $('shopList');
  $('shopBtn').onclick = () => {
    audioInit();
    if (!$shop.hidden) {
      closeSheets();
      return;
    }
    renderShop();
    openSheet($shop);
  };
  $daily = $('dailySheet');
  $('claimDaily').onclick = () => {
    if (M.claimed) return;
    const r = DAILY[(M.streak - 1) % 7];
    if (r.c) {
      const a = cashFor(r.c);
      G.money += a;
      bumpMoney();
    }
    if (r.g) addGems(r.g);
    if (r.boost) giveBoost('cash', r.boost);
    M.claimed = true;
    saveMeta();
    chord();
    ching();
    renderDaily();
    showBanner(t('Tagesbonus abgeholt!'), dailyText(r).join(' · '));
    setTimeout(closeSheets, 700);
  };
  {
    const today = dayStr(new Date()),
      yest = dayStr(new Date(Date.now() - 864e5));
    if (M.lastDay !== today) {
      M.streak = M.lastDay === yest ? (M.streak % 7) + 1 : 1;
      M.lastDay = today;
      M.claimed = false;
      saveMeta();
    }
    if (!M.claimed)
      setTimeout(() => {
        renderDaily();
        openSheet($daily);
      }, 700);
  }
  $wheel = $('wheelSheet');
  wc = $('wheelCanvas');
  wx = wc.getContext('2d');
  $('spinBtn').onclick = () => {
    if (spinning || !wheelReady()) return;
    audioInit();
    let r = Math.random() * WHEEL.reduce((a, s) => a + s.w, 0),
      idx = 0;
    for (; idx < WHEEL.length; idx++) {
      r -= WHEEL[idx].w;
      if (r <= 0) break;
    }
    idx = Math.min(idx, WHEEL.length - 1);
    const a = (Math.PI * 2) / WHEEL.length,
      start = wRot % (Math.PI * 2),
      target = Math.PI * 2 * 6 - (idx + 0.5) * a + (Math.random() - 0.5) * a * 0.6,
      t0 = performance.now(),
      dur = 3400;
    spinning = true;
    M.wheelAt = Date.now() + WHEEL_COOLDOWN;
    saveMeta();
    renderWheelBtn();
    let lastTick = 0;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur),
        e = 1 - Math.pow(1 - k, 3);
      wRot = start + (target - start) * e;
      drawWheel();
      const seg = Math.floor(((wRot % (Math.PI * 2)) + Math.PI * 2) / a);
      if (seg !== lastTick) {
        lastTick = seg;
        sfx('click', 0.5, 1.2) || beep(1200, 0.02, 'square', 0.015);
      }
      if (k < 1) requestAnimationFrame(step);
      else {
        spinning = false;
        const txt = WHEEL[idx].do();
        chord();
        ching();
        $('wheelResult').textContent = txt;
        showBanner(t('Glücksrad'), txt);
        renderWheelBtn();
      }
    };
    requestAnimationFrame(step);
  };
  $('wheelBtn').onclick = () => {
    audioInit();
    if (!$wheel.hidden) {
      closeSheets();
      return;
    }
    $('wheelResult').textContent = wheelReady()
      ? t('Ein Dreh ist bereit.')
      : t('Alle 20 Minuten gibt es einen Gratis-Dreh.');
    drawWheel();
    renderWheelBtn();
    openSheet($wheel);
  };
  $('gems').textContent = fmt(M.gems);
}
