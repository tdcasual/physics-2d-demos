import { createFixedStepper } from '../core/fixed-step';

export type TransportState = {
  isPlaying: boolean;
};

export function createTransportState(): TransportState {
  return { isPlaying: false };
}

export type FrameHandle = number | ReturnType<typeof setTimeout>;

export type FrameDriver = {
  requestFrame(callback: (timestampMs: number) => void): FrameHandle;
  cancelFrame(handle: FrameHandle): void;
  now(): number;
};

export type SceneShellOptions = {
  stepSeconds?: number;
  maxSubSteps?: number;
  frameDriver?: FrameDriver;
  onStep?: (dt: number) => void;
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

  function requestNextFrame(): void {
    frameHandle = frameDriver.requestFrame(loop);
  }

  function loop(timestampMs: number): void {
    if (!transport.isPlaying) return;

    const frameDt = Math.max(0, (timestampMs - previousTimeMs) / 1000);
    previousTimeMs = timestampMs;
    const steps = stepper.consume(frameDt);
    for (let i = 0; i < steps; i += 1) {
      options.onStep?.(stepSeconds);
    }
    if (steps > 0) {
      options.onRender?.();
    }

    // 再次检查 isPlaying，防止 pause() 在 step/render 期间被调用后仍请求下一帧
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
    stepOnce(onStep: () => void): void {
      onStep();
      options.onRender?.();
    },
    dispose(): void {
      transport.isPlaying = false;
      stepper.reset();
      stopFrameLoop();
    }
  };
}
