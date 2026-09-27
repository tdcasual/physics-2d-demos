import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDataWorkspace,
  setDataWorkspaceRuntimeLoaderForTests,
  type DataWorkspaceRuntimeModule
} from '../../src/app/layouts/capabilities/data-workspace-lazy';
import type {
  CapabilityContext,
  CapabilityInstance,
  LayoutSlots
} from '../../src/app/layouts/types';
import type { DataWorkspaceUpdateData } from '../../src/app/layouts/capabilities/data-workspace-declarations';
import { SidebarStateOwner } from '../../src/app/layouts/sidebar-state';
import { WorkspaceUiState } from '../../src/app/layouts/workspace-ui-state';

function createSlots(): LayoutSlots {
  return {
    control: document.createElement('div'),
    animation: document.createElement('div')
  };
}

function createCtx(): CapabilityContext {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return {
    container,
    getTheme: () => 'light',
    setTheme() {},
    getMode: () => 'normal',
    setMode() {},
    switchLayout() {},
    getCurrentLayoutId: () => 'split-right',
    getAvailableLayouts: () => [],
    on: () => () => {},
    requestStageRepaint() {},
    sidebar: new SidebarStateOwner(),
    workspaceUi: new WorkspaceUiState()
  };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createRuntimeMock(): {
  inner: CapabilityInstance<DataWorkspaceUpdateData>;
  mount: ReturnType<typeof vi.fn>;
  module: DataWorkspaceRuntimeModule;
} {
  const inner: CapabilityInstance<DataWorkspaceUpdateData> = {
    update: vi.fn(),
    dispose: vi.fn()
  };
  const mount = vi.fn(() => inner);
  const module = {
    createDataWorkspace: vi.fn(() => ({
      id: 'data-workspace' as const,
      mount
    }))
  } as unknown as DataWorkspaceRuntimeModule;
  return { inner, mount, module };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('lazy data-workspace factory', () => {
  afterEach(() => {
    setDataWorkspaceRuntimeLoaderForTests(null);
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('loads the runtime once for concurrent mounts', () => {
    const deferred = createDeferred<DataWorkspaceRuntimeModule>();
    const load = vi.fn(() => deferred.promise);
    setDataWorkspaceRuntimeLoaderForTests(load);

    createDataWorkspace().mount(createSlots(), {}, createCtx());
    createDataWorkspace().mount(createSlots(), {}, createCtx());

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('buffers only the latest update until the runtime mounts', async () => {
    const deferred = createDeferred<DataWorkspaceRuntimeModule>();
    setDataWorkspaceRuntimeLoaderForTests(() => deferred.promise);
    const { inner, module } = createRuntimeMock();
    const instance = createDataWorkspace().mount(
      createSlots(),
      {},
      createCtx()
    );
    const first: DataWorkspaceUpdateData = { host: { id: 'first' } as never };
    const latest: DataWorkspaceUpdateData = { host: { id: 'latest' } as never };

    instance.update?.(first);
    instance.update?.(latest);
    deferred.resolve(module);
    await settle();

    expect(inner.update).toHaveBeenCalledTimes(1);
    expect(inner.update).toHaveBeenCalledWith(latest);
  });

  it('forwards updates after the runtime has mounted', async () => {
    const deferred = createDeferred<DataWorkspaceRuntimeModule>();
    setDataWorkspaceRuntimeLoaderForTests(() => deferred.promise);
    const { inner, module } = createRuntimeMock();
    const instance = createDataWorkspace().mount(
      createSlots(),
      {},
      createCtx()
    );

    deferred.resolve(module);
    await settle();

    const data: DataWorkspaceUpdateData = { host: { id: 'live' } as never };
    instance.update?.(data);
    expect(inner.update).toHaveBeenCalledTimes(1);
    expect(inner.update).toHaveBeenCalledWith(data);
  });

  it('never mounts the runtime when dispose runs before load resolves', async () => {
    const deferred = createDeferred<DataWorkspaceRuntimeModule>();
    setDataWorkspaceRuntimeLoaderForTests(() => deferred.promise);
    const { inner, mount, module } = createRuntimeMock();
    const instance = createDataWorkspace().mount(
      createSlots(),
      {},
      createCtx()
    );

    instance.update?.({ host: { id: 'pending' } as never });
    instance.dispose();
    deferred.resolve(module);
    await settle();

    expect(mount).not.toHaveBeenCalled();
    expect(inner.dispose).not.toHaveBeenCalled();
  });

  it('logs a scoped error when the runtime import rejects', async () => {
    const failure = new Error('chunk missing');
    setDataWorkspaceRuntimeLoaderForTests(() => Promise.reject(failure));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const instance = createDataWorkspace().mount(
      createSlots(),
      {},
      createCtx()
    );

    await settle();

    expect(spy).toHaveBeenCalled();
    const first = spy.mock.calls[0]?.[0];
    expect(String(first)).toContain('[data-workspace]');
    expect(() => instance.update?.({ host: null })).not.toThrow();
    expect(() => instance.dispose()).not.toThrow();
  });

  it('allows a later mount to retry after a transient loader rejection', async () => {
    const failure = new Error('temporary chunk failure');
    const deferred = createDeferred<DataWorkspaceRuntimeModule>();
    const load = vi
      .fn<() => Promise<DataWorkspaceRuntimeModule>>()
      .mockRejectedValueOnce(failure)
      .mockReturnValueOnce(deferred.promise);
    setDataWorkspaceRuntimeLoaderForTests(load);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    createDataWorkspace().mount(createSlots(), {}, createCtx());
    await settle();
    expect(load).toHaveBeenCalledTimes(1);

    const { module, mount } = createRuntimeMock();
    createDataWorkspace().mount(createSlots(), {}, createCtx());
    deferred.resolve(module);
    await settle();

    expect(load).toHaveBeenCalledTimes(2);
    expect(mount).toHaveBeenCalledTimes(1);
  });
});
