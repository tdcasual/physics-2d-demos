import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { springBallControlsSchema } from '../../src/scenes/spring-ball/controls-schema';
import { springBallMeta } from '../../src/scenes/spring-ball/scene.meta';
import {
  createSpringBallSim,
  springBallConstants
} from '../../src/scenes/spring-ball/scene.sim';
import { createSpringBallView } from '../../src/scenes/spring-ball/scene.view';

function mockCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }) as DOMRect;
  return canvas;
}

describe('spring-ball view contract', () => {
  it('keeps animation canvas free of graph, data cards and long copy', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/scenes/spring-ball/scene.view.ts'),
      'utf8'
    );
    expect(source).not.toMatch(
      /drawPanel|实时位置|实验工况|核心规律|最低点.*加速度/
    );
    expect(source).not.toMatch(/m\/s²|弹簧力|合力|接触时刻/);
    expect(source).toContain('attachGraphCanvas');
  });

  it('renders animation and graph canvases across themes and sizes', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const graphCanvas = mockCanvas(width, 236);
      const view = createSpringBallView({
        canvas,
        graphCanvas,
        theme: 'light'
      });
      const sim = createSpringBallSim({ releaseHeight: 0.5, autoRun: true });
      sim.step(0.4);
      expect(() => {
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.15 });
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps graph contract in the standard layout', () => {
    expect(springBallMeta.testProfile?.hasGraph).toBe(true);
    expect(springBallMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining([
        'stage',
        'position',
        'velocity',
        'acceleration',
        'spring-force',
        'net-force'
      ])
    );
    expect(springBallConstants.baseWidth).toBe(springBallConstants.fieldWidth);
    const sections = springBallControlsSchema.sections.map(
      (section) => section.title
    );
    expect(sections).toEqual(expect.arrayContaining(['释放', '运行', '关系']));
    const formula = springBallControlsSchema.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === 'formula');
    expect(formula && 'lines' in formula ? formula.lines : []).toEqual(
      expect.arrayContaining(['x₀ = mg/k = 0.25 m', 'h=0：x底 = 2x₀'])
    );
  });
});
