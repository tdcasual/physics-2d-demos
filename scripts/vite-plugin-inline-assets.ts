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
  /** 动态导入的 chunk；standalone 单文件产物必须一并内联 */
  dynamicImports: string[];
  isEntry?: boolean;
  code: string;
  facadeModuleId?: string | null;
};

type OutputBundle = Record<string, OutputChunk | { type: 'asset' }>;

function resolvePluginDir(): string {
  try {
    if (
      typeof import.meta.url === 'string' &&
      import.meta.url.startsWith('file:')
    ) {
      return fileURLToPath(new URL('.', import.meta.url));
    }
  } catch {
    /* vitest/happy-dom 下 import.meta.url 可能不是可用的 file URL */
  }
  return join(process.cwd(), 'scripts');
}
const __dirname = resolvePluginDir();

/**
 * Topological sort of chunks starting from an entry chunk.
 *
 * Follows both static imports and dynamic imports: the standalone HTML is
 * a single file with no assets/ directory, so lazily-loaded chunks (layouts,
 * instruments) must be inlined too. esbuild converts their import() into a
 * Promise.resolve().then() shim (iife format, no code splitting), keeping
 * the async semantics intact.
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
    for (const imp of chunk.dynamicImports) {
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
 * Strip leading slash / relative prefixes to match bundle keys.
 * Handles '/assets/x', './assets/x', '../assets/x' → 'assets/x'.
 */
function assetPathToKey(path: string): string {
  return path.replace(/^(\.\.?\/)+/, '').replace(/^\//, '');
}

/**
 * Escape a string for use in a RegExp.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findModuleScripts(
  html: string
): Array<{ fullTag: string; src: string }> {
  // 每次新建正则，避免 /g lastIndex 在多次调用间残留
  const re = /<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/gi;
  return [...html.matchAll(re)].map((m) => ({
    fullTag: m[0],
    src: m[1] ?? ''
  }));
}

/**
 * standalone 单文件页的 chrome 处理：favicon 内联为 data URI，
 * manifest 无法自包含则删除 link（cleanup 也会删掉 manifest.json）。
 */
export function inlineStandaloneChrome(
  html: string,
  faviconSvg: string | null
): string {
  let out = html;
  if (faviconSvg !== null) {
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(faviconSvg).toString('base64')}`;
    out = out.replace(
      /<link\s+[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*>/gi,
      `<link rel="icon" href="${dataUri}" type="image/svg+xml" />`
    );
  }
  out = out.replace(
    /<link\s+[^>]*rel=["']manifest["'][^>]*>/gi,
    '<!-- standalone: manifest omitted (cannot self-contain) -->'
  );
  return out;
}

function readFaviconSvg(dir: string): string | null {
  const candidates = [
    join(dir, 'favicon.svg'),
    join(process.cwd(), 'public/favicon.svg')
  ];
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, 'utf-8');
  }
  return null;
}

export function inlineAssets(): Plugin {
  return {
    name: 'vite-plugin-inline-assets',
    apply: 'build',
    enforce: 'post',

    writeBundle(options, bundle) {
      const dir = options.dir ?? 'dist';
      const tmpDir = join(dir, '.tmp-esbuild');
      const failures: string[] = [];
      try {
        mkdirSync(tmpDir, { recursive: true });
      } catch {
        /* exists */
      }

      const htmlFiles = Object.keys(bundle).filter((f) => f.endsWith('.html'));
      const faviconSvg = readFaviconSvg(dir);

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

        // --- JS inlining：所有 type="module" src 脚本都必须内联，否则计失败 ---
        const moduleScripts = findModuleScripts(html);
        for (const { fullTag, src } of moduleScripts) {
          const entryKey = assetPathToKey(src);
          const entryChunk = bundle[entryKey];

          if (!entryChunk || entryChunk.type !== 'chunk') {
            failures.push(`${htmlFileName}: missing entry chunk "${entryKey}"`);
            continue;
          }

          const orderedChunks = topoSortChunks(entryChunk, bundle);

          try {
            let bundledCode = bundleChunksToIife(orderedChunks, tmpDir);
            // Escape </script> inside the JS to prevent premature tag closing
            bundledCode = bundledCode.replace(/<\/script>/gi, '<\\/script>');
            // 保留 type="module"：模块脚本默认 deferred，内联为 classic
            // script 会在 head 解析阶段先于 #app 执行，导致启动挂载失败。
            // Use regex + function replacement to avoid JS treating $ in
            // bundledCode as special replacement patterns ($&, $', $`, $n)
            html = html.replace(
              new RegExp(escapeRegex(fullTag)),
              () => `<script type="module">\n${bundledCode}\n</script>`
            );
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            failures.push(
              `${htmlFileName}: failed to bundle ${entryKey}: ${reason}`
            );
          }
        }

        // --- Remove crossorigin attributes ---
        html = html.replace(/\s+crossorigin/g, '');

        if (
          /<link\s+[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*>/i.test(html) &&
          faviconSvg === null
        ) {
          failures.push(`${htmlFileName}: favicon.svg not found for inlining`);
        }
        html = inlineStandaloneChrome(html, faviconSvg);

        // --- Write standalone HTML (flatten src/pages/ to root) ---
        const outputFileName = htmlFileName.replace(/^src\/pages\//, '');
        const outputPath = join(dir, outputFileName);
        writeFileSync(outputPath, html);
      }

      // --- Cleanup ---
      rmSync(tmpDir, { recursive: true, force: true });
      if (failures.length === 0) {
        const topLevel = readdirSync(dir);
        for (const entry of topLevel) {
          if (extname(entry) === '.html') continue;
          rmSync(join(dir, entry), { recursive: true, force: true });
        }
      } else {
        this.error(
          `[inline-assets] Failed to inline ${failures.length} asset(s):\n` +
            failures.map((f) => `  - ${f}`).join('\n')
        );
      }
    }
  };
}
