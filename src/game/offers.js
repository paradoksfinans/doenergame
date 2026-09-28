// offers.js – wo Belohnungs-Videos angeboten werden (immer freiwillig):
//   1. „▶ 2× Umsatz“-Knopf oben (alle 4 Minuten, 5 Minuten doppelter Umsatz)
//   2. Einnahmen während der Abwesenheit verdoppeln
//   3. Glücksrad einmal zusätzlich drehen, während es auf Pause ist
import { G } from './state.js';
import { t, fmt } from './i18n.js';
import { $, bumpMoney, showBanner } from './hud.js';
import { M, saveMeta, giveBoost, openSheet, closeSheets, renderWheelBtn } from './meta.js';
import { showRewarded } from './ads.js';
import { sfx } from './audio.js';

const VIDEO_COOLDOWN = 4 * 60 * 1000,
  VIDEO_BOOST = 300;
let busy = false;

async function watch(onReward) {
  if (busy) return;
  busy = true;
  try {
    if (await showRewarded()) onReward();
  } finally {
    busy = false;
  }
}

// ---------------------------------------------------------------- 1. Umsatz-Video
function videoReady() {
  return Date.now() >= (M.videoAt || 0) && !(G.boost.cash > 0);
}
let hudT = 0;
export function offersHud(dt) {
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.5;
  const b = $('vidChip');
  if (!b) return;
  // erst anbieten, wenn der Laden läuft (Kasse gekauft)
  b.hidden = !(G.unlocked.has('cashier') && videoReady());
  const w = $('spinAdBtn');
  if (w) w.hidden = !wheelAdReady();
}

// ---------------------------------------------------------------- 2. Offline-Einnahmen
let offline = 0;
export function offerOffline(amount) {
  offline = amount;
  $('offAmt').textContent = '+' + fmt(amount) + ' €';
  // warten, bis kein anderes Fenster (z. B. Tagesbonus) offen ist
  const tryOpen = () => {
    if ([...document.querySelectorAll('.sheet')].some(s => !s.hidden)) return setTimeout(tryOpen, 700);
    openSheet($('offlineSheet'));
  };
  tryOpen();
}
function collectOffline(mult) {
  const a = offline * mult;
  offline = 0;
  if (!a) return;
  G.piles.reg.amount += a;
  G.piles.reg.count += Math.min(40, Math.round(a / 6));
  closeSheets();
  showBanner(t('Während du weg warst: +{a} €', { a: fmt(a) }), t('Liegt an der Kasse bereit'));
  sfx('cash', 0.7);
}

// ---------------------------------------------------------------- 3. Glücksrad nochmal
function wheelAdReady() {
  return M.wheelAt > Date.now() && M.wheelAdFor !== M.wheelAt;
}

export function initOffers() {
  const vb = $('vidChip');
  vb.onclick = () =>
    watch(() => {
      M.videoAt = Date.now() + VIDEO_COOLDOWN;
      saveMeta();
      giveBoost('cash', VIDEO_BOOST);
      showBanner(t('Doppelter Umsatz!'), t('5 Minuten lang zählt jeder Verkauf doppelt'));
      sfx('fanfare', 0.7);
      bumpMoney();
    });
  $('offCollect').onclick = () => collectOffline(1);
  $('offDouble').onclick = () => watch(() => collectOffline(2));
  // Schließen ohne Auswahl = normal abholen
  $('offlineSheet')
    .querySelectorAll('[data-close]')
    .forEach(b => b.addEventListener('click', () => collectOffline(1)));
  $('spinAdBtn').onclick = () =>
    watch(() => {
      M.wheelAdFor = M.wheelAt;
      M.wheelAt = 0;
      saveMeta();
      renderWheelBtn();
      sfx('ding', 0.6);
    });
}
