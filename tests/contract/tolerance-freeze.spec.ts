/**
 * 容差冻结（v13 Wave J J4 / B20；v15 Phase A 收紧 2b；Phase F 关闭 2a）
 *
 * highDiff 分支已删除（B20-2a）：visual-regression 全员 800 / 0.2，
 * extraWait 仅 chase-meet。本文件棘轮禁止 highDiff 回潮。
 * toBeCloseTo(…, 0) 保留桶（2b）扫描用括号平衡口径（含多行调用），
 * 跳过 `.not.toBeCloseTo`（收紧它会放宽）。冻条数只降不升。
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());

/** v15 Phase A：括号平衡口径 23 → 保留桶 2（maxwell mostProbable、force-composition baseEnd.x）。 */
const CLOSE_TO_ZERO_CEILING = 2;

const STANDARD_MAX_DIFF_PIXELS = 800;

const CLOSE_TO_CALL = 'toBeCloseTo(';

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? text.length : end);
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*');
}

function skipStringAndComment(
  text: string,
  i: number
): { i: number; skipped: boolean } {
  const c = text[i];
  if (c === "'" || c === '"' || c === '`') {
    const quote = c;
    i += 1;
    while (i < text.length) {
      if (text[i] === '\\') {
        i += 2;
        continue;
      }
      if (text[i] === quote) return { i: i + 1, skipped: true };
      i += 1;
    }
    return { i, skipped: true };
  }
  if (c === '/' && text[i + 1] === '/') {
    const nl = text.indexOf('\n', i);
    return { i: nl === -1 ? text.length : nl, skipped: true };
  }
  if (c === '/' && text[i + 1] === '*') {
    const end = text.indexOf('*/', i + 2);
    return { i: end === -1 ? text.length : end + 2, skipped: true };
  }
  return { i, skipped: false };
}

/** 括号平衡扫描 toBeCloseTo 调用；precision 字面量 0 且非 `.not.` 才计入。 */
function collectCloseToZeroHits(
  text: string
): Array<{ index: number; lineNo: number }> {
  const hits: Array<{ index: number; lineNo: number }> = [];
  let i = 0;
  while (i < text.length) {
    const skip = skipStringAndComment(text, i);
    if (skip.skipped) {
      i = skip.i;
      continue;
    }
    if (text.startsWith(CLOSE_TO_CALL, i)) {
      const line = lineAt(text, i);
      if (!isCommentLine(line) && !/\.not\s*\.\s*$/.test(text.slice(0, i))) {
        const start = i + CLOSE_TO_CALL.length;
        let depth = 1;
        let j = start;
        while (j < text.length && depth > 0) {
          const inner = skipStringAndComment(text, j);
          if (inner.skipped) {
            j = inner.i;
            continue;
          }
          if (text[j] === '(') depth += 1;
          else if (text[j] === ')') depth -= 1;
          j += 1;
        }
        const inner = text.slice(start, j - 1);
        const precision = lastTopLevelPrecision(inner);
        if (precision === '0') {
          hits.push({
            index: i,
            lineNo: text.slice(0, i).split('\n').length
          });
        }
        i = j;
        continue;
      }
    }
    i += 1;
  }
  return hits;
}

function lastTopLevelPrecision(inner: string): string | null {
  let lastComma = -1;
  let depth = 0;
  let k = 0;
  while (k < inner.length) {
    const skip = skipStringAndComment(inner, k);
    if (skip.skipped) {
      k = skip.i;
      continue;
    }
    const c = inner[k];
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (c === ',' && depth === 0) lastComma = k;
    k += 1;
  }
  if (lastComma === -1) return null;
  const raw = inner.slice(lastComma + 1).trim();
  const precision = raw.replace(/,+$/, '').trim();
  return precision.length === 0 ? null : precision;
}

describe('tolerance freeze (B20)', () => {
  it('visual-regression has no highDiff branch (B20-2a closed)', () => {
    const source = readFileSync(
      resolve(ROOT, 'tests/visual/visual-regression.spec.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/\bhighDiff\b/);
    expect(source).toMatch(
      new RegExp(`maxDiffPixels:\\s*${STANDARD_MAX_DIFF_PIXELS}\\b`)
    );
    expect(source).toMatch(/threshold:\s*0\.2\b/);
    expect(source).toMatch(/const extraWait = scene\.id === 'chase-meet';/);
    expect(source).not.toMatch(/maxDiffPixels:\s*3000/);
    expect(source).not.toMatch(/threshold:\s*0\.3/);
  });

  it('counts multiline toBeCloseTo(…, 0) and skips .not (paren-balance)', () => {
    const sample = `
expect(a).toBeCloseTo(
  foo,
  0
);
expect(b).not.toBeCloseTo(c, 0);
expect(d).toBeCloseTo(1, 0);
expect(e).toBeCloseTo(1, 1);
`;
    const hits = collectCloseToZeroHits(sample);
    expect(hits.map((h) => h.lineNo)).toEqual([2, 7]);
  });

  it('freezes toBeCloseTo(…, 0) count as a tightening candidate list', () => {
    const files = [
      ...walk(join(ROOT, 'tests/unit')),
      ...walk(join(ROOT, 'tests/e2e')),
      ...walk(join(ROOT, 'tests/visual'))
    ];
    const hits: string[] = [];
    for (const abs of files) {
      const text = readFileSync(abs, 'utf8');
      const rel = relative(ROOT, abs).replaceAll('\\', '/');
      for (const hit of collectCloseToZeroHits(text)) {
        hits.push(`${rel}:${hit.lineNo}`);
      }
    }
    expect(
      hits.length,
      `toBeCloseTo(…, 0) 冻 ${CLOSE_TO_ZERO_CEILING} 处；只许缩小。当前：${hits.join(', ')}`
    ).toBeLessThanOrEqual(CLOSE_TO_ZERO_CEILING);
    expect(hits.length).toBeGreaterThan(0);
  });
});
