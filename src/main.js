// Schriften lokal einbinden (funktioniert offline und in der App)
import '@fontsource/bungee/latin-400.css';
import '@fontsource/bungee/latin-ext-400.css';
import '@fontsource/figtree/latin-600.css';
import '@fontsource/figtree/latin-ext-600.css';
import '@fontsource/figtree/latin-800.css';
import '@fontsource/figtree/latin-ext-800.css';
import './styles.css';
import { initI18n } from './game/i18n.js';
import { initConfig } from './game/config.js';
import { initState } from './game/state.js';
import { initIso } from './game/iso.js';
import { initSprites } from './game/sprites.js';
import { initWorld } from './game/world.js';
import { initFx } from './game/fx.js';
import { initAudio } from './game/audio.js';
import { initInput } from './game/input.js';
import { initUpdate } from './game/update.js';
import { initGoals } from './game/goals.js';
import { initRender } from './game/render.js';
import { initHud } from './game/hud.js';
import { initSave } from './game/save.js';
import { initMeta } from './game/meta.js';
import { initDaynight } from './game/daynight.js';
import { initAchievements } from './game/achievements.js';
import { initConfetti } from './game/confetti.js';
import { initEvents } from './game/events.js';
import { initPets } from './game/pets.js';
import { initBranches } from './game/branches.js';
import { initCutting } from './game/cutting.js';
import { initMap } from './game/map.js';
import { initTutorial } from './game/tutorial.js';
import { initMission } from './game/mission.js';
import { initDecor } from './game/decor.js';
import { initFestival } from './game/festival.js';
import { initTempo } from './game/tempo.js';
import { initLevels } from './game/levels.js';
import { initGfx } from './game/gfx.js';
import { initLoop } from './game/loop.js';

// Reihenfolge entspricht dem Original – bitte nicht umsortieren.
initI18n();
initConfig();
initState();
initIso();
initSprites();
initWorld();
initFx();
initAudio();
initInput();
initUpdate();
initGoals();
initRender();
initHud();
initSave();
initMeta();
initDaynight();
initAchievements();
initConfetti();
initEvents();
initPets();
initBranches();
initCutting();
initMap();
initTutorial();
initMission();
initDecor();
initFestival();
initTempo();
initLevels();
initGfx();
initLoop();

// Test-Hilfe: nur mit ?debug in der Adresse aktiv
if (new URLSearchParams(location.search).has('debug')) {
  Promise.all([import('./game/state.js'), import('./game/world.js'), import('./game/meta.js')]).then(
    ([st, w, m]) => {
      window.__G = () => st.G;
      window.__unlock = id => w.unlock(id);
      window.__M = m.M;
    },
  );
}
