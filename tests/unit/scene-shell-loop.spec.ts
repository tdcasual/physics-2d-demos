import { describe, expect, it } from 'vitest';
import {
  createSceneShell,
  type FrameDriver,
  type FrameHandle
} from '../../src/app/scene-shell';

function createMockFrameDriver(): FrameDriver & { tick(ms: number): void } {
  let nowMs = 0;
  let nextId = 1;
  const callbacks = new Map<FrameHandle, (timestampMs: number) => void>();

  return {
    requestFrame(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame(handle) {
      callbacks.delete(handle);
    },
    now() {
      return nowMs;
    },
    tick(ms: number) {
      nowMs += ms;
      const pending = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pending) {
        callback(nowMs);
      }
    }
  };
}

describe('scene shell loop', () => {
  it('advances step loop while playing and stops after pause', () => {
    const driver = createMockFrameDriver();
    const steps: number[] = [];
    let renders = 0;

    const shell = createSceneShell({
      stepSeconds: 0.1,
      maxSubSteps: 5,
      frameDriver: driver,
      onStep: (dt) => steps.push(dt),
      onRender: () => {
        renders += 1;
      }
    });

    shell.play();
    driver.tick(100);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toBeCloseTo(0.1);
    expect(renders).toBe(1);

    shell.pause();
    driver.tick(100);
    expect(steps).toHaveLength(1);
  });

  it('executes single-step callback while paused', () => {
    const shell = createSceneShell();
    let count = 0;

    shell.stepOnce(() => {
      count += 1;
    });

    expect(count).toBe(1);
    expect(shell.transport.isPlaying).toBe(false);
  });

  it('does not request next frame when paused during step callback', () => {
    const driver = createMockFrameDriver();
    let frameRequests = 0;

    const instrumentedDriver: FrameDriver = {
      requestFrame(callback) {
        frameRequests += 1;
        return driver.requestFrame(callback);
      },
      cancelFrame: driver.cancelFrame,
      now: driver.now
    };

    const shell = createSceneShell({
      stepSeconds: 0.1,
      maxSubSteps: 5,
      frameDriver: instrumentedDriver,
      onStep: () => {
        shell.pause(); // 在 step 回调中暂停
      },
      onRender: () => {}
    });

    shell.play();
    const requestsBefore = frameRequests;
    driver.tick(100);

    // 只应该有初始的 requestFrame，tick 后不应再有新的请求
    expect(frameRequests).toBe(requestsBefore);
  });
});
