// decor.js – aus der Einzeldatei extrahiert

import { beep, chord } from './audio.js';
import { $, showBanner } from './hud.js';
import { M, saveMeta } from './meta.js';
import { burst } from './confetti.js';
import { t } from './i18n.js';

export const FLOORS = [
  { id: 'city', name: 'Stadt-Fliesen', price: 0, desc: 'Passend zur jeweiligen Stadt' },
  { id: 'marmor', name: 'Marmor', price: 4, a: '#ecebe6', b: '#d9d7d0', desc: 'Edel und hell' },
  { id: 'holz', name: 'Holzdielen', price: 4, a: '#b98352', b: '#a8743f', desc: 'Warm wie im Bistro' },
  { id: 'schach', name: 'Schachbrett', price: 5, a: '#f3efe8', b: '#3a3438', desc: 'Klassischer Diner-Look' },
  {
    id: 'terrazzo',
    name: 'Terrazzo',
    price: 6,
    a: '#e6ddd0',
    b: '#ddd2c3',
    speck: true,
    desc: 'Mit bunten Steinchen',
  },
];

export const NEONS = [
  { id: 'city', name: 'Stadtfarbe', price: 0, desc: 'Streifen in der Farbe der Stadt' },
  {
    id: 'tuerkis',
    name: 'Türkis',
    price: 3,
    s1: '#2f9a8a',
    s2: '#237a6d',
    desc: 'Wandstreifen und Schild-Rahmen',
  },
  {
    id: 'lila',
    name: 'Lila',
    price: 3,
    s1: '#8a5bb0',
    s2: '#6d4790',
    desc: 'Wandstreifen und Schild-Rahmen',
  },
  {
    id: 'pink',
    name: 'Pink',
    price: 3,
    s1: '#c24d78',
    s2: '#9c3b5f',
    desc: 'Wandstreifen und Schild-Rahmen',
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 5,
    s1: '#e6b422',
    s2: '#b98b12',
    desc: 'Wandstreifen und Schild-Rahmen',
  },
];

export function decoFloor(CT) {
  const f = FLOORS.find(x => x.id === M.deco.floor);
  return f && f.a ? f : { a: CT.a, b: CT.b };
}

export function decoNeon(CT) {
  const n = NEONS.find(x => x.id === M.deco.neon);
  return n && n.s1 ? n : { s1: CT.s1, s2: CT.s2 };
}

export function renderDeco() {
  const box = $('decoList');
  box.innerHTML = '';
  const rows = [...FLOORS.map(x => ['floor', x]), ...NEONS.map(x => ['neon', x])];
  for (const [kind, it] of rows) {
    const key = kind + ':' + it.id,
      row = document.createElement('div');
    row.className = 'up';
    const n = document.createElement('div');
    n.className = 'n';
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background =
      kind === 'floor'
        ? it.a
          ? `linear-gradient(135deg,${it.a} 50%,${it.b} 50%)`
          : 'linear-gradient(135deg,#e8c9a0 50%,#dcb88b 50%)'
        : it.s1 || '#d8342b';
    n.append(
      sw,
      document.createTextNode(
        kind === 'floor' ? t('Boden: {n}', { n: t(it.name) }) : t('Neon: {n}', { n: t(it.name) }),
      ),
    );
    const d = document.createElement('div');
    d.className = 'd';
    d.textContent = t(it.desc);
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'deco-' + kind + '-' + it.id;
    const own = M.decoOwned.includes(key),
      active = M.deco[kind] === it.id;
    if (active) {
      b.textContent = t('Aktiv');
      b.disabled = true;
    } else if (own) {
      b.textContent = t('Benutzen');
      b.onclick = () => {
        M.deco[kind] = it.id;
        saveMeta();
        renderDeco();
        beep(880, 0.08);
      };
    } else {
      b.textContent = t('{p} Münzen', { p: it.price });
      b.disabled = M.gems < it.price;
      b.onclick = () => {
        if (M.gems < it.price) return;
        M.gems -= it.price;
        M.decoOwned.push(key);
        M.deco[kind] = it.id;
        saveMeta();
        $('gems').textContent = M.gems;
        chord();
        burst(40);
        renderDeco();
        showBanner(t('{n} eingebaut!', { n: t(it.name) }), t('Dein Laden sieht jetzt anders aus'));
      };
    }
    row.append(n, b, d);
    box.append(row);
  }
}

export function initDecor() {
  if (!M.deco) M.deco = { floor: 'city', neon: 'city' };
  if (!M.decoOwned) M.decoOwned = ['floor:city', 'neon:city'];
}
