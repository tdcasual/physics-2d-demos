/**
 * Standalone build config — exports each scene as a self-contained HTML file.
 *
 * Usage: vite build --config vite.config.standalone.ts
 * Output: dist/standalone/<scene-id>.html
 */

import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { inlineAssets } from './scripts/vite-plugin-inline-assets';

function discoverPageEntries(pagesDir: string): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const file of readdirSync(pagesDir)) {
    if (file.endsWith('.html')) {
      const name = file.replace(/\.html$/, '');
      entries[name] = resolve(pagesDir, file);
    }
  }
  return entries;
}

export default defineConfig({
  plugins: [tailwindcss(), react(), inlineAssets()],
  build: {
    outDir: 'dist/standalone',
    emptyOutDir: true,
    // No manual chunks — everything gets inlined anyway
    // Let Vite optimize freely for smaller total size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: discoverPageEntries(resolve(__dirname, 'src/pages')),
      output: {
        // Flatten output so scene HTML files land at the root of dist/standalone/
        // (the inline plugin also handles this, but flat asset paths help)
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
});
