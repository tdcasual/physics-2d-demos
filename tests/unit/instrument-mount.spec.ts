import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInstrumentHost } from '../../src/instruments/mount';

type SceneParams = { visible: boolean; active?: 'a' | 'b'; value: number };

type FakeViewControl = {
  setReading(value: number): void;
  render: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};

function createCanvasHost(): {
  parent: HTMLDivElement;
  canvas: HTMLCanvasElement;
} {
  const parent = document.createElement('div');
  const canvas = document.createElement('canvas');
  parent.appendChild(canvas);
  document.body.appendChild(parent);
  return { parent, canvas };
}

function createFakeFactory(options: { serializable?: boolean } = {}) {
  const controls: FakeViewControl[] = [];
  const simStates: Array<Record<string, unknown>> = [];
  const factory = {
    createSim() {
      let state: Record<string, unknown> = { currentReading: 1, zeroOffset: 0 };
      simStates.push(state);
      return {
        getState: () => state,
        setParams(params: Record<string, unknown>) {
          state = { ...state, ...params };
          simStates[simStates.length - 1] = state;
        },
        step() {},
        reset() {}
      };
    },
    createView() {
      let reading = 1;
      const listeners: Array<(value: number) => void> = [];
      const control: FakeViewControl = {
        setReading(value) {
          reading = value;
          listeners.forEach((listener) => listener(value));
        },
        render: vi.fn(),
        resize: vi.fn(),
        dispose: vi.fn()
      };
      controls.push(control);
      return {
        render: control.render,
        resize: control.resize,
        setTheme: vi.fn(),
        setViewport: vi.fn(),
        dispose: control.dispose,
        getReading: () => reading,
        onReadingChange(callback: (value: number) => void) {
          listeners.push(callback);
          return () => listeners.splice(listeners.indexOf(callback), 1);
        },
        ...(options.serializable
          ? {
              serialize: () => JSON.stringify({ reading }),
              deserialize(json: string) {
                const value: unknown = JSON.parse(json);
                if (
                  typeof value === 'object' &&
                  value !== null &&
                  'reading' in value &&
                  typeof value.reading === 'number'
                ) {
                  reading = value.reading;
                }
              }
            }
          : {})
      };
    }
  };
  return { factory, controls, simStates };
}

function createHost(
  canvas: HTMLCanvasElement,
  factory: unknown,
  overrides: Partial<{
    loadFactory: () => Promise<unknown>;
    visible: (params: SceneParams) => boolean;
  }> = {}
) {
  return createInstrumentHost<SceneParams>({
    attachTo: canvas,
    theme: 'dark',
    instruments: [
      {
        id: 'fake',
        loadFactory: overrides.loadFactory ?? (() => Promise.resolve(factory)),
        placement: 'full',
        visible: overrides.visible ?? ((params) => params.visible),
        mapParams: (params) => ({ value: params.value })
      }
    ]
  });
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('createInstrumentHost', () => {
  it('mounts, unmounts, and fully disposes instrument DOM', async () => {
    const { canvas, parent } = createCanvasHost();
    const fake = createFakeFactory();
    const removeListener = vi.spyOn(document, 'removeEventListener');
    const host = createHost(canvas, fake.factory);

    host.sync({ visible: true, value: 2 });
    await vi.waitFor(() => expect(fake.controls).toHaveLength(1));
    expect(parent.querySelector('[data-instrument-host]')).not.toBeNull();

    host.sync({ visible: false, value: 2 });
    expect(fake.controls[0]?.dispose).toHaveBeenCalledOnce();
    expect(parent.querySelector('[data-instrument-host]')).toBeNull();

    host.dispose();
    expect(parent.style.position).toBe('');
    expect(removeListener).toHaveBeenCalledWith(
      'instrument-param',
      expect.any(Function)
    );
  });

  it('restores a view reading through serialize after unmount and remount', async () => {
    const { canvas } = createCanvasHost();
    const fake = createFakeFactory({ serializable: true });
    const host = createHost(canvas, fake.factory);

    host.sync({ visible: true, value: 2 });
    await vi.waitFor(() => expect(fake.controls).toHaveLength(1));
    fake.controls[0]?.setReading(7.25);
    host.sync({ visible: false, value: 2 });
    host.sync({ visible: true, value: 2 });

    await vi.waitFor(() => expect(fake.controls).toHaveLength(2));
    expect(host.getReading('fake')).toBe(7.25);
    host.dispose();
  });

  it('falls back to a sim-state snapshot without serialize support', async () => {
    const { canvas, parent } = createCanvasHost();
    const fake = createFakeFactory();
    const host = createHost(canvas, fake.factory);

    host.sync({ visible: true, value: 2 });
    await vi.waitFor(() => expect(fake.controls).toHaveLength(1));
    const slot = parent.querySelector('[data-instrument-id="fake"]');
    slot?.dispatchEvent(
      new CustomEvent('instrument-param', {
        bubbles: true,
        detail: { key: 'jawPosition', value: 23.7 }
      })
    );
    host.sync({ visible: false, value: 2 });
    host.sync({ visible: true, value: 2 });

    await vi.waitFor(() => expect(fake.controls).toHaveLength(2));
    expect(fake.simStates.at(-1)?.jawPosition).toBe(23.7);
    host.dispose();
  });

  it('deduplicates concurrent factory loading', async () => {
    const { canvas } = createCanvasHost();
    const fake = createFakeFactory();
    let resolveFactory: ((factory: unknown) => void) | undefined;
    const factoryPromise = new Promise<unknown>((resolve) => {
      resolveFactory = resolve;
    });
    const loadFactory = vi.fn(() => factoryPromise);
    const host = createHost(canvas, fake.factory, { loadFactory });

    host.sync({ visible: true, value: 2 });
    host.sync({ visible: true, value: 2 });
    expect(loadFactory).toHaveBeenCalledOnce();
    resolveFactory?.(fake.factory);
    await vi.waitFor(() => expect(fake.controls).toHaveLength(1));
    host.dispose();
  });

  it('discards a resolved load when its mount was destroyed', async () => {
    const { canvas } = createCanvasHost();
    const fake = createFakeFactory();
    let resolveFactory: ((factory: unknown) => void) | undefined;
    const factoryPromise = new Promise<unknown>((resolve) => {
      resolveFactory = resolve;
    });
    const host = createHost(canvas, fake.factory, {
      loadFactory: () => factoryPromise
    });

    host.sync({ visible: true, value: 2 });
    host.sync({ visible: false, value: 2 });
    resolveFactory?.(fake.factory);
    await Promise.resolve();
    await Promise.resolve();
    expect(fake.controls).toHaveLength(0);
    host.dispose();
  });

  it('reattaches its DOM when the canvas parent changes during sync', async () => {
    const { canvas, parent } = createCanvasHost();
    const fake = createFakeFactory();
    const host = createHost(canvas, fake.factory);
    host.sync({ visible: true, value: 2 });
    await vi.waitFor(() => expect(fake.controls).toHaveLength(1));

    const nextParent = document.createElement('div');
    document.body.appendChild(nextParent);
    nextParent.appendChild(canvas);
    host.sync({ visible: true, value: 2 });

    expect(parent.querySelector('[data-instrument-host]')).toBeNull();
    expect(nextParent.querySelector('[data-instrument-host]')).not.toBeNull();
    expect(fake.controls[0]?.resize).toHaveBeenCalledTimes(2);
    host.dispose();
  });

  it('forces render and resize when a hidden instrument becomes visible', async () => {
    const { canvas, parent } = createCanvasHost();
    const first = createFakeFactory();
    const second = createFakeFactory();
    const host = createInstrumentHost<SceneParams>({
      attachTo: canvas,
      theme: 'dark',
      instruments: [
        {
          id: 'a',
          loadFactory: () => Promise.resolve(first.factory),
          placement: 'full',
          visible: (params) => params.active === 'a',
          mapParams: () => ({})
        },
        {
          id: 'b',
          loadFactory: () => Promise.resolve(second.factory),
          placement: 'full',
          visible: (params) => params.active === 'b',
          mapParams: () => ({})
        }
      ]
    });

    host.sync({ visible: true, active: 'a', value: 0 });
    await vi.waitFor(() => expect(first.controls).toHaveLength(1));
    host.sync({ visible: true, active: 'b', value: 0 });
    await vi.waitFor(() => expect(second.controls).toHaveLength(1));
    host.sync({ visible: true, active: 'a', value: 0 });

    expect(
      parent.querySelector<HTMLElement>('[data-instrument-id="a"]')?.style
        .display
    ).toBe('block');
    expect(first.controls[0]?.render.mock.calls.length).toBeGreaterThan(1);
    expect(first.controls[0]?.resize.mock.calls.length).toBeGreaterThan(1);
    host.dispose();
  });
});
