/**
 * B13 / B22 双层守卫：
 * ① 行为型单测见 tests/unit/scene-adapter-autorun.spec.ts
 *    （snapshot autoRun=0 不 startAll / snapshot 缺省仍 startAll /
 *     autoPlay:false 不 startAll）；
 * ② 本文件保留回归断言：顶层 readSceneParams = 0；14 个 I3 钩子存在。
 * 69 清单退役原因：平台 fallback 已覆盖；平台级修复不改 page/meta 文本。
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SCENES_DIR = resolve(process.cwd(), 'src/scenes');

const MIGRATED_SHOULD_AUTO_PLAY = [
  'block-board',
  'charged-particle-circle',
  'emf-internal-resistance',
  'internal-energy',
  'mechanical-energy',
  'oscilloscope',
  'precision-tools',
  'projectile-components',
  'resistor-measurement',
  'rod-model',
  'single-loop',
  'spring-ball',
  'ticker-timer',
  'variable-work'
] as const;

function listSceneIds(): string[] {
  return readdirSync(SCENES_DIR)
    .filter(
      (name) =>
        statSync(join(SCENES_DIR, name)).isDirectory() &&
        existsSync(join(SCENES_DIR, name, 'page.ts'))
    )
    .sort();
}

function hasTopLevelReadSceneParams(source: string): boolean {
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (/^const\s+\w+\s*=\s*readSceneParams\s*\(/.test(trimmed)) return true;
    if (/^const\s+\{[^}]+\}\s*=\s*readSceneParams\s*\(/.test(trimmed)) {
      return true;
    }
  }
  return false;
}

describe('autoRun URL gap freeze (B13/B22)', () => {
  const sceneIds = listSceneIds();

  it('B13 remaining top-level readSceneParams is 0', () => {
    const leftover: string[] = [];
    for (const id of sceneIds) {
      const page = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      if (hasTopLevelReadSceneParams(page)) leftover.push(id);
    }
    expect(leftover).toEqual([]);
  });

  it('I3 migrated 14 scenes keep shouldAutoPlay', () => {
    for (const id of MIGRATED_SHOULD_AUTO_PLAY) {
      const page = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      expect(page, `${id} lost shouldAutoPlay`).toMatch(/\bshouldAutoPlay\s*:/);
    }
  });
});
