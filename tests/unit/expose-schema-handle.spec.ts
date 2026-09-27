import { describe, expect, it, vi } from 'vitest';
import { exposeSchemaHandle } from '../../src/ui/components/expose-schema-handle';
import { renderSchema } from '../../src/ui/components/SchemaRenderer';
import type { ControlsSchema } from '../../src/platform/controls-schema';

describe('exposeSchemaHandle', () => {
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
            type: 'preset-group',
            key: 'env',
            presets: [{ id: 'earth', label: '地球' }],
            initialActive: 'earth'
          }
        ]
      }
    ]
  };

  function createRenderer() {
    return renderSchema({
      mount: document.createElement('div'),
      schema,
      onChange: vi.fn(),
      onAction: vi.fn()
    });
  }

  it('forwards the six methods and transcludes fieldTypes by reference', () => {
    const renderer = createRenderer();
    const handle = exposeSchemaHandle(renderer);

    expect(handle.fieldTypes).toBe(renderer.fieldTypes);
    expect(handle.fieldTypes.get('speed')).toBe('slider');
    expect(handle.fieldTypes.get('env')).toBe('preset-group');

    const setValue = vi.spyOn(renderer, 'setValue');
    const setValueSilently = vi.spyOn(renderer, 'setValueSilently');
    const setActive = vi.spyOn(renderer, 'setActive');
    const setActiveSilently = vi.spyOn(renderer, 'setActiveSilently');
    const setVisible = vi.spyOn(renderer, 'setVisible');
    const dispose = vi.spyOn(renderer, 'dispose');

    handle.setValue('speed', 40);
    handle.setValueSilently('speed', 50);
    handle.setActive('env', 'earth');
    handle.setActiveSilently('env', 'earth');
    handle.setVisible('speed', false);
    handle.dispose();

    expect(setValue).toHaveBeenCalledWith('speed', 40);
    expect(setValueSilently).toHaveBeenCalledWith('speed', 50);
    expect(setActive).toHaveBeenCalledWith('env', 'earth');
    expect(setActiveSilently).toHaveBeenCalledWith('env', 'earth');
    expect(setVisible).toHaveBeenCalledWith('speed', false);
    expect(dispose).toHaveBeenCalledOnce();
  });
});
