import type { TeachingTheme } from '../platform/standards';

export type InstrumentPlacement =
  | 'full'
  | {
      top: number | string;
      left: number | string;
      width: number | string;
      height: number | string;
      padding?: number | string;
    };

type HostSim = {
  getState(): unknown;
  setParams(params: Record<string, unknown>): void;
};

type HostView = {
  render(state: unknown): void;
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  dispose(): void;
  getReading?: () => number;
  onReadingChange?: (callback: (reading: number) => void) => () => void;
  serialize?: () => string;
  deserialize?: (json: string) => void;
};

type HostFactory = {
  createSim(): HostSim;
  createView(options: Record<string, unknown>): HostView;
};

export type InstrumentHostDefinition<SceneParams> = {
  id: string;
  loadFactory: () => Promise<unknown>;
  placement: InstrumentPlacement;
  visible: (sceneParams: SceneParams) => boolean;
  mapParams: (sceneParams: SceneParams) => Record<string, unknown>;
  viewOptions?: Record<string, unknown>;
};

export type CreateInstrumentHostOptions<SceneParams> = {
  attachTo: HTMLCanvasElement;
  theme: TeachingTheme;
  instruments: Array<InstrumentHostDefinition<SceneParams>>;
  cssVariables?: Record<`--${string}`, string>;
  onReadingChange?: (id: string, reading: number) => void;
  onParamChange?: (id: string, key: string, value: unknown) => void;
  onError?: (id: string, error: unknown) => void;
};

export type InstrumentHost<SceneParams> = {
  sync(sceneParams: SceneParams): void;
  setTheme(theme: TeachingTheme): void;
  resize(): void;
  getReading(id: string): number | undefined;
  dispose(): void;
};

type MountedInstrument<SceneParams> = {
  definition: InstrumentHostDefinition<SceneParams>;
  slot: HTMLDivElement | null;
  canvas: HTMLCanvasElement | null;
  sim: HostSim | null;
  view: HostView | null;
  unsubscribe: (() => void) | null;
  loading: Promise<void> | null;
  factoryPromise: Promise<HostFactory> | null;
  serializedState: string | null;
  simState: Record<string, unknown> | null;
  visible: boolean;
  paramsKey: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveFactory(value: unknown): HostFactory {
  if (
    !isRecord(value) ||
    typeof value.createSim !== 'function' ||
    typeof value.createView !== 'function'
  ) {
    throw new Error(
      'instrument factory must expose createSim() and createView()'
    );
  }
  return value as HostFactory;
}

function cssLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
}

function applyPlacement(
  slot: HTMLDivElement,
  placement: InstrumentPlacement
): void {
  slot.style.position = 'absolute';
  slot.style.pointerEvents = 'auto';
  slot.style.overflow = 'visible';
  if (placement === 'full') {
    slot.style.inset = '0';
    return;
  }
  slot.style.top = cssLength(placement.top);
  slot.style.left = cssLength(placement.left);
  slot.style.width = cssLength(placement.width);
  slot.style.height = cssLength(placement.height);
  if (placement.padding !== undefined) {
    slot.style.padding = cssLength(placement.padding);
  }
}

function stableKey(value: Record<string, unknown>): string {
  function normalize(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(normalize);
    if (!isRecord(input)) return input;
    return Object.fromEntries(
      Object.entries(input)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, normalize(nested)])
    );
  }
  return JSON.stringify(normalize(value));
}

function snapshotState(state: unknown): Record<string, unknown> | null {
  if (!isRecord(state)) return null;
  try {
    const snapshot: unknown = structuredClone(state);
    return isRecord(snapshot) ? snapshot : null;
  } catch {
    return { ...state };
  }
}

export function createInstrumentHost<SceneParams>(
  options: CreateInstrumentHostOptions<SceneParams>
): InstrumentHost<SceneParams> {
  let theme = options.theme;
  let root: HTMLDivElement | null = null;
  let mountedParent: HTMLElement | null = null;
  let parentOriginalPosition = '';
  let latestParams: SceneParams | null = null;
  let disposed = false;

  const records = new Map<string, MountedInstrument<SceneParams>>();
  for (const definition of options.instruments) {
    if (records.has(definition.id)) {
      throw new Error(`duplicate instrument id: ${definition.id}`);
    }
    records.set(definition.id, {
      definition,
      slot: null,
      canvas: null,
      sim: null,
      view: null,
      unsubscribe: null,
      loading: null,
      factoryPromise: null,
      serializedState: null,
      simState: null,
      visible: false,
      paramsKey: ''
    });
  }

  function restoreParentPosition(): void {
    if (mountedParent) mountedParent.style.position = parentOriginalPosition;
    mountedParent = null;
    parentOriginalPosition = '';
  }

  function attachRoot(parent: HTMLElement): boolean {
    if (!root) {
      root = document.createElement('div');
      root.dataset.instrumentHost = '';
      root.style.cssText =
        'position:absolute;inset:0;pointer-events:none;z-index:10;overflow:visible;';
      for (const [name, value] of Object.entries(options.cssVariables ?? {})) {
        root.style.setProperty(name, value);
      }
    }
    const parentChanged =
      mountedParent !== parent || root.parentElement !== parent;
    if (!parentChanged) return false;

    restoreParentPosition();
    mountedParent = parent;
    parentOriginalPosition = parent.style.position;
    parent.style.position = 'relative';
    parent.appendChild(root);
    return true;
  }

  function ensureSlot(record: MountedInstrument<SceneParams>): void {
    if (!root || (record.slot && record.slot.parentElement === root)) return;
    const slot = document.createElement('div');
    slot.dataset.instrumentId = record.definition.id;
    slot.style.boxSizing = 'border-box';
    applyPlacement(slot, record.definition.placement);
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    slot.appendChild(canvas);
    root.appendChild(slot);
    record.slot = slot;
    record.canvas = canvas;
  }

  function cacheState(record: MountedInstrument<SceneParams>): void {
    if (!record.sim || !record.view) return;
    if (
      typeof record.view.serialize === 'function' &&
      typeof record.view.deserialize === 'function'
    ) {
      record.serializedState = record.view.serialize();
      record.simState = null;
      return;
    }
    record.simState = snapshotState(record.sim.getState());
    record.serializedState = null;
  }

  function releaseInstance(record: MountedInstrument<SceneParams>): void {
    record.unsubscribe?.();
    record.unsubscribe = null;
    if (record.view) {
      cacheState(record);
      record.view.dispose();
    }
    record.sim = null;
    record.view = null;
    record.paramsKey = '';
  }

  function teardownMount(): void {
    for (const record of records.values()) {
      releaseInstance(record);
      record.slot?.remove();
      record.slot = null;
      record.canvas = null;
      record.visible = false;
    }
    root?.remove();
    root = null;
    restoreParentPosition();
  }

  function renderRecord(
    record: MountedInstrument<SceneParams>,
    forceResize = false
  ): void {
    if (!record.sim || !record.view) return;
    record.view.render(record.sim.getState());
    if (forceResize) record.view.resize();
  }

  function applyMappedParams(
    record: MountedInstrument<SceneParams>,
    sceneParams: SceneParams,
    force = false
  ): void {
    if (!record.sim || !record.view) return;
    const mapped = record.definition.mapParams(sceneParams);
    const key = stableKey(mapped);
    if (!force && key === record.paramsKey) return;
    record.paramsKey = key;
    record.sim.setParams(mapped);
    renderRecord(record);
  }

  function loadFactory(
    record: MountedInstrument<SceneParams>
  ): Promise<HostFactory> {
    record.factoryPromise ??= record.definition
      .loadFactory()
      .then(resolveFactory);
    return record.factoryPromise;
  }

  function ensureInstance(record: MountedInstrument<SceneParams>): void {
    if (record.view || record.loading || !record.canvas) return;
    record.loading = loadFactory(record)
      .then((factory) => {
        if (
          disposed ||
          !latestParams ||
          !record.visible ||
          !record.canvas ||
          !record.slot ||
          !root ||
          record.slot.parentElement !== root
        ) {
          return;
        }
        const sim = factory.createSim();
        const view = factory.createView({
          canvas: record.canvas,
          theme,
          ...record.definition.viewOptions
        });
        record.sim = sim;
        record.view = view;
        if (
          record.serializedState !== null &&
          typeof view.deserialize === 'function'
        ) {
          view.deserialize(record.serializedState);
        } else if (record.simState) {
          sim.setParams(record.simState);
        }
        if (typeof view.onReadingChange === 'function') {
          record.unsubscribe = view.onReadingChange((reading) => {
            options.onReadingChange?.(record.definition.id, reading);
          });
        }
        record.paramsKey = '';
        applyMappedParams(record, latestParams, true);
        view.resize();
        if (typeof view.getReading === 'function') {
          options.onReadingChange?.(record.definition.id, view.getReading());
        }
      })
      .catch((error: unknown) => {
        record.factoryPromise = null;
        if (options.onError) options.onError(record.definition.id, error);
        else
          console.error(
            `[InstrumentHost] failed to load ${record.definition.id}`,
            error
          );
      })
      .finally(() => {
        record.loading = null;
      });
  }

  function handleInstrumentParam(event: Event): void {
    if (!(event instanceof CustomEvent) || !isRecord(event.detail)) return;
    const { key, value } = event.detail;
    if (typeof key !== 'string') return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const record = [...records.values()].find((item) =>
      item.slot?.contains(target)
    );
    if (!record?.sim) return;
    record.sim.setParams({ [key]: value });
    record.paramsKey = '';
    renderRecord(record);
    options.onParamChange?.(record.definition.id, key, value);
  }

  document.addEventListener('instrument-param', handleInstrumentParam);

  return {
    sync(sceneParams: SceneParams) {
      if (disposed) return;
      latestParams = sceneParams;
      const visibility = [...records.values()].map((record) => ({
        record,
        visible: record.definition.visible(sceneParams)
      }));
      if (!visibility.some((item) => item.visible)) {
        teardownMount();
        return;
      }

      const parent = options.attachTo.parentElement;
      if (!parent) return;
      const reattached = attachRoot(parent);
      for (const { record, visible } of visibility) {
        ensureSlot(record);
        const changed = record.visible !== visible;
        record.visible = visible;
        if (record.slot) record.slot.style.display = visible ? 'block' : 'none';
        if (!visible) continue;
        ensureInstance(record);
        applyMappedParams(record, sceneParams);
        if (changed || reattached) renderRecord(record, true);
      }
    },
    setTheme(nextTheme: TeachingTheme) {
      if (disposed) return;
      theme = nextTheme;
      for (const record of records.values()) {
        record.view?.setTheme(nextTheme);
        renderRecord(record, true);
      }
    },
    resize() {
      if (disposed) return;
      for (const record of records.values()) renderRecord(record, true);
    },
    getReading(id: string) {
      const getReading = records.get(id)?.view?.getReading;
      return getReading?.();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('instrument-param', handleInstrumentParam);
      teardownMount();
      latestParams = null;
    }
  };
}
