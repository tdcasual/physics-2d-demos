import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFloatingControls } from '../../src/ui/floating-controls';

describe('createFloatingControls', () => {
  let options: {
    isPlaying: () => boolean;
    onTogglePlay: ReturnType<typeof vi.fn>;
    onReset: ReturnType<typeof vi.fn>;
    onSpeedChange: ReturnType<typeof vi.fn>;
    getSpeed: () => number;
  };

  beforeEach(() => {
    options = {
      isPlaying: () => false,
      onTogglePlay: vi.fn(),
      onReset: vi.fn(),
      onSpeedChange: vi.fn(),
      getSpeed: () => 1
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return control interface', () => {
    const controls = createFloatingControls(options);
    expect(controls.element).toBeInstanceOf(HTMLElement);
    expect(typeof controls.updatePlayState).toBe('function');
    expect(typeof controls.refreshLayout).toBe('function');
    expect(typeof controls.setState).toBe('function');
    expect(typeof controls.dispose).toBe('function');
    controls.dispose();
  });

  it('should create play/pause button', () => {
    const controls = createFloatingControls(options);
    const btn = controls.element.querySelector('button[title="播放/暂停"]');
    expect(btn).toBeTruthy();
    controls.dispose();
  });

  it('should create reset button', () => {
    const controls = createFloatingControls(options);
    const btn = controls.element.querySelector('button[title="重置"]');
    expect(btn).toBeTruthy();
    expect(btn?.textContent).toBe('↺');
    controls.dispose();
  });

  it('should create speed slider', () => {
    const controls = createFloatingControls(options);
    const slider = controls.element.querySelector('input[type="range"]');
    expect(slider).toBeTruthy();
    expect((slider as HTMLInputElement).min).toBe('0.05');
    expect((slider as HTMLInputElement).max).toBe('3');
    controls.dispose();
  });

  it('should call onTogglePlay when play button clicked', () => {
    const controls = createFloatingControls(options);
    const btn = controls.element.querySelector(
      'button[title="播放/暂停"]'
    ) as HTMLButtonElement;
    btn.click();
    expect(options.onTogglePlay).toHaveBeenCalledTimes(1);
    controls.dispose();
  });

  it('should call onReset when reset button clicked', () => {
    const controls = createFloatingControls(options);
    const btn = controls.element.querySelector(
      'button[title="重置"]'
    ) as HTMLButtonElement;
    btn.click();
    expect(options.onReset).toHaveBeenCalledTimes(1);
    controls.dispose();
  });

  it('should call onSpeedChange when slider input changes', () => {
    const controls = createFloatingControls(options);
    const slider = controls.element.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    slider.value = '1.5';
    slider.dispatchEvent(new Event('input'));
    expect(options.onSpeedChange).toHaveBeenCalledWith(1.5);
    controls.dispose();
  });

  it('should update play button text via updatePlayState', () => {
    options.isPlaying = () => true;
    const controls = createFloatingControls(options);
    const btn = controls.element.querySelector(
      'button[title="播放/暂停"]'
    ) as HTMLButtonElement;
    expect(btn.textContent).toBe('⏸');
    controls.dispose();
  });

  it('should update play button text when paused', () => {
    options.isPlaying = () => false;
    const controls = createFloatingControls(options);
    const btn = controls.element.querySelector(
      'button[title="播放/暂停"]'
    ) as HTMLButtonElement;
    expect(btn.textContent).toBe('▶');
    controls.dispose();
  });

  it('should set state via setState', () => {
    const controls = createFloatingControls(options);
    controls.setState({ isPlaying: true, speed: 2 });
    const btn = controls.element.querySelector(
      'button[title="播放/暂停"]'
    ) as HTMLButtonElement;
    expect(btn.textContent).toBe('⏸');
    const slider = controls.element.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    expect(slider.value).toBe('2');
    controls.dispose();
  });

  it('should set only speed via setState', () => {
    const controls = createFloatingControls(options);
    controls.setState({ speed: 0.5 });
    const slider = controls.element.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    expect(slider.value).toBe('0.5');
    controls.dispose();
  });

  it('should set only isPlaying via setState', () => {
    const controls = createFloatingControls(options);
    controls.setState({ isPlaying: true });
    const btn = controls.element.querySelector(
      'button[title="播放/暂停"]'
    ) as HTMLButtonElement;
    expect(btn.textContent).toBe('⏸');
    controls.dispose();
  });

  it('should remove element on dispose', () => {
    const controls = createFloatingControls(options);
    const el = controls.element;
    document.body.appendChild(el);
    expect(document.body.contains(el)).toBe(true);
    controls.dispose();
    expect(document.body.contains(el)).toBe(false);
  });

  it('should include speed value display', () => {
    options.getSpeed = () => 1.5;
    const controls = createFloatingControls(options);
    const spans = controls.element.querySelectorAll('span');
    const speedValue = Array.from(spans).find((s) =>
      s.textContent?.includes('×')
    );
    expect(speedValue).toBeTruthy();
    expect(speedValue?.textContent).toContain('1.5');
    controls.dispose();
  });

  it('should have correct speed slider initial value', () => {
    options.getSpeed = () => 0.75;
    const controls = createFloatingControls(options);
    const slider = controls.element.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    expect(slider.value).toBe('0.75');
    controls.dispose();
  });
});
