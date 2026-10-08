/**
 * vt-integral：URL 编码 round-trip、?scene=N 选择器高亮、左/右端点开关、
 * 子场景控件可见性、读数单位。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applySceneUrlParams } from '../../src/app/url-sync';
import type { SceneParamSync } from '../../src/app/scene-bootstrapper-types';
import { createVtIntegralScene } from '../../src/scenes/vt-integral/scene.entry';
import { vtIntegralMeta } from '../../src/scenes/vt-integral/scene.meta';

type Handle = {
  syncFromScene?: () => void;
  dispose: () => void;
  setValueSilently?: (key: string, value: unknown) => void;
  setActiveSilently?: (key: string, id: string) => void;
};

type CreateControls = (o: {
  mount: HTMLElement;
  scene: unknown;
  writeParam?: (key: string, value: number | string | boolean) => void;
  scheduleRender?: () => void;
}) => Handle;

const captured = vi.hoisted(() => ({
  createControls: null as unknown,
  paramSync: null as unknown
}));

vi.mock('../../src/app/scene-bootstrapper', () => ({
  bootScenePage: (opts: { createControls: unknown; paramSync?: unknown }) => {
    captured.createControls = opts.createControls;
    captured.paramSync = opts.paramSync;
  }
}));

import '../../src/scenes/vt-integral/page';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
});

function mount(scene = createVtIntegralScene()) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const writeParam = vi.fn();
  const handle = (captured.createControls as CreateControls)({
    mount: el,
    scene,
    writeParam,
    scheduleRender: vi.fn()
  });
  cleanups.push(() => {
    handle.dispose();
    el.remove();
  });
  return { el, scene, handle, writeParam };
}

function activeScene(el: HTMLElement): string {
  return (
    el.querySelector('[data-control-key="scene"] button[aria-checked="true"]')
      ?.textContent ?? ''
  );
}

function select(el: HTMLElement, key: string): HTMLSelectElement {
  const node = el.querySelector(`[data-control-key="${key}"] select`);
  if (!(node instanceof HTMLSelectElement)) throw new Error(`no select ${key}`);
  return node;
}

function slider(el: HTMLElement, key: string): HTMLInputElement {
  const node = el.querySelector(`[data-control-key="${key}"] input`);
  if (!(node instanceof HTMLInputElement)) throw new Error(`no slider ${key}`);
  return node;
}

function hidden(el: HTMLElement, selector: string): boolean {
  return (el.querySelector(selector) as HTMLElement | null)?.hidden ?? true;
}

function readout(scene: ReturnType<typeof createVtIntegralScene>, key: string) {
  const item = scene.getReadoutItems().find((r) => r.key === key);
  if (!item) throw new Error(`readout ${key} missing`);
  return item;
}

describe('vt-integral entry · URL 参数编码', () => {
  it('defaults match meta.defaultParams (n = 10, scene = 1, rule = 0 → left)', () => {
    const scene = createVtIntegralScene();
    expect(scene.getParams()).toEqual({ n: 10, scene: 1, rule: 0 });
    expect(vtIntegralMeta.defaultParams).toEqual({ n: 10, scene: 1, rule: 0 });
  });

  it('round-trips setParams → getParams with numeric scene and rule', () => {
    const scene = createVtIntegralScene();
    expect(scene.setParams({ scene: 3, n: 12, rule: 1 })).toEqual({
      n: 12,
      scene: 3,
      rule: 1
    });
    expect(scene.getParams()).toEqual({ n: 12, scene: 3, rule: 1 });
    const again = createVtIntegralScene();
    again.setParams(scene.getParams());
    expect(again.getParams()).toEqual({ n: 12, scene: 3, rule: 1 });
  });

  it('reset returns to n = 10 / left rule while keeping the sub-scene', () => {
    const scene = createVtIntegralScene();
    scene.setParams({ scene: 3, n: 30, rule: 1 });
    scene.reset();
    expect(scene.getParams()).toEqual({ n: 10, scene: 3, rule: 0 });
    expect(scene.getSnapshot().params.circleN).toBe(10);
  });
});

describe('vt-integral readouts · 单位与偏小/偏大', () => {
  it('left rule, n = 10: S = 5.6250 m (偏小), x = 6.2500 m, Δ = −0.6250 m', () => {
    const scene = createVtIntegralScene();
    expect(readout(scene, 'rect-area')).toMatchObject({
      label: '左端点矩形和 S',
      value: '5.6250 m（偏小）'
    });
    expect(readout(scene, 'true-area').value).toBe('6.2500 m');
    expect(readout(scene, 'abs-err').value).toBe('−0.6250 m');
    expect(readout(scene, 'rel-err').value).toBe('10.00%');
  });

  it('right rule, n = 10: S = 6.8750 m (偏大), Δ = +0.6250 m', () => {
    const scene = createVtIntegralScene();
    scene.setParams({ rule: 1 });
    expect(readout(scene, 'rect-area')).toMatchObject({
      label: '右端点矩形和 S',
      value: '6.8750 m（偏大）'
    });
    expect(readout(scene, 'abs-err').value).toBe('+0.6250 m');
  });

  it('scene3 polygon perimeter uses the shared n (n = 6 → 6.0000)', () => {
    const scene = createVtIntegralScene();
    scene.setParams({ scene: 3, n: 6 });
    expect(readout(scene, 'n').value).toBe('6');
    expect(readout(scene, 'poly').value).toBe('6.0000');
  });
});

describe('vt-integral page · URL 恢复与控件', () => {
  it('?scene=2&n=12&rule=1 highlights the right selector button and projects controls', () => {
    const { el, scene, handle } = mount();
    applySceneUrlParams(
      vtIntegralMeta,
      { scene, controls: handle, mount: el, scheduleRender: vi.fn() },
      captured.paramSync as SceneParamSync,
      { scene: 2, n: 12, rule: 1 }
    );
    expect(scene.getParams()).toEqual({ n: 12, scene: 2, rule: 1 });
    expect(activeScene(el)).toContain('化曲为直');
    expect(slider(el, 'n').value).toBe('12');
    expect(select(el, 'rule').value).toBe('1');
    expect(hidden(el, '[data-control-section="分割"]')).toBe(true);
  });

  it('?scene=3 highlights 割圆术 and hides the rule switch but keeps n', () => {
    const { el, scene, handle } = mount();
    applySceneUrlParams(
      vtIntegralMeta,
      { scene, controls: handle, mount: el, scheduleRender: vi.fn() },
      captured.paramSync as SceneParamSync,
      { scene: 3 }
    );
    expect(activeScene(el)).toContain('割圆术');
    expect(hidden(el, '[data-control-section="分割"]')).toBe(false);
    expect(hidden(el, '[data-control-key="rule"]')).toBe(true);
    expect(hidden(el, '[data-control-section="函数类型"]')).toBe(true);
  });

  it('writes numeric scene / rule to the URL when the user switches', () => {
    const { el, scene, writeParam } = mount();
    const scene3 = Array.from(
      el.querySelectorAll<HTMLButtonElement>(
        '[data-control-key="scene"] button'
      )
    ).find((b) => b.textContent?.includes('割圆术'));
    scene3?.click();
    expect(writeParam).toHaveBeenCalledWith('scene', 3);
    expect(scene.getParams().scene).toBe(3);

    const rule = select(el, 'rule');
    rule.value = '1';
    rule.dispatchEvent(new Event('change', { bubbles: true }));
    expect(writeParam).toHaveBeenCalledWith('rule', 1);
    expect(scene.getParams().rule).toBe(1);
  });

  it('scene1 shows curve presets and the rule switch by default', () => {
    const { el } = mount();
    expect(hidden(el, '[data-control-section="函数类型"]')).toBe(false);
    expect(hidden(el, '[data-control-key="rule"]')).toBe(false);
    expect(select(el, 'rule').value).toBe('0');
  });

  it('syncFromScene projects rule silently after reset', () => {
    const scene = createVtIntegralScene();
    scene.setParams({ rule: 1 });
    const { el, handle, writeParam } = mount(scene);
    handle.syncFromScene?.();
    expect(select(el, 'rule').value).toBe('1');
    scene.reset();
    const events: string[] = [];
    el.addEventListener('change', () => events.push('change'), true);
    el.addEventListener('input', () => events.push('input'), true);
    handle.syncFromScene?.();
    expect(select(el, 'rule').value).toBe('0');
    expect(slider(el, 'n').value).toBe('10');
    expect(events).toEqual([]);
    expect(writeParam).not.toHaveBeenCalled();
  });
});
