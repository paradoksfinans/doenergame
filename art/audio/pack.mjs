// Packt art/audio/out/*.mp3 als Data-URIs nach src/game/sounddata.js (eine Datei, offline nutzbar).
import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), 'out');
const out = {};
let bytes = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).sort()) {
  const b = fs.readFileSync(path.join(dir, f));
  bytes += b.length;
  out[f.replace('.mp3', '')] = 'data:audio/mpeg;base64,' + b.toString('base64');
}
fs.writeFileSync(
  path.join(dir, '..', '..', '..', 'src', 'game', 'sounddata.js'),
  '// Automatisch erzeugt von art/audio/pack.mjs aus art/audio/make_audio.py – nicht von Hand bearbeiten.\nexport const SOUNDS = ' +
    JSON.stringify(out) +
    ';\n',
);
console.log(Object.keys(out).length, 'Sounds,', Math.round(bytes / 1024), 'KB');
