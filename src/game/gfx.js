// gfx.js – vorgerenderte Blender-Grafiken. Fällt automatisch auf die gezeichnete Grafik zurück,
// solange Bilder fehlen oder im Upgrades-Menü „Grafik: Klassisch“ gewählt ist.
//
// Figuren und Autos sind „einfärbbar“: sie liegen als mehrere Ebenen vor (fixed + Graustufen-Ebenen
// skin/shirt/hair/pants/cap). Zur Laufzeit wird jede Ebene mit der gewünschten Farbe multipliziert
// und das Ergebnis pro Farbkombination zwischengespeichert.
import { SPRITES } from './spritedata.js';
import { ctx } from './config.js';
import { P, chip } from './iso.js';
import { M, saveMeta } from './meta.js';
import { drawItem, drawHats } from './sprites.js';
import { $ } from './hud.js';
import { t } from './i18n.js';

const imgs = {};
let ready = 0,
  total = 0;

export const gfxOn = () => M.gfx !== 'classic' && total > 0 && ready === total;

// ---------------------------------------------------------------- Einfärben mit Cache
const cache = new Map();
let tmp = null;
function tinted(name, cols) {
  const s = SPRITES[name];
  const key = name + '|' + s.layerNames.map(l => cols[l] || '').join('|');
  let cv = cache.get(key);
  if (cv) return cv;
  if (cache.size > 900) cache.clear();
  cv = document.createElement('canvas');
  cv.width = s.w;
  cv.height = s.h;
  const g = cv.getContext('2d');
  if (!tmp) tmp = document.createElement('canvas');
  for (const l of s.layerNames) {
    const im = imgs[name + '|' + l];
    const col = cols[l];
    if (l === 'fixed' || !col) {
      g.drawImage(im, 0, 0);
      continue;
    }
    tmp.width = s.w;
    tmp.height = s.h;
    const t = tmp.getContext('2d');
    t.drawImage(im, 0, 0);
    t.globalCompositeOperation = 'multiply';
    t.fillStyle = col;
    t.fillRect(0, 0, s.w, s.h);
    t.globalCompositeOperation = 'destination-in';
    t.drawImage(im, 0, 0);
    t.globalCompositeOperation = 'source-over';
    g.drawImage(tmp, 0, 0);
  }
  cache.set(key, cv);
  return cv;
}

/** Zeichnet ein Sprite so, dass sein Ankerpunkt auf der Spielkoordinate (wx, wy, wz) liegt. */
export function sprite(name, wx, wy, wz = 0, flip = false, cols = null) {
  const s = SPRITES[name];
  if (!s) return false;
  const im = s.layerNames ? tinted(name, cols || {}) : imgs[name];
  if (!im) return false;
  const p = P(wx, wy, wz),
    w = s.w / 2,
    h = s.h / 2;
  if (flip) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(-1, 1);
    ctx.drawImage(im, -s.ax / 2, -s.ay / 2, w, h);
    ctx.restore();
  } else ctx.drawImage(im, p.x - s.ax / 2, p.y - s.ay / 2, w, h);
  return true;
}

// ---------------------------------------------------------------- Figuren
const TAU = Math.PI * 2;
function variant(c) {
  if (c.staff) {
    if (c.cap && SPRITES.pl_idle) return 'pl';
    return c.long ? 'stl' : 'sts';
  }
  return c.long ? 'cul' : 'cus';
}

/** Blender-Figur für Spieler, Personal und Gäste. Gibt false zurück, wenn kein Sprite passt. */
export function drawPersonSprite(c) {
  if (!gfxOn()) return false;
  const v = variant(c);
  const carry = c.carry > 0;
  let frame;
  if (c.sitting) frame = 'sit';
  else {
    const f = c.moving ? Math.floor(((((c.phase % TAU) + TAU) % TAU) / TAU) * 8) % 8 : -1;
    frame = (carry ? 'c' : '') + (f < 0 ? 'idle' : 'walk' + f);
  }
  const name = v + '_' + frame;
  if (!SPRITES[name]) return false;
  const cols = {
    skin: c.skin || '#e0ac80',
    shirt: c.shirt || '#3f7fbf',
    hair: c.hair || '#2b1d16',
    pants: c.pants || '#3b3440',
    cap: c.capCol || '#d8342b',
  };
  sprite(name, c.x, c.y, c.z || 0, c.fx < 0, cols);
  const p = P(c.x, c.y, c.z || 0),
    b = c.moving ? Math.abs(Math.sin(c.phase)) * 1.5 : 0;
  if (!(c.cap && v === 'pl')) drawHats(c, p, b - 1, c.sitting ? 3 : 0);
  if (carry) {
    for (let i = 0; i < c.carry; i++) drawItem(c.items[i], p.x + c.fx * 13, p.y - 21 - b - i * 5);
    if (c.max && c.carry >= c.max)
      chip(
        p.x + c.fx * 13,
        p.y - 37 - b - c.carry * 5,
        t('MAX'),
        '#d8342b',
        '#fff6e8',
        '10px Bungee, Impact, sans-serif',
      );
  }
  return true;
}

/** Auto am Drive-In, in Wagenfarbe eingefärbt. */
export function drawCarSprite(c, roadX) {
  return gfxOn() && sprite('car', roadX, c.y, 0, false, { shirt: c.col });
}

function label() {
  const b = $('gfxBtn');
  if (b) b.textContent = M.gfx === 'classic' ? t('Grafik: Klassisch') : t('Grafik: Neu');
}
function load(key, src) {
  total++;
  const im = new Image();
  im.onload = () => ready++;
  im.src = src;
  imgs[key] = im;
}
export function initGfx() {
  if (!M.gfx) M.gfx = 'new';
  for (const k in SPRITES) {
    const s = SPRITES[k];
    if (s.layers) {
      s.layerNames = Object.keys(s.layers);
      for (const l of s.layerNames) load(k + '|' + l, s.layers[l]);
    } else load(k, s.src);
  }
  const b = $('gfxBtn');
  if (b)
    b.onclick = () => {
      M.gfx = M.gfx === 'classic' ? 'new' : 'classic';
      saveMeta();
      label();
    };
  label();
}
