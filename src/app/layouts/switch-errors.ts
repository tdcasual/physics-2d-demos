export type LayoutSwitchState = 'idle' | 'switching' | 'quarantined';

/**
 * Quarantine is terminal for the page unless `resetSwitchQuarantine()`
 * succeeds (acked phase + unique stage-canvas custody + known recovery
 * target). Otherwise the only exit is a full reload. Production surfaces
 * this via `layout:switch-error` (status bar + console). See
 * `docs/layout-switch-lifecycle.md`.
 */
export const SWITCH_STATUS_ATTR = 'data-layout-switch-status';

export const SWITCH_QUARANTINE_MESSAGE = '布局切换已隔离，请刷新页面恢复';

export function createAbortError(
  message = 'The operation was aborted.'
): Error {
  if (typeof DOMException === 'function') {
    return new DOMException(message, 'AbortError');
  }
  const err = new Error(message);
  err.name = 'AbortError';
  return err;
}

export function isAbortError(err: unknown): boolean {
  return (
    (typeof DOMException === 'function' &&
      err instanceof DOMException &&
      err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

export class SwitchQuarantinedError extends Error {
  readonly generation: number;
  constructor(generation: number, message = 'Layout switch is quarantined') {
    super(message);
    this.name = 'SwitchQuarantinedError';
    this.generation = generation;
  }
}

export class SwitchSupersededError extends Error {
  constructor(message = 'Layout switch superseded') {
    super(message);
    this.name = 'SwitchSupersededError';
  }
}

export function abortPromise(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? createAbortError());
      return;
    }
    signal.addEventListener(
      'abort',
      () => {
        reject(signal.reason ?? createAbortError());
      },
      { once: true }
    );
  });
}

export async function raceAbort<T>(
  work: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  if (signal.aborted) {
    throw signal.reason ?? createAbortError();
  }
  return Promise.race([work, abortPromise(signal)]);
}
