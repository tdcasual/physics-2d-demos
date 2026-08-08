import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type BundleBudget = {
  maxHomeEntryJsKb: number;
  maxHomeEntryCssKb: number;
  maxEntryJsKb: number;
  maxEntryCssKb: number;
  maxVendorJsKb: number;
  maxSharedJsKb: number;
};

export type BundleAsset = {
  bytes: number;
  kb: number;
  relativePath: string;
  type: 'css' | 'js';
};

export type BundleEntryReport = {
  cssAssets: string[];
  cssKb: number;
  htmlPath: string;
  jsAssets: string[];
  jsKb: number;
  kind: 'home' | 'page';
};

export type BundleBudgetViolation = {
  message: string;
};

export type BundleBudgetReport = {
  assets: BundleAsset[];
  budget: BundleBudget;
  entries: BundleEntryReport[];
  ok: boolean;
  totals: {
    sharedJsKb: number;
    vendorJsKb: number;
  };
  violations: BundleBudgetViolation[];
};

export const defaultBundleBudget: BundleBudget = {
  maxHomeEntryJsKb: 290,
  maxHomeEntryCssKb: 75,
  maxEntryJsKb: 160,
  maxEntryCssKb: 70,
  maxVendorJsKb: 170,
  maxSharedJsKb: 125
};

/** 特定入口的预算覆盖（功能复杂的场景需要更大的 budget） */
const ENTRY_BUDGET_OVERRIDES: Record<
  string,
  { maxJsKb?: number; maxCssKb?: number }
> = {
  'src/pages/double-slit.html': { maxJsKb: 185 } // 白光/滤光片/crosshair/双仪器
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

function listHtmlEntries(root: string, dir = root): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const htmlPaths: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      htmlPaths.push(...listHtmlEntries(root, fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.html')) {
      htmlPaths.push(relative(root, fullPath));
    }
  }

  return htmlPaths.sort((a, b) => a.localeCompare(b));
}

function toAssetRelativePath(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }

  const withoutHash = trimmed.split('#')[0] ?? trimmed;
  const withoutQuery = withoutHash.split('?')[0] ?? withoutHash;
  const normalized = withoutQuery.replace(/^\.?\//, '');

  if (!normalized.endsWith('.js') && !normalized.endsWith('.css')) {
    return null;
  }

  return normalized;
}

function collectHtmlAssetRefs(html: string): { css: string[]; js: string[] } {
  const jsRefs = new Set<string>();
  const cssRefs = new Set<string>();

  const scriptRegex = /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi;
  const preloadRegex =
    /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"[^>]*>/gi;
  const stylesheetRegex =
    /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi;

  for (const regex of [scriptRegex, preloadRegex]) {
    let match = regex.exec(html);
    while (match) {
      const assetPath = toAssetRelativePath(match[1] ?? '');
      if (assetPath) {
        jsRefs.add(assetPath);
      }
      match = regex.exec(html);
    }
  }

  let stylesheetMatch = stylesheetRegex.exec(html);
  while (stylesheetMatch) {
    const assetPath = toAssetRelativePath(stylesheetMatch[1] ?? '');
    if (assetPath) {
      cssRefs.add(assetPath);
    }
    stylesheetMatch = stylesheetRegex.exec(html);
  }

  return {
    css: [...cssRefs].sort((a, b) => a.localeCompare(b)),
    js: [...jsRefs].sort((a, b) => a.localeCompare(b))
  };
}

function sumAssetSizes(
  paths: string[],
  assetMap: Map<string, BundleAsset>
): number {
  return paths.reduce(
    (total, path) => total + (assetMap.get(path)?.kb ?? 0),
    0
  );
}

function computeSharedJsKb(
  entries: BundleEntryReport[],
  assetMap: Map<string, BundleAsset>
): number {
  const referenceCounts = new Map<string, number>();

  for (const entry of entries) {
    for (const path of entry.jsAssets) {
      referenceCounts.set(path, (referenceCounts.get(path) ?? 0) + 1);
    }
  }

  let sharedJsKb = 0;
  for (const [path, count] of referenceCounts) {
    if (count > 1 && !path.includes('vendor-')) {
      sharedJsKb += assetMap.get(path)?.kb ?? 0;
    }
  }

  return sharedJsKb;
}

function computeVendorJsKb(
  assetMap: Map<string, BundleAsset>,
  entries: BundleEntryReport[]
): number {
  const referenced = new Set(entries.flatMap((entry) => entry.jsAssets));

  let vendorJsKb = 0;
  for (const [path, asset] of assetMap) {
    if (
      asset.type === 'js' &&
      referenced.has(path) &&
      path.includes('vendor-')
    ) {
      vendorJsKb += asset.kb;
    }
  }

  return vendorJsKb;
}

export function analyzeBundleBudget(
  distDir = 'dist',
  budget = defaultBundleBudget
): BundleBudgetReport {
  const root = resolve(distDir);
  const assets = listBundleAssets(root);
  const assetMap = new Map(assets.map((asset) => [asset.relativePath, asset]));
  const htmlEntries = listHtmlEntries(root);

  const entries: BundleEntryReport[] = htmlEntries
    .map((htmlPath): BundleEntryReport => {
      const html = readFileSync(join(root, htmlPath), 'utf8');
      const refs = collectHtmlAssetRefs(html);
      return {
        cssAssets: refs.css,
        cssKb: sumAssetSizes(refs.css, assetMap),
        htmlPath,
        jsAssets: refs.js,
        jsKb: sumAssetSizes(refs.js, assetMap),
        kind: htmlPath === 'index.html' ? 'home' : 'page'
      };
    })
    .filter((entry) => entry.jsKb > 0 || entry.cssKb > 0);

  const sharedJsKb = computeSharedJsKb(entries, assetMap);
  const vendorJsKb = computeVendorJsKb(assetMap, entries);
  const violations: BundleBudgetViolation[] = [];

  for (const entry of entries) {
    const override = ENTRY_BUDGET_OVERRIDES[entry.htmlPath];
    const jsLimit =
      override?.maxJsKb ??
      (entry.kind === 'home' ? budget.maxHomeEntryJsKb : budget.maxEntryJsKb);
    const cssLimit =
      override?.maxCssKb ??
      (entry.kind === 'home' ? budget.maxHomeEntryCssKb : budget.maxEntryCssKb);

    if (entry.jsKb > jsLimit) {
      violations.push({
        message: `Entry ${entry.htmlPath} initial JS is ${formatKb(
          entry.jsKb
        )}, above ${entry.kind === 'home' ? 'home entry' : 'entry'} budget ${formatKb(
          jsLimit
        )}.`
      });
    }

    if (entry.cssKb > cssLimit) {
      violations.push({
        message: `Entry ${entry.htmlPath} initial CSS is ${formatKb(
          entry.cssKb
        )}, above ${entry.kind === 'home' ? 'home entry' : 'entry'} CSS budget ${formatKb(
          cssLimit
        )}.`
      });
    }
  }

  if (sharedJsKb > budget.maxSharedJsKb) {
    violations.push({
      message: `Shared JS is ${formatKb(sharedJsKb)}, above budget ${formatKb(
        budget.maxSharedJsKb
      )}.`
    });
  }

  if (vendorJsKb > budget.maxVendorJsKb) {
    violations.push({
      message: `Vendor JS is ${formatKb(vendorJsKb)}, above budget ${formatKb(
        budget.maxVendorJsKb
      )}.`
    });
  }

  return {
    assets,
    budget,
    entries,
    ok: violations.length === 0,
    totals: { sharedJsKb, vendorJsKb },
    violations
  };
}

export function formatBundleBudgetReport(report: BundleBudgetReport): string {
  const header = report.ok ? 'Bundle budget passed' : 'Bundle budget failed';
  const lines = [
    header,
    `Home entry JS budget: ${formatKb(report.budget.maxHomeEntryJsKb)}`,
    `Home entry CSS budget: ${formatKb(report.budget.maxHomeEntryCssKb)}`,
    `Page entry JS budget: ${formatKb(report.budget.maxEntryJsKb)}`,
    `Page entry CSS budget: ${formatKb(report.budget.maxEntryCssKb)}`,
    `Shared JS: ${formatKb(report.totals.sharedJsKb)} / ${formatKb(
      report.budget.maxSharedJsKb
    )}`,
    `Vendor JS: ${formatKb(report.totals.vendorJsKb)} / ${formatKb(
      report.budget.maxVendorJsKb
    )}`
  ];

  for (const entry of report.entries) {
    const override = ENTRY_BUDGET_OVERRIDES[entry.htmlPath];
    const jsLimit =
      override?.maxJsKb ??
      (entry.kind === 'home'
        ? report.budget.maxHomeEntryJsKb
        : report.budget.maxEntryJsKb);
    const cssLimit =
      override?.maxCssKb ??
      (entry.kind === 'home'
        ? report.budget.maxHomeEntryCssKb
        : report.budget.maxEntryCssKb);
    lines.push(
      `Entry ${entry.htmlPath}: JS ${formatKb(entry.jsKb)} / ${formatKb(
        jsLimit
      )}, CSS ${formatKb(entry.cssKb)} / ${formatKb(cssLimit)}`
    );
  }

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
