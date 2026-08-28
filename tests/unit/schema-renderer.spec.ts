import { describe, it, expect, vi } from 'vitest';
import { renderSchema } from '../../src/ui/components/SchemaRenderer';
import type { ControlsSchema } from '../../src/platform/controls-schema';

describe('SchemaRenderer', () => {
  const createMount = () => document.createElement('div');

  it('should render all sections', () => {
    const mount = createMount();
    const schema: ControlsSchema = {
      sections: [
        { title: '参数', fields: [] },
        { title: '预设', fields: [] }
      ]
    };

    const renderer = renderSchema({
      mount,
      schema,
      onChange: vi.fn(),
      onAction: vi.fn()
    });

    expect(renderer.element).toBe(mount);
    const headers = mount.querySelectorAll('div');
    expect(headers.length).toBeGreaterThanOrEqual(2);
  });

  it('marks control sections and fields for demo-profile filtering', () => {
    const mount = createMount();
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
              max: 10,
              step: 1,
              value: 5
            }
          ]
        }
      ]
    };

    renderSchema({ mount, schema, onChange: vi.fn(), onAction: vi.fn() });

    expect(mount.querySelector('[data-control-section="参数"]')).not.toBeNull();
    expect(mount.querySelector('[data-control-key="speed"]')).not.toBeNull();
  });

  it('should render slider and call onChange', () => {
    const mount = createMount();
    const onChange = vi.fn();
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
              max: 100,
              step: 1,
              value: 50
            }
          ]
        }
      ]
    };

    renderSchema({ mount, schema, onChange, onAction: vi.fn() });

    const input = mount.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('50');

    input.value = '75';
    input.dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenCalledWith('speed', 75);
  });

  it('should render number input and call onChange', () => {
    const mount = createMount();
    const onChange = vi.fn();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '参数',
          fields: [
            {
              type: 'number',
              key: 'count',
              label: '数量',
              value: 10,
              min: 0,
              max: 100
            }
          ]
        }
      ]
    };

    renderSchema({ mount, schema, onChange, onAction: vi.fn() });

    const input = mount.querySelector(
      'input[type="number"]'
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('10');
  });

  it('should render preset-group and call onChange', () => {
    const mount = createMount();
    const onChange = vi.fn();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '预设',
          fields: [
            {
              type: 'preset-group',
              key: 'env',
              presets: [
                { id: 'earth', label: '地球' },
                { id: 'moon', label: '月球' }
              ],
              initialActive: 'earth'
            }
          ]
        }
      ]
    };

    const renderer = renderSchema({
      mount,
      schema,
      onChange,
      onAction: vi.fn()
    });

    const buttons = mount.querySelectorAll('button');
    expect(buttons.length).toBe(3); // 2 presets + 1 card toggle

    buttons[2].click();
    expect(onChange).toHaveBeenCalledWith('env', 'moon');

    renderer.setActive('env', 'moon');
    expect(buttons[2].querySelector('span')?.style.color).toContain(
      'var(--text-primary)'
    );
  });

  it('should render scene-selector and call onChange', () => {
    const mount = createMount();
    const onChange = vi.fn();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '场景',
          fields: [
            {
              type: 'scene-selector',
              key: 'scene',
              scenes: [
                { id: 'a', label: '场景A' },
                { id: 'b', label: '场景B' }
              ]
            }
          ]
        }
      ]
    };

    const renderer = renderSchema({
      mount,
      schema,
      onChange,
      onAction: vi.fn()
    });

    const buttons = mount.querySelectorAll('button');
    expect(buttons.length).toBe(3); // 2 scenes + 1 card toggle

    buttons[2].click();
    expect(onChange).toHaveBeenCalledWith('scene', 'b');

    renderer.setActive('scene', 'b');
    expect(buttons[2].style.borderColor).toContain('var(--accent-primary)');
  });

  it('should render transport and call onAction', () => {
    const mount = createMount();
    const onAction = vi.fn();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '控制',
          fields: [{ type: 'transport', key: 'transport' }]
        }
      ]
    };

    renderSchema({ mount, schema, onChange: vi.fn(), onAction });

    const buttons = mount.querySelectorAll('button');
    // transport buttons + card toggle
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    // Find play button (skip card toggle at index 0)
    const playButton = Array.from(buttons).find(
      (b) =>
        b.textContent?.includes('▶') ||
        b.getAttribute('aria-label')?.includes('播放')
    );
    if (playButton) {
      playButton.click();
      expect(onAction).toHaveBeenCalledWith('transport:play');
    }
  });

  it('should render button-grid and call onAction', () => {
    const mount = createMount();
    const onAction = vi.fn();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '操作',
          fields: [
            {
              type: 'button-grid',
              key: 'action',
              columns: 2,
              buttons: [
                { key: 'btn1', label: '按钮1' },
                { key: 'btn2', label: '按钮2' }
              ]
            }
          ]
        }
      ]
    };

    renderSchema({ mount, schema, onChange: vi.fn(), onAction });

    const buttons = mount.querySelectorAll('button');
    expect(buttons.length).toBe(3); // 2 grid buttons + 1 card toggle

    // Skip card toggle (first button), click second button (btn1)
    buttons[1].click();
    expect(onAction).toHaveBeenCalledWith('btn1');
  });

  it('should setValue for slider', () => {
    const mount = createMount();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '参数',
          fields: [
            {
              type: 'slider',
              key: 'x',
              label: 'X',
              min: 0,
              max: 10,
              step: 1,
              value: 5
            }
          ]
        }
      ]
    };

    const renderer = renderSchema({
      mount,
      schema,
      onChange: vi.fn(),
      onAction: vi.fn()
    });
    const input = mount.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('5');

    renderer.setValue('x', 8);
    expect(input.value).toBe('8');
  });

  it('should render select and call onChange', () => {
    const mount = createMount();
    const onChange = vi.fn();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '选项',
          fields: [
            {
              type: 'select',
              key: 'method',
              label: '方法',
              value: 'left',
              options: [
                { label: '左', value: 'left' },
                { label: '右', value: 'right' }
              ]
            }
          ]
        }
      ]
    };

    renderSchema({ mount, schema, onChange, onAction: vi.fn() });

    const select = mount.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe('left');

    select.value = 'right';
    select.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith('method', 'right');
  });

  it('should render text input and call onChange', () => {
    const mount = createMount();
    const onChange = vi.fn();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '输入',
          fields: [{ type: 'text', key: 'expr', label: '表达式', value: 't' }]
        }
      ]
    };

    renderSchema({ mount, schema, onChange, onAction: vi.fn() });

    const input = mount.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('t');
  });

  it('should render hint as static paragraphs without onChange', () => {
    const mount = createMount();
    const onChange = vi.fn();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '说明',
          fields: [
            {
              type: 'hint',
              key: 'hint',
              lines: ['• 第一行', '• 第二行']
            }
          ]
        }
      ]
    };

    renderSchema({ mount, schema, onChange, onAction: vi.fn() });

    const hintNode = mount.querySelector(
      '[data-control-key="hint"]'
    ) as HTMLElement;
    expect(hintNode).not.toBeNull();
    expect(hintNode.className).toContain('text-sm');
    expect(hintNode.style.color).toContain('var(--text-secondary)');
    const paragraphs = hintNode.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].textContent).toBe('• 第一行');
    expect(paragraphs[1].textContent).toBe('• 第二行');
    // hint 是静态文本，不应产生任何 onChange
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render button and call onAction', () => {
    const mount = createMount();
    const onAction = vi.fn();
    const schema: ControlsSchema = {
      sections: [
        {
          title: '操作',
          fields: [{ type: 'button', key: 'reset', label: '重置' }]
        }
      ]
    };

    renderSchema({ mount, schema, onChange: vi.fn(), onAction });

    const buttons = mount.querySelectorAll('button');
    expect(buttons.length).toBe(2); // 1 button + 1 card toggle
    // Skip card toggle (first button)
    const button = buttons[1] as HTMLButtonElement;
    expect(button.textContent).toContain('重置');

    button.click();
    expect(onAction).toHaveBeenCalledWith('reset');
  });
});
