import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DebugPanelManager } from '../../../src/app/layouts/masters/mobile-stack/mobile-debug-panel';

describe('DebugPanelManager', () => {
  let parent: HTMLElement;
  let manager: DebugPanelManager;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    manager?.destroy();
    parent.remove();
  });

  it('should create debug panel', () => {
    manager = new DebugPanelManager(parent);
    expect(parent.querySelector('.mobile-debug-panel')).toBeTruthy();
    expect(parent.querySelector('.debug-header')?.textContent).toBe('Debug');
  });

  it('should create debug content fields', () => {
    manager = new DebugPanelManager(parent);
    expect(parent.querySelector('.debug-fps')).toBeTruthy();
    expect(parent.querySelector('.debug-memory')).toBeTruthy();
    expect(parent.querySelector('.debug-theme')).toBeTruthy();
  });

  it('should update FPS value', () => {
    manager = new DebugPanelManager(parent);
    manager.update(
      {
        fps: 60,
        memory: 0,
        scrollPosition: 0,
        visibleSections: [],
        renderTime: 0
      },
      'light'
    );
    expect(parent.querySelector('.debug-fps')?.textContent).toBe('60');
  });

  it('should update memory in MB', () => {
    manager = new DebugPanelManager(parent);
    manager.update(
      {
        fps: 0,
        memory: 1024 * 1024 * 42,
        scrollPosition: 0,
        visibleSections: [],
        renderTime: 0
      },
      'light'
    );
    expect(parent.querySelector('.debug-memory')?.textContent).toBe('42.0');
  });

  it('should update theme display', () => {
    manager = new DebugPanelManager(parent);
    manager.update(
      {
        fps: 0,
        memory: 0,
        scrollPosition: 0,
        visibleSections: [],
        renderTime: 0
      },
      'dark'
    );
    expect(parent.querySelector('.debug-theme')?.textContent).toBe('dark');
  });

  it('should handle zero memory', () => {
    manager = new DebugPanelManager(parent);
    manager.update(
      {
        fps: 30,
        memory: 0,
        scrollPosition: 0,
        visibleSections: [],
        renderTime: 0
      },
      'light'
    );
    expect(parent.querySelector('.debug-memory')?.textContent).toBe('0.0');
  });

  it('should clean up DOM on destroy', () => {
    manager = new DebugPanelManager(parent);
    manager.destroy();
    expect(parent.querySelector('.mobile-debug-panel')).toBeFalsy();
  });
});
