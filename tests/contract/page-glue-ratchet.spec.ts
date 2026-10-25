/**
 * page.ts 胶水代码棘轮
 *
 * 新场景用 createBoundControls：参数路由、URL 恢复、remount 投影由平台按
 * schema `bind` / `visibleWhen` 完成。下列「手写胶水」形态的页面数只许减少：
 * - 直接 renderSchema（自行写 onChange 路由）
 * - paramSync.applyParam（手写 URL 恢复）
 * - syncFromScene（手写控件投影）
 *
 * 迁移一页后下调对应计数（测试会 console.warn 提示）。
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SCENES_DIR = resolve(process.cwd(), 'src/scenes');

const FROZEN: Record<string, { pattern: RegExp; max: number }> = {
  'raw renderSchema': { pattern: /\brenderSchema\(/, max: 62 },
  'paramSync.applyParam': { pattern: /\bapplyParam\s*:/, max: 42 },
  syncFromScene: { pattern: /\bsyncFromScene\b/, max: 20 }
};

const pages = readdirSync(SCENES_DIR)
  .map((id) => join(SCENES_DIR, id, 'page.ts'))
  .filter((file) => existsSync(file))
  .map((file) => readFileSync(file, 'utf8'));

describe('page glue ratchet', () => {
  it.each(Object.entries(FROZEN))('%s pages only shrink', (name, rule) => {
    const count = pages.filter((source) => rule.pattern.test(source)).length;
    expect(
      count,
      `${name}：新页面请用 createBoundControls，并在 schema 声明 bind / visibleWhen`
    ).toBeLessThanOrEqual(rule.max);
    if (count < rule.max) {
      console.warn(
        `[page-glue-ratchet] ${name}: ${count} < ${rule.max}; lower the freeze`
      );
    }
  });
});
