/**
 * 容差冻结（v13 Wave J J4 / B20）
 *
 * 登记 visual-regression highDiff 分支与 toBeCloseTo(…, 0) 为收紧候选。
 * 冻条数只降不升；不收紧数值本身。
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());

const HIGH_DIFF_SCENE_CEILING = 2;
const HIGH_DIFF_MAX_PIXELS = 3000;
const HIGH_DIFF_THRESHOLD = 0.3;
const CLOSE_TO_ZERO_CEILING = 21;

const HIGH_DIFF_SCENES = ['double-slit', 'emf-analogy'] as const;

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

describe('tolerance freeze (B20)', () => {
  it('freezes visual-regression highDiff scenes and thresholds', () => {
    const source = readFileSync(
      resolve(ROOT, 'tests/visual/visual-regression.spec.ts'),
      'utf8'
    );
    const match = source.match(
      /const highDiff = scene\.id === '([^']+)' \|\| scene\.id === '([^']+)';/
    );
    expect(
      match,
      'highDiff scene pair must stay a two-id === check'
    ).not.toBeNull();
    const ids = [match![1], match![2]].sort();
    expect(ids).toEqual([...HIGH_DIFF_SCENES].sort());
    expect(ids.length).toBeLessThanOrEqual(HIGH_DIFF_SCENE_CEILING);

    expect(source).toMatch(
      new RegExp(`maxDiffPixels:\\s*highDiff \\? ${HIGH_DIFF_MAX_PIXELS} : `)
    );
    expect(source).toMatch(
      new RegExp(`threshold:\\s*highDiff \\? ${HIGH_DIFF_THRESHOLD} : `)
    );
  });

  it('freezes toBeCloseTo(…, 0) count as a tightening candidate list', () => {
    const files = [
      ...walk(join(ROOT, 'tests/unit')),
      ...walk(join(ROOT, 'tests/e2e')),
      ...walk(join(ROOT, 'tests/visual'))
    ];
    const hits: string[] = [];
    const re = /toBeCloseTo\([^\n)]*,\s*0\s*\)/g;
    for (const abs of files) {
      const text = readFileSync(abs, 'utf8');
      const rel = relative(ROOT, abs).replaceAll('\\', '/');
      const local = new RegExp(re.source, re.flags);
      let match: RegExpExecArray | null;
      while ((match = local.exec(text))) {
        const lineNo = text.slice(0, match.index).split('\n').length;
        const line = text.split('\n')[lineNo - 1] ?? '';
        if (
          line.trimStart().startsWith('//') ||
          line.trimStart().startsWith('*')
        ) {
          continue;
        }
        hits.push(`${rel}:${lineNo}`);
      }
    }
    expect(
      hits.length,
      `toBeCloseTo(…, 0) 冻 ${CLOSE_TO_ZERO_CEILING} 处；只许缩小。当前：${hits.join(', ')}`
    ).toBeLessThanOrEqual(CLOSE_TO_ZERO_CEILING);
    expect(hits.length).toBeGreaterThan(0);
  });
});
