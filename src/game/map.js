// map.js – aus der Einzeldatei extrahiert

import { CITIES, cityOf } from './config.js';
import { G } from './state.js';
import { audioInit } from './audio.js';
import { $ } from './hud.js';
import { closeSheets, openSheet } from './meta.js';
import { collectBranches } from './branches.js';

export let $map;

export const MAPPOS = [
  [232, 58],
  [132, 38],
  [196, 150],
  [78, 110],
  [318, 176],
];

export function renderMap() {
  const svg = $('mapSvg'),
    NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  const n = Math.max(CITIES.length, G.city + 2),
    shown = Math.min(n, CITIES.length);
  const mk = (tag, attrs, txt) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    svg.append(e);
    return e;
  };
  for (let i = 0; i < shown - 1; i++) {
    const a = MAPPOS[i],
      b = MAPPOS[i + 1];
    mk('line', {
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      stroke: i < G.city ? '#4fae62' : '#6b5a6d',
      'stroke-width': 3,
      'stroke-dasharray': i < G.city ? '' : '6 6',
    });
  }
  for (let i = 0; i < shown; i++) {
    const [x, y] = MAPPOS[i],
      c = cityOf(i),
      done = i < G.city,
      cur = i === G.city,
      next = i === G.city + 1;
    mk('circle', {
      cx: x,
      cy: y,
      r: cur ? 15 : 11,
      fill: done ? '#4fae62' : cur ? '#f2b134' : '#2c212e',
      stroke: cur ? '#fff6e8' : next ? '#f2b134' : '#6b5a6d',
      'stroke-width': 3,
      class: cur ? 'pulse' : '',
    });
    mk(
      'text',
      {
        x,
        y: y + (y > 170 ? -22 : 28),
        'text-anchor': 'middle',
        fill: '#fff6e8',
        'font-size': 13,
        'font-family': 'Bungee, Impact, sans-serif',
      },
      c.name,
    );
    const sub = done
      ? '+' + Math.round(G.branches[i] ? G.branches[i].rate * 0.25 : 0).toLocaleString('de-DE') + ' €/Min'
      : cur
        ? 'Du bist hier'
        : next
          ? 'als Nächstes'
          : '';
    if (sub)
      mk(
        'text',
        {
          x,
          y: y + (y > 170 ? -9 : 41),
          'text-anchor': 'middle',
          fill: done ? '#7fd48f' : cur ? '#f2b134' : '#cdbfae',
          'font-size': 10.5,
          'font-weight': 800,
          'font-family': 'Figtree, system-ui, sans-serif',
        },
        sub,
      );
  }
  const tot = (G.branches || []).reduce((a, b) => a + b.rate * 0.25, 0);
  $('mapInfo').textContent =
    G.branches && G.branches.length
      ? `${G.branches.length} Filiale${G.branches.length > 1 ? 'n' : ''} verdienen zusammen ${Math.round(tot).toLocaleString('de-DE')} €/Min – auch wenn du nicht spielst (bis 2 Std).`
      : 'Noch keine Filialen. Bau den Laden mit dem Goldenen Spieß aus, dann kannst du in die nächste Stadt ziehen – und dieser Laden verdient weiter.';
  const b = $('mapCollect'),
    a = Math.floor(G.branchCash || 0);
  b.disabled = a < 1;
  b.textContent = a >= 1 ? a.toLocaleString('de-DE') + ' € abholen' : 'Nichts abzuholen';
}

export function initMap() {
  $map = $('mapSheet');
  $('mapCollect').onclick = () => {
    collectBranches();
    renderMap();
  };
  $('mapBtn').onclick = () => {
    audioInit();
    if (!$map.hidden) {
      closeSheets();
      return;
    }
    renderMap();
    openSheet($map);
  };
}
