import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransportBarManager } from '../../../src/app/layouts/masters/mobile-stack/mobile-transport-bar';

describe('TransportBarManager', () => {
  let parent: HTMLElement;
  let manager: TransportBarManager;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    manager?.destroy();
    parent.remove();
  });

  it('should create controls bar', () => {
    manager = new TransportBarManager(parent);
    expect(parent.querySelector('.mobile-controls-bar')).toBeTruthy();
  });

  it('should render play/pause button', () => {
    manager = new TransportBarManager(parent);
    manager.render(
      { showPlayPause: true, showReset: false, showSpeed: false },
      { isPlaying: () => false, getSpeed: () => 1 }
    );

    const btn = parent.querySelector('.mobile-control-btn.play-pause');
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('aria-label')).toBe('播放动画');
  });

  it('should render pause icon when playing', () => {
    manager = new TransportBarManager(parent);
    manager.render(
      { showPlayPause: true },
      { isPlaying: () => true, getSpeed: () => 1 }
    );

    const btn = parent.querySelector('.mobile-control-btn.play-pause');
    expect(btn?.innerHTML).toContain('M6');
    expect(btn?.getAttribute('aria-label')).toBe('暂停动画');
  });

  it('should call toggle callback on play click', () => {
    const onTogglePlay = vi.fn();
    manager = new TransportBarManager(parent);
    manager.render(
      { showPlayPause: true },
      { onTogglePlay, isPlaying: () => false, getSpeed: () => 1 }
    );

    const btn = parent.querySelector(
      '.mobile-control-btn.play-pause'
    ) as HTMLElement;
    btn.click();
    expect(onTogglePlay).toHaveBeenCalled();
  });

  it('should render reset button', () => {
    manager = new TransportBarManager(parent);
    manager.render(
      { showPlayPause: false, showReset: true, showSpeed: false },
      {}
    );

    const btn = parent.querySelector('.mobile-control-btn.reset');
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('aria-label')).toBe('重置动画');
  });

  it('should call reset callback', () => {
    const onReset = vi.fn();
    manager = new TransportBarManager(parent);
    manager.render({ showReset: true }, { onReset });

    const btn = parent.querySelector(
      '.mobile-control-btn.reset'
    ) as HTMLElement;
    btn.click();
    expect(onReset).toHaveBeenCalled();
  });

  it('should render speed control', () => {
    manager = new TransportBarManager(parent);
    manager.render(
      { showPlayPause: false, showReset: false, showSpeed: true },
      { getSpeed: () => 1.5 }
    );

    const control = parent.querySelector('.mobile-speed-control');
    expect(control).toBeTruthy();

    const slider = control?.querySelector('input[type="range"]');
    expect(slider).toBeTruthy();
    expect((slider as HTMLInputElement).value).toBe('1.5');
  });

  it('should call speed change callback', () => {
    const onSpeedChange = vi.fn();
    manager = new TransportBarManager(parent);
    manager.render({ showSpeed: true }, { onSpeedChange, getSpeed: () => 1 });

    const slider = parent.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    slider.value = '2';
    slider.dispatchEvent(new Event('input'));

    expect(onSpeedChange).toHaveBeenCalledWith(2);
  });

  it('should update speed value display on input', () => {
    manager = new TransportBarManager(parent);
    manager.render({ showSpeed: true }, { getSpeed: () => 1 });

    const slider = parent.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    slider.value = '1.5';
    slider.dispatchEvent(new Event('input'));

    const value = parent.querySelector('.speed-value');
    expect(value?.textContent).toBe('1.50×');
  });

  it('should update slider aria-valuenow on input', () => {
    manager = new TransportBarManager(parent);
    manager.render({ showSpeed: true }, { getSpeed: () => 1 });

    const slider = parent.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    slider.value = '2';
    slider.dispatchEvent(new Event('input'));

    expect(slider.getAttribute('aria-valuenow')).toBe('2');
  });

  it('should render fullscreen button', () => {
    manager = new TransportBarManager(parent);
    manager.render({ showFullscreen: true }, {});

    const btn = parent.querySelector('.mobile-control-btn.fullscreen');
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('aria-label')).toBe('全屏');
  });

  it('should update play state', () => {
    manager = new TransportBarManager(parent);
    manager.render(
      { showPlayPause: true },
      { isPlaying: () => false, getSpeed: () => 1 }
    );

    manager.updatePlayState(true);

    const btn = parent.querySelector('.mobile-control-btn.play-pause');
    expect(btn?.getAttribute('aria-label')).toBe('暂停动画');
  });

  it('should clear previous buttons on re-render', () => {
    manager = new TransportBarManager(parent);
    manager.render(
      { showPlayPause: true, showReset: true },
      { isPlaying: () => false, getSpeed: () => 1 }
    );

    expect(parent.querySelectorAll('.mobile-control-btn').length).toBe(2);

    manager.render({ showPlayPause: false, showReset: false }, {});

    expect(parent.querySelectorAll('.mobile-control-btn').length).toBe(0);
  });

  it('should use onPlayPause fallback when onTogglePlay is absent', () => {
    const onPlayPause = vi.fn();
    manager = new TransportBarManager(parent);
    manager.render(
      { showPlayPause: true },
      { onPlayPause, isPlaying: () => false, getSpeed: () => 1 }
    );

    const btn = parent.querySelector(
      '.mobile-control-btn.play-pause'
    ) as HTMLElement;
    btn.click();
    expect(onPlayPause).toHaveBeenCalled();
  });

  it('should apply custom speed range', () => {
    manager = new TransportBarManager(parent);
    manager.render(
      { showSpeed: true, speedMin: 0.1, speedMax: 5, speedStep: 0.1 },
      { getSpeed: () => 1 }
    );

    const slider = parent.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    expect(slider.min).toBe('0.1');
    expect(slider.max).toBe('5');
    expect(slider.step).toBe('0.1');
  });

  it('should clean up DOM on destroy', () => {
    manager = new TransportBarManager(parent);
    manager.destroy();
    expect(parent.querySelector('.mobile-controls-bar')).toBeFalsy();
  });
});
