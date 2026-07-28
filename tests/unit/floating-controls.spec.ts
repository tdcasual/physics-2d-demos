import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFloatingControls } from '../../src/ui/floating-controls';

describe('createFloatingControls', () => {
  let controls: ReturnType<typeof createFloatingControls>;

  afterEach(() => {
    controls?.dispose();
    controls.remove();
  });

  function playBtn(): HTMLElement {
    return controls.querySelector('button[title="播放/暂停"]') as HTMLElement;
  }
  function resetBtn(): HTMLElement {
    return controls.querySelector('button[title="重置"]') as HTMLElement;
  }
  function slider(): HTMLInputElement {
    return controls.querySelector('input[type="range"]') as HTMLInputElement;
  }

  it('creates play/pause, reset buttons and a speed slider', () => {
    controls = createFloatingControls({});
    expect(playBtn()).not.toBeNull();
    expect(resetBtn()).not.toBeNull();
    expect(slider()).not.toBeNull();
  });

  it('invokes onTogglePlay and refreshes glyph on play click', () => {
    const onTogglePlay = vi.fn();
    let playing = false;
    controls = createFloatingControls({
      isPlaying: () => playing,
      onTogglePlay
    });
    playBtn().dispatchEvent(new Event('click'));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
    // 点击后按 isPlaying() 刷新图标
    playing = true;
    playBtn().dispatchEvent(new Event('click'));
    expect(playBtn().textContent).toBe('⏸');
  });

  it('invokes onReset on reset click', () => {
    const onReset = vi.fn();
    controls = createFloatingControls({ isPlaying: () => false, onReset });
    resetBtn().dispatchEvent(new Event('click'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('invokes onSpeedChange on slider input', () => {
    const onSpeedChange = vi.fn();
    controls = createFloatingControls({ getSpeed: () => 1, onSpeedChange });
    const s = slider();
    s.value = '2.5';
    s.dispatchEvent(new Event('input'));
    expect(onSpeedChange).toHaveBeenCalledWith(2.5);
  });

  it('setState updates play glyph and speed slider', () => {
    controls = createFloatingControls({ isPlaying: () => false });
    controls.setState({ isPlaying: true, speed: 1.75 });
    expect(playBtn().textContent).toBe('⏸');
    expect(slider().value).toBe('1.75');
    controls.setState({ isPlaying: false });
    expect(playBtn().textContent).toBe('▶');
  });

  it('hover handlers run without error', () => {
    controls = createFloatingControls({ isPlaying: () => false });
    for (const el of [playBtn(), resetBtn()]) {
      expect(() => {
        el.dispatchEvent(new Event('mouseenter'));
        el.dispatchEvent(new Event('mouseleave'));
      }).not.toThrow();
    }
  });

  it('exposes dispose for cleanup', () => {
    controls = createFloatingControls({});
    expect(typeof controls.dispose).toBe('function');
    expect(() => controls.dispose()).not.toThrow();
  });
});
