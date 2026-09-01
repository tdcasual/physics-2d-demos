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
  console.error(
    'Usage: node esbuild-bundle-chunks.js <input.json> <output.js>'
  );
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
          // 归一化各种 specifier 形态：'./x.js'、'/assets/x.js'、'assets/x.js'
          const stripped = args.path.replace(/^\.?\//, '');
          const candidates = [
            args.path,
            stripped,
            stripped.replace(/^assets\//, ''),
            // chunkData 同时以 fileName 与 basename 为键
            stripped.split('/').pop() ?? stripped
          ];
          for (const key of candidates) {
            if (chunkMap.has(key)) {
              return { path: key, namespace: 'virtual' };
            }
          }
          return {
            errors: [
              {
                text: `standalone inline: unresolved specifier "${args.path}" (not in chunk map)`
              }
            ]
          };
        });
        b.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
          return { contents: chunkMap.get(args.path) || '', loader: 'js' };
        });
      }
    }
  ]
});

writeFileSync(outputFile, result.outputFiles[0]?.text || '');
