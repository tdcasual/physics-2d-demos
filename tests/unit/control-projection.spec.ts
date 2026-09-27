import { describe, it, expect, vi } from 'vitest';
import {
  collectFieldKeys,
  paramsFromScene,
  projectControlsFromParams,
  syncControlsFromLiveParams,
  type ControlProjectionHandle
} from '../../src/app/control-projection';
import type { ControlsSchema } from '../../src/platform/controls-schema';
import { renderSchema } from '../../src/ui/components/SchemaRenderer';

const schema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      fields: [
        {
          type: 'slider',
          key: 'speed',
          label: '速度',
          min: 0,
          max: 80,
          step: 1,
          value: 20
        },
        {
          type: 'number',
          key: 'count',
          label: '次数',
          value: 1
        },
        {
          type: 'text',
          key: 'vExprA',
          label: '表达式',
          value: 't'
        },
        {
          type: 'toggle',
          key: 'showA',
          label: '显示',
          value: false
        },
        {
          type: 'select',
          key: 'mode',
          label: '模式',
          value: 'earth',
          options: [
            { label: '地球', value: 'earth' },
            { label: '月球', value: 'moon' }
          ]
        },
        {
          type: 'preset-group',
          key: 'env',
          presets: [{ id: 'earth', label: '地球' }],
          initialActive: 'earth'
        },
        {
          type: 'scene-selector',
          key: 'scene',
          scenes: [{ id: 'a', label: 'A' }],
          initialActive: 'a'
        },
        {
          type: 'button',
          key: 'reset',
          label: '重置'
        },
        {
          type: 'button-grid',
          key: 'actions',
          buttons: [{ key: 'go', label: '走' }]
        },
        {
          type: 'hint',
          key: 'tip',
          lines: ['说明']
        },
        {
          type: 'custom',
          key: 'extra',
          label: '自定义',
          render: () => undefined
        },
        {
          type: 'transport',
          key: 'play',
          showPlay: true
        }
      ]
    }
  ]
};

function handleWithTypes(
  overrides: Partial<ControlProjectionHandle> = {}
): ControlProjectionHandle {
  return {
    fieldTypes: collectFieldKeys(schema),
    setValueSilently: vi.fn(),
    setActiveSilently: vi.fn(),
    ...overrides
  };
}

describe('collectFieldKeys', () => {
  it('maps section field keys to schema types without nested button-grid keys', () => {
    const keys = collectFieldKeys(schema);
    expect(keys.get('speed')).toBe('slider');
    expect(keys.get('mode')).toBe('select');
    expect(keys.get('env')).toBe('preset-group');
    expect(keys.get('actions')).toBe('button-grid');
    expect(keys.has('go')).toBe(false);
    expect(keys.size).toBe(schema.sections[0].fields.length);
  });
});

describe('projectControlsFromParams', () => {
  it('projects slider values via setValueSilently', () => {
    const handle = handleWithTypes();
    const ok = projectControlsFromParams({
      params: { speed: 40 },
      handle
    });
    expect(ok).toBe(true);
    expect(handle.setValueSilently).toHaveBeenCalledWith('speed', 40);
    expect(handle.setActiveSilently).not.toHaveBeenCalled();
  });

  it('projects select via setValueSilently, not setActiveSilently', () => {
    const handle = handleWithTypes();
    projectControlsFromParams({
      params: { mode: 'moon' },
      handle
    });
    expect(handle.setValueSilently).toHaveBeenCalledWith('mode', 'moon');
    expect(handle.setActiveSilently).not.toHaveBeenCalled();
  });

  it('projects preset-group via setActiveSilently', () => {
    const handle = handleWithTypes();
    projectControlsFromParams({
      params: { env: 'earth' },
      handle
    });
    expect(handle.setActiveSilently).toHaveBeenCalledWith('env', 'earth');
    expect(handle.setValueSilently).not.toHaveBeenCalled();
  });

  it('does not send text field string values through setActiveSilently', () => {
    const handle = handleWithTypes();
    projectControlsFromParams({
      params: { vExprA: '2*t+1' },
      handle
    });
    expect(handle.setValueSilently).toHaveBeenCalledWith('vExprA', '2*t+1');
    expect(handle.setActiveSilently).not.toHaveBeenCalled();
  });

  it('skips keys without silent setters and returns false', () => {
    const setValue = vi.fn();
    const setActive = vi.fn();
    const handle: ControlProjectionHandle & {
      setValue: typeof setValue;
      setActive: typeof setActive;
    } = {
      fieldTypes: collectFieldKeys(schema),
      setValue,
      setActive
    };
    const ok = projectControlsFromParams({
      params: { speed: 40, env: 'earth', vExprA: 't' },
      handle
    });
    expect(ok).toBe(false);
    expect(setValue).not.toHaveBeenCalled();
    expect(setActive).not.toHaveBeenCalled();
  });

  it('never touches scene or URL apply hooks', () => {
    const scene = {
      setParams: vi.fn(),
      setParam: vi.fn(),
      render: vi.fn(),
      reset: vi.fn(),
      getParams: vi.fn(() => ({ speed: 12 }))
    };
    const applyAll = vi.fn(() => true);
    const applyParam = vi.fn(() => true);
    const afterApply = vi.fn();
    const handle = handleWithTypes();
    projectControlsFromParams({
      params: scene.getParams(),
      handle,
      paramSync: { applyAll, applyParam, afterApply } as never
    });
    expect(scene.setParams).not.toHaveBeenCalled();
    expect(scene.setParam).not.toHaveBeenCalled();
    expect(scene.render).not.toHaveBeenCalled();
    expect(scene.reset).not.toHaveBeenCalled();
    expect(applyAll).not.toHaveBeenCalled();
    expect(applyParam).not.toHaveBeenCalled();
    expect(afterApply).not.toHaveBeenCalled();
  });

  it('reverses paramMap so projectile v0 reads live speed', () => {
    const handle = handleWithTypes({
      fieldTypes: new Map([
        ['v0', 'slider'],
        ['theta', 'slider'],
        ['preset', 'preset-group']
      ])
    });
    const ok = projectControlsFromParams({
      params: { speed: 42, angleDeg: 30, gravity: 9.8 },
      handle,
      paramSync: {
        paramMap: {
          v0: 'speed',
          theta: 'angleDeg',
          h0: 'initialHeight',
          g: 'gravity',
          c: 'drag'
        }
      }
    });
    expect(ok).toBe(true);
    expect(handle.setValueSilently).toHaveBeenCalledWith('v0', 42);
    expect(handle.setValueSilently).toHaveBeenCalledWith('theta', 30);
    expect(handle.setValueSilently).not.toHaveBeenCalledWith(
      'speed',
      expect.anything()
    );
    expect(handle.setValueSilently).not.toHaveBeenCalledWith(
      'gravity',
      expect.anything()
    );
  });

  it('returns false when the handle has no field-type table', () => {
    const handle: ControlProjectionHandle = {
      setValueSilently: vi.fn(),
      setActiveSilently: vi.fn()
    };
    const ok = projectControlsFromParams({
      params: { speed: 40 },
      handle
    });
    expect(ok).toBe(false);
    expect(handle.setValueSilently).not.toHaveBeenCalled();
  });

  it('does not dispatch button / hint / custom / transport keys', () => {
    const handle = handleWithTypes();
    projectControlsFromParams({
      params: { reset: true, actions: 'go', tip: 'x', extra: 1, play: true },
      handle
    });
    expect(handle.setValueSilently).not.toHaveBeenCalled();
    expect(handle.setActiveSilently).not.toHaveBeenCalled();
  });

  it('reads fieldTypes attached by renderSchema', () => {
    const mount = document.createElement('div');
    const renderer = renderSchema({
      mount,
      schema: {
        sections: [
          {
            title: '参数',
            fields: [
              {
                type: 'slider',
                key: 'speed',
                label: '速度',
                min: 0,
                max: 80,
                step: 1,
                value: 20
              }
            ]
          }
        ]
      },
      onChange: vi.fn(),
      onAction: vi.fn()
    });
    expect(renderer.fieldTypes.get('speed')).toBe('slider');
    const spy = vi.spyOn(renderer, 'setValueSilently');
    const ok = projectControlsFromParams({
      params: { speed: 40 },
      handle: renderer
    });
    expect(ok).toBe(true);
    expect(spy).toHaveBeenCalledWith('speed', 40);
    const input = mount.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('40');
  });
});

describe('syncControlsFromLiveParams', () => {
  it('prefers handle.syncFromScene over the generic projector', () => {
    const syncFromScene = vi.fn();
    const refresh = vi.fn();
    const setValueSilently = vi.fn();
    syncControlsFromLiveParams({
      params: { speed: 40 },
      handle: {
        fieldTypes: collectFieldKeys(schema),
        setValueSilently,
        syncFromScene,
        refresh
      }
    });
    expect(syncFromScene).toHaveBeenCalledOnce();
    expect(setValueSilently).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('falls back to handle.refresh when the projector cannot project', () => {
    const refresh = vi.fn();
    syncControlsFromLiveParams({
      params: { speed: 40 },
      handle: { refresh }
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('skips refresh when at least one key was projected', () => {
    const refresh = vi.fn();
    const setValueSilently = vi.fn();
    syncControlsFromLiveParams({
      params: { speed: 40 },
      handle: {
        fieldTypes: collectFieldKeys(schema),
        setValueSilently,
        refresh
      }
    });
    expect(setValueSilently).toHaveBeenCalledWith('speed', 40);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('paramsFromScene', () => {
  it('reads getParams and returns an empty bag when missing', () => {
    expect(paramsFromScene({ getParams: () => ({ speed: 3 }) })).toEqual({
      speed: 3
    });
    expect(paramsFromScene({})).toEqual({});
    expect(paramsFromScene(null)).toEqual({});
  });
});
