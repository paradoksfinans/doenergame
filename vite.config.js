import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Baut das Spiel zu EINER HTML-Datei (für das Artifact und als Basis für die App-Hülle).
export default defineConfig({
  plugins: [viteSingleFile()],
  build: { target: 'es2020', assetsInlineLimit: 100000000 },
});
