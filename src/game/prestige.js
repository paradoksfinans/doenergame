// prestige.js – „Palast übergeben“: Nach Istanbul Level 10 übergibt man das Döner-Imperium an die nächste
// Generation und fängt in Berlin neu an. Dafür gibt es Goldene Spieße: jeder bringt dauerhaft +2 % auf alle
// Einnahmen und kann im Prestige-Baum für bleibende Vorteile ausgegeben werden.
import { G, __set_G, fresh } from './state.js';
import { M, saveMeta, applyOutfit, openSheet, closeSheets } from './meta.js';
import { $, showBanner, bumpMoney } from './hud.js';
import { t, fmt } from './i18n.js';
import { KEY, save } from './save.js';
import { unlock } from './world.js';
import { cam } from './render.js';
import { flyers, texts } from './fx.js';
import { burst } from './confetti.js';
import { sfx, chord, audioInit } from './audio.js';
import { showRewarded } from './ads.js';

// Äste des Prestige-Baums
export const PRES_UPS = [
  {
    id: 'pIncome',
    br: 'Einnahmen',
    name: 'Familienrezept',
    desc: 'Alle Einnahmen +10 %',
    cost: [3, 5, 8, 12, 18],
  },
  { id: 'pCash', br: 'Start', name: 'Erbe', desc: '+500 € Startgeld', cost: [2, 3, 5, 7, 10] },
  { id: 'pSpit', br: 'Start', name: 'Zweiter Spieß', desc: 'Der 2. Spieß steht schon', cost: [4] },
  {
    id: 'pStaff0',
    br: 'Start',
    name: 'Alte Freunde',
    desc: 'Zeynep und Ali arbeiten ab der ersten Minute',
    cost: [6],
  },
  { id: 'pWalk', br: 'Tempo', name: 'Flinke Füße', desc: 'Du läufst 8 % schneller', cost: [2, 3, 5, 7, 10] },
  {
    id: 'pTeam',
    br: 'Tempo',
    name: 'Eingespieltes Team',
    desc: 'Personal arbeitet 8 % schneller',
    cost: [2, 4, 6, 9, 13],
  },
  { id: 'pTray', br: 'Tempo', name: 'Starke Arme', desc: 'Du trägst 2 Döner mehr', cost: [3, 6, 10] },
  {
    id: 'pCheap',
    br: 'Räume',
    name: 'Handwerker-Rabatt',
    desc: 'Alle Ausbauten 8 % billiger',
    cost: [3, 5, 8, 12, 16],
  },
  { id: 'pRooms', br: 'Räume', name: 'Alter Bauplan', desc: 'Nebenräume 1 Level früher', cost: [8, 15] },
  { id: 'pYusuf', br: 'Räume', name: 'Yusuf bleibt', desc: 'Flur-Kellner Yusuf kostet nichts', cost: [10] },
  {
    id: 'pEvents',
    br: 'Events',
    name: 'Gute Kontakte',
    desc: 'Events 20 % häufiger, Belohnungen +25 %',
    cost: [4, 8, 12],
  },
  {
    id: 'pGems',
    br: 'Events',
    name: 'Glückspilz',
    desc: '+1 Goldmünze bei jedem Level-Aufstieg',
    cost: [3, 6, 10],
  },
];

function P0() {
  if (!M.pres) M.pres = { lvl: 0, pts: 0, total: 0, ups: {} };
  return M.pres;
}
/** Stufe eines Prestige-Vorteils. */
export const pres = id => (M.pres && M.pres.ups && M.pres.ups[id]) || 0;
export const presLevel = () => (M.pres ? M.pres.lvl : 0);
/** Faktor auf alle Verkäufe. */
export const presIncomeMul = () => (1 + 0.02 * (M.pres ? M.pres.total : 0)) * (1 + 0.1 * pres('pIncome'));
/** Istanbul (oder später) komplett ausgebaut? */
export const presAvailable = () => G.city >= 4 && G.cityLv >= 10 && G.unlocked.has('golden');

// Verdienst dieses Durchlaufs. Alte Spielstände bekommen eine Schätzung nach der erreichten Stadt.
const SEED = [0, 60000, 150000, 270000, 420000, 600000];
export function addRunEarn(a) {
  if (M.runEarn == null) M.runEarn = SEED[Math.min(5, G.top ?? G.city)] || 0;
  M.runEarn += a;
}
export function presGain() {
  if (M.runEarn == null) addRunEarn(0);
  return Math.max(5, Math.floor(Math.sqrt(M.runEarn / 4000)));
}

/** Tablett-Größe inkl. Prestige (wird nach jedem Ausbau und beim Laden gesetzt). */
export function capFix() {
  G.cap = (G.unlocked.has('tray2') ? 12 : G.unlocked.has('tray') ? 8 : 5) + 2 * pres('pTray');
}
/** Start-Vorteile auf einen frischen Laden anwenden. */
export function applyPresStart() {
  G.money += 500 * pres('pCash');
  if (pres('pSpit')) unlock('spit2', true);
  if (pres('pStaff0')) {
    unlock('cashier', true);
    unlock('runner', true);
  }
  capFix();
}

function doPrestige(mul) {
  const P = P0(),
    gain = presGain() * mul;
  P.lvl++;
  P.pts += gain;
  P.total += gain;
  M.runEarn = 0;
  saveMeta();
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
  __set_G(fresh(0));
  G.top = 0;
  G.branches = [];
  G.branchCash = 0;
  cam.init = false;
  flyers.length = 0;
  texts.length = 0;
  applyOutfit();
  applyPresStart();
  save();
  closeSheets();
  burst(200);
  chord();
  sfx('fanfare', 0.9);
  showBanner(
    t('Prestige {n}!', { n: P.lvl }),
    t('+{g} Goldene Spieße · alle Einnahmen jetzt ×{m}', { g: gain, m: fmt(presIncomeMul(), 2) }),
  );
  updPresBtn();
}

// ---------------------------------------------------------------- Fenster
let $sheet,
  $list,
  armT = 0;
function renderPres() {
  const P = P0(),
    avail = presAvailable();
  $('presInfo').innerHTML = t(
    'Prestige-Stufe <b>{l}</b> · <b>{p}</b> Goldene Spieße übrig · Einnahmen ×{m}',
    { l: P.lvl, p: P.pts, m: fmt(presIncomeMul(), 2) },
  );
  const go = $('presGo'),
    ad = $('presGoAd');
  go.hidden = ad.hidden = !avail;
  $('presLocked').hidden = avail;
  if (avail) {
    go.textContent =
      armT && Date.now() - armT < 3000
        ? t('Wirklich übergeben? Nochmal tippen')
        : t('Palast übergeben: +{g} Goldene Spieße', { g: presGain() });
    ad.textContent = t('▶ Video ansehen: +{g} Goldene Spieße', { g: presGain() * 2 });
  }
  $list.innerHTML = '';
  let br = '';
  for (const u of PRES_UPS) {
    if (u.br !== br) {
      br = u.br;
      const h = document.createElement('h3');
      h.className = 'presbr';
      h.textContent = t(br);
      $list.append(h);
    }
    const lv = pres(u.id),
      max = lv >= u.cost.length,
      cost = max ? 0 : u.cost[lv],
      row = document.createElement('div');
    row.className = 'up';
    const n = document.createElement('div');
    n.className = 'n';
    n.textContent = t(u.name);
    const dots = document.createElement('span');
    dots.className = 'dots';
    for (let i = 0; i < u.cost.length; i++) {
      const d = document.createElement('i');
      if (i < lv) d.className = 'on';
      dots.append(d);
    }
    n.append(dots);
    const d = document.createElement('div');
    d.className = 'd';
    d.textContent = t(u.desc);
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = max ? t('Maximum') : cost + ' 🥙';
    b.disabled = max || P.pts < cost;
    b.onclick = () => {
      const l = pres(u.id);
      if (l >= u.cost.length || P.pts < u.cost[l]) return;
      P.pts -= u.cost[l];
      P.ups[u.id] = l + 1;
      saveMeta();
      capFix();
      // Start-Vorteile gleich anwenden, solange der neue Durchlauf gerade erst begonnen hat
      if (G.city === 0 && G.cityLv === 1) {
        if (u.id === 'pCash') {
          G.money += 500;
          bumpMoney();
        }
        if (u.id === 'pSpit') unlock('spit2', true);
        if (u.id === 'pStaff0') {
          unlock('cashier', true);
          unlock('runner', true);
        }
      }
      sfx('buy', 0.8) || chord();
      renderPres();
    };
    row.append(n, b, d);
    $list.append(row);
  }
}
export function updPresBtn() {
  const b = $('presBtn');
  if (!b) return;
  const show = presAvailable() || presLevel() > 0;
  b.hidden = !show;
  b.textContent = presAvailable() ? t('👑 Prestige bereit!') : '👑 ' + t('Prestige {n}', { n: presLevel() });
  b.classList.toggle('pulse', presAvailable());
}
let hudT = 0;
export function presTick(dt) {
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 1;
  updPresBtn();
}

export function initPrestige() {
  P0();
  capFix();
  $sheet = $('presSheet');
  $list = $('presList');
  $('presBtn').onclick = () => {
    audioInit();
    if (!$sheet.hidden) return closeSheets();
    armT = 0;
    renderPres();
    openSheet($sheet);
  };
  $('presGo').onclick = () => {
    if (!presAvailable()) return;
    if (armT && Date.now() - armT < 3000) {
      armT = 0;
      doPrestige(1);
      return;
    }
    armT = Date.now();
    renderPres();
    setTimeout(() => !$sheet.hidden && renderPres(), 3100);
  };
  $('presGoAd').onclick = async () => {
    if (!presAvailable()) return;
    if (await showRewarded()) doPrestige(2);
  };
  updPresBtn();
}
