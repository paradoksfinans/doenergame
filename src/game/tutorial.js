// tutorial.js – aus der Einzeldatei extrahiert

import { G } from './state.js';
import { beep, chord } from './audio.js';
import { showBanner } from './hud.js';
import { M, addGems, saveMeta } from './meta.js';
import { burst } from './confetti.js';
import { t } from './i18n.js';

export const TUT = [
  { t: 'Zieh irgendwo über den Bildschirm, um zu laufen.', ok: () => G.hasMoved },
  {
    t: 'Lauf zum <b>Dönerspieß</b> und nimm Döner auf.',
    ok: () => G.player.items.includes('d') || G.tutFlags.drop,
  },
  { t: 'Bring die Döner zur <b>Theke</b> – aufs Feld „THEKE“.', ok: () => G.tutFlags.drop },
  { t: 'Stell dich an die <b>Kasse</b>, damit der Gast bezahlt.', ok: () => G.stats.sell > 0 },
  { t: 'Sammle das <b>Geld</b> neben der Kasse ein.', ok: () => G.money >= 1 || G.unlocked.size > 0 },
  { t: 'Stell dich aufs gelbe Feld <b>2. Dönerspieß</b> und bau aus.', ok: () => G.unlocked.has('spit2') },
];

export function tutActive() {
  return M.tut != null && M.tut < TUT.length;
}

export function tutTick() {
  if (!tutActive()) return null;
  if (TUT[M.tut].ok()) {
    M.tut++;
    saveMeta();
    beep(990, 0.1);
    if (M.tut >= TUT.length) {
      addGems(2);
      showBanner(t('Tutorial geschafft!'), t('+2 Goldmünzen – ab jetzt zeigt dir der Pfeil den Weg'));
      burst(90);
      chord();
      return null;
    }
  }
  return t('<b>Schritt {n}/{total}</b> · ', { n: M.tut + 1, total: TUT.length }) + t(TUT[M.tut].t);
}

export function initTutorial() {}
