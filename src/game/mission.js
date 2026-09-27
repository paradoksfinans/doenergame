// mission.js – aus der Einzeldatei extrahiert

import { $ } from './hud.js';
import { hadSave } from './save.js';
import { M, saveMeta } from './meta.js';
import { TUT } from './tutorial.js';

export let $mission;

export function missionView() {
  $mission.classList.toggle('mini', !!M.missionMini);
  $mission.setAttribute('aria-expanded', String(!M.missionMini));
}

export function initMission() {
  $mission = $('mission');
  $mission.onclick = () => {
    M.missionMini = !M.missionMini;
    saveMeta();
    missionView();
  };
  missionView();
  if (M.tut == null) {
    M.tut = hadSave ? TUT.length : 0;
    saveMeta();
  }
}
