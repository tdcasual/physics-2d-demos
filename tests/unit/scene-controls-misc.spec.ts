import { describe, it, expect, vi } from 'vitest';
import { createDeleteButton } from '../../src/ui/components/scene-controls/delete-button';
import { createSceneControls } from '../../src/ui/components/scene-controls/scene-controls';

describe('createDeleteButton', () => {
  it('renders a ✕ button titled 删除', () => {
    const btn = createDeleteButton(() => {});
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.textContent).toBe('✕');
    expect(btn.title).toBe('删除');
  });

  it('invokes onClick when clicked', () => {
    const onClick = vi.fn();
    const btn = createDeleteButton(onClick);
    btn.dispatchEvent(new Event('click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('createSceneControls', () => {
  it('creates a card whose body lives inside the element', () => {
    const controls = createSceneControls({ title: '参数' });
    expect(controls.element.dataset.testid).toBe('control-card');
    expect(controls.element.contains(controls.body)).toBe(true);
  });

  it('expands by default and collapses via option', () => {
    const expanded = createSceneControls({ title: 'a' });
    expect(expanded.element.classList.contains('collapsed')).toBe(false);
    expect(expanded.body.style.display).toBe('flex');

    const collapsed = createSceneControls({
      title: 'b',
      defaultCollapsed: true
    });
    expect(collapsed.element.classList.contains('collapsed')).toBe(true);
    expect(collapsed.body.style.display).toBe('none');
  });

  it('setValue / getValue round-trip stored values', () => {
    const controls = createSceneControls({ title: '参数' });
    expect(controls.getValue('v0')).toBeUndefined();
    controls.setValue('v0', 30);
    expect(controls.getValue('v0')).toBe(30);
    controls.setValue('preset', 'earth');
    expect(controls.getValue('preset')).toBe('earth');
  });

  it('renders header actions when provided', () => {
    const action = document.createElement('button');
    action.textContent = 'act';
    const controls = createSceneControls({
      title: 'x',
      headerActions: [action]
    });
    expect(controls.element.contains(action)).toBe(true);
  });
});
