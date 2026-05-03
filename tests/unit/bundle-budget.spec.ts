import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  analyzeBundleBudget,
  defaultBundleBudget,
  formatBundleBudgetReport
} from '../../scripts/check-bundle-budget';

const tempDirs: string[] = [];

function makeDist(files: Record<string, number>): string {
  const root = mkdtempSync(join(tmpdir(), 'bundle-budget-'));
  const assetsDir = join(root, 'assets');
  mkdirSync(assetsDir, { recursive: true });
  tempDirs.push(root);

  for (const [file, bytes] of Object.entries(files)) {
    writeFileSync(join(assetsDir, file), 'x'.repeat(bytes));
  }

  return root;
}

describe('bundle budget check', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('passes when all generated JS and CSS assets fit the configured budget', () => {
    const distDir = makeDist({
      'vendor-a.js': 120 * 1024,
      'layouts-a.js': 45 * 1024,
      'main-a.css': 20 * 1024
    });

    const report = analyzeBundleBudget(distDir, {
      maxSingleJsKb: 150,
      maxSingleCssKb: 30,
      maxTotalJsKb: 180,
      maxTotalCssKb: 30,
      maxVendorJsKb: 130
    });

    expect(report.ok).toBe(true);
    expect(report.assets.map((asset) => asset.relativePath)).toEqual([
      'assets/layouts-a.js',
      'assets/main-a.css',
      'assets/vendor-a.js'
    ]);
    expect(report.totals.jsKb).toBe(165);
    expect(report.totals.cssKb).toBe(20);
  });

  it('reports every violated budget in a stable human-readable format', () => {
    const distDir = makeDist({
      'vendor-a.js': 181 * 1024,
      'scene-a.js': 71 * 1024,
      'main-a.css': 41 * 1024
    });

    const report = analyzeBundleBudget(distDir, {
      maxSingleJsKb: 70,
      maxSingleCssKb: 40,
      maxTotalJsKb: 240,
      maxTotalCssKb: 40,
      maxVendorJsKb: 170
    });

    expect(report.ok).toBe(false);
    expect(report.violations.map((violation) => violation.message)).toEqual([
      'Total JS is 252.00 kB, above budget 240.00 kB.',
      'Total CSS is 41.00 kB, above budget 40.00 kB.',
      'assets/main-a.css is 41.00 kB, above single CSS budget 40.00 kB.',
      'assets/scene-a.js is 71.00 kB, above single JS budget 70.00 kB.',
      'assets/vendor-a.js is 181.00 kB, above single JS budget 70.00 kB.',
      'Vendor JS is 181.00 kB, above budget 170.00 kB.'
    ]);
    expect(formatBundleBudgetReport(report)).toContain('Bundle budget failed');
  });

  it('keeps default budgets aligned with the current production build envelope', () => {
    expect(defaultBundleBudget).toEqual({
      maxSingleCssKb: 60,
      maxSingleJsKb: 180,
      maxTotalCssKb: 80,
      maxTotalJsKb: 500,
      maxVendorJsKb: 170
    });
  });
});
