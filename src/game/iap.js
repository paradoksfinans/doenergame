// iap.js – Käufe mit echtem Geld über Google Play Billing (Plugin @capgo/native-purchases).
// Im Browser / Artefakt gibt es stattdessen einen deutlich markierten Testkauf ohne echtes Geld.
// Die Produkt-IDs unten müssen in der Play Console unter „Monetarisieren → In-App-Produkte“ exakt so angelegt werden.
import { G } from './state.js';
import { M, saveMeta, addGems, giveBoost, cashFor, applyOutfit, renderShop } from './meta.js';
import { $, showBanner, bumpMoney } from './hud.js';
import { t, fmt } from './i18n.js';
import { burst } from './confetti.js';
import { chord, sfx, audioInit } from './audio.js';

// type: c = Verbrauchsgut (mehrfach kaufbar), n = einmalig (bleibt für immer)
export const PRODUCTS = [
  {
    id: 'starter_paket',
    type: 'n',
    eur: '1,99 €',
    name: 'Starter-Paket',
    desc: '60 Münzen, Outfit „Sultan“ und 30 Min 2× Umsatz',
    tag: 'Einmalig',
  },
  { id: 'muenzen_s', type: 'c', gems: 30, eur: '0,99 €', name: 'Handvoll Münzen', desc: '30 Goldmünzen' },
  {
    id: 'muenzen_m',
    type: 'c',
    gems: 100,
    eur: '2,99 €',
    name: 'Beutel Münzen',
    desc: '100 Goldmünzen',
    tag: 'Beliebt',
  },
  { id: 'muenzen_l', type: 'c', gems: 250, eur: '5,99 €', name: 'Truhe Münzen', desc: '250 Goldmünzen' },
  {
    id: 'muenzen_xl',
    type: 'c',
    gems: 600,
    eur: '11,99 €',
    name: 'Münzschatz',
    desc: '600 Goldmünzen',
    tag: 'Bester Wert',
  },
  {
    id: 'werbefrei',
    type: 'n',
    eur: '3,99 €',
    name: 'Werbefrei',
    desc: 'Alle Video-Belohnungen sofort – ohne Werbung',
  },
  {
    id: 'doppelt_umsatz',
    type: 'n',
    eur: '6,99 €',
    name: 'Doppelter Umsatz',
    desc: 'Für immer ×2 auf alle Einnahmen',
  },
  {
    id: 'goldene_spiesse_5',
    type: 'c',
    eur: '2,99 €',
    name: '5 Goldene Spieße',
    desc: 'Für den Prestige-Baum',
    pres: true,
  },
];

const native = () =>
  !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
let NP = null,
  prices = {},
  busy = false;

function I() {
  if (!M.iap) M.iap = {};
  return M.iap;
}
/** Einmal-Kauf vorhanden? */
export const owns = id => !!(M.iap && M.iap[id]);
export const incomeIapMul = () => (owns('doppelt_umsatz') ? 2 : 1);

// ---------------------------------------------------------------- Belohnung
function grant(p, silent) {
  const iap = I();
  if (p.type === 'n') {
    if (iap[p.id]) return;
    iap[p.id] = true;
  }
  if (p.gems) addGems(p.gems);
  if (p.id === 'starter_paket') {
    addGems(60);
    if (!M.owned.includes('sultan')) M.owned.push('sultan');
    M.outfit = 'sultan';
    applyOutfit();
    giveBoost('cash', 1800);
  }
  if (p.id === 'goldene_spiesse_5') {
    if (!M.pres) M.pres = { lvl: 0, pts: 0, total: 0, ups: {} };
    M.pres.pts += 5;
    M.pres.total += 5;
  }
  saveMeta();
  if (silent) return;
  burst(120);
  chord();
  sfx('cash', 0.8);
  bumpMoney();
  showBanner(t('Danke für deinen Kauf!'), t('{n} ist freigeschaltet', { n: t(p.name) }));
}

// ---------------------------------------------------------------- Google Play
async function plugin() {
  if (NP) return NP;
  const mod = await import('@capgo/native-purchases');
  NP = mod.NativePurchases;
  return NP;
}
async function initNative() {
  try {
    const np = await plugin();
    const ok = await np.isBillingSupported();
    if (!ok.isBillingSupported) return;
    const { products } = await np.getProducts({
      productIdentifiers: PRODUCTS.map(p => p.id),
      productType: 'inapp',
    });
    for (const pr of products || []) prices[pr.identifier] = pr.priceString;
    await restore(true);
  } catch (e) {}
}
/** Käufe von Google Play abgleichen: Einmal-Käufe wiederherstellen, offene Verbrauchskäufe nachliefern. */
async function restore(silent) {
  if (!native()) return;
  try {
    const np = await plugin();
    const { purchases } = await np.getPurchases({ productType: 'inapp' });
    let n = 0;
    for (const tx of purchases || []) {
      if (tx.purchaseState && tx.purchaseState !== '1') continue;
      const p = PRODUCTS.find(q => q.id === tx.productIdentifier);
      if (!p) continue;
      if (p.type === 'n') {
        if (!owns(p.id)) {
          grant(p, true);
          n++;
        }
      } else if (tx.purchaseToken) {
        // Verbrauchskauf, der noch nicht verbucht wurde (z. B. App vorher geschlossen)
        grant(p, true);
        await np.consumePurchase({ purchaseToken: tx.purchaseToken });
        n++;
      }
    }
    if (n) {
      showBanner(t('Käufe wiederhergestellt'), t('{n} Kauf/Käufe gutgeschrieben', { n }));
      renderShop();
    } else if (!silent) showBanner(t('Nichts wiederherzustellen'), t('Es gibt keine offenen Käufe'));
  } catch (e) {
    if (!silent) showBanner(t('Wiederherstellen fehlgeschlagen'), t('Bitte später erneut versuchen'));
  }
}
async function buyNative(p) {
  const np = await plugin();
  const tx = await np.purchaseProduct({
    productIdentifier: p.id,
    productType: 'inapp',
    isConsumable: p.type === 'c',
  });
  if (tx && tx.purchaseState && tx.purchaseState !== '1') {
    showBanner(t('Kauf wird bearbeitet'), t('Sobald Google Play ihn bestätigt, bekommst du die Belohnung'));
    return;
  }
  grant(p);
}

// ---------------------------------------------------------------- Testkauf im Browser
function buySimulated(p) {
  return new Promise(res => {
    const ov = document.createElement('div');
    ov.className = 'adsim';
    ov.innerHTML = `<div class="adbox"><small>${t('Testkauf – kein echtes Geld')}</small><b>${t(p.name)}</b><span class="adt">${p.eur}</span><button type="button" class="ok">${t('Kaufen (Test)')}</button><button type="button" class="no">${t('Abbrechen')}</button></div>`;
    document.body.append(ov);
    ov.querySelector('.ok').onclick = () => {
      ov.remove();
      res(true);
    };
    ov.querySelector('.no').onclick = () => {
      ov.remove();
      res(false);
    };
  });
}

export async function buy(p) {
  if (busy) return;
  audioInit();
  busy = true;
  try {
    if (native()) await buyNative(p);
    else if (await buySimulated(p)) grant(p);
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (!/cancel/i.test(msg))
      showBanner(t('Kauf nicht möglich'), t('Google Play hat den Kauf nicht abgeschlossen'));
  } finally {
    busy = false;
    renderShop();
  }
}

// ---------------------------------------------------------------- Shop-Abschnitte
function row(name, desc, btnText, onClick, opts = {}) {
  const r = document.createElement('div');
  r.className = 'up' + (opts.hot ? ' iaphot' : '');
  const n = document.createElement('div');
  n.className = 'n';
  n.textContent = name;
  if (opts.tag) {
    const tg = document.createElement('span');
    tg.className = 'iaptag';
    tg.textContent = opts.tag;
    n.append(tg);
  }
  const d = document.createElement('div');
  d.className = 'd';
  d.textContent = desc;
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = btnText;
  b.disabled = !!opts.disabled;
  b.onclick = onClick;
  r.append(n, b, d);
  return r;
}
export function renderIap() {
  const el = $('iapList');
  if (!el) return;
  el.innerHTML = '';
  for (const p of PRODUCTS) {
    if (p.pres && !(M.pres && (M.pres.lvl > 0 || M.pres.pts > 0)) && G.city < 4) continue;
    const own = p.type === 'n' && owns(p.id);
    el.append(
      row(t(p.name), t(p.desc), own ? t('Gekauft') : prices[p.id] || p.eur, () => buy(p), {
        disabled: own,
        tag: p.tag && !own ? t(p.tag) : '',
        hot: p.id === 'starter_paket' && !own,
      }),
    );
  }
  const rb = document.createElement('button');
  rb.type = 'button';
  rb.className = 'linkbtn';
  rb.textContent = t('Käufe wiederherstellen');
  rb.onclick = () =>
    native() ? restore(false) : showBanner(t('Nur in der App'), t('Im Browser gibt es nur Testkäufe'));
  el.append(rb);
  // Münzen ausgeben: sofort Geld oder Boosts
  const gl = $('gemUseList');
  if (!gl) return;
  gl.innerHTML = '';
  const uses = [
    {
      name: 'Geldsack',
      desc: () => t('+{a} € sofort (10 Min Umsatz)', { a: fmt(cashFor(10)) }),
      cost: 5,
      go: () => ((G.money += cashFor(10)), bumpMoney()),
    },
    {
      name: 'Geldtruhe',
      desc: () => t('+{a} € sofort (1 Std Umsatz)', { a: fmt(cashFor(60)) }),
      cost: 20,
      go: () => ((G.money += cashFor(60)), bumpMoney()),
    },
    {
      name: '2× Umsatz',
      desc: () => t('30 Minuten doppelte Einnahmen'),
      cost: 8,
      go: () => giveBoost('cash', 1800),
    },
    {
      name: 'Turbo',
      desc: () => t('10 Minuten 50 % schneller laufen'),
      cost: 4,
      go: () => giveBoost('speed', 600),
    },
  ];
  for (const u of uses)
    gl.append(
      row(
        t(u.name),
        u.desc(),
        t('{p} Münzen', { p: u.cost }),
        () => {
          if (M.gems < u.cost) return;
          M.gems -= u.cost;
          saveMeta();
          $('gems').textContent = fmt(M.gems);
          u.go();
          chord();
          showBanner(t(u.name), u.desc());
          renderShop();
        },
        { disabled: M.gems < u.cost },
      ),
    );
}

export function initIap() {
  I();
  if (native()) setTimeout(initNative, 2500);
}
