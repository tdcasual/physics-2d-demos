import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

const PRIVATE_CLASS =
  /\.(?:lab-stage-main|teaching-right-panel|srgb-graph-section|srgb-stage-frame|teaching-stage-frame|lab-stage-anim)\b/;

/** Layout implementations may use their own private classes internally. */
const LAYOUT_OWN_CLASS_FILES = new Set([
  'src/app/layouts/layouts/split-right-graph-bottom/split-right-graph-bottom.ts',
  'src/app/layouts/layouts/split-right/split-right.ts',
  'src/app/layouts/layouts/lab-stage/lab-stage.ts'
]);

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, acc);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('cross-module private layout selectors', () => {
  it('data-workspace capability uses semantic stage/graph attrs', () => {
    const file = path.join(
      ROOT,
      'src/app/layouts/capabilities/data-workspace/index.ts'
    );
    const text = fs.readFileSync(file, 'utf8');
    expect(text).toContain('STAGE_FRAME_ATTR');
    expect(text).toContain('GRAPH_SECTION_ATTR');
    expect(text).not.toMatch(PRIVATE_CLASS);
  });

  it('ticker-tape finds the stage frame via semantic attr', () => {
    const file = path.join(ROOT, 'src/scenes/ticker-tape/scene.view.ts');
    const text = fs.readFileSync(file, 'utf8');
    expect(text).toContain('STAGE_FRAME_ATTR');
    expect(text).not.toMatch(PRIVATE_CLASS);
  });

  it('projectile-components lab float helpers use semantic attrs', () => {
    const file = path.join(
      ROOT,
      'src/scenes/projectile-components/data-panel.ts'
    );
    const text = fs.readFileSync(file, 'utf8');
    expect(text).toContain('LAB_DATA_SLOT_ATTR');
    expect(text).toContain('GRAPH_SECTION_ATTR');
    expect(text).toContain('STAGE_FRAME_ATTR');
    expect(text).not.toMatch(PRIVATE_CLASS);
  });

  it('does not introduce new cross-module private layout class selectors', () => {
    const hits: string[] = [];
    for (const abs of walkTs(path.join(ROOT, 'src'))) {
      const rel = path.relative(ROOT, abs);
      if (LAYOUT_OWN_CLASS_FILES.has(rel)) continue;
      const text = fs.readFileSync(abs, 'utf8');
      if (PRIVATE_CLASS.test(text)) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });
});
