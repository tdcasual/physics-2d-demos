/**
 * Lazy data-workspace factory — keeps CapabilityInstance synchronous.
 *
 * mount() returns a proxy immediately. The runtime is dynamically imported
 * only when a layout actually declares the capability. Latest update() is
 * buffered until the real instance mounts; dispose() before resolve skips
 * mount entirely.
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../types';
import type { DataWorkspaceUpdateData } from './data-workspace-declarations';

export type DataWorkspaceRuntimeModule = typeof import('./data-workspace');

type RuntimeLoader = () => Promise<DataWorkspaceRuntimeModule>;

const defaultLoader: RuntimeLoader = () => import('./data-workspace');

let loader: RuntimeLoader = defaultLoader;
let runtimePromise: Promise<DataWorkspaceRuntimeModule> | null = null;

export function setDataWorkspaceRuntimeLoaderForTests(
  next: RuntimeLoader | null
): void {
  loader = next ?? defaultLoader;
  runtimePromise = null;
}

function loadRuntime(): Promise<DataWorkspaceRuntimeModule> {
  if (!runtimePromise) {
    const pending = loader().catch((error: unknown) => {
      // A transient chunk/network failure must not poison the capability for
      // the lifetime of the tab. Clear only this generation's rejected
      // promise so a later layout mount can retry while concurrent callers
      // still share the original request.
      if (runtimePromise === pending) runtimePromise = null;
      console.error('[data-workspace] failed to load runtime', error);
      throw error;
    });
    runtimePromise = pending;
  }
  return runtimePromise;
}

export function createDataWorkspace(): CapabilityDefinition<
  unknown,
  DataWorkspaceUpdateData,
  unknown
> {
  return {
    id: 'data-workspace',

    mount(
      slots: LayoutSlots,
      config: unknown,
      ctx: CapabilityContext
    ): CapabilityInstance<DataWorkspaceUpdateData> {
      let disposed = false;
      let inner: CapabilityInstance<DataWorkspaceUpdateData> | null = null;
      let pending: DataWorkspaceUpdateData | undefined;
      let hasPending = false;

      void loadRuntime()
        .then((mod) => {
          if (disposed) return;
          inner = mod.createDataWorkspace().mount(slots, config, ctx);
          if (disposed) {
            inner.dispose();
            inner = null;
            return;
          }
          if (hasPending) {
            inner.update?.(pending as DataWorkspaceUpdateData);
            hasPending = false;
            pending = undefined;
          }
        })
        .catch(() => {
          /* loadRuntime already logged a scoped error */
        });

      return {
        update(data: DataWorkspaceUpdateData) {
          if (disposed) return;
          if (inner) {
            inner.update?.(data);
            return;
          }
          pending = data;
          hasPending = true;
        },
        dispose() {
          disposed = true;
          hasPending = false;
          pending = undefined;
          inner?.dispose();
          inner = null;
        }
      };
    }
  };
}
