// ads.js – freiwillige Belohnungs-Videos („Video ansehen → Bonus“).
// In der Android-App über Google AdMob (vorerst mit Googles offiziellen TEST-Anzeigen),
// im Browser/Artefakt als simulierte 5-Sekunden-Werbung, damit sich der Ablauf testen lässt.
// Für echte Einnahmen später nur AD_UNIT und APP_ID (AndroidManifest.xml) durch die eigenen IDs ersetzen
// und TESTING auf false stellen.
import { t } from './i18n.js';
import { audioInit, playMusic } from './audio.js';
import { M } from './meta.js';

const TESTING = true;
// Googles öffentliche Test-ID für Belohnungs-Videos (Android)
const AD_UNIT = 'ca-app-pub-3940256099942544/5224354917';

const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
let admob = null,
  ready = false,
  loading = null;

async function initNative() {
  if (admob) return admob;
  const mod = await import('@capacitor-community/admob');
  admob = mod.AdMob;
  await admob.initialize({ initializeForTesting: TESTING });
  // Einwilligung (DSGVO): Google-Formular zeigen, falls nötig
  try {
    const info = await admob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === 'REQUIRED') await admob.showConsentForm();
  } catch (e) {}
  return admob;
}

function preload() {
  if (!native()) return Promise.resolve();
  if (ready) return Promise.resolve();
  if (loading) return loading;
  loading = initNative()
    .then(a => a.prepareRewardVideoAd({ adId: AD_UNIT, isTesting: TESTING }))
    .then(() => (ready = true))
    .catch(() => (ready = false))
    .finally(() => (loading = null));
  return loading;
}

/** Zeigt ein Belohnungs-Video. Ergebnis: true = bis zum Ende angesehen (Belohnung geben). */
export async function showRewarded() {
  audioInit();
  if (!native()) return simulated();
  playMusic(false);
  try {
    await preload();
    if (!ready) throw new Error('not loaded');
    ready = false;
    const r = await admob.showRewardVideoAd();
    return !!r;
  } catch (e) {
    toast(t('Gerade ist kein Video verfügbar – versuch es gleich nochmal'));
    return false;
  } finally {
    if (M.music) playMusic(true);
    setTimeout(preload, 1500);
  }
}

// ---------------------------------------------------------------- Simulation im Browser
function simulated() {
  return new Promise(res => {
    const ov = document.createElement('div');
    ov.className = 'adsim';
    ov.innerHTML = `<div class="adbox"><small>${t('Werbung (Test)')}</small><b>DÖNER PALAST</b><span class="adt"></span><button type="button">${t('Schließen')}</button></div>`;
    document.body.append(ov);
    let s = 5;
    const lab = ov.querySelector('.adt'),
      btn = ov.querySelector('button');
    const tick = () => {
      lab.textContent = s > 0 ? t('Belohnung in {s} s', { s }) : t('Belohnung erhalten!');
      btn.textContent = s > 0 ? t('Abbrechen') : t('Weiter');
    };
    tick();
    const iv = setInterval(() => {
      s--;
      tick();
      if (s <= 0) clearInterval(iv);
    }, 1000);
    btn.onclick = () => {
      clearInterval(iv);
      ov.remove();
      res(s <= 0);
    };
  });
}

function toast(msg) {
  const d = document.createElement('div');
  d.className = 'adtoast';
  d.textContent = msg;
  document.body.append(d);
  setTimeout(() => d.remove(), 2600);
}

export function initAds() {
  // Video schon im Hintergrund vorladen, damit es beim Antippen sofort startet
  setTimeout(preload, 4000);
}
