import { describe, expect, it } from 'vitest';
import {
  createInterferenceVernierCaliper,
  interferenceVernierCaliperFactory
} from '../../src/instruments/interference-vernier-caliper/instrument.entry';
import { interferenceVernierCaliperMeta } from '../../src/instruments/interference-vernier-caliper/instrument.meta';
import {
  createMicrometerEyepiece,
  micrometerEyepieceFactory
} from '../../src/instruments/micrometer-eyepiece/instrument.entry';
import { micrometerEyepieceMeta } from '../../src/instruments/micrometer-eyepiece/instrument.meta';
import {
  createVernierCaliperGuide,
  vernierCaliperGuideFactory
} from '../../src/instruments/vernier-caliper-guide/instrument.entry';
import { vernierCaliperGuideMeta } from '../../src/instruments/vernier-caliper-guide/instrument.meta';
import type { InterferenceVernierCaliperView } from '../../src/instruments/interference-vernier-caliper/instrument.view';
import type { MicrometerEyepieceView } from '../../src/instruments/micrometer-eyepiece/instrument.view';

function createCanvasHost() {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const canvas = document.createElement('canvas');
  parent.appendChild(canvas);
  return canvas;
}

// 渲染技术软契约的最小结构视图：绕过 4 个工厂的具体泛型做统一遍历
type AnyInstrumentFactory = {
  meta: { id: string; renderTech?: 'canvas' | 'svg' };
  createSim(): { getState(): unknown };
  createView(options: { canvas: HTMLCanvasElement; theme: 'dark' }): {
    render(state: unknown): void;
    dispose(): void;
  };
};

const allFactories: AnyInstrumentFactory[] = [
  interferenceVernierCaliperFactory,
  micrometerEyepieceFactory,
  vernierCaliperGuideFactory
] as unknown as AnyInstrumentFactory[];

describe('instrument entries', () => {
  describe('interference-vernier-caliper', () => {
    it('exposes the meta on the factory', () => {
      expect(interferenceVernierCaliperFactory.meta).toBe(
        interferenceVernierCaliperMeta
      );
      expect(interferenceVernierCaliperFactory.meta.id).toBe(
        'interference-vernier-caliper'
      );
    });

    it('createSim builds a sim initialized from meta.defaultParams', () => {
      const sim = interferenceVernierCaliperFactory.createSim();
      const s = sim.getState();
      expect(s.currentReading).toBe(
        interferenceVernierCaliperMeta.defaultParams.initialReading
      );
      expect(s.zeroOffset).toBe(
        interferenceVernierCaliperMeta.defaultParams.zeroOffset
      );
      expect(s.fringeSpacing).toBe(
        interferenceVernierCaliperMeta.defaultParams.fringeSpacing
      );
    });

    it('createView satisfies the InstrumentView + measurable contract', () => {
      const canvas = createCanvasHost();
      // 工厂契约类型仅声明 InstrumentView，此处收窄到具体视图类型以覆盖扩展接口
      const view = interferenceVernierCaliperFactory.createView({
        canvas,
        theme: 'dark'
      }) as InterferenceVernierCaliperView;
      for (const method of [
        'render',
        'resize',
        'setTheme',
        'setViewport',
        'dispose',
        'getReading',
        'onReadingChange',
        'onAlign',
        'onLimit',
        'serialize',
        'deserialize',
        'setZero',
        'getZero',
        'getCalibrationOffset',
        'setReadoutVisible'
      ] as const) {
        expect(typeof view[method]).toBe('function');
      }
      view.dispose();
    });

    it('createInterferenceVernierCaliper assembles sim + view', () => {
      const canvas = createCanvasHost();
      const { sim, view } = createInterferenceVernierCaliper({
        canvas,
        theme: 'dark'
      });
      expect(sim.getState().currentReading).toBe(1.4);
      expect(view.getReading()).toBeCloseTo(1.4, 10);
      view.dispose();
    });
  });

  describe('micrometer-eyepiece', () => {
    it('exposes the meta on the factory', () => {
      expect(micrometerEyepieceFactory.meta).toBe(micrometerEyepieceMeta);
      expect(micrometerEyepieceFactory.meta.id).toBe('micrometer-eyepiece');
    });

    it('createSim builds a sim initialized from meta.defaultParams', () => {
      const sim = micrometerEyepieceFactory.createSim();
      const s = sim.getState();
      expect(s.currentReading).toBe(
        micrometerEyepieceMeta.defaultParams.initialReading
      );
      expect(s.stripeSpacing).toBe(
        micrometerEyepieceMeta.defaultParams.stripeSpacing
      );
      expect(s.viewMode).toBe(micrometerEyepieceMeta.defaultParams.viewMode);
    });

    it('createView satisfies the InstrumentView + measurable contract', () => {
      const canvas = createCanvasHost();
      // 工厂契约类型仅声明 InstrumentView，此处收窄到具体视图类型以覆盖扩展接口
      const view = micrometerEyepieceFactory.createView({
        canvas,
        theme: 'dark'
      }) as MicrometerEyepieceView;
      for (const method of [
        'render',
        'resize',
        'setTheme',
        'setViewport',
        'dispose',
        'getReading',
        'onReadingChange',
        'onAlign',
        'onLimit',
        'serialize',
        'deserialize',
        'setZero',
        'getZero',
        'getCalibrationOffset',
        'setReadoutVisible'
      ] as const) {
        expect(typeof view[method]).toBe('function');
      }
      view.dispose();
    });

    it('createMicrometerEyepiece assembles sim + view', () => {
      const canvas = createCanvasHost();
      const { sim, view } = createMicrometerEyepiece({ canvas, theme: 'dark' });
      expect(sim.getState().currentReading).toBe(0);
      expect(view.getReading()).toBe(0);
      view.dispose();
    });
  });

  describe('vernier-caliper-guide（SVG 样例）', () => {
    it('exposes the meta on the factory', () => {
      expect(vernierCaliperGuideFactory.meta).toBe(vernierCaliperGuideMeta);
      expect(vernierCaliperGuideFactory.meta.id).toBe('vernier-caliper-guide');
      expect(vernierCaliperGuideFactory.meta.renderTech).toBe('svg');
    });

    it('createSim builds a sim initialized from meta.defaultParams', () => {
      const sim = vernierCaliperGuideFactory.createSim();
      const s = sim.getState();
      expect(s.precision).toBe(0.1);
      expect(s.mode).toBe(0);
      expect(s.jawPosition).toBe(23.7);
      // 读数引擎的独立核算（手算期望值 + 进位边界回归）见
      // instrument-vernier-caliper-guide.sim.spec.ts，此处只校验管线自洽
      expect(s.totalReading).toBeCloseTo(s.currentReading, 10);
    });

    it('createView renders an <svg> sibling and satisfies the view contract', () => {
      const canvas = createCanvasHost();
      const view = vernierCaliperGuideFactory.createView({
        canvas,
        theme: 'dark'
      });
      for (const method of [
        'render',
        'resize',
        'setTheme',
        'setViewport',
        'dispose'
      ] as const) {
        expect(typeof view[method]).toBe('function');
      }
      const sim = vernierCaliperGuideFactory.createSim();
      view.render(sim.getState());
      // renderTech: 'svg' — 渲染面是 canvas 旁的 <svg> 兄弟节点
      const svg = canvas.parentElement?.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 900 430');
      view.dispose();
      expect(canvas.parentElement?.querySelector('svg')).toBeNull();
    });

    it('createVernierCaliperGuide assembles sim + view', () => {
      const canvas = createCanvasHost();
      const { sim, view } = createVernierCaliperGuide({
        canvas,
        theme: 'light'
      });
      expect(sim.getState().modeName).toContain('外径');
      view.render(sim.getState());
      view.dispose();
    });
  });
});

describe('instrument render tech contract', () => {
  // 渲染技术按元素密度选择（STANDARDS.md「View 规范」）：
  // 刻度盘/读数窗类默认 svg，密集条纹/图案类默认 canvas。
  // 声明与实际渲染面必须一致：svg 仪器在 canvas 旁插入 <svg> 兄弟节点；
  // canvas 仪器不得注入 svg。缺省 renderTech 视为 'canvas'。
  for (const factory of allFactories) {
    it(`${factory.meta.id}: render surface matches declared renderTech`, () => {
      const canvas = createCanvasHost();
      const view = factory.createView({ canvas, theme: 'dark' });
      view.render(factory.createSim().getState());
      const svg = canvas.parentElement?.querySelector('svg') ?? null;
      const declared = factory.meta.renderTech ?? 'canvas';
      if (declared === 'svg') {
        expect(
          svg,
          `${factory.meta.id}: meta.renderTech 声明为 'svg'，` +
            'view 必须在 canvas.parentElement 内插入 <svg> 兄弟节点渲染；' +
            '若实际用 Canvas 绘制，请改回 renderTech: "canvas" 或删除该字段'
        ).not.toBeNull();
      } else {
        expect(
          svg,
          `${factory.meta.id}: 未声明 renderTech: 'svg' 却注入了 <svg> 节点；` +
            'SVG 仪器必须在 instrument.meta.ts 声明 renderTech: "svg"'
        ).toBeNull();
      }
      view.dispose();
    });
  }
});
