import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Wave 0 freeze (wc -l) for grandfathered production modules.
 * New src TS/TSX modules must stay at or under 1000 lines.
 * Frozen limits are the Wave 0 measured values; do not raise them.
 */
const GRANDFATHERED: Record<string, number> = {
  'src/scenes/pendulum-period/scene.view.ts': 1091,
  'src/scenes/potential-energy-graphs/scene.view.ts': 1078,
  'src/scenes/multimeter-practice/scene.view.ts': 1019,
  'src/scenes/rod-model/scene.view.ts': 1006
};

const LIMIT = 1000;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

/** Match `wc -l`: count newline bytes. */
function wcLines(file: string): number {
  const buf = fs.readFileSync(file);
  let n = 0;
  for (const byte of buf) if (byte === 10) n += 1;
  return n;
}

describe('module line budget', () => {
  it('caps new production modules at 1000 lines and freezes grandfathered files', () => {
    const root = path.resolve(__dirname, '../..');
    const src = path.join(root, 'src');
    const over: string[] = [];
    const grown: string[] = [];
    for (const abs of walk(src)) {
      const file = path.relative(root, abs);
      const count = wcLines(abs);
      const frozen = GRANDFATHERED[file];
      if (frozen != null) {
        if (count > frozen) grown.push(`${file}: ${count} > ${frozen}`);
        continue;
      }
      if (count > LIMIT) over.push(`${file}: ${count}`);
    }
    expect(over, `new modules over ${LIMIT} lines`).toEqual([]);
    expect(grown, 'grandfathered modules grew').toEqual([]);
  });
});
