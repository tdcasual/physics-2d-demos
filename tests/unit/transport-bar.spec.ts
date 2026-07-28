import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransportBar } from '../../src/app/layouts/capabilities/transport-bar';
import type {
  CapabilityContext,
  LayoutSlots,
  TransportState
} from '../../src/app/layouts/types';

// mount 不使用 ctx，提供一个最小桩
const ctx = {} as CapabilityContext;

function makeSlots(): LayoutSlots {
  return {
    control: document.createElement('div'),
    animation: document.createElement('div')
  };
}

function mountCompact() {
  const container = document.createElement('div');
  const def = createTransportBar();
  const instance = def.mount(makeSlots(), { container }, ctx);
  return { container, instance };
}

describe('transport-bar capability (compact mode)', () => {
  let container: HTMLElement;
  let instance: ReturnType<ReturnType<typeof createTransportBar>['mount']>;

  beforeEach(() => {
    ({ container, instance } = mountCompact());
  });

  it('creates play / reset buttons and speed slider in the container', () => {
    expect(container.querySelector('.play-pause')).not.toBeNull();
    expect(container.querySelector('.reset')).not.toBeNull();
    const slider = container.querySelector(
      '.mobile-transport-speed-slider'
    ) as HTMLInputElement;
    expect(slider).not.toBeNull();
    expect(slider.type).toBe('range');
  });

  it('invokes onTogglePlay when play button is clicked', () => {
    const onTogglePlay = vi.fn();
    instance.setCallbacks?.({
      isPlaying: () => false,
      onTogglePlay,
      onReset: vi.fn(),
      onSpeedChange: vi.fn(),
      getSpeed: () => 1
    });
    (container.querySelector('.play-pause') as HTMLElement).dispatchEvent(
      new Event('click')
    );
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('invokes onReset when reset button is clicked', () => {
    const onReset = vi.fn();
    instance.setCallbacks?.({
      isPlaying: () => false,
      onTogglePlay: vi.fn(),
      onReset,
      onSpeedChange: vi.fn(),
      getSpeed: () => 1
    });
    (container.querySelector('.reset') as HTMLElement).dispatchEvent(
      new Event('click')
    );
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('invokes onSpeedChange and updates label when slider moves', () => {
    const onSpeedChange = vi.fn();
    instance.setCallbacks?.({
      isPlaying: () => false,
      onTogglePlay: vi.fn(),
      onReset: vi.fn(),
      onSpeedChange,
      getSpeed: () => 1
    });
    const slider = container.querySelector(
      '.mobile-transport-speed-slider'
    ) as HTMLInputElement;
    slider.value = '2';
    slider.dispatchEvent(new Event('input'));
    expect(onSpeedChange).toHaveBeenCalledWith(2);
    expect(container.querySelector('.speed-value')?.textContent).toBe('2.00×');
  });

  it('update({isPlaying}) toggles play button glyph and class', () => {
    const playBtn = container.querySelector('.play-pause') as HTMLElement;
    instance.update?.({ isPlaying: true } as TransportState);
    expect(playBtn.textContent).toBe('⏸');
    expect(playBtn.classList.contains('is-playing')).toBe(true);

    instance.update?.({ isPlaying: false } as TransportState);
    expect(playBtn.textContent).toBe('▶');
    expect(playBtn.classList.contains('is-playing')).toBe(false);
  });

  it('update({speed}) syncs slider value and label', () => {
    instance.update?.({ isPlaying: false, speed: 1.5 } as TransportState);
    const slider = container.querySelector(
      '.mobile-transport-speed-slider'
    ) as HTMLInputElement;
    expect(slider.value).toBe('1.5');
    expect(container.querySelector('.speed-value')?.textContent).toBe('1.50×');
  });

  it('dispose aborts listeners so clicks no longer fire callbacks', () => {
    const onTogglePlay = vi.fn();
    instance.setCallbacks?.({
      isPlaying: () => false,
      onTogglePlay,
      onReset: vi.fn(),
      onSpeedChange: vi.fn(),
      getSpeed: () => 1
    });
    instance.dispose();
    (container.querySelector('.play-pause') as HTMLElement).dispatchEvent(
      new Event('click')
    );
    expect(onTogglePlay).not.toHaveBeenCalled();
  });
});

describe('transport-bar capability (floating mode)', () => {
  it('mounts floating controls into the animation slot', () => {
    const slots = makeSlots();
    const def = createTransportBar();
    const instance = def.mount(slots, {}, ctx);
    // createFloatingControls  appended a controls element to the animation slot
    expect(slots.animation.childElementCount).toBeGreaterThan(0);
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.dispose).toBe('function');
    instance.dispose();
  });

  it('update forwards state to the floating controls without throwing', () => {
    const slots = makeSlots();
    const def = createTransportBar();
    const instance = def.mount(slots, {}, ctx);
    expect(() =>
      instance.update?.({ isPlaying: true, speed: 2 } as TransportState)
    ).not.toThrow();
    instance.dispose();
  });
});
