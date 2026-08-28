/**
 * createRenderScheduler 单元测试
 *
 * 用手动驱动的 rAF stub 替代真实 requestAnimationFrame，
 * 以确定性地模拟「帧」边界（happy-dom 的 rAF 时序不可控）。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRenderScheduler } from '../../src/app/render-scheduler';

describe('createRenderScheduler', () => {
  let pending: Map<number, FrameRequestCallback>;
  let nextId: number;

  /** 执行当前帧所有挂起的 rAF 回调（模拟浏览器新一帧） */
  const runFrame = (): void => {
    const callbacks = [...pending.values()];
    pending.clear();
    for (const cb of callbacks) cb(16.6);
  };

  beforeEach(() => {
    pending = new Map();
    nextId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      pending.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('同帧内多次 schedule 合并为一次渲染', () => {
    const render = vi.fn();
    const scheduler = createRenderScheduler(render);

    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();
    expect(render).not.toHaveBeenCalled();

    runFrame();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('跨帧各 schedule 一次则每帧各渲染一次', () => {
    const render = vi.fn();
    const scheduler = createRenderScheduler(render);

    scheduler.schedule();
    runFrame();
    scheduler.schedule();
    runFrame();

    expect(render).toHaveBeenCalledTimes(2);
  });

  it('flush 同步执行渲染并取消挂起的 rAF', () => {
    const render = vi.fn();
    const scheduler = createRenderScheduler(render);

    scheduler.schedule();
    scheduler.flush();
    // 同步立即执行，无需等帧
    expect(render).toHaveBeenCalledTimes(1);

    // 挂起的 rAF 已被取消，下一帧不再重复渲染
    runFrame();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('flush 无挂起任务时直接同步渲染', () => {
    const render = vi.fn();
    const scheduler = createRenderScheduler(render);

    scheduler.flush();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('dispose 取消挂起的 rAF，之后 schedule 不再渲染', () => {
    const render = vi.fn();
    const scheduler = createRenderScheduler(render);

    scheduler.schedule();
    scheduler.dispose();
    runFrame();
    expect(render).not.toHaveBeenCalled();

    // dispose 后 schedule 为 no-op（不应再请求 rAF）
    scheduler.schedule();
    expect(pending.size).toBe(0);
    runFrame();
    expect(render).not.toHaveBeenCalled();
  });

  it('render 回调内再次 schedule 不会同步死循环，仅排到下一帧', () => {
    const render = vi.fn(() => {
      scheduler.schedule();
    });
    const scheduler = createRenderScheduler(render);

    scheduler.schedule();
    runFrame();
    // 第一帧渲染一次；回调内的 schedule 只排到下一帧，同帧不重入
    expect(render).toHaveBeenCalledTimes(1);

    runFrame();
    expect(render).toHaveBeenCalledTimes(2);
  });
});
