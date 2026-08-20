import { describe, it, expect, vi } from 'vitest';
import {
  createSliderRow,
  createNumberInputRow,
  createTextInputRow,
  createSelectRow,
  createButtonGrid,
  createPresetButtonGroup,
  createTransportRow,
  createSceneSelector
} from '../../src/ui/components/scene-controls';

describe('SceneControls', () => {
  describe('createSliderRow', () => {
    it('should create a slider with label and input', () => {
      const onChange = vi.fn();
      const row = createSliderRow('速度', {
        min: 0,
        max: 100,
        step: 1,
        value: 50,
        unit: 'm/s',
        onChange
      });

      expect(row.tagName).toBe('DIV');
      const spans = row.querySelectorAll('span');
      expect(spans[0]?.textContent).toBe('速度');
      expect(row.querySelector('input[type="range"]')).not.toBeNull();
      expect(spans[1]?.textContent).toBe('50m/s');
    });

    it('should call onChange when slider value changes', () => {
      const onChange = vi.fn();
      const row = createSliderRow('角度', {
        min: 0,
        max: 90,
        step: 0.1,
        value: 45,
        onChange
      });
      const input = row.querySelector('input') as HTMLInputElement;

      input.value = '60';
      input.dispatchEvent(new Event('input'));
      expect(onChange).toHaveBeenCalledWith(60);
    });
  });

  describe('createNumberInputRow', () => {
    it('should create a number input row', () => {
      const onChange = vi.fn();
      const row = createNumberInputRow(
        '时间',
        { value: 10, min: 0, max: 120, step: 0.5, unit: 's' },
        onChange
      );

      expect(row.querySelector('label')?.textContent).toBe('时间');
      expect(row.querySelector('input[type="number"]')).not.toBeNull();
    });

    it('should call onChange on blur with parsed number', () => {
      const onChange = vi.fn();
      const row = createNumberInputRow('步长', { value: 0.05 }, onChange);
      const input = row.querySelector('input') as HTMLInputElement;

      input.value = '0.1';
      input.dispatchEvent(new Event('change'));
      expect(onChange).toHaveBeenCalledWith(0.1);
    });
  });

  describe('createTextInputRow', () => {
    it('should create a text input row', () => {
      const onChange = vi.fn();
      const row = createTextInputRow(
        '表达式',
        { value: '2*t', fontFamily: 'monospace' },
        onChange
      );

      expect(row.querySelector('label')?.textContent).toBe('表达式');
      const input = row.querySelector('input') as HTMLInputElement;
      expect(input.type).toBe('text');
      expect(input.value).toBe('2*t');
    });
  });

  describe('createSelectRow', () => {
    it('should create a select dropdown', () => {
      const onChange = vi.fn();
      const row = createSelectRow('场景', {
        choices: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' }
        ],
        value: 'a',
        onChange
      });

      const select = row.querySelector('select') as HTMLSelectElement;
      expect(select).not.toBeNull();
      expect(select.options.length).toBe(2);
      expect(select.value).toBe('a');
    });

    it('should call onChange when selection changes', () => {
      const onChange = vi.fn();
      const row = createSelectRow('类型', {
        choices: [
          { label: 'X', value: 'x' },
          { label: 'Y', value: 'y' }
        ],
        value: 'x',
        onChange
      });
      const select = row.querySelector('select') as HTMLSelectElement;

      select.value = 'y';
      select.dispatchEvent(new Event('change'));
      expect(onChange).toHaveBeenCalledWith('y');
    });
  });

  describe('createButtonGrid', () => {
    it('should create a grid of buttons', () => {
      const onClickA = vi.fn();
      const onClickB = vi.fn();
      const grid = createButtonGrid(
        [
          { label: '按钮A', onClick: onClickA },
          { label: '按钮B', desc: '描述', onClick: onClickB }
        ],
        2
      );

      const buttons = grid.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toContain('按钮A');
      expect(buttons[1].textContent).toContain('按钮B');
    });

    it('should call onClick when button is clicked', () => {
      const onClick = vi.fn();
      const grid = createButtonGrid([{ label: '点击', onClick }], 1);
      const button = grid.querySelector('button') as HTMLButtonElement;

      button.click();
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('createPresetButtonGroup', () => {
    it('should create preset buttons with active state', () => {
      const onSelect = vi.fn();
      const mount = document.createElement('div');
      createPresetButtonGroup(
        mount,
        [
          { id: 'earth', label: '地球', desc: 'g=9.8' },
          { id: 'moon', label: '月球', desc: 'g=1.6' }
        ],
        { initialActive: 'earth', onSelect }
      );

      const buttons = mount.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      const labelSpan = buttons[0].querySelector('span') as HTMLElement;
      expect(labelSpan.style.color).toContain('var(--text-primary)');
    });

    it('should call onSelect and update active state', () => {
      const onSelect = vi.fn();
      const mount = document.createElement('div');
      const preset = createPresetButtonGroup(
        mount,
        [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' }
        ],
        { onSelect }
      );

      const buttons = mount.querySelectorAll('button');
      buttons[1].click();
      expect(onSelect).toHaveBeenCalledWith('b');

      preset.setActive('b');
      const labelSpan = buttons[1].querySelector('span') as HTMLElement;
      expect(labelSpan.style.color).toContain('var(--text-primary)');
    });
  });

  describe('createTransportRow', () => {
    it('should create transport buttons', () => {
      const onPlay = vi.fn();
      const onPause = vi.fn();
      const mount = document.createElement('div');
      createTransportRow(mount, { onPlay, onPause });

      const buttons = mount.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should call callbacks when buttons clicked', () => {
      const onPlay = vi.fn();
      const onReset = vi.fn();
      const mount = document.createElement('div');
      createTransportRow(mount, { onPlay, onReset });

      const buttons = mount.querySelectorAll('button');
      buttons[0].click();
      expect(onPlay).toHaveBeenCalled();
    });
  });

  describe('createSceneSelector', () => {
    it('should create scene selector buttons', () => {
      const onSelect = vi.fn();
      const mount = document.createElement('div');
      const selector = createSceneSelector(
        mount,
        [
          { id: 's1', label: '场景1', desc: '描述1' },
          { id: 's2', label: '场景2' }
        ],
        { initialActive: 's1', onSelect }
      );

      const buttons = mount.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].style.borderColor).toContain('var(--accent-primary)');

      buttons[1].click();
      expect(onSelect).toHaveBeenCalledWith('s2');

      selector.setActive('s2');
      expect(buttons[1].style.borderColor).toContain('var(--accent-primary)');
    });

    it('supports radio keyboard navigation with roving tabindex', () => {
      const onSelect = vi.fn();
      const mount = document.createElement('div');
      createSceneSelector(
        mount,
        [
          { id: 's1', label: '场景1' },
          { id: 's2', label: '场景2' },
          { id: 's3', label: '场景3' }
        ],
        { initialActive: 's1', onSelect }
      );

      const buttons = Array.from(mount.querySelectorAll('button'));
      expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1]);
      expect(buttons[0]?.getAttribute('aria-checked')).toBe('true');

      buttons[0]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
      expect(onSelect).toHaveBeenLastCalledWith('s2');
      expect(buttons.map((button) => button.tabIndex)).toEqual([-1, 0, -1]);
      expect(buttons[1]?.getAttribute('aria-checked')).toBe('true');

      buttons[1]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true })
      );
      expect(onSelect).toHaveBeenLastCalledWith('s3');
      expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1, 0]);
    });
  });
});
