/**
 * view-base 单元测试
 *
 * 覆盖 createCanvasViewport（clamped/raw 尺寸记录、responsiveScale/dpr 记录、
 * ensureSized 首帧兜底、attach/release、eagerContext、自定义 measure/resolveScale）
 * 与 createViewEnvironment（theme/mode/demoHints 状态、contentScale 计算）。
 *
 * happy-dom 中 getBoundingClientRect 默认为 0，用桩函数注入指定尺寸。
 */

import { describe, it, expect } from 'vitest';
import {
  createCanvasViewport,
  createViewEnvironment
} from '../../src/scenes/view-base';

function makeCanvas(rectW = 0, rectH = 0): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () =>
    ({
      width: rectW,
      height: rectH,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: rectW,
      bottom: rectH,
      toJSON: () => ({})
    }) as DOMRect;
  return canvas;
}

describe('createCanvasViewport', () => {
  it('clamped（默认）：0 尺寸走 fallback 800×600', () => {
    const vp = createCanvasViewport({ canvas: makeCanvas(0, 0) });
    vp.resize();
    expect(vp.cssWidth).toBe(800);
    expect(vp.cssHeight).toBe(600);
  });

  it('clamped：小于下限的记录值被 clamp 到 200×150', () => {
    const vp = createCanvasViewport({ canvas: makeCanvas(150, 100) });
    vp.resize();
    expect(vp.cssWidth).toBe(200);
    expect(vp.cssHeight).toBe(150);
  });

  it('clamped：正常尺寸 floor 记录', () => {
    const vp = createCanvasViewport({ canvas: makeCanvas(640.7, 480.2) });
    vp.resize();
    expect(vp.cssWidth).toBe(640);
    expect(vp.cssHeight).toBe(480);
  });

  it('clamped：支持 graph 风格的自定义 fallback/min', () => {
    const vp = createCanvasViewport({
      canvas: makeCanvas(0, 0),
      sizing: {
        mode: 'clamped',
        fallbackWidth: 400,
        fallbackHeight: 200,
        minWidth: 200,
        minHeight: 100
      }
    });
    vp.resize();
    expect(vp.cssWidth).toBe(400);
    expect(vp.cssHeight).toBe(200);
  });

  it('raw：原样记录 rect 尺寸（含 0）', () => {
    const vp = createCanvasViewport({
      canvas: makeCanvas(320.5, 240.5),
      sizing: { mode: 'raw' }
    });
    vp.resize();
    expect(vp.cssWidth).toBe(320.5);
    expect(vp.cssHeight).toBe(240.5);

    const hidden = createCanvasViewport({
      canvas: makeCanvas(0, 0),
      sizing: { mode: 'raw' }
    });
    hidden.resize();
    expect(hidden.cssWidth).toBe(0);
    expect(hidden.cssHeight).toBe(0);
  });

  it('记录 responsiveScale 与 dpr', () => {
    const originalDpr = window.devicePixelRatio;
    window.devicePixelRatio = 2;
    try {
      const canvas = makeCanvas(400, 300);
      const vp = createCanvasViewport({ canvas });
      vp.resize();
      expect(vp.cssWidth).toBe(400);
      expect(vp.cssHeight).toBe(300);
      expect(canvas.width).toBe(800);
      expect(vp.dpr).toBe(2);
      // 短边 300 / 参考 400 → 0.75（与 getResponsiveScale 公式独立对照）
      expect(vp.responsiveScale).toBe(0.75);
    } finally {
      window.devicePixelRatio = originalDpr;
    }
  });

  it('initialWidth/Height 作为首次 resize 前的记录值', () => {
    const vp = createCanvasViewport({
      canvas: makeCanvas(640, 480),
      initialWidth: 1280,
      initialHeight: 720
    });
    expect(vp.cssWidth).toBe(1280);
    expect(vp.cssHeight).toBe(720);
    vp.resize();
    expect(vp.cssWidth).toBe(640);
    expect(vp.cssHeight).toBe(480);
  });

  it('ensureSized：记录尺寸 <= 0 时兜底 resize，之后不再触发', () => {
    let measureCalls = 0;
    const vp = createCanvasViewport({
      canvas: makeCanvas(640, 480),
      measure: (canvas) => {
        measureCalls += 1;
        const rect = canvas.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }
    });
    vp.ensureSized(); // 初始 0 → 触发
    expect(measureCalls).toBe(1);
    expect(vp.cssWidth).toBe(640);
    vp.ensureSized(); // 已有有效尺寸 → 不再触发
    vp.ensureSized();
    expect(measureCalls).toBe(1);
  });

  it('ensureSized：raw 模式下隐藏容器（rect 0）每次都重测', () => {
    let measureCalls = 0;
    const vp = createCanvasViewport({
      canvas: makeCanvas(0, 0),
      sizing: { mode: 'raw' },
      measure: (canvas) => {
        measureCalls += 1;
        const rect = canvas.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }
    });
    vp.ensureSized();
    vp.ensureSized();
    expect(measureCalls).toBe(2);
  });

  it('canvas 为 null 时 resize/ensureSized 安全空转', () => {
    const vp = createCanvasViewport();
    expect(() => {
      vp.resize();
      vp.ensureSized();
    }).not.toThrow();
    expect(vp.ctx).toBeNull();
    expect(vp.cssWidth).toBe(0);
  });

  it('attach 换绑 canvas 并立即 resize', () => {
    const vp = createCanvasViewport();
    const graphCanvas = makeCanvas(500, 300);
    vp.attach(graphCanvas);
    expect(vp.canvas).toBe(graphCanvas);
    expect(vp.cssWidth).toBe(500);
    expect(vp.cssHeight).toBe(300);
    expect(vp.ctx).not.toBeNull();
  });

  it('release 清空 canvas/ctx，后续 resize 空转', () => {
    const vp = createCanvasViewport({ canvas: makeCanvas(640, 480) });
    vp.resize();
    vp.release();
    expect(vp.canvas).toBeNull();
    expect(vp.ctx).toBeNull();
    expect(() => vp.resize()).not.toThrow();
  });

  it('eagerContext：构造时即建立 ctx（不等首次 resize）', () => {
    const vp = createCanvasViewport({
      canvas: makeCanvas(640, 480),
      eagerContext: true
    });
    expect(vp.ctx).not.toBeNull();
  });

  it('默认不 eager：首次 resize 前 ctx 为 null', () => {
    const vp = createCanvasViewport({ canvas: makeCanvas(640, 480) });
    expect(vp.ctx).toBeNull();
    vp.resize();
    expect(vp.ctx).not.toBeNull();
  });

  it('自定义 measure/resolveScale（double-slit 风格：style 尺寸 + fitScale）', () => {
    const canvas = makeCanvas(0, 0);
    const vp = createCanvasViewport({
      canvas,
      sizing: { mode: 'raw' },
      measure: (c) => ({
        width: parseFloat(c.style.width || '1000'),
        height: parseFloat(c.style.height || '500')
      }),
      resolveScale: (c, viewport) => {
        const rawScale = parseFloat(c.dataset.responsiveScale || '1');
        return Math.min(
          rawScale,
          Math.min(viewport.cssWidth / 1000, viewport.cssHeight / 500)
        );
      }
    });
    vp.resize();
    // 无父容器时 sizeCanvasToFill 走 800×600 兜底并写入 style
    expect(vp.cssWidth).toBe(800);
    expect(vp.cssHeight).toBe(600);
    const rawScale = parseFloat(canvas.dataset.responsiveScale || '1');
    expect(vp.responsiveScale).toBe(Math.min(rawScale, 0.8));
  });
});

describe('createViewEnvironment', () => {
  it('默认 dark/normal，demoHints 为 undefined', () => {
    const env = createViewEnvironment();
    expect(env.theme).toBe('dark');
    expect(env.mode).toBe('normal');
    expect(env.demoHints).toBeUndefined();
  });

  it('接受初始值', () => {
    const env = createViewEnvironment({
      theme: 'light',
      mode: 'presentation',
      demoHints: { contentScale: 2 }
    });
    expect(env.theme).toBe('light');
    expect(env.mode).toBe('presentation');
    expect(env.demoHints?.contentScale).toBe(2);
  });

  it('setTheme/setMode 更新状态', () => {
    const env = createViewEnvironment();
    env.setTheme('light');
    env.setMode('presentation', { contentScale: 2 });
    expect(env.theme).toBe('light');
    expect(env.mode).toBe('presentation');
    expect(env.demoHints?.contentScale).toBe(2);
  });

  it('contentScale：normal 恒为 1', () => {
    const env = createViewEnvironment({
      demoHints: { contentScale: 2 }
    });
    expect(env.contentScale()).toBe(1);
  });

  it('contentScale：presentation 无 hints 默认 1.5，有 hints 取 contentScale', () => {
    const env = createViewEnvironment();
    env.setMode('presentation');
    expect(env.contentScale()).toBe(1.5);
    env.setMode('presentation', { contentScale: 1.8 });
    expect(env.contentScale()).toBe(1.8);
  });

  it('fontScale 不回落到 phenomenonScale', () => {
    const env = createViewEnvironment();
    env.setMode('presentation', { contentScale: 1.8 });
    expect(env.fontScale()).toBe(1);
    env.setMode('presentation', { contentScale: 1.8, fontScale: 1.2 });
    expect(env.fontScale()).toBe(1.2);
  });
});
