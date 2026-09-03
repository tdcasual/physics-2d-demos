/**
 * 游标卡尺使用演示 view — DOM 行为测试（happy-dom）
 *
 * 锁定审计修复的行为契约：
 * - 练习模式（showReading=0）不绘制对齐高亮（防答案泄漏回归）
 * - 滑框宽度随游标分度自适应（50 分度 49mm 刻度不得溢出滑框）
 * - 被测物尺寸固定为 targetSize，不随卡爪开度变化
 */

import { describe, expect, it } from 'vitest';
import { createVernierCaliperGuideSim } from '../../src/instruments/vernier-caliper-guide/instrument.sim';
import type { VernierCaliperGuideParams } from '../../src/instruments/vernier-caliper-guide/instrument.sim';
import { createVernierCaliperGuideView } from '../../src/instruments/vernier-caliper-guide/instrument.view';

const base: VernierCaliperGuideParams = {
  precision: 0.1,
  mode: 0,
  jawPosition: 23.7,
  showReading: 1,
  demo: 0
};

function setup() {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const canvas = document.createElement('canvas');
  parent.appendChild(canvas);
  const view = createVernierCaliperGuideView({ canvas, theme: 'light' });
  return { parent, view };
}

/** 对齐高亮线 = overlay 中跨主尺/游标的 accent 竖线 */
function highlightLine(parent: HTMLElement): SVGLineElement | null {
  return parent.querySelector('line[stroke-opacity]');
}

/** 滑框 = 高 64 的 rect */
function sliderRect(parent: HTMLElement): SVGRectElement | null {
  return parent.querySelector('rect[height="64"]');
}

describe('vernier-caliper-guide view', () => {
  it('显示读数时绘制对齐高亮，练习模式不绘制', () => {
    const { parent, view } = setup();
    const sim = createVernierCaliperGuideSim(base);

    view.render(sim.getState());
    expect(highlightLine(parent)).not.toBeNull();

    sim.setParams({ showReading: 0 });
    view.render(sim.getState());
    expect(highlightLine(parent)).toBeNull();

    view.dispose();
  });

  it('滑框宽度随分度自适应：0.02 档必须容纳 49mm 游标刻度', () => {
    const { parent, view } = setup();
    const sim = createVernierCaliperGuideSim(base);

    // 1mm = 4px，余量 60px
    sim.setParams({ precision: 0.1 });
    view.render(sim.getState());
    expect(Number(sliderRect(parent)?.getAttribute('width'))).toBe(9 * 4 + 60);

    sim.setParams({ precision: 0.05 });
    view.render(sim.getState());
    expect(Number(sliderRect(parent)?.getAttribute('width'))).toBe(19 * 4 + 60);

    sim.setParams({ precision: 0.02 });
    view.render(sim.getState());
    const w = Number(sliderRect(parent)?.getAttribute('width'));
    expect(w).toBe(49 * 4 + 60);
    // 最末游标刻度（jawX + 49*4）必须落在滑框内
    const jawX = 90 + 23.7 * 4;
    expect(jawX + 49 * 4).toBeLessThanOrEqual(jawX - 6 + w);

    view.dispose();
  });

  it('被测物尺寸固定：外径球半径不随卡爪开度变化', () => {
    const { parent, view } = setup();
    const sim = createVernierCaliperGuideSim(base); // mode 0，target 23.7

    sim.setParams({ jawPosition: 50 });
    view.render(sim.getState());
    const r1 = Number(
      parent.querySelector('circle[fill-opacity]')?.getAttribute('r')
    );

    sim.setParams({ jawPosition: 100 });
    view.render(sim.getState());
    const r2 = Number(
      parent.querySelector('circle[fill-opacity]')?.getAttribute('r')
    );

    expect(r1).toBeCloseTo((23.7 * 4) / 2, 10);
    expect(r2).toBe(r1);

    view.dispose();
  });

  it('dispose 移除 svg 并恢复 canvas 显示', () => {
    const { parent, view } = setup();
    expect(parent.querySelector('svg')).not.toBeNull();
    view.dispose();
    expect(parent.querySelector('svg')).toBeNull();
    const canvas = parent.querySelector('canvas')!;
    expect(canvas.style.display).toBe('');
  });
});
