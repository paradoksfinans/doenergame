// map.js – Städtekarte: Filialen ansehen, Einnahmen abholen, zu einer Filiale reisen

import { cityOf } from './config.js';
import { G } from './state.js';
import { audioInit } from './audio.js';
import { $ } from './hud.js';
import { closeSheets, openSheet } from './meta.js';
import { collectBranches } from './branches.js';
import { travelTo } from './world.js';
import { mechOf } from './citymech.js';
import { t, fmt } from './i18n.js';

export let $map;
let sel = null;

export const MAPPOS = [
  [262, 62],
  [140, 40],
  [196, 112],
  [78, 172],
  [322, 176],
];

export function renderMap() {
  const svg = $('mapSvg'),
    NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  const top = G.top ?? G.city;
  // Die Karte zeigt 5 Städte: die erreichten plus die nächste
  const start = Math.max(0, top + 2 - MAPPOS.length),
    end = start + MAPPOS.length;
  const mk = (tag, attrs, txt) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    svg.append(e);
    return e;
  };
  const pos = i => MAPPOS[i - start];
  for (let i = start; i < end - 1; i++) {
    const a = pos(i),
      b = pos(i + 1);
    mk('line', {
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      stroke: i < top ? '#4fae62' : '#6b5a6d',
      'stroke-width': 3,
      'stroke-dasharray': i < top ? '' : '6 6',
    });
  }
  const branchOf = i => (G.branches || []).find(b => b.i === i);
  for (let i = start; i < end; i++) {
    const [x, y] = pos(i),
      c = cityOf(i),
      br = branchOf(i),
      cur = i === G.city,
      next = i === top + 1,
      picked = i === sel;
    const g = document.createElementNS(NS, 'g');
    svg.append(g);
    const circ = document.createElementNS(NS, 'circle');
    const attrs = {
      cx: x,
      cy: y,
      r: cur || picked ? 15 : 11,
      fill: br ? '#4fae62' : cur ? '#f2b134' : '#2c212e',
      stroke: cur || picked ? '#fff6e8' : next ? '#f2b134' : '#6b5a6d',
      'stroke-width': 3,
      class: cur ? 'pulse' : '',
    };
    for (const k in attrs) circ.setAttribute(k, attrs[k]);
    g.append(circ);
    const hit = document.createElementNS(NS, 'circle');
    hit.setAttribute('cx', x);
    hit.setAttribute('cy', y);
    hit.setAttribute('r', 24);
    hit.setAttribute('fill', 'transparent');
    g.append(hit);
    if (br) {
      g.setAttribute('class', 'city');
      g.setAttribute('role', 'button');
      g.setAttribute('tabindex', '0');
      g.setAttribute('aria-label', t('{c} auswählen', { c: c.name }));
      const pick = () => {
        sel = i;
        renderMap();
      };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      });
    }
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
    const sub = br
      ? '+' + fmt(Math.round(br.rate * 0.25)) + ' €/Min'
      : cur
        ? t('Du bist hier')
        : next
          ? t('als Nächstes')
          : '';
    if (sub)
      mk(
        'text',
        {
          x,
          y: y + (y > 170 ? -9 : 41),
          'text-anchor': 'middle',
          fill: br ? '#7fd48f' : cur ? '#f2b134' : '#cdbfae',
          'font-size': 10.5,
          'font-weight': 800,
          'font-family': 'Figtree, system-ui, sans-serif',
        },
        sub,
      );
  }
  const n = (G.branches || []).length,
    tot = (G.branches || []).reduce((a, b) => a + b.rate * 0.25, 0);
  let info = n
    ? t(n > 1 ? '{n} Filialen verdienen zusammen {a} €/Min – auch wenn du nicht spielst (bis 2 Std).' : '{n} Filiale verdient {a} €/Min – auch wenn du nicht spielst (bis 2 Std).', {
        n,
        a: fmt(Math.round(tot)),
      })
    : t(
        'Noch keine Filialen. Bau den Laden mit dem Goldenen Spieß aus, dann kannst du in die nächste Stadt ziehen – und dieser Laden verdient weiter.',
      );
  if (n) info += ' ' + t('Tippe auf eine grüne Stadt, um dorthin zu reisen.');
  $('mapInfo').textContent = info;
  const tb = $('mapTravel'),
    sb = sel != null ? branchOf(sel) : null;
  tb.hidden = !sb;
  if (sb) tb.textContent = t('Nach {c} reisen · {m}', { c: cityOf(sel).name, m: mechOf(sel).name() });
  const b = $('mapCollect'),
    a = Math.floor(G.branchCash || 0);
  b.disabled = a < 1;
  b.textContent = a >= 1 ? t('{a} € abholen', { a: fmt(a) }) : t('Nichts abzuholen');
}

export function initMap() {
  $map = $('mapSheet');
  $('mapCollect').onclick = () => {
    collectBranches();
    renderMap();
  };
  $('mapTravel').onclick = () => {
    if (sel == null) return;
    const to = sel;
    sel = null;
    closeSheets();
    travelTo(to);
  };
  $('mapBtn').onclick = () => {
    audioInit();
    if (!$map.hidden) {
      closeSheets();
      return;
    }
    sel = null;
    renderMap();
    openSheet($map);
  };
}
