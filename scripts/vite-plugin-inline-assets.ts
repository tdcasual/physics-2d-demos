/**
 * Vite plugin: inline all JS and CSS assets into HTML files
 *
 * Uses esbuild (via a child process) to properly bundle chunks into
 * a single IIFE, handling variable scoping and name collisions.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  rmSync,
  mkdirSync
} from 'node:fs';
import { join, extname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** 内联类型：避免依赖未显式安装的 rollup 包 */
type OutputChunk = {
  type: 'chunk';
  fileName: string;
  imports: string[];
  isEntry?: boolean;
  code: string;
  facadeModuleId?: string | null;
};

type OutputBundle = Record<string, OutputChunk | { type: 'asset' }>;

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Topological sort of chunks starting from an entry chunk.
 */
function topoSortChunks(
  entry: OutputChunk,
  bundle: OutputBundle
): OutputChunk[] {
  const visited = new Set<string>();
  const result: OutputChunk[] = [];

  function visit(fileName: string) {
    if (visited.has(fileName)) return;
    visited.add(fileName);
    const chunk = bundle[fileName];
    if (!chunk || chunk.type !== 'chunk') return;
    for (const imp of chunk.imports) {
      visit(imp);
    }
    result.push(chunk);
  }

  visit(entry.fileName);
  return result;
}

/**
 * Bundle chunks into a single IIFE using esbuild via child process.
 */
function bundleChunksToIife(chunks: OutputChunk[], tmpDir: string): string {
  const entryChunk = chunks[chunks.length - 1];

  // Build the input for the esbuild script
  const chunkData: Record<string, string> = {};
  for (const chunk of chunks) {
    chunkData[basename(chunk.fileName)] = chunk.code;
    chunkData[chunk.fileName] = chunk.code;
  }

  const inputFile = join(tmpDir, '_input.json');
  const outputFile = join(tmpDir, '_output.js');

  writeFileSync(
    inputFile,
    JSON.stringify({
      entry: basename(entryChunk.fileName),
      chunks: chunkData
    })
  );

  const scriptPath = join(__dirname, 'esbuild-bundle-chunks.js');

  execFileSync('node', [scriptPath, inputFile, outputFile], {
    maxBuffer: 10 * 1024 * 1024,
    cwd: tmpDir
  });

  return readFileSync(outputFile, 'utf-8');
}

/**
 * Strip leading slash to match bundle keys.
 */
function assetPathToKey(path: string): string {
  return path.replace(/^\//, '');
}

/**
 * Escape a string for use in a RegExp.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function inlineAssets(): Plugin {
  return {
    name: 'vite-plugin-inline-assets',
    apply: 'build',
    enforce: 'post',

    writeBundle(options, bundle) {
      const dir = options.dir ?? 'dist';
      const tmpDir = join(dir, '.tmp-esbuild');
      try {
        mkdirSync(tmpDir, { recursive: true });
      } catch {
        /* exists */
      }

      const htmlFiles = Object.keys(bundle).filter((f) => f.endsWith('.html'));

      for (const htmlFileName of htmlFiles) {
        const htmlPath = join(dir, htmlFileName);
        if (!existsSync(htmlPath)) continue;

        let html = readFileSync(htmlPath, 'utf-8');

        // --- CSS inlining ---
        const cssLinks = [
          ...html.matchAll(
            /<link\s+[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*\/?>/gi
          )
        ];

        for (const [fullMatch, href] of cssLinks) {
          const cssKey = assetPathToKey(href);
          const asset = bundle[cssKey];
          let cssContent: string | undefined;

          if (
            asset &&
            asset.type === 'asset' &&
            typeof asset.source === 'string'
          ) {
            cssContent = asset.source;
          } else {
            const cssPath = join(dir, cssKey);
            if (existsSync(cssPath)) {
              cssContent = readFileSync(cssPath, 'utf-8');
            }
          }

          if (cssContent) {
            html = html.replace(fullMatch, `<style>\n${cssContent}\n</style>`);
          }
        }

        // --- Remove modulepreload links ---
        html = html.replace(/<link\s+[^>]*rel="modulepreload"[^>]*\/?>/gi, '');

        // --- JS inlining ---
        const scriptMatch = html.match(
          /<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/i
        );

        if (scriptMatch) {
          const [fullScriptTag, scriptSrc] = scriptMatch;
          const entryKey = assetPathToKey(scriptSrc);
          const entryChunk = bundle[entryKey];

          if (entryChunk && entryChunk.type === 'chunk') {
            const orderedChunks = topoSortChunks(entryChunk, bundle);

            try {
              let bundledCode = bundleChunksToIife(orderedChunks, tmpDir);
              // Escape </script> inside the JS to prevent premature tag closing
              bundledCode = bundledCode.replace(/<\/script>/gi, '<\\/script>');
              // Use regex + function replacement to avoid JS treating $ in
              // bundledCode as special replacement patterns ($&, $', $`, $n)
              html = html.replace(
                new RegExp(escapeRegex(fullScriptTag)),
                () => `<script>\n${bundledCode}\n</script>`
              );
            } catch (err) {
              console.warn(
                `[inline-assets] Failed to bundle ${entryKey}:`,
                err instanceof Error ? err.message : err
              );
            }
          }
        }

        // --- Remove crossorigin attributes ---
        html = html.replace(/\s+crossorigin/g, '');

        // --- Write standalone HTML (flatten src/pages/ to root) ---
        const outputFileName = htmlFileName.replace(/^src\/pages\//, '');
        const outputPath = join(dir, outputFileName);
        writeFileSync(outputPath, html);
      }

      // --- Cleanup ---
      rmSync(tmpDir, { recursive: true, force: true });
      const topLevel = readdirSync(dir);
      for (const entry of topLevel) {
        if (extname(entry) === '.html') continue;
        rmSync(join(dir, entry), { recursive: true, force: true });
      }
    }
  };
}
