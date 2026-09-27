# Döner Palast

Isometrisches Hybrid-Casual-Spiel: Döner, Pommes und Stadt-Spezialitäten tragen, verkaufen, den Laden ausbauen und Filialen in neuen Städten eröffnen. Stand: Version 15 – mit Stadt-Leveln und einem ersten Blender-Grafiktest.

## Loslegen

Voraussetzung: [Node.js](https://nodejs.org) 20 oder neuer.

```bash
npm install        # einmalig
npm run dev        # Entwicklungsserver mit Live-Neuladen (http://localhost:5173)
npm run build      # baut dist/index.html – eine einzige Datei mit allem drin
npm run preview    # gebaute Version lokal ansehen
npm run format     # Code einheitlich formatieren
```

`dist/index.html` ist komplett eigenständig (nur die Schriften kommen noch von Google Fonts) und läuft in jedem Browser. Genau diese Datei wird später in die Android-/iOS-App verpackt.

Test-Hilfe: Mit `?debug` hinter der Adresse (z. B. `http://localhost:5173/?debug`) stehen in der Browser-Konsole `__G()` (Spielstand), `__M` (Münzen, Outfits, Erfolge) und `__unlock('id')` (Ausbaustufe sofort freischalten) zur Verfügung.

## Aufbau

```
index.html            Oberfläche: Anzeigen, Menüleiste, Fenster (Shop, Glücksrad, Karte …)
src/main.js           Startpunkt: lädt alle Module und startet sie in fester Reihenfolge
src/styles.css        Gestaltung der Oberfläche
src/game/             das Spiel, ein Modul pro Bereich
```

| Modul | Inhalt |
|---|---|
| `config.js` | Spielfeld, Stationen, Ausbaustufen (`PADS`), Städte, Spezialitäten, Upgrades |
| `state.js` | Spielstand (`G`), Preise, Aufgaben, Statistik |
| `iso.js` | Isometrie-Umrechnung und Zeichen-Grundformen |
| `sprites.js` | Figuren, Döner, Pommes, Spieße, Fritteuse, Autos, Roller … |
| `world.js` | Hindernisse, Mitarbeiter, Ausbau freischalten, Städtewechsel, Verkäufe |
| `fx.js`, `audio.js` | fliegende Döner/Scheine, Texte; Soundeffekte |
| `input.js` | Joystick und Tastatur |
| `update.js` | Spiellogik pro Frame: Produktion, Tragen, Gäste, Drive-In, Lieferdienst |
| `goals.js` | Hinweistext und gelber Pfeil |
| `render.js` | Zeichnen der Welt |
| `hud.js`, `save.js` | Anzeigen und Upgrades-Menü; Speichern/Laden |
| `meta.js` | Goldmünzen, Outfits, Tagesbonus, Glücksrad, Boosts |
| `daynight.js`, `events.js` | Tag/Nacht; Kritiker, Hygiene-Kontrolle, Regen, Musik |
| `achievements.js`, `confetti.js` | Erfolge und Statistik; Konfetti |
| `pets.js`, `branches.js`, `cutting.js` | Begleiter; Filial-Einnahmen; Schneide-Minispiel |
| `map.js`, `tutorial.js`, `mission.js` | Städtekarte; Tutorial; Aufgaben-Anzeige |
| `decor.js`, `festival.js`, `tempo.js` | Laden-Deko; Herbstfest; Gemütlich-Modus |
| `levels.js` | Stadt-Level 1–10: welche Ausbauten ab welchem Level, Level-Ziele, Level-Fenster |
| `gfx.js`, `spritedata.js` | Blender-Grafiken zeichnen (mit Rückfall auf gezeichnete Grafik); Bilddaten, automatisch erzeugt |
| `loop.js` | Spielschleife |

Jedes Modul hat eine `init…()`-Funktion für das, was beim Start passieren muss. `main.js` ruft sie in der ursprünglichen Reihenfolge auf – nicht umsortieren. Variablen, die ein anderes Modul neu setzt (z. B. der Spielstand `G`), ändert man über `__set_G(...)`.

Die Aufteilung wurde automatisch aus der Einzeldatei erzeugt und im Browser gegen das Original getestet (Ausbau aller Stufen, Verkäufe, Drive-In, Lieferdienst, alle Menüs, Städtewechsel, Neuladen).

## Grafik mit Blender

Die Test-Grafiken (Dönerspieß, Theke, Tisch, Hocker, Spielerfigur mit Laufanimation) entstehen per Skript in Blender – ohne Blender-Oberfläche:

```bash
pip install bpy==5.0.1 pillow   # Blender als Python-Paket (Python 3.11)
python3 art/render.py           # rendert alles nach art/out/  (oder: python3 art/render.py counter spit)
node art/pack.mjs               # packt die Bilder nach src/game/spritedata.js
npm run build
```

Die Kamera in `render.py` entspricht exakt dem Isometrie-Winkel des Spiels (1 Feld = 32 × 16 px), gerendert wird in doppelter Auflösung. Im Spiel lässt sich unter Upgrades → „Grafik: Neu (Test) / Klassisch“ umschalten.

## Stadt-Level

Jede Stadt hat 10 Level (`src/game/levels.js`). Pro Level erscheinen bestimmte Ausbauten (`PAD_LEVEL`); das nächste Level gibt es, wenn alle Ausbauten des Levels gekauft sind und das Level-Ziel erreicht ist (`GOALS`). Die nächste Filiale öffnet erst ab Level 10. Antippen der Level-Anzeige oben rechts zeigt den Stand.

## Nächste Schritte (Fahrplan Phase 1)

- Module schrittweise auf TypeScript umstellen (`tsconfig.json` ist vorbereitet, `npm run typecheck`)
- Eigene Mechanik pro Stadt, frühere Städte wieder besuchen
- Bei gutem Ergebnis: weitere Objekte und alle Figuren mit Blender rendern
- Sprachen Deutsch, Englisch, Türkisch; Einstellungen
- Schriften lokal einbinden (für den Offline-Betrieb in der App)
