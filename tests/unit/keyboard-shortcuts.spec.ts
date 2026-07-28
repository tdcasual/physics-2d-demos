import { describe, it, expect, vi, afterEach } from 'vitest';
import { KeyboardShortcutManager } from '../../src/platform/input/keyboard-shortcuts';

describe('KeyboardShortcutManager', () => {
  let mgr: KeyboardShortcutManager;

  afterEach(() => {
    mgr?.dispose();
  });

  function press(key: string, target: EventTarget = document.body): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(event);
    return event;
  }

  it('invokes the registered handler on matching key', () => {
    mgr = new KeyboardShortcutManager();
    const handler = vi.fn();
    mgr.register('r', handler);
    mgr.init();
    press('r');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches keys case-insensitively', () => {
    mgr = new KeyboardShortcutManager();
    const handler = vi.fn();
    mgr.register('R', handler);
    mgr.init();
    press('r');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('registerMultiple registers several shortcuts', () => {
    mgr = new KeyboardShortcutManager();
    const a = vi.fn();
    const b = vi.fn();
    mgr.registerMultiple({ a, b });
    mgr.init();
    press('a');
    press('b');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('prevents default when a shortcut matches', () => {
    mgr = new KeyboardShortcutManager();
    mgr.register('r', () => {});
    mgr.init();
    const event = new KeyboardEvent('keydown', {
      key: 'r',
      bubbles: true,
      cancelable: true
    });
    const spy = vi.spyOn(event, 'preventDefault');
    document.body.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });

  it('ignores keys typed into input / textarea / select', () => {
    mgr = new KeyboardShortcutManager();
    const handler = vi.fn();
    mgr.register('r', handler);
    mgr.init();

    for (const tag of ['input', 'textarea', 'select']) {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      press('r', el);
      el.remove();
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not listen before init', () => {
    mgr = new KeyboardShortcutManager();
    const handler = vi.fn();
    mgr.register('r', handler);
    press('r');
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispose stops listening and clears shortcuts', () => {
    mgr = new KeyboardShortcutManager();
    const handler = vi.fn();
    mgr.register('r', handler);
    mgr.init();
    mgr.dispose();
    press('r');
    expect(handler).not.toHaveBeenCalled();
  });

  it('init is idempotent (no double registration)', () => {
    mgr = new KeyboardShortcutManager();
    const handler = vi.fn();
    mgr.register('r', handler);
    mgr.init();
    mgr.init();
    press('r');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
