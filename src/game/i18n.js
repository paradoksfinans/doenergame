// i18n.js – Sprachen Deutsch (Quelltext), Englisch, Türkisch.
// Texte stehen im Code auf Deutsch; t('…') schlägt die Übersetzung im Wörterbuch nach.
// Platzhalter: t('Willkommen in {c}!', { c: name })
import { DICT } from './i18n-dict.js';

export const LANGS = [
  { id: 'de', name: 'Deutsch', locale: 'de-DE' },
  { id: 'en', name: 'English', locale: 'en-US' },
  { id: 'tr', name: 'Türkçe', locale: 'tr-TR' },
];
export let LANG = 'de';
let LOCALE = 'de-DE';

export function setLang(id) {
  const l = LANGS.find(x => x.id === id) || LANGS[0];
  LANG = l.id;
  LOCALE = l.locale;
  document.documentElement.lang = l.id;
}
export function detectLang() {
  const n = (navigator.language || 'de').slice(0, 2).toLowerCase();
  return LANGS.some(l => l.id === n) ? n : 'en';
}

const missing = new Set();
export function t(s, v) {
  let r = s;
  if (LANG !== 'de') {
    const d = DICT[LANG];
    if (d && d[s] != null) r = d[s];
    else if (!missing.has(s)) {
      missing.add(s);
      if (typeof window !== 'undefined' && window.__i18nMissing) window.__i18nMissing.push(s);
    }
  }
  if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
  return r;
}
/** Zahl im Format der gewählten Sprache (1.234 / 1,234). */
export const fmt = (n, d = 0) =>
  Number(n).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });

/** Statische Texte in index.html: data-i18n (Text), data-i18n-aria (aria-label). */
export function translateDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    if (!el.dataset.de) el.dataset.de = el.textContent;
    el.textContent = t(el.dataset.de);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => {
    if (!el.dataset.deAria) el.dataset.deAria = el.getAttribute('aria-label');
    el.setAttribute('aria-label', t(el.dataset.deAria));
  });
}

/** Beim Start: gespeicherte Sprache (sonst Handysprache) setzen und statische Texte übersetzen. */
export function initI18n() {
  let id = null;
  try {
    id = JSON.parse(localStorage.getItem('doener-palast-meta') || '{}').lang || null;
  } catch (e) {}
  setLang(id || detectLang());
  translateDom();
  if (LANG === 'tr') turkishCaps();
}

// Die Schrift Bungee hat nur Großbuchstaben und kein „ı“. Auf Türkisch deshalb Canvas-Texte in dieser
// Schrift vorher nach türkischen Regeln groß schreiben (ı→I, i→İ). HTML-Texte regelt styles.css.
function turkishCaps() {
  const P = CanvasRenderingContext2D.prototype;
  for (const fn of ['fillText', 'strokeText', 'measureText']) {
    const orig = P[fn];
    P[fn] = function (text, ...rest) {
      if (typeof text === 'string' && this.font.includes('Bungee')) text = text.toLocaleUpperCase('tr-TR');
      return orig.call(this, text, ...rest);
    };
  }
}
export const nextLang = () => LANGS[(LANGS.findIndex(l => l.id === LANG) + 1) % LANGS.length];
export const langName = () => (LANGS.find(l => l.id === LANG) || LANGS[0]).name;
