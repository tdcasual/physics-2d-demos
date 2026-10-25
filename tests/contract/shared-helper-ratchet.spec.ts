/**
 * 场景助手去重棘轮
 *
 * 这些助手已有共享实现，场景内的本地定义只许减少：
 * - 参数归一化：src/core/coerce.ts（finiteOr / finiteNumber / asBoolean / asBooleanOr）
 * - 画布文字：src/core/draw-primitives.ts（drawText）
 * - 舞台适配：src/scenes/stage-fit.ts（containInRect / betterPose / StagePose /
 *   StageLayoutHint / sizeCanvasToHostBox / measureStageLayout / fitStage）与
 *   platform/stage-readout.ts。stageTransform / stageLayoutFrom 允许保留为
 *   传入场景常量的薄包装。
 *
 * 剩余本地定义是语义有差异的变体或被测试按场景路径导入的导出；迁移时
 * 先确认语义一致，再改为导入并下调此处计数。新场景直接用共享实现。
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SCENES_DIR = resolve(process.cwd(), 'src/scenes');

const FROZEN_LOCAL_DEFINITIONS: Record<string, number> = {
  finite: 5,
  asBoolean: 4,
  asBool: 19,
  text: 22,
  betterPose: 0,
  containInRect: 5,
  contentBoxSize: 0,
  hasFloatingReadout: 2,
  stageTransform: 10,
  stageLayoutFrom: 6,
  pointerToBaseNorm: 8,
  StagePose: 1,
  StageLayoutHint: 4
};

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

/** 委托给共享实现的薄包装（传入场景常量）不算复刻 */
const DELEGATES: Record<string, RegExp> = {
  stageTransform: /\breturn fitStage\(/,
  stageLayoutFrom: /\breturn measureStageLayout\(/
};

function countLocalDefinitions(name: string, sources: string[]): number {
  const pattern = new RegExp(
    `^(?:export )?(?:function ${name}\\b|type ${name} = )`,
    'm'
  );
  const delegate = DELEGATES[name];
  return sources.filter(
    (source) => pattern.test(source) && !(delegate && delegate.test(source))
  ).length;
}

describe('shared scene helpers are not re-copied', () => {
  const sources = sceneSourceFiles().map((file) => readFileSync(file, 'utf8'));

  it.each(Object.entries(FROZEN_LOCAL_DEFINITIONS))(
    '%s: local definitions only shrink (frozen %i)',
    (name, frozen) => {
      const count = countLocalDefinitions(name, sources);
      expect(
        count,
        `${name} 在场景内被重新定义：请改用共享实现（见本文件头注释）`
      ).toBeLessThanOrEqual(frozen);
      if (count < frozen) {
        console.warn(
          `[shared-helper-ratchet] ${name} is ${count} < frozen ${frozen}; lower the freeze`
        );
      }
    }
  );
});
