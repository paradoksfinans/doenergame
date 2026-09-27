// Packt art/out/*.png + meta.json in src/game/spritedata.js (als Data-URIs, damit der Build eine Datei bleibt).
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), 'out');
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const out = {};
let bytes = 0;
for (const [name, m] of Object.entries(meta)) {
  const buf = fs.readFileSync(path.join(dir, name + '.png'));
  bytes += buf.length;
  out[name] = { ...m, src: 'data:image/png;base64,' + buf.toString('base64') };
}
const target = path.join(dir, '..', '..', 'src', 'game', 'spritedata.js');
fs.writeFileSync(
  target,
  '// Automatisch erzeugt von art/pack.mjs aus den Blender-Renderings – nicht von Hand bearbeiten.\n' +
    'export const SPRITES = ' + JSON.stringify(out) + ';\n',
);
console.log(Object.keys(out).length, 'Sprites,', Math.round(bytes / 1024), 'KB PNG');
