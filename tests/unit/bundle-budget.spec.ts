import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  analyzeBundleBudget,
  defaultBundleBudget,
  formatBundleBudgetReport
} from '../../scripts/check-bundle-budget';

const tempDirs: string[] = [];

function writeDistFile(
  root: string,
  relativePath: string,
  contents: string
): void {
  const fullPath = join(root, relativePath);
  const dir = fullPath.slice(0, fullPath.lastIndexOf('/'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, contents);
}

function makeDist(options: {
  assets: Record<string, number>;
  htmlEntries: Record<string, string>;
}): string {
  const root = mkdtempSync(join(tmpdir(), 'bundle-budget-'));
  tempDirs.push(root);

  for (const [relativePath, bytes] of Object.entries(options.assets)) {
    writeDistFile(root, relativePath, 'x'.repeat(bytes));
  }

  for (const [relativePath, html] of Object.entries(options.htmlEntries)) {
    writeDistFile(root, relativePath, html);
  }

  return root;
}

function htmlWithAssets(options: {
  script?: string;
  preloads?: string[];
  stylesheets?: string[];
}): string {
  const preloads = (options.preloads ?? [])
    .map((href) => `  <link rel="modulepreload" crossorigin href="${href}">`)
    .join('\n');
  const stylesheets = (options.stylesheets ?? [])
    .map((href) => `  <link rel="stylesheet" crossorigin href="${href}">`)
    .join('\n');

  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    options.script
      ? `  <script type="module" crossorigin src="${options.script}"></script>`
      : '',
    preloads,
    stylesheets,
    '</head>',
    '<body><main id="app"></main></body>',
    '</html>'
  ]
    .filter(Boolean)
    .join('\n');
}

describe('bundle budget check', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('passes when each HTML entry fits its own initial payload budget even if total emitted JS is large', () => {
    const distDir = makeDist({
      assets: {
        'assets/vendor-a.js': 80 * 1024,
        'assets/shared-a.js': 40 * 1024,
        'assets/home-a.js': 20 * 1024,
        'assets/scene-a.js': 10 * 1024,
        'assets/scene-b.js': 12 * 1024,
        'assets/shared.css': 20 * 1024,
        'assets/home.css': 5 * 1024,
        'assets/lazy-unused-a.js': 180 * 1024,
        'assets/lazy-unused-b.js': 190 * 1024
      },
      htmlEntries: {
        'index.html': htmlWithAssets({
          script: '/assets/home-a.js',
          preloads: ['/assets/vendor-a.js', '/assets/shared-a.js'],
          stylesheets: ['/assets/shared.css', '/assets/home.css']
        }),
        'src/pages/scene-a.html': htmlWithAssets({
          script: '/assets/scene-a.js',
          preloads: ['/assets/shared-a.js'],
          stylesheets: ['/assets/shared.css']
        }),
        'src/pages/scene-b.html': htmlWithAssets({
          script: '/assets/scene-b.js',
          preloads: ['/assets/shared-a.js'],
          stylesheets: ['/assets/shared.css']
        })
      }
    });

    const report = analyzeBundleBudget(distDir, {
      maxHomeEntryJsKb: 160,
      maxHomeEntryCssKb: 30,
      maxEntryJsKb: 80,
      maxEntryCssKb: 30,
      maxVendorJsKb: 90,
      maxSharedJsKb: 50
    });

    expect(report.ok).toBe(true);
    expect(
      report.entries.map((entry) => ({
        path: entry.htmlPath,
        jsKb: entry.jsKb,
        cssKb: entry.cssKb,
        kind: entry.kind
      }))
    ).toEqual([
      { path: 'index.html', jsKb: 140, cssKb: 25, kind: 'home' },
      { path: 'src/pages/scene-a.html', jsKb: 50, cssKb: 20, kind: 'page' },
      { path: 'src/pages/scene-b.html', jsKb: 52, cssKb: 20, kind: 'page' }
    ]);
    expect(report.totals.vendorJsKb).toBe(80);
    expect(report.totals.sharedJsKb).toBe(40);
  });

  it('reports every violated entry and shared budget in a stable human-readable format', () => {
    const distDir = makeDist({
      assets: {
        'assets/vendor-a.js': 101 * 1024,
        'assets/shared-a.js': 91 * 1024,
        'assets/home-a.js': 20 * 1024,
        'assets/scene-a.js': 40 * 1024,
        'assets/home.css': 10 * 1024,
        'assets/scene-a.css': 31 * 1024
      },
      htmlEntries: {
        'index.html': htmlWithAssets({
          script: '/assets/home-a.js',
          preloads: ['/assets/vendor-a.js', '/assets/shared-a.js'],
          stylesheets: ['/assets/home.css']
        }),
        'src/pages/scene-a.html': htmlWithAssets({
          script: '/assets/scene-a.js',
          preloads: ['/assets/shared-a.js'],
          stylesheets: ['/assets/scene-a.css']
        })
      }
    });

    const report = analyzeBundleBudget(distDir, {
      maxHomeEntryJsKb: 200,
      maxHomeEntryCssKb: 9,
      maxEntryJsKb: 120,
      maxEntryCssKb: 30,
      maxVendorJsKb: 100,
      maxSharedJsKb: 90
    });

    expect(report.ok).toBe(false);
    expect(report.violations.map((violation) => violation.message)).toEqual([
      'Entry index.html initial JS is 212.00 kB, above home entry budget 200.00 kB.',
      'Entry index.html initial CSS is 10.00 kB, above home entry CSS budget 9.00 kB.',
      'Entry src/pages/scene-a.html initial JS is 131.00 kB, above entry budget 120.00 kB.',
      'Entry src/pages/scene-a.html initial CSS is 31.00 kB, above entry CSS budget 30.00 kB.',
      'Shared JS is 91.00 kB, above budget 90.00 kB.',
      'Vendor JS is 101.00 kB, above budget 100.00 kB.'
    ]);
    expect(formatBundleBudgetReport(report)).toContain('Bundle budget failed');
  });

  it('keeps default budgets aligned with the current multi-entry build envelope', () => {
    expect(defaultBundleBudget).toEqual({
      maxHomeEntryJsKb: 290,
      maxHomeEntryCssKb: 75,
      maxEntryJsKb: 160,
      maxEntryCssKb: 70,
      maxVendorJsKb: 170,
      maxSharedJsKb: 130
    });
  });
});
