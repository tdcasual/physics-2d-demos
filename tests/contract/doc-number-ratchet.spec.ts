/**
 * 文档数字棘轮（v13 Wave J J1）
 *
 * 扫描 AGENTS.md / docs/quality-gates.md / docs/debt-ledger.md 中
 * 「当前有效预算/覆盖率」上下文的数字，必须与 vite.config.ts
 * `test.coverage.thresholds`、`scripts/check-bundle-budget.ts`
 * `defaultBundleBudget` 常量一致。
 *
 * 显式豁免：历史 A→B / from→to、wc -l 计数、git SHA、清单条数、
 * 「以 X 为唯一权威」指针句。不扫 scripts/。
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { defaultBundleBudget } from '../../scripts/check-bundle-budget';

const ROOT = resolve(process.cwd());

const DOC_PATHS = [
  'AGENTS.md',
  'docs/quality-gates.md',
  'docs/debt-ledger.md'
] as const;

type CoverageThresholds = {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
};

function parseCoverageThresholds(): CoverageThresholds {
  const sourceText = readFileSync(resolve(ROOT, 'vite.config.ts'), 'utf8');
  const sourceFile = ts.createSourceFile(
    'vite.config.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  let found: CoverageThresholds | null = null;

  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isPropertyAssignment(node)) {
      const name = ts.isIdentifier(node.name) ? node.name.text : '';
      if (
        name === 'thresholds' &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        const obj = node.initializer;
        const read = (key: string): number | undefined => {
          for (const prop of obj.properties) {
            if (!ts.isPropertyAssignment(prop)) continue;
            const k = ts.isIdentifier(prop.name) ? prop.name.text : '';
            if (k !== key) continue;
            if (ts.isNumericLiteral(prop.initializer)) {
              return Number(prop.initializer.text);
            }
          }
          return undefined;
        };
        const lines = read('lines');
        const functions = read('functions');
        const branches = read('branches');
        const statements = read('statements');
        if (
          lines != null &&
          functions != null &&
          branches != null &&
          statements != null
        ) {
          found = { lines, functions, branches, statements };
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!found) {
    throw new Error('vite.config.ts test.coverage.thresholds 解析失败');
  }
  return found;
}

function stripFences(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '');
}

function isExemptLine(line: string): boolean {
  if (/以.{0,80}为唯一(权威|来源)/.test(line)) return true;
  if (/本文不固化数值/.test(line)) return true;
  if (/\d[\d.]*\s*→\s*\d/.test(line)) return true;
  if (/from\s*→\s*to|A\s*→\s*B/i.test(line)) return true;
  if (/wc\s+-l/.test(line)) return true;
  if (/\b[0-9a-f]{7,40}\b/.test(line) && !/\d+\.\d+/.test(line)) return true;
  if (/实测/.test(line)) return true;
  if (/历史/.test(line) && /覆盖率|预算|kB/.test(line)) return true;
  if (/已清/.test(line)) return true;
  return false;
}

function isListCountContext(line: string): boolean {
  return /(冻|共|计)?\s*\d+\s*(项|条|场景|键|id|张|个|份|文件|模块|处)/i.test(
    line
  );
}

function extractClaimedNumbers(line: string): number[] {
  const out: number[] = [];
  const re = /\d+(?:\.\d+)?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    const raw = match[0];
    const start = match.index;
    const before = line.slice(Math.max(0, start - 1), start);
    const after = line.slice(start + raw.length, start + raw.length + 1);
    if (/[a-f]/i.test(before) || /[a-f]/i.test(after)) continue;
    if (raw.includes('-')) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    out.push(n);
  }
  return out;
}

function isBudgetOrCoverageLine(line: string): boolean {
  return /覆盖率|thresholds|预算|kB|vendor|shared|maxEntry|maxHome|maxVendor|maxShared/.test(
    line
  );
}

describe('document number ratchet (J1)', () => {
  const coverage = parseCoverageThresholds();

  const allowed = new Set<number>([
    coverage.lines,
    coverage.functions,
    coverage.branches,
    coverage.statements,
    defaultBundleBudget.maxHomeEntryJsKb,
    defaultBundleBudget.maxHomeEntryCssKb,
    defaultBundleBudget.maxEntryJsKb,
    defaultBundleBudget.maxEntryCssKb,
    defaultBundleBudget.maxVendorJsKb,
    defaultBundleBudget.maxSharedJsKb
  ]);

  it('parses source-of-truth coverage and bundle budget constants', () => {
    expect(coverage.lines).toBeGreaterThan(0);
    expect(coverage.functions).toBeGreaterThan(0);
    expect(coverage.branches).toBeGreaterThan(0);
    expect(coverage.statements).toBeGreaterThan(0);
    expect(defaultBundleBudget.maxEntryJsKb).toBe(190);
    expect(defaultBundleBudget.maxVendorJsKb).toBe(29);
    expect(defaultBundleBudget.maxSharedJsKb).toBe(162);
  });

  it('AGENTS.md and quality-gates.md keep unique-authority pointers', () => {
    const agents = readFileSync(resolve(ROOT, 'AGENTS.md'), 'utf8');
    const gates = readFileSync(resolve(ROOT, 'docs/quality-gates.md'), 'utf8');
    expect(agents).toMatch(/scripts\/check-bundle-budget\.ts.{0,40}唯一权威/s);
    expect(agents).toMatch(/vite\.config\.ts.{0,80}唯一来源/s);
    expect(gates).toMatch(/vite\.config\.ts.{0,80}唯一来源/s);
    expect(gates).toMatch(/check-bundle-budget\.ts.{0,80}唯一权威/s);
  });

  it.each(DOC_PATHS)(
    '%s current budget/coverage numbers match source of truth',
    (rel) => {
      const text = stripFences(readFileSync(resolve(ROOT, rel), 'utf8'));
      const drift: string[] = [];
      for (const [i, rawLine] of text.split('\n').entries()) {
        const line = rawLine.trim();
        if (!line || line.startsWith('<!--')) continue;
        if (!isBudgetOrCoverageLine(line)) continue;
        if (isExemptLine(line)) continue;
        if (isListCountContext(line)) continue;
        for (const n of extractClaimedNumbers(line)) {
          if (n < 10) continue;
          if (n > 1000) continue;
          if (n >= 2020 && n <= 2030) continue;
          if (allowed.has(n)) continue;
          const asList = new RegExp(
            `${n}\\s*(项|条|场景|键|id|张|个|份|文件|模块|处|波)`
          );
          if (asList.test(line)) continue;
          drift.push(
            `${rel}:${i + 1} 数字 ${n} 不在当前预算/覆盖率常量中：${line}`
          );
        }
      }
      expect(drift, drift.join('\n')).toEqual([]);
    }
  );
});
