import { describe, expect, it } from 'vitest';
import { bindingEnergyControlsSchema } from '../../src/scenes/binding-energy/controls-schema';
import { bindingEnergyMeta } from '../../src/scenes/binding-energy/scene.meta';
import {
  BINDING_ENERGY_X_TITLE,
  BINDING_ENERGY_Y_TITLE,
  bindingEnergyConstants as C,
  boxInsideFrame,
  boxesOverlap,
  createBindingEnergySim,
  estimateLabelWidth,
  labelBox,
  stageTransform
} from '../../src/scenes/binding-energy/scene.sim';
import { createBindingEnergyView } from '../../src/scenes/binding-energy/scene.view';

function mockCanvas(
  width: number,
  height: number,
  slot: 'bare' | 'mobile' = 'bare'
): HTMLCanvasElement {
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
  if (slot === 'mobile') {
    const root = document.createElement('div');
    root.className = 'mobile-stack-layout';
    root.setAttribute('data-testid', 'mobile-stack-layout');
    root.appendChild(canvas);
    document.body.appendChild(root);
  }
  return canvas;
}

function disposeView(
  view: { dispose(): void },
  canvas: HTMLCanvasElement
): void {
  view.dispose();
  canvas.parentElement?.remove();
}

type FillTextFn = CanvasRenderingContext2D['fillText'];
type FillTextHost = { fillText: FillTextFn };

function resolveFillTextHost(ctx: CanvasRenderingContext2D): FillTextHost {
  if (typeof ctx.fillText !== 'function') {
    throw new Error('fillText is not available on canvas context');
  }
  if (Object.prototype.hasOwnProperty.call(ctx, 'fillText')) {
    return ctx;
  }
  const ctorProto = (ctx.constructor as { prototype?: Partial<FillTextHost> })
    .prototype;
  if (ctorProto && typeof ctorProto.fillText === 'function') {
    return ctorProto as FillTextHost;
  }
  const proto = Object.getPrototypeOf(ctx) as Partial<FillTextHost> | null;
  if (proto && typeof proto.fillText === 'function') {
    return proto as FillTextHost;
  }
  return ctx;
}

type DrawnLabel = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  align: BindingAlign;
};

type BindingAlign = 'left' | 'right' | 'center';

function parseFontSize(font: string): number {
  const match = /([\d.]+)px/.exec(font);
  return match ? Number(match[1]) : 12;
}

function parseAlign(align: CanvasTextAlign): BindingAlign {
  if (align === 'right' || align === 'end') return 'right';
  if (align === 'center') return 'center';
  return 'left';
}

function withFillTextCapture(
  canvas: HTMLCanvasElement,
  run: () => void
): DrawnLabel[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2d canvas context is required to capture fillText');
  }
  const host = resolveFillTextHost(ctx);
  const original = host.fillText;
  const labels: DrawnLabel[] = [];
  host.fillText = function fillTextSpy(
    this: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    maxWidth?: number
  ) {
    labels.push({
      text: String(value),
      x,
      y,
      fontSize: parseFontSize(this.font),
      align: parseAlign(this.textAlign)
    });
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

function drawnBox(label: DrawnLabel) {
  return labelBox(label.text, label.x, label.y, label.align, label.fontSize);
}

/** Animation-slot sizes under split-right / mobile-stack, not the viewport. */
const SLOT_SIZES = [
  { name: '1280×720', width: 862, height: 640 },
  { name: '1024×768', width: 688, height: 688 },
  { name: '900×768', width: 592, height: 688 },
  { name: '768×768', width: 460, height: 688 },
  { name: '390×844', width: 390, height: 296 }
] as const;

describe('binding-energy view contract', () => {
  it('uses an animation-only design frame (no in-canvas side panel)', () => {
    expect(C.baseWidth).toBe(880);
    expect(C.baseHeight).toBe(640);
    expect('fieldWidth' in C).toBe(false);
    expect('panelWidth' in C).toBe(false);
    expect('formulaTop' in C).toBe(false);
    expect('formulaHeight' in C).toBe(false);
    expect('valuesTop' in C).toBe(false);
    expect('valuesHeight' in C).toBe(false);
    expect(C.chartRight).toBeLessThan(C.baseWidth);
    expect(C.chartBottom).toBeLessThan(C.baseHeight - C.transportClearY);
  });

  it('draws the curve labels and omits panel, formula, and status copy', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createBindingEnergyView({ canvas, theme: 'light' });
    const drawn = withFillTextCapture(canvas, () => {
      view.render(
        createBindingEnergySim({ A: 238, showRegions: true }).getState()
      );
    });
    const labels = drawn.map((item) => item.text);
    expect(labels).toEqual(
      expect.arrayContaining([
        BINDING_ENERGY_Y_TITLE[0],
        BINDING_ENERGY_Y_TITLE[1],
        BINDING_ENERGY_X_TITLE,
        'He-4',
        'C-12',
        'Fe-56',
        'Kr-89',
        'U-235',
        'U-238',
        '聚变',
        '裂变'
      ])
    );
    expect(labels).not.toContain('比结合能 E/A (MeV)');
    expect(labels.some((text) => text.includes('原子核比结合能'))).toBe(false);
    expect(labels.some((text) => text.includes('核素档案'))).toBe(false);
    expect(labels.some((text) => text.includes('核素名称'))).toBe(false);
    expect(labels.some((text) => text.includes('E = A'))).toBe(false);
    expect(labels.some((text) => text.includes('总结合能'))).toBe(false);
    expect(labels.some((text) => text.includes('核心物理'))).toBe(false);
    expect(labels.some((text) => text.includes('方向键'))).toBe(false);
    expect(labels.some((text) => text.includes('空格'))).toBe(false);
    expect(labels.some((text) => text.includes('极不稳定'))).toBe(false);
    expect(labels.some((text) => /\d+\.\d+\s*MeV/.test(text))).toBe(false);
    view.dispose();
  });

  it('keeps U-235 and U-238 labels from overlapping', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createBindingEnergyView({ canvas, theme: 'light' });
    const drawn = withFillTextCapture(canvas, () => {
      view.render(
        createBindingEnergySim({ A: 238, showRegions: true }).getState()
      );
    });
    const u235 = drawn.find((item) => item.text === 'U-235');
    const u238 = drawn.find((item) => item.text === 'U-238');
    expect(u235).toBeDefined();
    expect(u238).toBeDefined();
    expect(
      Math.hypot(
        (u235?.x ?? 0) - (u238?.x ?? 0),
        (u235?.y ?? 0) - (u238?.y ?? 0)
      )
    ).toBeGreaterThan(16);
    expect(u235?.y).not.toBe(u238?.y);
    expect(
      u235 && u238 && boxesOverlap(drawnBox(u235), drawnBox(u238), 4)
    ).toBe(false);
    const fe = drawn.find((item) => item.text === 'Fe-56');
    const kr = drawn.find((item) => item.text === 'Kr-89');
    expect(fe).toBeDefined();
    expect(kr).toBeDefined();
    expect(
      Math.hypot((fe?.x ?? 0) - (kr?.x ?? 0), (fe?.y ?? 0) - (kr?.y ?? 0))
    ).toBeGreaterThan(16);
    if (fe && kr) {
      expect(boxesOverlap(drawnBox(fe), drawnBox(kr), 4)).toBe(false);
    }
    view.dispose();
  });

  it('keeps curve labels inside the base frame and off the slot edge', () => {
    const names = [
      ...BINDING_ENERGY_Y_TITLE,
      BINDING_ENERGY_X_TITLE,
      'He-4',
      'C-12',
      'Fe-56',
      'Kr-89',
      'U-235',
      'U-238'
    ];
    for (const slot of SLOT_SIZES) {
      const canvas = mockCanvas(slot.width, slot.height, 'mobile');
      const view = createBindingEnergyView({ canvas, theme: 'light' });
      const drawn = withFillTextCapture(canvas, () => {
        view.render(
          createBindingEnergySim({ A: 238, showRegions: true }).getState()
        );
      });
      const pose = stageTransform(slot.width, slot.height, {
        floatingReadout: false
      });
      const named = names.map((text) => {
        const item = drawn.find((entry) => entry.text === text);
        expect(item, `${slot.name} missing ${text}`).toBeDefined();
        return item!;
      });
      for (const label of named) {
        const box = drawnBox(label);
        expect(
          boxInsideFrame(box, C.labelInset),
          `${slot.name} ${label.text} ${JSON.stringify(box)}`
        ).toBe(true);
        const screenLeft = pose.offsetX + box.left * pose.fit;
        const screenRight = pose.offsetX + box.right * pose.fit;
        expect(screenLeft).toBeGreaterThanOrEqual(-0.5);
        expect(screenRight).toBeLessThanOrEqual(slot.width + 0.5);
        expect(screenRight).toBeLessThanOrEqual(slot.width - 8);
      }
      const u238 = named.find((item) => item.text === 'U-238')!;
      const u238Box = drawnBox(u238);
      expect(u238.align).toBe('right');
      expect(pose.offsetX + u238Box.right * pose.fit).toBeLessThan(
        slot.width - 12
      );
      const fe = named.find((item) => item.text === 'Fe-56')!;
      const title = named.find(
        (item) => item.text === BINDING_ENERGY_Y_TITLE[0]
      )!;
      const titleUnit = named.find(
        (item) => item.text === BINDING_ENERGY_Y_TITLE[1]
      )!;
      expect(boxesOverlap(drawnBox(fe), drawnBox(title), 6)).toBe(false);
      expect(boxesOverlap(drawnBox(fe), drawnBox(titleUnit), 6)).toBe(false);
      expect(fe.y).toBeGreaterThan(titleUnit.y + titleUnit.fontSize * 0.6);
      disposeView(view, canvas);
    }
    expect(estimateLabelWidth('U-238', 12)).toBeGreaterThan(30);
  });

  it('hides fusion/fission markers when showRegions is off', () => {
    const canvas = mockCanvas(1280, 720);
    const view = createBindingEnergyView({ canvas, theme: 'light' });
    const labels = withFillTextCapture(canvas, () => {
      view.render(
        createBindingEnergySim({ A: 56, showRegions: false }).getState()
      );
    }).map((item) => item.text);
    expect(labels).toContain('Fe-56');
    expect(labels).not.toContain('聚变');
    expect(labels).not.toContain('裂变');
    view.dispose();
  });

  it('renders light and dark themes at desktop and mobile slots without throwing', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844]
    ] as const) {
      const canvas = mockCanvas(width, height);
      const view = createBindingEnergyView({ canvas, theme: 'light' });
      expect(() => {
        const sim = createBindingEnergySim({ A: 56, autoRun: false });
        view.render(sim.getState());
        sim.step(0.4);
        view.render(sim.getState());
        view.resize();
        view.setTheme('dark');
        view.setMode('presentation', { contentScale: 1.2 });
        view.render(sim.getState());
        sim.setParams({ A: 4, showRegions: false });
        view.render(sim.getState());
        sim.setParams({ A: 235, showRegions: true });
        view.render(sim.getState());
      }).not.toThrow();
      view.dispose();
    }
  });

  it('keeps graph off the layout card and formulas off the canvas', () => {
    expect(bindingEnergyMeta.testProfile?.hasGraph).toBe(false);
    expect(bindingEnergyMeta.demoProfile?.readoutKeys).toEqual(
      expect.arrayContaining(['nuclide', 'A', 'binding', 'total', 'status'])
    );
    const titles = bindingEnergyControlsSchema.sections.map(
      (section) => section.title
    );
    expect(titles).toContain('核素');
    expect(titles).toContain('显示');
    expect(titles).toContain('质量数');
    expect(titles).toContain('要点');
    expect(titles).not.toContain('结论');
    const keys = bindingEnergyControlsSchema.sections.flatMap((section) =>
      section.fields.map((field) => field.key)
    );
    expect(keys).toEqual(
      expect.arrayContaining(['preset', 'A', 'autoRun', 'showRegions'])
    );
    const hint = bindingEnergyControlsSchema.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === 'formula');
    expect(hint && 'lines' in hint ? hint.lines : []).toEqual(
      expect.arrayContaining(['E = A × (E/A)', '← → 切换核素'])
    );
  });
});
