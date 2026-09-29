import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Wave 0 freeze (wc -l) for grandfathered production modules.
 * New src TS/TSX modules must stay at or under 1000 lines.
 * Frozen limits are the Wave 0 measured values; do not raise them.
 * v15 Phase D emptied this map: the four >1000 scene.view.ts files
 * (pendulum-period / potential-energy-graphs / multimeter-practice /
 * rod-model) were split into renderer/ modules, each ≤800 lines.
 */
const GRANDFATHERED: Record<string, number> = {};

/**
 * Wave J 实测 (800, 1000] 警戒清单。冻结值只降不升。
 * >1000 的祖父文件不重复登记。
 */
const WATCHLIST: Record<string, number> = {
  'src/app/layouts/container.ts': 996,
  'src/scenes/internal-energy/scene.view.ts': 979,
  'src/scenes/oscilloscope/scene.sim.ts': 970,
  'src/app/layouts/layout-switch-runtime.ts': 929,
  'src/scenes/three-forces/scene.sim.ts': 911,
  'src/scenes/dynamic-circle/scene.sim.ts': 878,
  'src/scenes/mechanical-energy/scene.view.ts': 876,
  'src/scenes/faraday-disc/scene.view.ts': 871,
  'src/scenes/molecular-potential/scene.view.ts': 863,
  'src/scenes/accel-force/scene.sim.ts': 861,
  'src/scenes/thin-film/scene.view.ts': 852,
  'src/scenes/emf-internal-resistance/scene.view.ts': 843,
  'src/scenes/accel-force/scene.view.ts': 831,
  'src/scenes/block-board/scene.sim.ts': 825,
  'src/scenes/double-slit/scene.entry.ts': 821,
  'src/scenes/wire-loop-field/scene.view.ts': 815,
  'src/scenes/double-slit/data-task.ts': 810,
  'src/scenes/capacitor-charge-discharge/scene.view.ts': 805,
  'src/scenes/photoelectric-switch/scene.view.ts': 801
};

const LIMIT = 1000;
const WATCH_FLOOR = 800;
const WATCHLIST_CEILING = 19;

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

  it('freezes WATCHLIST files in (800, 1000]; values may only shrink', () => {
    const root = path.resolve(__dirname, '../..');
    const src = path.join(root, 'src');
    const grown: string[] = [];
    const missing: string[] = [];
    const overlap: string[] = [];
    const present = new Set<string>();

    for (const file of Object.keys(WATCHLIST)) {
      if (Object.hasOwn(GRANDFATHERED, file)) overlap.push(file);
    }

    for (const abs of walk(src)) {
      const file = path.relative(root, abs);
      present.add(file);
      const count = wcLines(abs);
      if (Object.hasOwn(GRANDFATHERED, file)) continue;
      const frozen = WATCHLIST[file];
      if (frozen != null) {
        if (count > frozen) grown.push(`${file}: ${count} > ${frozen}`);
        else if (count < frozen) {
          console.warn(
            `[module-line-budget] WATCHLIST ${file} is ${count} < frozen ${frozen}; lower the freeze`
          );
        }
        continue;
      }
      if (count > WATCH_FLOOR && count <= LIMIT) {
        console.warn(
          `[module-line-budget] ${file} is ${count} lines (in (${WATCH_FLOOR}, ${LIMIT}]); consider WATCHLIST`
        );
      }
    }

    for (const file of Object.keys(WATCHLIST)) {
      if (!present.has(file)) missing.push(file);
    }

    expect(overlap, 'WATCHLIST overlaps GRANDFATHERED').toEqual([]);
    expect(missing, 'WATCHLIST path missing').toEqual([]);
    expect(grown, 'WATCHLIST modules grew').toEqual([]);
    expect(
      Object.keys(WATCHLIST).length,
      'WATCHLIST 冻 (800, 1000] 文件；只许缩小'
    ).toBeLessThanOrEqual(WATCHLIST_CEILING);
  });
});
