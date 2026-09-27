// hud.js – aus der Einzeldatei extrahiert
import { levelProgress, levelsTick, MAX_LEVEL } from './levels.js';

import { PADS, UPS, UP_MAX, cityOf } from './config.js';
import { G, MTEXT, __set_G, fresh, friesPrice, price, upCost } from './state.js';
import { flyers, texts } from './fx.js';
import { __set_muted, audioInit, chord, muted } from './audio.js';
import { ratePerMin } from './update.js';
import { cam } from './render.js';
import { KEY, save } from './save.js';
import { applyOutfit, closeSheets, metaHud, openSheet } from './meta.js';
import { v7Hud } from './confetti.js';
import { tutTick } from './tutorial.js';

export let $m,
  $mb,
  $h,
  $pl,
  $pb,
  $b,
  $rate,
  $rc,
  $price,
  $rush,
  $rfx,
  $mt,
  $mbar,
  $up,
  $sheet,
  $upList,
  $snd,
  $rst;

export const $ = id => document.getElementById(id);

export let lastM = -1,
  lastH = '',
  bTimer = 0,
  rateT = 0,
  lastRate = 0,
  bestRate = 0,
  lastMT = '',
  sheetT = 0;

export function renderSheet() {
  $upList.innerHTML = '';
  for (const u of UPS) {
    const lv = G.lv[u.id],
      cost = upCost(u),
      max = lv >= UP_MAX,
      row = document.createElement('div');
    row.className = 'up';
    const n = document.createElement('div');
    n.className = 'n';
    n.textContent = u.name;
    const dots = document.createElement('span');
    dots.className = 'dots';
    for (let i = 0; i < UP_MAX; i++) {
      const d = document.createElement('i');
      if (i < lv) d.className = 'on';
      dots.append(d);
    }
    n.append(dots);
    const d = document.createElement('div');
    d.className = 'd';
    d.textContent = u.desc;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'buy-' + u.id;
    b.textContent = max ? 'Maximum' : cost.toLocaleString('de-DE') + ' €';
    b.disabled = max || G.money < cost;
    b.onclick = () => {
      if (G.lv[u.id] >= UP_MAX || G.money < upCost(u)) return;
      G.money -= upCost(u);
      G.lv[u.id]++;
      chord();
      renderSheet();
      save();
    };
    row.append(n, b, d);
    $upList.append(row);
  }
}

export function bumpMoney() {
  $mb.classList.remove('pop');
  void $mb.offsetWidth;
  $mb.classList.add('pop');
}

export function showBanner(a, b) {
  $b.innerHTML = '';
  $b.append(a);
  if (b) {
    const s = document.createElement('small');
    s.textContent = b;
    $b.append(s);
  }
  $b.hidden = false;
  $b.style.animation = 'none';
  void $b.offsetWidth;
  $b.style.animation = '';
  clearTimeout(bTimer);
  bTimer = setTimeout(() => ($b.hidden = true), 2800);
}

export function hud(g, dt) {
  const m = Math.floor(G.money);
  if (m !== lastM) {
    $m.textContent = m.toLocaleString('de-DE');
    lastM = m;
  }
  const tt = tutTick();
  const h = tt || (G.hasMoved ? '' : 'Ziehen zum Laufen · ') + g.t;
  if (h !== lastH) {
    $h.innerHTML = h;
    lastH = h;
  }
  const n = G.unlocked.size;
  const lp = levelProgress();
  $pl.textContent = `${cityOf(G.city).name} · Level ${G.cityLv}/${MAX_LEVEL}`;
  $pb.style.width = (G.cityLv >= MAX_LEVEL ? 100 : lp.frac * 100) + '%';
  levelsTick(dt);
  if (G.rush > 0) {
    $rush.hidden = false;
    $rush.textContent = 'Rush ' + Math.ceil(G.rush) + ' s';
    $rfx.hidden = false;
  } else if (!$rush.hidden) {
    $rush.hidden = true;
    $rfx.hidden = true;
  }
  const mi = G.mission;
  if (mi) {
    const pr = Math.min(mi.goal, G.stats[mi.type] - mi.start),
      tx = `${MTEXT[mi.type](mi.goal)} · ${pr.toLocaleString('de-DE')}/${mi.goal.toLocaleString('de-DE')}`;
    if (tx !== lastMT) {
      $mt.textContent = tx;
      $('mHead').textContent = `Aufgabe · Belohnung ${mi.reward.toLocaleString('de-DE')} €`;
      $mbar.style.width = (pr / mi.goal) * 100 + '%';
      lastMT = tx;
    }
  }
  metaHud(dt);
  v7Hud(dt);
  const canBuy = UPS.some(u => G.lv[u.id] < UP_MAX && G.money >= upCost(u));
  $up.classList.toggle('hot', canBuy);
  if (!$sheet.hidden) {
    sheetT -= dt;
    if (sheetT <= 0) {
      sheetT = 0.3;
      renderSheet();
    }
  }
  rateT -= dt;
  if (rateT <= 0) {
    rateT = 0.5;
    const r = ratePerMin();
    $rate.textContent = r.toLocaleString('de-DE');
    $rc.classList.toggle('up', r > bestRate && r > 0);
    if (r > bestRate) bestRate = r;
    lastRate = r;
    $price.textContent = price();
    {
      const st = $('stars'),
        r = G.rating;
      st.textContent = '★ ' + r.toFixed(1).replace('.', ',') + (r >= 4.5 ? ' · +10 %' : '');
      st.style.color = r >= 4.5 ? '#7fd48f' : r < 3 ? '#ff8a7f' : '#f2b134';
    }
    $('friesChip').hidden = !G.fryer.on;
    $('fprice').textContent = friesPrice();
  }
}

export let rstArm = 0;

export function __set_bestRate(v) {
  bestRate = v;
}

export function initHud() {
  $m = $('money');
  $mb = $('moneyBox');
  $h = $('hint');
  $pl = $('progLabel');
  $pb = $('progBar');
  $b = $('banner');
  $rate = $('rate');
  $rc = $('rateChip');
  $price = $('price');
  $rush = $('rushChip');
  $rfx = $('rushFx');
  $mt = $('mText');
  $mbar = $('mBar');
  $up = $('upBtn');
  $sheet = $('sheet');
  $upList = $('upList');
  $up.onclick = () => {
    audioInit();
    if (!$sheet.hidden) {
      closeSheets();
      return;
    }
    renderSheet();
    openSheet($sheet);
  };
  $snd = $('snd');
  $rst = $('rst');
  $snd.onclick = () => {
    audioInit();
    __set_muted(!muted);
    $snd.textContent = 'Ton: ' + (muted ? 'aus' : 'an');
  };
  $rst.onclick = () => {
    if (Date.now() - rstArm < 2500) {
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
      __set_G(fresh());
      cam.init = false;
      flyers.length = 0;
      texts.length = 0;
      bestRate = 0;
      $rst.textContent = 'Laden neu starten';
      $rst.classList.remove('warn');
      rstArm = 0;
      applyOutfit();
      closeSheets();
      showBanner('Neuer Laden, neues Glück!');
      return;
    }
    rstArm = Date.now();
    $rst.textContent = 'Wirklich? Nochmal tippen';
    $rst.classList.add('warn');
    setTimeout(() => {
      if (Date.now() - rstArm >= 2400) {
        $rst.textContent = 'Laden neu starten';
        $rst.classList.remove('warn');
      }
    }, 2500);
  };
}
