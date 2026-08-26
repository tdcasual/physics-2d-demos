import { describe, it, expect, vi } from 'vitest';
import {
  createSliderRow,
  createNumberInputRow,
  createTextInputRow,
  createSelectRow,
  createButtonGrid,
  createPresetButtonGroup,
  createTransportRow,
  createSceneSelector,
  createToggleRow
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
      const labelEl = row.querySelector('label');
      expect(labelEl?.textContent).toBe('速度');
      expect(row.querySelector('input[type="range"]')).not.toBeNull();
      const valueEl = row.querySelector('span');
      expect(valueEl?.textContent).toBe('50m/s');
    });

    it('should associate the label with the slider via htmlFor/id', () => {
      const row = createSliderRow('速度', {
        min: 0,
        max: 100,
        step: 1,
        value: 50
      });

      const labelEl = row.querySelector('label') as HTMLLabelElement;
      const slider = row.querySelector(
        'input[type="range"]'
      ) as HTMLInputElement;
      expect(slider.id).toBeTruthy();
      expect(labelEl.htmlFor).toBe(slider.id);
    });

    it('should generate unique slider ids across instances', () => {
      const a = createSliderRow('速度', {
        min: 0,
        max: 100,
        step: 1,
        value: 50
      });
      const b = createSliderRow('速度', {
        min: 0,
        max: 100,
        step: 1,
        value: 50
      });
      const idA = a.querySelector('input')?.id;
      const idB = b.querySelector('input')?.id;
      expect(idA).toBeTruthy();
      expect(idB).toBeTruthy();
      expect(idA).not.toBe(idB);
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

  describe('createToggleRow', () => {
    it('should expose an accessible name via aria-labelledby', () => {
      const row = createToggleRow('显示轨迹', { value: true });

      const labelEl = row.querySelector('span') as HTMLSpanElement;
      const track = row.querySelector(
        'button[role="switch"]'
      ) as HTMLButtonElement;
      expect(labelEl.textContent).toBe('显示轨迹');
      expect(labelEl.id).toBeTruthy();
      expect(track.getAttribute('aria-labelledby')).toBe(labelEl.id);
      expect(track.getAttribute('aria-checked')).toBe('true');
    });

    it('should generate unique label ids across instances', () => {
      const a = createToggleRow('显示轨迹', { value: false });
      const b = createToggleRow('显示轨迹', { value: false });
      const idA = a.querySelector('span')?.id;
      const idB = b.querySelector('span')?.id;
      expect(idA).toBeTruthy();
      expect(idB).toBeTruthy();
      expect(idA).not.toBe(idB);
    });

    it('should carry the hit-area expansion class', () => {
      const row = createToggleRow('显示轨迹', { value: false });
      const track = row.querySelector(
        'button[role="switch"]'
      ) as HTMLButtonElement;
      expect(track.classList.contains('toggle-switch-btn')).toBe(true);
    });

    it('should toggle aria-checked and call onChange on click', () => {
      const onChange = vi.fn();
      const row = createToggleRow('显示轨迹', { value: false, onChange });
      const track = row.querySelector(
        'button[role="switch"]'
      ) as HTMLButtonElement;

      track.click();
      expect(track.getAttribute('aria-checked')).toBe('true');
      expect(onChange).toHaveBeenCalledWith(true);

      track.click();
      expect(track.getAttribute('aria-checked')).toBe('false');
      expect(onChange).toHaveBeenCalledWith(false);
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
      expect(mount.querySelector('[role="radiogroup"]')).not.toBeNull();
      expect(buttons[0].getAttribute('role')).toBe('radio');
      expect(buttons[0].getAttribute('aria-checked')).toBe('true');
      expect(buttons[0].dataset.presetId).toBe('earth');
      expect(buttons[1].getAttribute('aria-checked')).toBe('false');
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
      expect(buttons[0].getAttribute('aria-checked')).toBe('false');
      expect(buttons[1].getAttribute('aria-checked')).toBe('true');

      preset.setActive('b');
      const labelSpan = buttons[1].querySelector('span') as HTMLElement;
      expect(labelSpan.style.color).toContain('var(--text-primary)');
    });

    it('should label the radiogroup with the provided label or a default', () => {
      const mount = document.createElement('div');
      createPresetButtonGroup(mount, [{ id: 'a', label: 'A' }], {
        label: '预设场景',
        onSelect: () => {}
      });
      expect(
        mount.querySelector('[role="radiogroup"]')!.getAttribute('aria-label')
      ).toBe('预设场景');

      const mount2 = document.createElement('div');
      createPresetButtonGroup(mount2, [{ id: 'a', label: 'A' }], {
        onSelect: () => {}
      });
      expect(
        mount2.querySelector('[role="radiogroup"]')!.getAttribute('aria-label')
      ).toBe('预设选项');
    });

    it('should navigate with arrow keys and Home/End (roving tabindex)', () => {
      const onSelect = vi.fn();
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      createPresetButtonGroup(
        mount,
        [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
          { id: 'c', label: 'C' }
        ],
        { initialActive: 'a', onSelect }
      );
      const buttons = Array.from(mount.querySelectorAll('button'));
      const pressKey = (btn: HTMLButtonElement, key: string) =>
        btn.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        );

      // ArrowRight: 移动焦点并选中下一项
      pressKey(buttons[0], 'ArrowRight');
      expect(onSelect).toHaveBeenCalledWith('b');
      expect(buttons[1].getAttribute('aria-checked')).toBe('true');
      expect(buttons[1].tabIndex).toBe(0);
      expect(buttons[0].tabIndex).toBe(-1);
      expect(document.activeElement).toBe(buttons[1]);

      // ArrowLeft 回到上一项
      pressKey(buttons[1], 'ArrowLeft');
      expect(onSelect).toHaveBeenLastCalledWith('a');

      // ArrowDown / ArrowUp 与左右方向等价（含环绕）
      pressKey(buttons[0], 'ArrowUp');
      expect(onSelect).toHaveBeenLastCalledWith('c');
      pressKey(buttons[2], 'ArrowDown');
      expect(onSelect).toHaveBeenLastCalledWith('a');

      // Home / End 跳转首末项
      pressKey(buttons[0], 'End');
      expect(onSelect).toHaveBeenLastCalledWith('c');
      expect(document.activeElement).toBe(buttons[2]);
      pressKey(buttons[2], 'Home');
      expect(onSelect).toHaveBeenLastCalledWith('a');
      expect(document.activeElement).toBe(buttons[0]);

      mount.remove();
    });

    it('should remove keydown listeners on dispose', () => {
      const onSelect = vi.fn();
      const mount = document.createElement('div');
      const preset = createPresetButtonGroup(
        mount,
        [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' }
        ],
        { initialActive: 'a', onSelect }
      );
      preset.dispose();
      const buttons = mount.querySelectorAll('button');
      buttons[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true
        })
      );
      expect(onSelect).not.toHaveBeenCalled();
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
