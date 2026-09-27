// gfx.js – vorgerenderte Blender-Grafiken (Test). Fällt automatisch auf die gezeichnete Grafik zurück,
// solange Bilder fehlen oder im Upgrades-Menü „Grafik: Klassisch“ gewählt ist.
import { SPRITES } from './spritedata.js';
import { ctx } from './config.js';
import { P, chip } from './iso.js';
import { M, saveMeta } from './meta.js';
import { drawItem } from './sprites.js';
import { $ } from './hud.js';

const imgs = {};
let ready = 0,
  total = 0;

export const gfxOn = () => M.gfx !== 'classic' && total > 0 && ready === total;

/** Zeichnet ein Sprite so, dass sein Ankerpunkt auf der Spielkoordinate (wx, wy, wz) liegt. */
export function sprite(name, wx, wy, wz = 0, flip = false) {
  const s = SPRITES[name],
    im = imgs[name];
  if (!s || !im) return false;
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

/** Spielerfigur als Sprite (nur Standard-Outfit), inkl. getragenem Stapel. */
export function drawPlayerSprite(c) {
  const TAU = Math.PI * 2;
  const f = c.moving ? Math.floor(((((c.phase % TAU) + TAU) % TAU) / TAU) * 8) % 8 : -1;
  const carry = c.carry > 0;
  const name = 'pl_' + (carry ? 'c' : '') + (f < 0 ? 'idle' : 'walk' + f);
  sprite(name, c.x, c.y, 0, c.fx < 0);
  if (carry) {
    const p = P(c.x, c.y),
      b = c.moving ? Math.abs(Math.sin(c.phase)) * 1.5 : 0;
    for (let i = 0; i < c.carry; i++) drawItem(c.items[i], p.x + c.fx * 13, p.y - 21 - b - i * 5);
    if (c.max && c.carry >= c.max)
      chip(
        p.x + c.fx * 13,
        p.y - 37 - b - c.carry * 5,
        'MAX',
        '#d8342b',
        '#fff6e8',
        '10px Bungee, Impact, sans-serif',
      );
  }
}

export const playerUsesSprite = pl => gfxOn() && !!SPRITES.pl_idle && (M.outfit || 'klassik') === 'klassik';

function label() {
  const b = $('gfxBtn');
  if (b) b.textContent = 'Grafik: ' + (M.gfx === 'classic' ? 'Klassisch' : 'Neu (Test)');
}
export function initGfx() {
  if (!M.gfx) M.gfx = 'new';
  for (const k in SPRITES) {
    total++;
    const im = new Image();
    im.onload = () => ready++;
    im.src = SPRITES[k].src;
    imgs[k] = im;
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
