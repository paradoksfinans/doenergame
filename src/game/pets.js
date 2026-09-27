// pets.js – aus der Einzeldatei extrahiert

import { ctx, rnd } from './config.js';
import { G } from './state.js';
import { P, ell } from './iso.js';
import { moveToward } from './world.js';
import { floatText } from './fx.js';
import { M } from './meta.js';

export const PETS = [
  { id: 'cat', name: 'Katze Minka', price: 6, desc: 'Gäste warten 10 % geduldiger' },
  { id: 'dog', name: 'Hund Karabaş', price: 8, desc: 'Sammelt Geld schon aus 2,5 Feldern Abstand' },
  { id: 'parrot', name: 'Papagei Paşa', price: 10, desc: '+5 % Umsatz – und ruft „Döner!“' },
];

export const pet = { x: 0, y: 0, phase: 0, moving: false, fx: 1, init: false, talk: 0 };

export function updatePet(dt) {
  if (!M.pet) return;
  const pl = G.player;
  if (!pet.init) {
    pet.x = pl.x - 0.6;
    pet.y = pl.y + 0.3;
    pet.init = true;
  }
  const tx = pl.x - pl.fx * 0.45 - 0.25,
    ty = pl.y + 0.45,
    d = Math.hypot(tx - pet.x, ty - pet.y);
  if (d > 3) {
    pet.x = tx;
    pet.y = ty;
  }
  if (d > 0.15) moveToward(pet, tx, ty, Math.max(2.5, d * 4), dt);
  else pet.moving = false;
  if (M.pet === 'parrot') {
    pet.talk -= dt;
    if (pet.talk <= 0) {
      pet.talk = 14 + Math.random() * 10;
      floatText(pet.x, pet.y, 62, rnd(['Döner!', 'Mit alles!', 'Ayran?', 'Lecker!']), '#7fd48f');
    }
  }
}

export function drawPet(t) {
  if (!M.pet) return;
  const p = P(pet.x, pet.y),
    b = pet.moving ? Math.abs(Math.sin(pet.phase)) * 2 : 0,
    f = pet.fx;
  if (M.pet === 'parrot') {
    const y = p.y - 44 - Math.sin(t * 4) * 3,
      w = Math.sin(t * 18) * 5;
    ell(p.x, p.y, 6, 3, 'rgba(20,10,20,.18)');
    ell(p.x, y, 6, 8, '#2f9a8a');
    ell(p.x + f * 3, y - 8, 4.5, 4.5, '#4fae62');
    ctx.fillStyle = '#f2b134';
    ctx.beginPath();
    ctx.moveTo(p.x + f * 7, y - 8);
    ctx.lineTo(p.x + f * 11, y - 6);
    ctx.lineTo(p.x + f * 7, y - 5);
    ctx.fill();
    ctx.fillStyle = '#d8342b';
    ctx.beginPath();
    ctx.moveTo(p.x - 3, y);
    ctx.lineTo(p.x - 12, y - 4 - w);
    ctx.lineTo(p.x - 4, y + 5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x + 3, y);
    ctx.lineTo(p.x + 12, y - 4 + w);
    ctx.lineTo(p.x + 4, y + 5);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(p.x + f * 4, y - 9, 1.6, 1.6);
    return;
  }
  const cat = M.pet === 'cat',
    body = cat ? '#e07a3a' : '#c9a77a',
    dark = cat ? '#b35a24' : '#8a6a44';
  ell(p.x, p.y, cat ? 9 : 11, 4.5, 'rgba(20,10,20,.2)');
  ctx.fillStyle = dark;
  const lg = pet.moving ? Math.sin(pet.phase * 1.4) * 2 : 0;
  ctx.fillRect(p.x - 6, p.y - 6 + lg, 2.5, 6);
  ctx.fillRect(p.x + 4, p.y - 6 - lg, 2.5, 6);
  ell(p.x, p.y - 9 - b, cat ? 9 : 11, cat ? 5 : 6.5, body);
  const hx = p.x + f * (cat ? 8 : 10),
    hy = p.y - 15 - b;
  ell(hx, hy, cat ? 5.5 : 6.5, cat ? 5 : 6, body);
  if (cat) {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(hx - 5, hy - 2);
    ctx.lineTo(hx - 3, hy - 9);
    ctx.lineTo(hx, hy - 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + 5, hy - 2);
    ctx.lineTo(hx + 3, hy - 9);
    ctx.lineTo(hx, hy - 4);
    ctx.fill();
    ctx.strokeStyle = body;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x - f * 8, p.y - 10 - b);
    ctx.quadraticCurveTo(p.x - f * 16, p.y - 14, p.x - f * 13, p.y - 22 + Math.sin(t * 3) * 2);
    ctx.stroke();
  } else {
    ell(hx - f * 3, hy + 1, 2.5, 5, dark);
    ell(hx + f * 5, hy + 2, 3, 2, '#231a24');
    ctx.strokeStyle = body;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - f * 10, p.y - 11 - b);
    ctx.lineTo(p.x - f * 15, p.y - 17 - b + Math.sin(t * 12) * 3);
    ctx.stroke();
  }
  ctx.fillStyle = '#111';
  ctx.fillRect(hx + f * 2, hy - 2, 1.8, 1.8);
}

export function initPets() {
  if (!M.pets) M.pets = [];
  if (M.pet === undefined) M.pet = null;
}
