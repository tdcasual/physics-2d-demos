/**
 * ESLint 分层规则探针：用 lintText 对合成片段断言关键 no-restricted-imports
 * 命中/放行，防止规则回潮时探针缺失。
 */
import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function restrictedImportMessages(
  filePath: string,
  code: string
): Promise<string[]> {
  const results = await eslint.lintText(code, {
    filePath: resolve(process.cwd(), filePath)
  });
  return (results[0]?.messages ?? [])
    .filter((m) => m.ruleId === 'no-restricted-imports')
    .map((m) => m.message);
}

describe('eslint layer rules', { timeout: 30_000 }, () => {
  it('page.ts forbids cross-scene imports', async () => {
    const msgs = await restrictedImportMessages(
      'src/scenes/projectile/page.ts',
      `import { gansheMeta } from '../ganshe/scene.meta';\n`
    );
    expect(msgs.some((m) => /cannot import other scenes/i.test(m))).toBe(true);
  });

  it('page.ts forbids catalog imports', async () => {
    const msgs = await restrictedImportMessages(
      'src/scenes/projectile/page.ts',
      `import { sceneRegistry } from '../../catalog/scene-registry';\n`
    );
    expect(msgs.some((m) => /cannot import catalog layer/i.test(m))).toBe(true);
  });

  it('page.ts allows app imports', async () => {
    const msgs = await restrictedImportMessages(
      'src/scenes/projectile/page.ts',
      `import { bootScenePage } from '../../app/scene-bootstrapper';\n`
    );
    expect(msgs).toEqual([]);
  });

  it('non-page scene files forbid sibling scene imports', async () => {
    const msgs = await restrictedImportMessages(
      'src/scenes/projectile/scene.entry.ts',
      `import { createGansheScene } from '../ganshe/scene.entry';\n`
    );
    expect(msgs.some((m) => /cannot import other scenes/i.test(m))).toBe(true);
  });

  it('non-page scene files allow ../types and ../types.ts', async () => {
    const withoutExt = await restrictedImportMessages(
      'src/scenes/projectile/scene.entry.ts',
      `import type { SceneLifecycle } from '../types';\n`
    );
    const withExt = await restrictedImportMessages(
      'src/scenes/projectile/scene.entry.ts',
      `import type { SceneLifecycle } from '../types.ts';\n`
    );
    expect(withoutExt).toEqual([]);
    expect(withExt).toEqual([]);
  });

  it('scene files forbid ui imports', async () => {
    const msgs = await restrictedImportMessages(
      'src/scenes/projectile/scene.entry.ts',
      `import { renderSchema } from '../../ui/components/SchemaRenderer';\n`
    );
    expect(msgs.some((m) => /cannot import ui layer/i.test(m))).toBe(true);
  });
});
