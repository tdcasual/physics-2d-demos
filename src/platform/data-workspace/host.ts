/**
 * Lazy DataWorkspaceHost shell shared by ticker-tape and double-slit.
 *
 * Parameterizes the two wrappers instead of flattening them: empty-session
 * row count, prefetch timing, setActive extras, submitField/addTrial
 * notify, and optional contract methods all stay per-scene.
 */

import { cloneSession, freezeSession } from './session';
import type {
  DataWorkspaceDraft,
  DataWorkspaceEligibility,
  DataWorkspaceFieldResult,
  DataWorkspaceHost,
  DataWorkspaceSession
} from './types';

export type DataWorkspaceHostSubmitEffect = 'renderAndNotify' | 'notify';
export type DataWorkspaceHostNotifyEffect = 'notify' | 'none';

export type DataWorkspaceHostEffects = {
  /** ticker-tape: renderAndNotify; double-slit: notify */
  submitField: DataWorkspaceHostSubmitEffect;
  /** ticker-tape: none; double-slit: notify */
  addTrial: DataWorkspaceHostNotifyEffect;
  /** ticker-tape: none; double-slit: notify */
  removeTrial: DataWorkspaceHostNotifyEffect;
  /** ticker-tape: none; double-slit: notify */
  syncInstrument: DataWorkspaceHostNotifyEffect;
};

export type DataWorkspaceHostExtensions = {
  /** Forward inner.invalidateAll; ticker-tape notifies, double-slit does not. */
  invalidateAll?: { notify: boolean };
  /** Forward inner.invalidateSigFigsDerived (ticker-tape). */
  invalidateSigFigsDerived?: { notify: boolean };
  /** Forward inner.renderResult (double-slit). */
  renderResult?: boolean;
  /** Scene-owned visual side effects (double-slit). */
  setActiveVisual?: (active: boolean) => void;
};

export type CreateDataWorkspaceHostOptions<TInner extends DataWorkspaceHost> = {
  load: () => Promise<TInner>;
  eligibility: () => DataWorkspaceEligibility;
  emptySession: (active: boolean) => DataWorkspaceSession;
  prefetch?: boolean | (() => boolean);
  onActiveChange?: (active: boolean) => void;
  extensions?: DataWorkspaceHostExtensions;
  notify: () => void;
  renderAndEmit?: () => void;
  effects: DataWorkspaceHostEffects;
  loadingMessage: string;
  notReadyError: string;
  loadErrorLabel: string;
  onInnerReady?: (inner: TInner) => void;
};

export type DataWorkspaceHostFacade<TInner extends DataWorkspaceHost> =
  DataWorkspaceHost & {
    ensure(): void;
    getInner(): TInner | null;
  };

export function createDataWorkspaceHost<TInner extends DataWorkspaceHost>(
  options: CreateDataWorkspaceHostOptions<TInner>
): DataWorkspaceHostFacade<TInner> {
  const {
    load,
    eligibility,
    emptySession,
    prefetch,
    onActiveChange,
    extensions = {},
    notify,
    renderAndEmit,
    effects,
    loadingMessage,
    notReadyError,
    loadErrorLabel,
    onInnerReady
  } = options;

  let inner: TInner | null = null;
  let loadPromise: Promise<void> | null = null;
  let chromeOpen = false;

  const empty = (): DataWorkspaceSession => emptySession(chromeOpen);

  function fireSubmit(): void {
    if (effects.submitField === 'renderAndNotify') {
      renderAndEmit?.();
      notify();
      return;
    }
    notify();
  }

  function fire(effect: DataWorkspaceHostNotifyEffect): void {
    if (effect === 'notify') notify();
  }

  function ensure(): void {
    if (inner || loadPromise) return;
    loadPromise = load()
      .then((loaded) => {
        inner = loaded;
        inner.setActive(chromeOpen);
        onInnerReady?.(loaded);
        notify();
      })
      .catch((error: unknown) => {
        console.error(loadErrorLabel, error);
      })
      .finally(() => {
        loadPromise = null;
      });
  }

  const host: DataWorkspaceHostFacade<TInner> = {
    getSpec() {
      if (!inner) throw new Error(notReadyError);
      return inner.getSpec();
    },
    getEligibility() {
      return inner?.getEligibility() ?? eligibility();
    },
    getSession() {
      const session = inner?.getSession() ?? empty();
      if (session.active === chromeOpen) return session;
      return freezeSession(cloneSession({ ...session, active: chromeOpen }));
    },
    getKnowns() {
      return inner?.getKnowns() ?? [];
    },
    getHint() {
      return inner?.getHint() ?? '';
    },
    setActive(active: boolean) {
      chromeOpen = active;
      if (active) ensure();
      inner?.setActive(active);
      onActiveChange?.(active);
      renderAndEmit?.();
      notify();
    },
    submitField(input): DataWorkspaceFieldResult {
      ensure();
      if (!inner) {
        return {
          feedback: { ok: false, message: loadingMessage },
          session: empty()
        };
      }
      const result = inner.submitField(input);
      fireSubmit();
      return result;
    },
    applyDrafts(drafts: readonly DataWorkspaceDraft[]) {
      ensure();
      if (!inner) return empty();
      const session = inner.applyDrafts(drafts);
      notify();
      return session;
    },
    resetSession() {
      inner?.resetSession();
      notify();
    },
    syncInstrument(instrumentId: string) {
      if (effects.syncInstrument === 'none') return;
      inner?.syncInstrument(instrumentId);
      fire(effects.syncInstrument);
    },
    addTrial() {
      ensure();
      if (!inner) return empty();
      const session = inner.addTrial();
      fire(effects.addTrial);
      return session;
    },
    removeTrial(rowId: string, confirmed = false) {
      if (!inner) {
        return { session: empty(), needsConfirm: false };
      }
      const result = inner.removeTrial(rowId, confirmed);
      fire(effects.removeTrial);
      return result;
    },
    ensure,
    getInner: () => inner
  };

  if (extensions.setActiveVisual) {
    host.setActiveVisual = extensions.setActiveVisual;
  }
  if (extensions.renderResult) {
    host.renderResult = (session) => inner?.renderResult?.(session) ?? null;
  }
  if (extensions.invalidateAll) {
    const notifyInvalidation = extensions.invalidateAll.notify;
    host.invalidateAll = (reason: string) => {
      inner?.invalidateAll?.(reason);
      if (notifyInvalidation) notify();
    };
  }
  if (extensions.invalidateSigFigsDerived) {
    const notifyDerived = extensions.invalidateSigFigsDerived.notify;
    host.invalidateSigFigsDerived = (reason: string) => {
      inner?.invalidateSigFigsDerived?.(reason);
      if (notifyDerived) notify();
    };
  }

  if (prefetch === true || (typeof prefetch === 'function' && prefetch())) {
    ensure();
  }

  return host;
}
