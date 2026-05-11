#!/usr/bin/env node
/**
 * Standalone esbuild bundler for inlining Vite chunks.
 *
 * Usage: node esbuild-bundle-chunks.js <input.json> <output.js>
 *
 * Input JSON format:
 * {
 *   "entry": "projectile.js",
 *   "chunks": {
 *     "projectile.js": "...code...",
 *     "canvas-sizing.js": "...code..."
 *   }
 * }
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const [inputFile, outputFile] = process.argv.slice(2);

if (!inputFile || !outputFile) {
  console.error('Usage: node esbuild-bundle-chunks.js <input.json> <output.js>');
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputFile, 'utf-8'));
const chunkMap = new Map(Object.entries(input.chunks));

const result = await build({
  stdin: {
    contents: `import "${input.entry}";`,
    resolveDir: process.cwd(),
    loader: 'js'
  },
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  plugins: [
    {
      name: 'virtual-chunks',
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) => {
          for (const key of [args.path, args.path.replace(/^\.\//, '')]) {
            if (chunkMap.has(key)) {
              return { path: key, namespace: 'virtual' };
            }
          }
          return { path: args.path, external: true };
        });
        b.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
          return { contents: chunkMap.get(args.path) || '', loader: 'js' };
        });
      }
    }
  ]
});

writeFileSync(outputFile, result.outputFiles[0]?.text || '');
