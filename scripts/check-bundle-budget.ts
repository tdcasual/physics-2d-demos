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

// 预算 = Phase 3 bundle 治理后实测值 + 余量。2026-09 起场景页 JS 上调至
// 190 kB（数据工作区测量判分场景 double-slit 入口 188.36 kB，180 kB 档放不下）。
// 治理后实测（2026-08）：首页 JS 162.05 / CSS 20.23；场景页 JS 最大 157.25
// （double-slit，仪器已改动态导入）/ CSS 最大 46.10（chase-meet）；
// vendor 138.53；shared 131.22（kB）。
export const defaultBundleBudget: BundleBudget = {
  maxHomeEntryJsKb: 190,
  maxHomeEntryCssKb: 25,
  // 棘轮 = 最大场景入口实测（2026-09-25：double-slit 187.65）+2（debt-ledger A12）
  maxEntryJsKb: 190,
  maxEntryCssKb: 55,
  // 棘轮 = 干净构建实测（2026-09-25：vendor 24.02 / shared 135.00，按本脚本
  // 口径）×1.2 向上取整；debt-ledger A6。上调须随实测同步。
  maxVendorJsKb: 29,
  // Layout/scene test capability metadata is intentionally shipped to each
  // page so the runtime and visual matrix share one source of truth.
  maxSharedJsKb: 162
};

/**
 * 特定入口的预算覆盖（功能复杂的场景需要更大的 budget）。
 * 当前为空：double-slit 仪器动态导入后已回归标准预算。
 */
const ENTRY_BUDGET_OVERRIDES: Record<
  string,
  { maxJsKb?: number; maxCssKb?: number }
> = {};

/** ExperimentsSection must not import per-scene scene-meta chunks. */
export function checkExperimentsSectionCatalogFanout(
  distRoot: string,
  assets: BundleAsset[]
): BundleBudgetViolation[] {
  const hits: { relativePath: string; text: string }[] = [];
  const sectionMarkers = ['选择实验开始探索', '按课程章节浏览'];
  for (const asset of assets) {
    if (asset.type !== 'js') continue;
    const text = readFileSync(join(distRoot, asset.relativePath), 'utf8');
    if (
      sectionMarkers.some((marker) => text.includes(marker)) &&
      text.includes('experiment-card')
    ) {
      hits.push({ relativePath: asset.relativePath, text });
    }
  }
  if (hits.length === 0) {
    return [
      {
        message:
          'ExperimentsSection chunk not found in dist (looked for directory section markers).'
      }
    ];
  }
  const violations: BundleBudgetViolation[] = [];
  for (const hit of hits) {
    const sceneMetaImports = hit.text.match(/scene-meta-[A-Za-z0-9_-]+/g) ?? [];
    // main keeps the eager import.meta.glob catalog in the aggregate registry;
    // its source paths are expected in this chunk. Only per-scene chunk names
    // indicate catalog fanout under the main build's accounting.
    if (sceneMetaImports.length > 0) {
      violations.push({
        message: `ExperimentsSection (${hit.relativePath}) depends on ${sceneMetaImports.length} scene-meta chunks; expected 0.`
      });
    }
  }
  return violations;
}

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
  const perSceneMetaAssets = assets.filter(
    (asset) =>
      asset.type === 'js' &&
      /^assets\/scene-meta-.*\.js$/.test(asset.relativePath)
  );

  if (perSceneMetaAssets.length > 0) {
    violations.push({
      message: `Found ${perSceneMetaAssets.length} per-scene metadata chunks in dist/assets; expected 0.`
    });
  }

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

  violations.push(...checkExperimentsSectionCatalogFanout(root, assets));

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
