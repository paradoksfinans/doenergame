// config.js – aus der Einzeldatei extrahiert

import { G } from './state.js';

export let cv, ctx;

export const TW = 64,
  TH = 32,
  W = 12,
  D = 16, // Gastraum ist tiefer (vorher 10) – Platz für Tische und die neuen Räume
  WALL = 128;

// Ganzes Gebäude: Nebenräume links (x < 0) und vorne (y > D)
export const BX0 = -9,
  BD = 24;

export const TRAY_MAX = 6;

export const SPIT_X = [1.2, 2.9, 4.6];

export const PICK_Y = 2.1;

export const BIN = { x: 1.0, y: 13.2 };

export const SP = { x: 10.6, y: 7.2 },
  SP_PICK = { x: 10.1, y: 7.7 },
  SP_MAX = 6,
  SPEC_MAX = 8;

export const SPECS = [
  { name: 'Currywurst', stand: 'Currywurst-Stand', awn: '#d8342b' },
  { name: 'Fischbrötchen', stand: 'Fischbrötchen-Stand', awn: '#2f5f93' },
  { name: 'Brezel', stand: 'Brezel-Stand', awn: '#3f7fbf' },
  { name: 'Reibekuchen', stand: 'Reibekuchen-Stand', awn: '#8a2f5a' },
  { name: 'Lahmacun', stand: 'Lahmacun-Ofen', awn: '#c0392f' },
];

export const specOf = () => SPECS[G.city % SPECS.length];

export const CRATE_SPOTS = [
  [8.4, 6.6],
  [9.0, 7.2],
  [4.9, 5.6],
  [2.6, 2.9],
  [9.6, 3.95],
  [5.9, 7.4],
  [5.8, 12.8],
  [9.0, 14.2],
];

export const PLANTS = [
  [0.5, 6.6],
  [3.2, 15.45],
  [11.55, 13.6],
  [11.55, 4.45],
  [8.3, 15.45],
];

export const FRY = { x: 7.05 },
  FRY_PICK = { x: 7.55, y: 2.1 },
  FRY_MAX = 6,
  FRIES_MAX = 8;

export const REG = { x: 6.9, y: 3.35 };
// Geschirr-Rückgabe links neben der Theke
export const SINK = { x: 1.8, y: 4.25 };

export const ROAD_CAR = 12.8,
  ROAD_MOPED = 13.8;

export const QSLOTS = [
  [6.9, 5.2],
  [6.9, 5.9],
  [6.9, 6.6],
  [6.9, 7.3],
  [6.9, 8.0],
  [6.9, 8.7],
];

// Eingang vorne rechts (links davon liegen jetzt VIP-Lounge und Hochzeitssaal)
export const ENTER = { x: 10.7, y: D + 1.3 },
  EXIT = { x: 10.1, y: D + 1.4 };

export const TABLES = [
  { x: 2.2, y: 6.8, lv: 1 },
  { x: 4.8, y: 7.4, lv: 2 },
  { x: 2.3, y: 10.8, lv: 3 },
  { x: 5.0, y: 11.4, lv: 3 },
];

export const ST = {
  counter: {
    zone: { x: 3.9, y: 3.4 },
    r: 0.85,
    cols: [
      [3.65, 4.25],
      [4.15, 4.25],
    ],
    z: 34,
    max: 16,
    label: 'Theke',
  },
  drive: {
    zone: { x: 10.8, y: 2.0 },
    r: 0.7,
    cols: [
      [11.65, 1.75],
      [11.65, 2.3],
    ],
    z: 34,
    max: 12,
    label: 'Drive-In',
  },
  deliv: {
    zone: { x: 10.9, y: 4.75 },
    r: 0.7,
    cols: [
      [10.65, 5.6],
      [11.15, 5.6],
    ],
    z: 30,
    max: 12,
    label: 'Lieferregal',
  },
};

export const PILES = {
  reg: { x: 8.0, y: 3.6 },
  drive: { x: 10.8, y: 3.25 },
  deliv: { x: 9.6, y: 5.3 },
  // Kassen der Nebenräume (siehe rooms.js)
  barber: { x: -1.3, y: 4.9 },
  gamer: { x: -1.4, y: 10.2 },
  shisha: { x: -1.4, y: 15.5 },
  vip: { x: 0.2, y: 17.0 },
  hall: { x: 4.0, y: 16.9 },
};

export const PADS = [
  { id: 'spit2', name: '2. Dönerspieß', desc: 'Mehr Nachschub', price: 15, x: 3.4, y: 2.1 },
  { id: 'tray', name: 'Tablett', desc: 'Trage 8 Döner', price: 30, x: 1.0, y: 2.5 },
  { id: 'tables1', name: 'Sitzplätze I', desc: 'Mehr Gäste', price: 45, x: 2.2, y: 6.8 },
  { id: 'cashier', name: 'Kassiererin', desc: 'Verkauft automatisch', price: 80, x: 9.0, y: 2.4 },
  { id: 'sauce', name: 'Knoblauchsoße', desc: 'Preis +2 €', price: 120, x: 1.0, y: 5.3 },
  { id: 'fryer', name: 'Fritteuse', desc: 'Neues Produkt: Pommes', price: 160, x: 7.55, y: 2.1 },
  { id: 'runner', name: 'Träger Ali', desc: 'Trägt automatisch', price: 200, x: 8.9, y: 0.9 },
  { id: 'tables2', name: 'Sitzplätze II', desc: 'Mehr Gäste', price: 250, x: 4.8, y: 7.4 },
  { id: 'spit3', name: '3. Dönerspieß', desc: 'Mehr Nachschub', price: 330, x: 5.1, y: 2.1 },
  { id: 'cleaner', name: 'Putzkraft Hatice', desc: 'Räumt Tische ab', price: 380, x: 2.4, y: 13.8 },
  { id: 'drivein', name: 'Drive-In', desc: 'Neue Station · +1 €/Döner', price: 450, x: 10.8, y: 2.0 },
  { id: 'special', name: 'Spezialität', desc: 'Neues Produkt dieser Stadt', price: 520, x: 10.1, y: 7.7 },
  { id: 'ayran', name: 'Ayran-Menü', desc: 'Preis +2 €', price: 600, x: 1.0, y: 5.3 },
  { id: 'deco', name: 'Deko & Pflanzen', desc: 'Bessere Bewertung', price: 680, x: 9.6, y: 12.2 },
  { id: 'driveStaff', name: 'Drive-In-Kraft', desc: 'Bedient Autos', price: 750, x: 10.1, y: 0.8 },
  { id: 'chili', name: 'Chili-Cheese', desc: 'Pommes +2 €', price: 850, x: 1.0, y: 5.3 },
  {
    id: 'driveRunner',
    name: 'Drive-In-Läufer',
    desc: 'Füllt nur das Drive-In auf',
    price: 520,
    x: 9.7,
    y: 2.0,
  },
  { id: 'tray2', name: 'Großes Tablett', desc: 'Trage 12 Döner', price: 850, x: 1.0, y: 2.5 },
  { id: 'tables3', name: 'Sitzplätze III', desc: 'Viel mehr Gäste', price: 1000, x: 3.6, y: 11.1 },
  { id: 'runner2', name: 'Träger Mehmet', desc: 'Trägt automatisch', price: 1200, x: 8.9, y: 0.9 },
  { id: 'combo', name: 'Menü-Deal', desc: 'Döner + Pommes: +3 € Bonus', price: 1450, x: 1.0, y: 5.3 },
  { id: 'delivery', name: 'Lieferdienst', desc: 'Neue Station · +2 €/Döner', price: 1500, x: 10.9, y: 4.75 },
  { id: 'delivRunner', name: 'Liefer-Läufer', desc: 'Füllt nur das Lieferregal', price: 900, x: 8.2, y: 5.6 },
  { id: 'spitSpeed', name: 'Turbo-Grill', desc: 'Spieße 50 % schneller', price: 1900, x: 6.4, y: 1.3 },
  { id: 'golden', name: 'Goldener Spieß', desc: 'Preis +3 €, noch schneller', price: 2800, x: 6.4, y: 1.3 },
  // Nebenräume (rooms.js) und ihre Ausbauten gegen die Nebenwirkungen
  { id: 'roomBarber', name: 'Barbershop', desc: 'Neuer Raum: Haarschnitt, danach Döner', price: 500, x: 0.8, y: 3.9 },
  { id: 'roomGamer', name: 'Zocker-Lounge', desc: 'Neuer Raum: Döner an die Couch', price: 700, x: 0.8, y: 9.5 },
  { id: 'barberGlass', name: 'Glaswand', desc: 'Keine Haare mehr im Essen', price: 400, x: -1.6, y: 2.6 },
  { id: 'roomShisha', name: 'Shisha-Whirlpool', desc: 'Neuer Raum: Whirlpool und Shisha', price: 1200, x: 0.8, y: 14.8 },
  { id: 'gamerSound', name: 'Schallschutz', desc: 'Torgebrüll bleibt in der Lounge', price: 600, x: -1.6, y: 6.4 },
  { id: 'shishaVent', name: 'Lüftung', desc: 'Rauch bleibt in der Lounge', price: 800, x: -1.6, y: 11.6 },
  { id: 'roomVip', name: 'Gold-VIP-Lounge', desc: 'Neuer Raum: Gold-Döner für VIPs', price: 1800, x: 1.8, y: 15.2 },
  { id: 'roomHall', name: 'Hochzeitssaal', desc: 'Neuer Raum: große Hochzeitsaufträge', price: 2200, x: 6.1, y: 15.2 },
  { id: 'city', name: 'Neue Filiale', desc: '', price: 4200, x: 8.0, y: 13.9 },
];

export const CITIES = [
  { name: 'Berlin', a: '#e8c9a0', b: '#dcb88b', s1: '#d8342b', s2: '#b82a22' },
  { name: 'Hamburg', a: '#dfe3d2', b: '#cdd3bd', s1: '#2f5f93', s2: '#244a73' },
  { name: 'München', a: '#e6cfa6', b: '#d3b687', s1: '#3f7fbf', s2: '#2f6399' },
  { name: 'Köln', a: '#ecd3c4', b: '#dcbcaa', s1: '#8a2f5a', s2: '#6e2447' },
  { name: 'Istanbul', a: '#bfe0dc', b: '#a6d0ca', s1: '#c0392f', s2: '#962a22' },
];

export const cityOf = i => {
  const c = CITIES[i % CITIES.length];
  return i < CITIES.length
    ? c
    : Object.assign({}, c, { name: c.name + ' ' + (Math.floor(i / CITIES.length) + 1) });
};

export const UPS = [
  { id: 'walk', name: 'Lauftempo', desc: 'Du läufst 10 % schneller', base: 60 },
  { id: 'staff', name: 'Personal-Training', desc: 'Mitarbeiter arbeiten 12 % schneller', base: 120 },
  { id: 'cap', name: 'Träger-Kisten', desc: 'Träger tragen 1 Döner mehr', base: 150 },
  { id: 'ads', name: 'Werbung', desc: '10 % mehr Gäste', base: 200 },
];

export const UP_MAX = 5;

export const MSG = {
  spit2: ['Zweiter Spieß dreht sich!', 'Doppelt so viel Nachschub'],
  tray: ['Tablett-Upgrade', 'Du trägst jetzt 8 Döner'],
  tables1: ['Sitzplätze eröffnet', 'Gäste kommen öfter und bestellen mehr'],
  cashier: ['Zeynep übernimmt die Kasse', 'Verkauf läuft jetzt ohne dich'],
  sauce: ['Knoblauchsoße!', 'Jeder Döner bringt 2 € mehr'],
  runner: ['Ali trägt Döner', 'Er versorgt die Theke mit allem, was fehlt'],
  tables2: ['Sitzplätze II', 'Noch mehr Gäste'],
  spit3: ['Dritter Spieß läuft', 'Mehr Nachschub für mehr Gäste'],
  drivein: ['Drive-In geöffnet!', 'Autos bestellen 3–5 Döner, +1 € pro Stück'],
  ayran: ['Ayran-Menü', 'Jeder Döner bringt nochmal 2 € mehr'],
  driveStaff: ['Elif am Drive-In', 'Autos werden automatisch bedient'],
  tray2: ['Großes Tablett', 'Du trägst jetzt 12 Döner'],
  tables3: ['Sitzplätze III', 'Der Laden ist voll – Gäste im Minutentakt'],
  runner2: ['Mehmet trägt mit', 'Zwei Träger versorgen jetzt die Theke'],
  driveRunner: ['Can am Drive-In', 'Er kümmert sich nur ums Drive-In – nichts wird mehr vergessen'],
  delivRunner: ['Emre fürs Lieferregal', 'Er füllt nur das Lieferregal – der Roller fährt durchgehend'],
  delivery: ['Lieferdienst startet!', 'Der Roller liefert 3 Döner pro Fahrt, +2 € pro Stück'],
  spitSpeed: ['Turbo-Grill', 'Alle Spieße 50 % schneller'],
  golden: ['Goldener Spieß!', 'Döner Palast komplett – Preis +3 €'],
  cleaner: ['Hatice räumt auf', 'Schmutzige Tische werden automatisch abgeräumt'],
  deco: ['Deko & Pflanzen', 'Gäste fühlen sich wohler – Bewertung steigt'],
  fryer: ['Fritteuse läuft!', 'Gäste bestellen jetzt auch Pommes'],
  chili: ['Chili-Cheese-Pommes', 'Jede Portion Pommes bringt 2 € mehr'],
  combo: ['Menü-Deal', 'Wer Döner und Pommes nimmt, zahlt 3 € Bonus'],
  roomBarber: ['Barbershop eröffnet!', 'Frisch frisiert holen sich viele gleich einen Döner'],
  barberGlass: ['Glaswand eingebaut', 'Keine Haare mehr im Döner'],
  roomGamer: ['Zocker-Lounge eröffnet!', 'Bring den Zockern Döner an die Couch – sie zahlen extra'],
  gamerSound: ['Schallschutz', 'Das Torgebrüll bleibt in der Lounge'],
  roomShisha: ['Shisha-Whirlpool eröffnet!', 'Leg am Ofen Kohle nach, sonst kippt die Stimmung'],
  shishaVent: ['Lüftung läuft', 'Der Rauch bleibt in der Lounge'],
  roomVip: ['Gold-VIP-Lounge eröffnet!', 'Veredle Döner mit Blattgold – VIPs zahlen das Achtfache'],
  roomHall: ['Hochzeitssaal eröffnet!', 'Bald kommt die erste Hochzeit – halte viele Döner bereit'],
};

export const SKINS = ['#f1c9a5', '#d9a47a', '#b97a52', '#8d5a3b', '#f5d6bc'];

export const HAIRS = ['#2b1d16', '#4a2e1c', '#1b1b1f', '#7a4a22', '#c8a36a', '#6b6b6b'];

export const SHIRTS = [
  '#3f7fbf',
  '#8a5bb0',
  '#2f9a8a',
  '#e07a3a',
  '#6f7f3a',
  '#c24d78',
  '#5a6fd0',
  '#9c6b4e',
];

export const CARCOLS = ['#3f7fbf', '#e0e0e0', '#2f9a8a', '#c24d78', '#f2b134', '#5a5a66', '#8a5bb0'];

export const rnd = a => a[Math.floor(Math.random() * a.length)];

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, v + amt));
  return '#' + ((1 << 24) + (c(n >> 16) << 16) + (c((n >> 8) & 255) << 8) + c(n & 255)).toString(16).slice(1);
}

export function initConfig() {
  cv = document.getElementById('game');
  ctx = cv.getContext('2d');
}
