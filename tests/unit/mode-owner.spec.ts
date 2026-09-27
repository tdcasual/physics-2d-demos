import { describe, expect, it, vi } from 'vitest';
import { ModeOwner } from '../../src/app/layouts/mode-owner';

describe('ModeOwner', () => {
  function make() {
    const container = document.createElement('div');
    const applyAdapterMode = vi.fn();
    const emitMode = vi.fn();
    const updateCapabilities = vi.fn();
    const owner = new ModeOwner({
      container,
      getScene: () => null,
      applyAdapterMode,
      emitMode,
      updateCapabilities
    });
    return { owner, container, applyAdapterMode, emitMode, updateCapabilities };
  }

  it('starts in normal and projects data-mode', () => {
    const { owner, container } = make();
    expect(owner.getMode()).toBe('normal');
    owner.project('page-entry');
    expect(container.getAttribute('data-mode')).toBe('normal');
  });

  it('is idempotent for a repeated mode after the first projection', () => {
    const { owner, applyAdapterMode } = make();
    owner.setMode('presentation', 'toggle');
    const calls = applyAdapterMode.mock.calls.length;
    owner.setMode('presentation', 'toggle');
    expect(applyAdapterMode.mock.calls.length).toBe(calls);
  });

  it('resets to normal for a new scene', () => {
    const { owner } = make();
    owner.setMode('presentation', 'toggle');
    owner.resetToNormal('new-scene');
    expect(owner.getMode()).toBe('normal');
  });
});
