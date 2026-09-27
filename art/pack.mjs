// Packt art/out/*.png + meta.json in src/game/spritedata.js (als Data-URIs, damit der Build eine Datei bleibt).
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), 'out');
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const out = {};
let bytes = 0;
for (const [name, m] of Object.entries(meta)) {
  const uri = f => {
    const buf = fs.readFileSync(path.join(dir, f));
    bytes += buf.length;
    return 'data:image/png;base64,' + buf.toString('base64');
  };
  if (m.layers) {
    // einfärbbares Sprite: eine PNG pro Ebene (fixed = feste Farben, Rest = Graustufen zum Einfärben)
    const L = {};
    for (const l of m.layers) L[l] = uri(`${name}__${l}.png`);
    out[name] = { ...m, layers: L };
  } else out[name] = { ...m, src: uri(name + '.png') };
}
const target = path.join(dir, '..', '..', 'src', 'game', 'spritedata.js');
fs.writeFileSync(
  target,
  '// Automatisch erzeugt von art/pack.mjs aus den Blender-Renderings – nicht von Hand bearbeiten.\n' +
    'export const SPRITES = ' + JSON.stringify(out) + ';\n',
);
console.log(Object.keys(out).length, 'Sprites,', Math.round(bytes / 1024), 'KB PNG');
