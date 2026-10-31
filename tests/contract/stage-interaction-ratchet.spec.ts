/**
 * 场景内直接监听 pointer 的文件数只许减少。
 * 新拖拽请用 createStageInteraction（platform/input/stage-interaction.ts）。
 * 余下文件是 click-to-set、window 级监听或 view 内仪器交互，不硬迁。
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SCENES_DIR = resolve(process.cwd(), 'src/scenes');
const POINTER = /addEventListener\(\s*['"]pointer(down|move|up|cancel)['"]/;
const FROZEN = 14;

function sceneSourceFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.ts')) files.push(full);
    }
  };
  for (const entry of readdirSync(SCENES_DIR)) {
    const full = join(SCENES_DIR, entry);
    if (statSync(full).isDirectory()) walk(full);
  }
  return files;
}

describe('stage interaction ratchet', () => {
  it('scene pointer listeners only shrink', () => {
    const count = sceneSourceFiles().filter((file) =>
      POINTER.test(readFileSync(file, 'utf8'))
    ).length;
    expect(
      count,
      '新拖拽请用 createStageInteraction，并下调本棘轮'
    ).toBeLessThanOrEqual(FROZEN);
    if (count < FROZEN) {
      console.warn(
        `[stage-interaction-ratchet] ${count} < frozen ${FROZEN}; lower the freeze`
      );
    }
  });
});
