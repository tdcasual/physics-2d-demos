import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type BundleBudget = {
  maxSingleCssKb: number;
  maxSingleJsKb: number;
  maxTotalCssKb: number;
  maxTotalJsKb: number;
  maxVendorJsKb: number;
};

export type BundleAsset = {
  bytes: number;
  kb: number;
  relativePath: string;
  type: 'css' | 'js';
};

export type BundleBudgetViolation = {
  message: string;
};

export type BundleBudgetReport = {
  assets: BundleAsset[];
  budget: BundleBudget;
  ok: boolean;
  totals: {
    cssKb: number;
    jsKb: number;
    vendorJsKb: number;
  };
  violations: BundleBudgetViolation[];
};

export const defaultBundleBudget: BundleBudget = {
  maxSingleCssKb: 60,
  maxSingleJsKb: 180,
  maxTotalCssKb: 80,
  maxTotalJsKb: 500,
  maxVendorJsKb: 170
};

function toKb(bytes: number): number {
  return bytes / 1024;
}

function formatKb(kb: number): string {
  return `${kb.toFixed(2)} kB`;
}

function listBundleAssets(root: string, dir = root): BundleAsset[] {
  if (!existsSync(dir)) {
    return [];
  }

  const assets: BundleAsset[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      assets.push(...listBundleAssets(root, fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = extname(entry.name);
    if (extension !== '.js' && extension !== '.css') {
      continue;
    }

    const bytes = statSync(fullPath).size;
    assets.push({
      bytes,
      kb: toKb(bytes),
      relativePath: relative(root, fullPath),
      type: extension === '.js' ? 'js' : 'css'
    });
  }

  return assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export function analyzeBundleBudget(
  distDir = 'dist',
  budget = defaultBundleBudget
): BundleBudgetReport {
  const root = resolve(distDir);
  const assets = listBundleAssets(root);
  const jsKb = assets
    .filter((asset) => asset.type === 'js')
    .reduce((total, asset) => total + asset.kb, 0);
  const cssKb = assets
    .filter((asset) => asset.type === 'css')
    .reduce((total, asset) => total + asset.kb, 0);
  const vendorJsKb = assets
    .filter(
      (asset) => asset.type === 'js' && asset.relativePath.includes('vendor-')
    )
    .reduce((total, asset) => total + asset.kb, 0);

  const violations: BundleBudgetViolation[] = [];

  if (jsKb > budget.maxTotalJsKb) {
    violations.push({
      message: `Total JS is ${formatKb(jsKb)}, above budget ${formatKb(
        budget.maxTotalJsKb
      )}.`
    });
  }

  if (cssKb > budget.maxTotalCssKb) {
    violations.push({
      message: `Total CSS is ${formatKb(cssKb)}, above budget ${formatKb(
        budget.maxTotalCssKb
      )}.`
    });
  }

  for (const asset of assets) {
    if (asset.type === 'css' && asset.kb > budget.maxSingleCssKb) {
      violations.push({
        message: `${asset.relativePath} is ${formatKb(
          asset.kb
        )}, above single CSS budget ${formatKb(budget.maxSingleCssKb)}.`
      });
    }

    if (asset.type === 'js' && asset.kb > budget.maxSingleJsKb) {
      violations.push({
        message: `${asset.relativePath} is ${formatKb(
          asset.kb
        )}, above single JS budget ${formatKb(budget.maxSingleJsKb)}.`
      });
    }
  }

  if (vendorJsKb > budget.maxVendorJsKb) {
    violations.push({
      message: `Vendor JS is ${formatKb(
        vendorJsKb
      )}, above budget ${formatKb(budget.maxVendorJsKb)}.`
    });
  }

  return {
    assets,
    budget,
    ok: violations.length === 0,
    totals: { cssKb, jsKb, vendorJsKb },
    violations
  };
}

export function formatBundleBudgetReport(report: BundleBudgetReport): string {
  const header = report.ok ? 'Bundle budget passed' : 'Bundle budget failed';
  const lines = [
    header,
    `Total JS: ${formatKb(report.totals.jsKb)} / ${formatKb(
      report.budget.maxTotalJsKb
    )}`,
    `Total CSS: ${formatKb(report.totals.cssKb)} / ${formatKb(
      report.budget.maxTotalCssKb
    )}`,
    `Vendor JS: ${formatKb(report.totals.vendorJsKb)} / ${formatKb(
      report.budget.maxVendorJsKb
    )}`
  ];

  if (report.violations.length > 0) {
    lines.push('Violations:');
    lines.push(
      ...report.violations.map((violation) => `- ${violation.message}`)
    );
  }

  return lines.join('\n');
}

function isCliEntrypoint(): boolean {
  const argvPath = process.argv[1];
  return (
    argvPath !== undefined &&
    resolve(argvPath) === fileURLToPath(import.meta.url)
  );
}

if (isCliEntrypoint()) {
  const report = analyzeBundleBudget(process.argv[2] ?? 'dist');
  console.log(formatBundleBudgetReport(report));
  process.exit(report.ok ? 0 : 1);
}
