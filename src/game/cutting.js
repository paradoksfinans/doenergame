// cutting.js – aus der Einzeldatei extrahiert

import { PICK_Y, TRAY_MAX, dist } from './config.js';
import { G } from './state.js';
import { floatText } from './fx.js';
import { audioInit, beep, chord, sfx } from './audio.js';
import { $, showBanner } from './hud.js';
import { M, closeSheets, openSheet, saveMeta } from './meta.js';
import { life } from './achievements.js';
import { burst } from './confetti.js';
import { PETS, pet, updatePet } from './pets.js';
import { branchPerSec } from './branches.js';
import { tutActive } from './tutorial.js';
import { renderDeco } from './decor.js';
import { t, fmt } from './i18n.js';

export let $cut, $cutBtn, $mk;

export let cutRun = null;

export function nearSpit() {
  const pl = G.player;
  return G.spits.find(s => s.on && dist(pl, { x: s.x + 0.5, y: PICK_Y }) < 1.0);
}

export function cutPos() {
  const k = (((performance.now() - cutRun.t0) / 1000) % 1.3) / 1.3;
  return k < 0.5 ? k * 2 : 2 - k * 2;
}

export function animCut() {
  if (!cutRun || cutRun.done || $cut.hidden) return;
  $mk.style.left = cutPos() * 100 + '%';
  requestAnimationFrame(animCut);
}

export function doCut() {
  if (!cutRun || cutRun.done) return;
  cutRun.done = true;
  const x = cutPos(),
    d = Math.abs(x - 0.5),
    s = cutRun.spit;
  let n, txt;
  if (d < 0.07) {
    n = 5;
    txt = t('Meisterschnitt! +5 Döner');
    life('perfect', 1);
    burst(60);
    chord();
  } else if (d < 0.18) {
    n = 3;
    txt = t('Guter Schnitt! +3 Döner');
    sfx('ding', 0.6) || beep(880, 0.1);
  } else {
    n = 1;
    txt = t('Daneben … +1 Döner');
    sfx('bad', 0.5, 1.3) || beep(200, 0.15, 'sawtooth', 0.03);
  }
  s.stock = Math.min(TRAY_MAX + 6, s.stock + n);
  s.cut = 25;
  $('cutResult').textContent = txt;
  floatText(s.x + 0.5, 1.3, 90, txt.split('!')[0], '#f2b134');
  setTimeout(() => {
    closeSheets();
    cutRun = null;
  }, 900);
}

export function v9Update(dt) {
  for (const s of G.spits) if (s.cut > 0) s.cut = Math.max(0, s.cut - dt);
  if (G.branches && G.branches.length) G.branchCash = (G.branchCash || 0) + branchPerSec() * dt;
  updatePet(dt);
}

export function v9Hud() {
  const s = nearSpit(),
    anySheet = [...document.querySelectorAll('.sheet')].some(x => !x.hidden);
  if (s && !anySheet && !(typeof tutActive === 'function' && tutActive())) {
    $cutBtn.hidden = false;
    const cd = s.cut || 0;
    $cutBtn.disabled = cd > 0;
    $cutBtn.textContent =
      cd > 0 ? t('Schneiden in {s} s', { s: Math.ceil(cd) }) : t('Döner schneiden!');
  } else $cutBtn.hidden = true;
  const bb = $('branchBtn');
  if (G.branches && G.branches.length) {
    bb.hidden = false;
    bb.textContent = t('Filialen: {amt} € abholen', { amt: fmt(Math.floor(G.branchCash || 0)) });
  } else bb.hidden = true;
}

export function renderPetsAndDeco() {
  renderPets();
  renderDeco();
}

export function renderPets() {
  const box = $('petList');
  box.innerHTML = '';
  for (const pt of PETS) {
    const row = document.createElement('div');
    row.className = 'up';
    const n = document.createElement('div');
    n.className = 'n';
    n.textContent = t(pt.name);
    const d = document.createElement('div');
    d.className = 'd';
    d.textContent = t(pt.desc);
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'pet-' + pt.id;
    const own = M.pets.includes(pt.id);
    if (M.pet === pt.id) {
      b.textContent = t('Nach Hause');
      b.onclick = () => {
        M.pet = null;
        saveMeta();
        renderPets();
      };
    } else if (own) {
      b.textContent = t('Mitnehmen');
      b.onclick = () => {
        M.pet = pt.id;
        pet.init = false;
        saveMeta();
        renderPets();
        sfx('buy', 0.7) || beep(880, 0.08);
      };
    } else {
      b.textContent = t('{price} Münzen', { price: pt.price });
      b.disabled = M.gems < pt.price;
      b.onclick = () => {
        if (M.gems < pt.price) return;
        M.gems -= pt.price;
        M.pets.push(pt.id);
        M.pet = pt.id;
        pet.init = false;
        saveMeta();
        $('gems').textContent = M.gems;
        chord();
        burst(50);
        renderPets();
        showBanner(t('{n} ist dabei!', { n: t(pt.name) }), t(pt.desc));
      };
    }
    row.append(n, b, d);
    box.append(row);
  }
}

export function initCutting() {
  $cut = $('cutSheet');
  $cutBtn = $('cutBtn');
  $mk = $('cutMarker');
  $cutBtn.onclick = () => {
    const s = nearSpit();
    if (!s || (s.cut || 0) > 0) return;
    audioInit();
    cutRun = { spit: s, t0: performance.now(), done: false };
    $('cutResult').textContent = t('Tippe, wenn der Zeiger im grünen Feld ist!');
    openSheet($cut);
    animCut();
  };
  $('cutGo').onclick = doCut;
  $('cutBar').onclick = doCut;
}
