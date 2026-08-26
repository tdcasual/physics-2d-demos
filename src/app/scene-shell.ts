/**
 * 场景外壳 — 运输控制与渲染循环
 * 管理播放/暂停/重置/单步和 RAF 渲染循环
 */

import { createFixedStepper } from '../core/fixed-step';

/** 运输状态 */
export type TransportState = {
  isPlaying: boolean;
};

/** 创建初始运输状态 */
export function createTransportState(): TransportState {
  return { isPlaying: false };
}

/** 帧句柄（RAF 或 setTimeout） */
export type FrameHandle = number | ReturnType<typeof setTimeout>;

/** 帧驱动器接口（支持测试模拟） */
export type FrameDriver = {
  requestFrame(callback: (timestampMs: number) => void): FrameHandle;
  cancelFrame(handle: FrameHandle): void;
  now(): number;
};

/** 场景外壳配置选项 */
export type SceneShellOptions = {
  /** 每步时间间隔（秒），默认 1/60 */
  stepSeconds?: number;
  /** 最大子步数，默认 5 */
  maxSubSteps?: number;
  /** 自定义帧驱动器（测试用） */
  frameDriver?: FrameDriver;
  /** 目标帧率，默认 60 */
  targetFps?: number;
  /** 每步回调 */
  onStep?: (dt: number) => void;
  /** 每帧渲染回调 */
  onRender?: () => void;
};

function createDefaultFrameDriver(): FrameDriver {
  const hasRaf =
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function' &&
    typeof window.cancelAnimationFrame === 'function';

  return {
    requestFrame(callback) {
      if (hasRaf) {
        return window.requestAnimationFrame(callback);
      }
      return setTimeout(() => callback(Date.now()), 16);
    },
    cancelFrame(handle) {
      if (typeof handle === 'number' && hasRaf) {
        window.cancelAnimationFrame(handle);
        return;
      }
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    },
    now() {
      if (
        typeof performance !== 'undefined' &&
        typeof performance.now === 'function'
      ) {
        return performance.now();
      }
      return Date.now();
    }
  };
}

/**
 * 创建场景外壳
 * 封装运输控制状态、固定步长模拟器和 RAF 渲染循环
 * @param options - 配置选项
 * @returns 包含 transport/play/pause/reset/dispose 的控制对象
 */
export function createSceneShell(options: SceneShellOptions = {}) {
  const stepSeconds = options.stepSeconds ?? 1 / 60;
  const frameDriver = options.frameDriver ?? createDefaultFrameDriver();
  const stepper = createFixedStepper({
    dt: stepSeconds,
    maxSubSteps: options.maxSubSteps ?? 5
  });
  const transport = createTransportState();
  let frameHandle: FrameHandle | null = null;
  let previousTimeMs = frameDriver.now();
  let targetFps = options.targetFps ?? 60;
  let lastRenderTimeMs = 0;
  let wasPlayingBeforeHidden = false;

  function requestNextFrame(): void {
    frameHandle = frameDriver.requestFrame(loop);
  }

  function handleVisibilityChange(): void {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      wasPlayingBeforeHidden = transport.isPlaying;
      if (transport.isPlaying) {
        stopFrameLoop();
        // Keep isPlaying = true so we know to resume when visible again
      }
    } else if (wasPlayingBeforeHidden && transport.isPlaying) {
      previousTimeMs = frameDriver.now();
      requestNextFrame();
      wasPlayingBeforeHidden = false;
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  function loop(timestampMs: number): void {
    if (!transport.isPlaying) return;

    const elapsed = timestampMs - previousTimeMs;
    previousTimeMs = timestampMs;

    // RAF 节流：如果距离上次渲染时间太短，只请求下一帧但不执行 render
    const targetIntervalMs = 1000 / Math.max(1, targetFps);
    const timeSinceRender = timestampMs - lastRenderTimeMs;

    if (timeSinceRender < targetIntervalMs) {
      if (transport.isPlaying) {
        requestNextFrame();
      }
      return;
    }

    lastRenderTimeMs = timestampMs;

    const frameDt = Math.max(0, elapsed / 1000);
    const steps = stepper.consume(frameDt);
    for (let i = 0; i < steps; i += 1) {
      options.onStep?.(stepSeconds);
    }
    if (steps > 0) {
      options.onRender?.();
    }

    if (transport.isPlaying) {
      requestNextFrame();
    }
  }

  function stopFrameLoop(): void {
    if (frameHandle !== null) {
      frameDriver.cancelFrame(frameHandle);
      frameHandle = null;
    }
  }

  return {
    transport,
    play(): void {
      if (transport.isPlaying) return;
      transport.isPlaying = true;
      previousTimeMs = frameDriver.now();
      lastRenderTimeMs = 0;
      requestNextFrame();
    },
    pause(): void {
      if (!transport.isPlaying) return;
      transport.isPlaying = false;
      stopFrameLoop();
    },
    reset(): void {
      transport.isPlaying = false;
      stepper.reset();
      stopFrameLoop();
    },
    stepOnce(onStep?: (dt: number) => void): void {
      const dt = options.stepSeconds ?? 1 / 60;
      if (onStep) {
        onStep(dt);
      } else {
        options.onStep?.(dt);
      }
      options.onRender?.();
    },
    setTargetFps(fps: number): void {
      targetFps = Math.max(1, Math.min(120, fps));
    },
    getTargetFps(): number {
      return targetFps;
    },
    dispose(): void {
      transport.isPlaying = false;
      stepper.reset();
      stopFrameLoop();
      if (typeof document !== 'undefined') {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      }
    }
  };
}
