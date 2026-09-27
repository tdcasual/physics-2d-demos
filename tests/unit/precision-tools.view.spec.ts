import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSchema } from '../../src/ui/components/SchemaRenderer';
import { precisionToolControlsSchema } from '../../src/scenes/precision-tools/controls-schema';
import { createPrecisionToolScene } from '../../src/scenes/precision-tools/scene.entry';
import { precisionToolMeta } from '../../src/scenes/precision-tools/scene.meta';
import { createPrecisionToolSim } from '../../src/scenes/precision-tools/scene.sim';
import { createPrecisionToolView } from '../../src/scenes/precision-tools/scene.view';

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
      toJSON() {
        return {};
      }
    }) as DOMRect;
  canvas.dataset.responsiveScale = String(
    Math.max(0.3, Math.min(1.5, Math.min(width, height) / 400))
  );
  return canvas;
}

type FillTextFn = CanvasRenderingContext2D['fillText'];
type FillTextHost = { fillText: FillTextFn };

function resolveFillTextHost(ctx: CanvasRenderingContext2D): FillTextHost {
  if (Object.prototype.hasOwnProperty.call(ctx, 'fillText')) return ctx;
  const proto = Object.getPrototypeOf(ctx) as Partial<FillTextHost> | null;
  if (proto && typeof proto.fillText === 'function') {
    return proto as FillTextHost;
  }
  return ctx;
}

function captureLabels(canvas: HTMLCanvasElement, run: () => void): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context is required');
  const host = resolveFillTextHost(ctx);
  const original = host.fillText;
  const labels: string[] = [];
  host.fillText = function spy(
    this: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    maxWidth?: number
  ) {
    labels.push(String(value));
    if (maxWidth === undefined) original.call(this, value, x, y);
    else original.call(this, value, x, y, maxWidth);
  };
  try {
    run();
  } finally {
    host.fillText = original;
  }
  return labels;
}

describe('precision-tools view contract', () => {
  it('keeps formula and readout copy out of the canvas source', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/scenes/precision-tools/scene.view.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/drawPanel|真实尺寸|最终读数|读数关系|状态说明/);
    expect(source).not.toMatch(/读数解析|主尺 \+|微分筒 ×|转动约/);
    expect(precisionToolMeta.testProfile?.hasGraph).toBe(false);
    expect(precisionToolMeta.testProfile?.hasTransport).toBe(true);
    expect(precisionToolMeta.testProfile?.supportsPresentation).toBe(true);
    expect(precisionToolMeta.demoProfile?.readoutKeys).toEqual([
      'mode',
      'main',
      'fine',
      'total'
    ]);
    const keys = precisionToolControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'mode',
        'adjustment',
        'showGuides',
        'showReading'
      ])
    );
  });

  it('draws only short apparatus labels', () => {
    const canvas = mockCanvas(960, 640);
    const view = createPrecisionToolView({ canvas });
    const caliper = captureLabels(canvas, () =>
      view.render(
        createPrecisionToolSim({ mode: 'caliper50', autoRun: false }).getState()
      )
    );
    expect(caliper).toEqual(expect.arrayContaining(['主尺', '游标']));
    expect(caliper.join(' ')).not.toMatch(/真实尺寸|最终读数|读数关系/);
    const micrometer = captureLabels(canvas, () =>
      view.render(
        createPrecisionToolSim({
          mode: 'micrometer',
          autoRun: false
        }).getState()
      )
    );
    expect(micrometer).toEqual(expect.arrayContaining(['固定刻度', '微分筒']));
  });

  it('puts reading parse items in the standard readout, not the canvas', () => {
    const scene = createPrecisionToolScene({
      canvas: mockCanvas(800, 600),
      initialParams: { showReading: true, autoRun: false }
    });
    const keys = scene.getReadoutItems().map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining(['mode', 'main', 'fine', 'total'])
    );
    expect(keys).toContain('parse');
    scene.setParams({ showReading: false });
    expect(scene.getReadoutItems().some((item) => item.key === 'parse')).toBe(
      false
    );
  });

  it('page.ts syncFromScene re-syncs mode, adjustment, autoRun, showGuides, showReading', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/scenes/precision-tools/page.ts'),
      'utf8'
    );
    expect(source).toMatch(/syncFromScene:\s*\(\)\s*=>\s*syncControls\(/);
    expect(source).toMatch(
      /renderer\.setActiveSilently\('mode',\s*params\.mode\)/
    );
    expect(source).toMatch(
      /renderer\.setValueSilently\('adjustment',\s*params\.adjustment\)/
    );
    expect(source).toMatch(
      /renderer\.setValueSilently\('autoRun',\s*params\.autoRun\)/
    );
    expect(source).toMatch(
      /renderer\.setValueSilently\('showGuides',\s*params\.showGuides\)/
    );
    expect(source).toMatch(
      /renderer\.setValueSilently\('showReading',\s*params\.showReading\)/
    );
  });

  it('reset + control refresh restores URL-baseline widgets', () => {
    const scene = createPrecisionToolScene({
      canvas: mockCanvas(800, 600),
      initialParams: {
        mode: 'caliper20',
        adjustment: 0.72,
        autoRun: false,
        showGuides: false,
        showReading: true
      }
    });
    const mount = document.createElement('div');
    const renderer = renderSchema({
      mount,
      schema: precisionToolControlsSchema,
      onChange: () => {},
      onAction: () => {}
    });
    scene.setParams({
      mode: 'caliper50',
      adjustment: 1,
      autoRun: true,
      showGuides: true,
      showReading: false
    });
    renderer.setActive('mode', 'caliper50');
    renderer.setValue('adjustment', 1);
    renderer.setValue('autoRun', true);
    renderer.setValue('showGuides', true);
    renderer.setValue('showReading', false);

    scene.reset();
    const params = scene.getParams();
    renderer.setActive('mode', params.mode);
    renderer.setValue('adjustment', params.adjustment);
    renderer.setValue('autoRun', params.autoRun);
    renderer.setValue('showGuides', params.showGuides);
    renderer.setValue('showReading', params.showReading);

    expect(params.mode).toBe('caliper20');
    expect(params.adjustment).toBeCloseTo(0.72, 8);
    expect(params.autoRun).toBe(false);
    expect(params.showGuides).toBe(false);
    expect(params.showReading).toBe(true);
    expect(mount.textContent ?? '').toMatch(/卡尺 20 分度/);
    const slider = mount.querySelector('input[type="range"]');
    expect(slider instanceof HTMLInputElement).toBe(true);
    if (slider instanceof HTMLInputElement) {
      expect(slider.value).toBe('0.72');
    }
    renderer.dispose();
  });
});
