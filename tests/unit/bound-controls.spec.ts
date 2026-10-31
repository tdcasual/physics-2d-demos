import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ControlsSchema } from '../../src/platform/controls-schema';
import {
  collectBindings,
  controlToParam,
  paramToControl
} from '../../src/platform/param-binding';
import { createBoundControls } from '../../src/ui/components/bound-controls';
import { matchesVisibleWhen } from '../../src/ui/components/SchemaRenderer';

const schema: ControlsSchema = {
  sections: [
    {
      title: '模式',
      fields: [
        {
          type: 'scene-selector',
          key: 'mode',
          initialActive: 'a',
          bind: { values: { a: 1, b: 2 } },
          scenes: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' }
          ]
        }
      ]
    },
    {
      title: '仅 A',
      visibleWhen: { mode: 'a' },
      fields: [
        {
          type: 'slider',
          key: 'pct',
          label: '位置',
          min: 0,
          max: 100,
          step: 1,
          value: 50,
          bind: { param: 'ratio', scale: 100 }
        },
        {
          type: 'toggle',
          key: 'every',
          label: '每五点',
          value: false,
          bind: { values: { true: 5, false: 1 } },
          visibleWhen: { pct: [50, 60] }
        }
      ]
    }
  ]
};

const mounts: HTMLElement[] = [];
afterEach(() => {
  mounts.splice(0).forEach((el) => el.remove());
});

function setup(
  onChange?: Parameters<typeof createBoundControls>[0]['onChange']
) {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  mounts.push(mount);
  const scene = { setParams: vi.fn(), render: vi.fn() };
  const scheduleRender = vi.fn();
  const writeParam = vi.fn();
  const handle = createBoundControls({
    mount,
    schema,
    scene,
    scheduleRender,
    writeParam,
    onChange
  });
  return { mount, scene, scheduleRender, writeParam, handle };
}

function section(mount: HTMLElement, title: string): HTMLElement {
  return mount.querySelector(
    `[data-control-section="${title}"]`
  ) as HTMLElement;
}

function field(mount: HTMLElement, key: string): HTMLElement {
  return mount.querySelector(`[data-control-key="${key}"]`) as HTMLElement;
}

describe('param-binding codecs', () => {
  const bindings = collectBindings(schema);

  it('encodes and decodes enum values', () => {
    expect(controlToParam('mode', 'b', bindings)).toBe(2);
    expect(paramToControl('mode', 2, bindings)).toBe('b');
    expect(paramToControl('mode', 9, bindings)).toBe(9);
  });

  it('decodes toggle codecs back to booleans', () => {
    expect(controlToParam('every', true, bindings)).toBe(5);
    expect(paramToControl('every', 5, bindings)).toBe(true);
    expect(paramToControl('every', 1, bindings)).toBe(false);
  });
});

describe('createBoundControls default routing', () => {
  it('routes through bind (rename, scale, enum) then renders and writes control value', () => {
    const { mount, scene, scheduleRender, writeParam } = setup();
    const slider = field(mount, 'pct').querySelector(
      'input'
    ) as HTMLInputElement;
    slider.value = '30';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(scene.setParams).toHaveBeenCalledWith({ ratio: 0.3 });
    expect(writeParam).toHaveBeenCalledWith('pct', 30);

    const b = Array.from(field(mount, 'mode').querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('B')
    );
    b?.click();
    expect(scene.setParams).toHaveBeenCalledWith({ mode: 2 });
    expect(writeParam).toHaveBeenCalledWith('mode', 'b');
    expect(scheduleRender).toHaveBeenCalledTimes(2);
  });

  it('true from onChange skips setParams but still renders and writes; skip does neither', () => {
    const results: Array<boolean | 'skip'> = [true, 'skip'];
    const { mount, scene, scheduleRender, writeParam } = setup(() =>
      results.shift()
    );
    const slider = field(mount, 'pct').querySelector(
      'input'
    ) as HTMLInputElement;
    slider.value = '40';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.value = '41';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(scene.setParams).not.toHaveBeenCalled();
    expect(scheduleRender).toHaveBeenCalledTimes(1);
    expect(writeParam).toHaveBeenCalledTimes(1);
  });
});

describe('bind.action', () => {
  it('calls scene.reset via bind.action and projects params', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    mounts.push(mount);
    const actionSchema: ControlsSchema = {
      sections: [
        {
          title: '操作',
          fields: [
            {
              type: 'slider',
              key: 'speed',
              label: '速度',
              min: 0,
              max: 10,
              step: 1,
              value: 5
            },
            {
              type: 'button',
              key: 'reset',
              label: '重置',
              bind: { action: 'reset' }
            },
            {
              type: 'button',
              key: 'fire',
              label: '发射',
              bind: { action: 'fireBeam' }
            }
          ]
        }
      ]
    };
    let speed = 5;
    const scene = {
      setParams: vi.fn(),
      render: vi.fn(),
      fireBeam: vi.fn(),
      reset: vi.fn(() => {
        speed = 1;
      }),
      getParams: () => ({ speed })
    };
    const handle = createBoundControls({
      mount,
      schema: actionSchema,
      scene,
      scheduleRender: vi.fn(),
      writeParam: vi.fn()
    });
    const fire = field(mount, 'fire').querySelector(
      'button'
    ) as HTMLButtonElement;
    fire.click();
    expect(scene.fireBeam).toHaveBeenCalledTimes(1);

    handle.setValueSilently?.('speed', 9);
    const reset = field(mount, 'reset').querySelector(
      'button'
    ) as HTMLButtonElement;
    reset.click();
    expect(scene.reset).toHaveBeenCalledTimes(1);
    const slider = field(mount, 'speed').querySelector(
      'input'
    ) as HTMLInputElement;
    expect(slider.value).toBe('1');
  });
});

describe('visibleWhen', () => {
  it('evaluates AND across keys and OR within arrays', () => {
    const state = new Map<string, unknown>([
      ['mode', 'a'],
      ['pct', 60]
    ]);
    expect(matchesVisibleWhen({ mode: 'a', pct: [50, 60] }, state)).toBe(true);
    expect(matchesVisibleWhen({ mode: 'b' }, state)).toBe(false);
  });

  it('tracks user input and silent projection', () => {
    const { mount, handle } = setup();
    expect(section(mount, '仅 A').hidden).toBe(false);
    expect(field(mount, 'every').hidden).toBe(false);

    handle.setActiveSilently?.('mode', 'b');
    expect(section(mount, '仅 A').hidden).toBe(true);

    handle.setActiveSilently?.('mode', 'a');
    handle.setValueSilently?.('pct', 10);
    expect(section(mount, '仅 A').hidden).toBe(false);
    expect(field(mount, 'every').hidden).toBe(true);
  });
});
