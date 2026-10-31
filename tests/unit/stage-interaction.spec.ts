import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createStageInteraction,
  type StageHandle
} from '../../src/platform/input/stage-interaction';

function pointer(type: string, x: number, y: number, pointerId = 1) {
  const event = new PointerEvent(type, {
    bubbles: true,
    pointerId,
    button: 0,
    pointerType: 'mouse'
  });
  Object.defineProperty(event, 'offsetX', { value: x });
  Object.defineProperty(event, 'offsetY', { value: y });
  return event;
}

function key(name: string, shiftKey = false) {
  return new KeyboardEvent('keydown', {
    key: name,
    shiftKey,
    bubbles: true,
    cancelable: true
  });
}

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));

function setup(handles?: StageHandle[]) {
  const host = document.createElement('div');
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'clientWidth', { value: 200 });
  Object.defineProperty(canvas, 'clientHeight', { value: 100 });
  canvas.setPointerCapture = vi.fn();
  canvas.releasePointerCapture = vi.fn();
  host.appendChild(canvas);
  document.body.appendChild(host);
  const positions: Record<string, { x: number; y: number }> = {
    a: { x: 0.25, y: 0.5 },
    b: { x: 0.75, y: 0.5 }
  };
  const move = vi.fn((id: string, p: { x: number; y: number }) => {
    positions[id] = p;
  });
  const commit = vi.fn();
  const onChange = vi.fn();
  const interaction = createStageInteraction({
    canvas,
    toModel: (local, size) => ({
      x: local.x / size.width,
      y: local.y / size.height
    }),
    pick: (p) => (Math.abs(p.x - positions.a.x) < 0.1 ? 'a' : null),
    move,
    commit,
    onChange,
    handles: handles ? () => handles : undefined
  });
  cleanups.push(() => {
    interaction.dispose();
    host.remove();
  });
  return { canvas, host, move, commit, onChange, interaction, positions };
}

describe('createStageInteraction', () => {
  it('drags with pointer capture in model coordinates and commits on release', () => {
    const { canvas, move, commit } = setup();
    expect(canvas.style.touchAction).toBe('none');
    canvas.dispatchEvent(pointer('pointerdown', 50, 50));
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
    canvas.dispatchEvent(pointer('pointermove', 100, 20));
    expect(move).toHaveBeenLastCalledWith('a', { x: 0.5, y: 0.2 });
    canvas.dispatchEvent(pointer('pointerup', 100, 20));
    expect(commit).toHaveBeenCalledWith('a');
  });

  it('ignores presses that miss every handle', () => {
    const { canvas, move } = setup();
    canvas.dispatchEvent(pointer('pointerdown', 180, 50));
    canvas.dispatchEvent(pointer('pointermove', 190, 50));
    expect(move).not.toHaveBeenCalled();
  });

  it('calls onPress on hit and onMiss on blank, exposes draggingId, restores on dispose', () => {
    const host = document.createElement('div');
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 200 });
    Object.defineProperty(canvas, 'clientHeight', { value: 100 });
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    canvas.tabIndex = -1;
    host.appendChild(canvas);
    document.body.appendChild(host);
    const onPress = vi.fn();
    const onMiss = vi.fn();
    const interaction = createStageInteraction({
      canvas,
      toModel: (local, size) => ({
        x: local.x / size.width,
        y: local.y / size.height
      }),
      pick: (p) => (p.x < 0.5 ? 'a' : null),
      move: vi.fn(),
      onPress,
      onMiss,
      handles: () => [
        {
          id: 'a',
          label: 'A',
          position: () => ({ x: 0.25, y: 0.5 })
        }
      ]
    });
    canvas.dispatchEvent(pointer('pointerdown', 40, 50));
    expect(onPress).toHaveBeenCalledWith('a', { x: 0.2, y: 0.5 });
    expect(interaction.draggingId()).toBe('a');
    canvas.dispatchEvent(pointer('pointerup', 40, 50));
    expect(interaction.draggingId()).toBeNull();
    canvas.dispatchEvent(pointer('pointerdown', 180, 50));
    expect(onMiss).toHaveBeenCalled();
    interaction.focusTarget('a');
    expect(interaction.focusedId()).toBe('a');
    interaction.dispose();
    expect(canvas.tabIndex).toBe(-1);
    expect(canvas.getAttribute('aria-roledescription')).toBeNull();
    host.remove();
  });

  it('keyboard: focus, Tab between handles, arrows move (Shift ×10, yUp)', () => {
    const { positions } = {
      positions: {} as Record<string, { x: number; y: number }>
    };
    const handles: StageHandle[] = [
      {
        id: 'a',
        label: '小球 A',
        position: () => positions.a ?? { x: 0.25, y: 0.5 },
        describe: () => 'x = 0.25'
      },
      {
        id: 'b',
        label: '小球 B',
        position: () => positions.b ?? { x: 0.75, y: 0.5 },
        step: 0.1,
        yUp: true
      }
    ];
    const ctx = setup(handles);
    Object.assign(positions, ctx.positions);
    const { canvas, move, commit, interaction, host } = ctx;
    expect(canvas.tabIndex).toBe(0);
    canvas.dispatchEvent(new FocusEvent('focus'));
    expect(interaction.focusedId()).toBe('a');
    expect(host.querySelector('[aria-live]')?.textContent).toBe(
      '小球 A：x = 0.25'
    );

    canvas.dispatchEvent(key('ArrowRight', true));
    expect(move).toHaveBeenLastCalledWith('a', { x: 0.35, y: 0.5 });
    expect(commit).toHaveBeenCalledWith('a');

    const tab = key('Tab');
    canvas.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(interaction.focusedId()).toBe('b');
    canvas.dispatchEvent(key('ArrowUp'));
    expect(move).toHaveBeenLastCalledWith('b', { x: 0.75, y: 0.6 });

    const leave = key('Tab');
    canvas.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(false);
  });
});
