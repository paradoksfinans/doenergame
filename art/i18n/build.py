"""Wörterbuch pflegen: art/i18n/dict.json (Schlüssel = deutscher Text, Werte en/tr) -> src/game/i18n-dict.js
Prüft auch, ob Platzhalter {x} und HTML-Tags in allen Sprachen übereinstimmen.
Aufruf: python3 art/i18n/build.py"""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(here, 'dict.json'), encoding='utf8'))
bad = 0
for k, v in d.items():
    for L in ('en', 'tr'):
        if L not in v: print('FEHLT', L, k); bad += 1; continue
        if sorted(re.findall(r'\{\w+\}', k)) != sorted(re.findall(r'\{\w+\}', v[L])): print('PLATZHALTER', L, k); bad += 1
        if sorted(re.findall(r'</?\w+>', k)) != sorted(re.findall(r'</?\w+>', v[L])): print('TAGS', L, k); bad += 1
out = {L: {k: v[L] for k, v in sorted(d.items()) if L in v} for L in ('en', 'tr')}
js = ('// Automatisch erzeugt aus art/i18n/dict.json (python3 art/i18n/build.py) – dort bearbeiten.\n'
      'export const DICT = ' + json.dumps(out, ensure_ascii=False, indent=2) + ';\n')
open(os.path.join(here, '..', '..', 'src', 'game', 'i18n-dict.js'), 'w', encoding='utf8').write(js)
print(len(d), 'Einträge', '– Probleme:', bad)
