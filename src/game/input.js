// input.js – aus der Einzeldatei extrahiert

import { cv } from './config.js';
import { audioInit } from './audio.js';

export let keys;

export let joy = null;

export const endJoy = e => {
  if (joy && e.pointerId === joy.id) joy = null;
};

export const KMAP = {
  ArrowUp: 'u',
  KeyW: 'u',
  ArrowDown: 'd',
  KeyS: 'd',
  ArrowLeft: 'l',
  KeyA: 'l',
  ArrowRight: 'r',
  KeyD: 'r',
};

export function initInput() {
  keys = new Set();
  cv.addEventListener('pointerdown', e => {
    audioInit();
    cv.setPointerCapture(e.pointerId);
    joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY };
  });
  cv.addEventListener('pointermove', e => {
    if (joy && e.pointerId === joy.id) {
      joy.cx = e.clientX;
      joy.cy = e.clientY;
    }
  });
  cv.addEventListener('pointerup', endJoy);
  cv.addEventListener('pointercancel', endJoy);
  addEventListener('keydown', e => {
    if (KMAP[e.code]) {
      audioInit();
      keys.add(KMAP[e.code]);
      e.preventDefault();
    }
  });
  addEventListener('keyup', e => {
    if (KMAP[e.code]) keys.delete(KMAP[e.code]);
  });
  addEventListener('blur', () => {
    keys.clear();
    joy = null;
  });
}
