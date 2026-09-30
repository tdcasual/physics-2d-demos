/**
 * Serial layout-switch coordinator: one owner, abort/ack, rollback, quarantine.
 *
 * Quarantine = page-terminal isolation (reload, or `resetSwitchQuarantine`
 * when ack + unique stage-canvas custody + recovery target). See
 * `docs/layout-switch-lifecycle.md`.
 *
 * Approved deviation from v10 §3.2:74: abort after `incomingMounted` keeps
 * the new tree and still commits `onLayoutDidChange` / `layout:change` /
 * `savePreference`. Rolling back an acked enter is worse.
 */

import { layoutRegistry } from './registry';
import {
  saveLayoutState as saveLayoutStateToStorage,
  restoreLayoutState as restoreLayoutStateFromStorage
} from './container-persistence';
import { suppressLayoutResize } from './request-layout-resize';
import {
  createAbortError,
  isAbortError,
  raceAbort,
  SwitchQuarantinedError,
  type LayoutSwitchState
} from './switch-errors';
import type { ModeOwner } from './mode-owner';
import type { SidebarStateOwner } from './sidebar-state';
import type { WorkspaceUiState } from './workspace-ui-state';
import type { CapabilityOrchestrator } from './capability-orchestrator';
import type {
  ILayout,
  LayoutConfig,
  LayoutTransition,
  Scene,
  SwitchOptions,
  Theme,
  LayoutChangeEvent
} from './types';

const SWITCH_TIMEOUT_MS = 10_000;
const ACK_DEADLINE_MS = 1_000;

export type LayoutSwitchSnapshot = {
  fromId: string | null;
  fromLayout: ILayout | null;
  canvas: HTMLCanvasElement | null;
  canvasGeneration: number;
  layoutState: Record<string, unknown> | undefined;
};

type PhaseName = 'willChange' | 'exit' | 'enter' | 'mount';

type SwitchPhase = {
  name: PhaseName;
  effectful: boolean;
  acked: boolean;
};

export type SwitchRuntimeHost = {
  container: HTMLElement;
  storageKey: string;
  getTheme(): Theme;
  resolveLayoutConfig(layoutId: string): LayoutConfig;
  isDisposed(): boolean;
  getCurrentLayout(): ILayout | null;
  setCurrentLayout(layout: ILayout | null): void;
  getCurrentScene(): Scene | null;
  mode: ModeOwner;
  sidebar: SidebarStateOwner;
  workspaceUi: WorkspaceUiState;
  orchestrator: CapabilityOrchestrator;
  emitLayoutChange(event: LayoutChangeEvent): void;
  emitSwitchError(payload: {
    generation: number;
    error: unknown;
    state: LayoutSwitchState;
  }): void;
  savePreference(layoutId: string): void;
  mountScene(scene: Scene, layout: ILayout): void;
  onLayoutDidChange(to: string): void;
  drainResize(): void;
  captureFocus(): {
    restore: () => void;
  };
};

export class LayoutSwitchRuntime {
  state: LayoutSwitchState = 'idle';
  generation = 0;
  pendingSwitchId: string | null = null;
  pendingScene: Scene | null = null;
  /**
   * Container-side settle hook for the switching-queue deferred.
   * `clearPendingQueue` (quarantine / reset / dispose) and a successful
   * `drainPending` apply must fire this so `setScene` waiters cannot hang.
   */
  pendingApplyNotify: (() => void) | null = null;
  private pendingSwitchSavePreference = false;
  private pendingSwitchReason = 'manual';
  canvasOwner: { generation: number; node: HTMLCanvasElement | null } | null =
    null;
  lastError: unknown = null;
  private abort: AbortController | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private phase: SwitchPhase | null = null;
  private snapshot: LayoutSwitchSnapshot | null = null;
  private incomingLayout: ILayout | null = null;
  private ackWaiters: Array<() => void> = [];
  private rollbackAbort: AbortController | null = null;

  constructor(private readonly host: SwitchRuntimeHost) {}

  /**
   * Seed stage-canvas custody from the layout already mounted by
   * `_initialSetScene`. First `switchLayout` constructs this runtime
   * before `willChange`, so a hung first switch can still reset
   * quarantine when extra instrument canvases share the animation slot.
   */
  adoptCurrentCanvas(): void {
    if (this.canvasOwner) return;
    const node =
      this.host
        .getCurrentLayout()
        ?.getSlots?.()
        ?.animation?.querySelector<HTMLCanvasElement>('canvas') ?? null;
    this.canvasOwner = { generation: this.generation, node };
  }

  getSwitchState(): LayoutSwitchState {
    return this.state;
  }

  /**
   * Abort the in-flight switch (watchdog, dispose, or explicit cancel).
   * Does not enter quarantine; the current `switchLayout` catch/finally
   * observes `isDisposed()` / the aborted signal and skips DOM writes.
   */
  abortSwitch(reason?: unknown): void {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.abort && !this.abort.signal.aborted) {
      this.abort.abort(reason ?? createAbortError());
    }
    this.flushAckWaiters();
  }

  /**
   * Page/container teardown: abort the in-flight wait, drop the pending
   * queue, and never enter quarantine from this path.
   */
  dispose(): void {
    this.clearPendingQueue();
    this.abortSwitch(createAbortError('Container disposed'));
    this.rollbackAbort?.abort(createAbortError('Container disposed'));
    this.rollbackAbort = null;
    this.abort = null;
    this.phase = null;
  }

  /**
   * Leave quarantine only when the live phase has acked, canvas ownership
   * is unique, and a recovery target is known. Otherwise keep isolation.
   */
  resetSwitchQuarantine(): boolean {
    if (this.state !== 'quarantined') return false;
    if (this.hasUnackedEffectfulPhase()) return false;
    if (!this.hasUniqueCanvasOwner()) return false;
    if (!this.recoveryTarget()) return false;
    this.clearPendingQueue();
    this.state = 'idle';
    this.lastError = null;
    this.abort = null;
    this.phase = null;
    return true;
  }

  rejectIfQuarantined(): void {
    if (this.state === 'quarantined') {
      throw new SwitchQuarantinedError(this.generation);
    }
  }

  async switchLayout(
    layoutId: string,
    options: SwitchOptions = {}
  ): Promise<void> {
    const {
      reason = 'manual',
      animate = true,
      transition = { type: 'fade', duration: 250, easing: 'ease-in-out' },
      savePreference = false,
      skipWillChange = false
    } = options;

    this.rejectIfQuarantined();
    if (this.host.getCurrentLayout()?.id === layoutId) return;
    if (this.host.isDisposed()) return;
    if (!layoutRegistry.has(layoutId)) {
      throw new Error(`Layout "${layoutId}" not found`);
    }
    if (this.state === 'switching') {
      if (reason === 'manual') {
        this.pendingSwitchId = layoutId;
        this.pendingSwitchSavePreference = savePreference;
        this.pendingSwitchReason = reason;
      }
      return;
    }

    const generation = ++this.generation;
    const abort = new AbortController();
    this.abort = abort;
    this.state = 'switching';
    this.incomingLayout = null;
    const stale = () =>
      generation !== this.generation ||
      this.host.isDisposed() ||
      abort.signal.aborted;

    this.timeoutId = setTimeout(() => {
      if (generation === this.generation && this.state === 'switching') {
        abort.abort(createAbortError('Layout switch timed out'));
      }
    }, SWITCH_TIMEOUT_MS);

    const fromLayout = this.host.getCurrentLayout();
    const fromId = fromLayout?.id || null;
    const focus = this.host.captureFocus();
    const releaseResize = suppressLayoutResize();
    let snapshot: LayoutSwitchSnapshot | null = null;
    let teardownStarted = false;
    let incomingMounted = false;

    try {
      if (!skipWillChange) {
        await this.runWillChange(fromId, layoutId, abort.signal, generation);
        if (this.getSwitchState() === 'quarantined') return;
        if (stale() && !abort.signal.aborted) return;
      }
      if (this.host.isDisposed() || abort.signal.aborted) return;

      snapshot = this.capture(fromLayout, generation);
      this.snapshot = snapshot;
      this.canvasOwner = {
        generation,
        node: snapshot.canvas
      };
      if (snapshot.layoutState && fromLayout?.id) {
        saveLayoutStateToStorage(
          this.host.storageKey,
          fromLayout.id,
          snapshot.layoutState
        );
      }

      this.host.orchestrator.disposeAll();

      teardownStarted = true;
      await this.teardownOutgoing(
        fromLayout,
        animate,
        transition,
        abort.signal,
        generation
      );
      if (this.getSwitchState() === 'quarantined') return;
      if (this.host.isDisposed()) return;
      this.host.setCurrentLayout(null);
      if (this.host.container.childElementCount > 0) {
        this.host.container.replaceChildren();
      }

      this.projectOwners();

      const newLayout = await this.setupIncoming(
        layoutId,
        snapshot.canvas,
        abort.signal,
        generation
      );
      incomingMounted = true;
      if (this.getSwitchState() === 'quarantined') return;
      if (this.host.isDisposed()) return;

      await this.finalize(
        newLayout,
        fromId,
        layoutId,
        reason,
        animate,
        transition,
        savePreference,
        abort.signal,
        generation
      );
      if (this.getSwitchState() === 'quarantined') return;
      if (this.host.isDisposed()) return;
      focus.restore();
    } catch (err) {
      if (this.host.isDisposed()) return;
      if (this.getSwitchState() === 'quarantined') return;
      if (this.hasUnackedEffectfulPhase()) {
        this.enterQuarantine(generation, err);
        return;
      }
      if (isAbortError(err) && !teardownStarted) {
        return;
      }
      if (!teardownStarted) {
        this.host.emitSwitchError({
          generation,
          error: err,
          state: 'idle'
        });
        return;
      }
      if (isAbortError(err) && !incomingMounted) {
        await this.rollback(snapshot, err);
        return;
      }
      if (isAbortError(err) && incomingMounted) {
        // Approved deviation from v10 §3.2:74: the incoming tree is already
        // live; complete commit notifications instead of rolling back an
        // acked enter. See docs/layout-switch-lifecycle.md.
        this.commitLayoutChange(fromId, layoutId, reason, savePreference);
        return;
      }
      console.error('[SceneContainer] Layout switch failed:', err);
      const recovered = await this.rollback(snapshot, err);
      if (!recovered) {
        this.enterQuarantine(generation, err);
      }
    } finally {
      if (this.timeoutId != null) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      releaseResize();
      if (this.host.isDisposed()) {
        this.clearPendingQueue();
      } else if (this.hasUnackedEffectfulPhase()) {
        if (this.getSwitchState() !== 'quarantined') {
          this.enterQuarantine(
            generation,
            this.lastError ?? createAbortError('Unacked layout phase')
          );
        }
      } else if (
        generation === this.generation &&
        this.getSwitchState() === 'switching'
      ) {
        this.finishIdle(generation);
        await this.drainPending(generation);
      }
    }
  }

  private hasUnackedEffectfulPhase(): boolean {
    return Boolean(this.phase && this.phase.effectful && !this.phase.acked);
  }

  private beginPhase(name: PhaseName, effectful: boolean): SwitchPhase {
    const phase: SwitchPhase = { name, effectful, acked: false };
    this.phase = phase;
    return phase;
  }

  private ackPhase(phase: SwitchPhase): void {
    phase.acked = true;
    if (this.phase === phase) this.phase = null;
    const waiters = this.ackWaiters;
    this.ackWaiters = [];
    for (const waiter of waiters) waiter();
  }

  private recoveryTarget(): string | null {
    return this.snapshot?.fromId ?? this.host.getCurrentLayout()?.id ?? null;
  }

  /**
   * Stage-canvas uniqueness is custody of the owned node, not a count of
   * every `<canvas>` under the animation slot (double-slit instruments
   * and chase-meet motion/x/v canvases are legal extras).
   *
   * owned still in the host container → unique. Coordinator holds a node
   * and the tracked slots contain 0 canvases → unique (ordinary
   * mount-throw rollback, `scene-container-registry.spec.ts`). owned
   * gone with a different canvas in the slot → not unique. owned is
   * null → fall back to live.length ≤ 1.
   */
  private hasUniqueCanvasOwner(): boolean {
    const owned = this.canvasOwner?.node ?? this.snapshot?.canvas ?? null;
    if (owned) {
      if (this.host.container.contains(owned)) return true;
      return this.trackedLiveStageCanvases().length === 0;
    }
    return this.trackedLiveStageCanvases().length <= 1;
  }

  private trackedLiveStageCanvases(): HTMLCanvasElement[] {
    const found = new Set<HTMLCanvasElement>();
    const take = (root: HTMLElement | undefined): void => {
      if (!root) return;
      for (const canvas of root.querySelectorAll('canvas')) {
        if (this.host.container.contains(canvas)) found.add(canvas);
      }
    };
    take(this.host.getCurrentLayout()?.getSlots?.()?.animation);
    take(this.incomingLayout?.getSlots?.()?.animation);
    return [...found];
  }

  private clearPendingQueue(): void {
    const pendingNotify = this.pendingApplyNotify;
    this.pendingApplyNotify = null;
    pendingNotify?.();
    this.pendingSwitchId = null;
    this.pendingScene = null;
    this.pendingSwitchSavePreference = false;
    this.pendingSwitchReason = 'manual';
  }

  private commitLayoutChange(
    fromId: string | null,
    layoutId: string,
    reason: string,
    savePreference: boolean
  ): void {
    this.host.onLayoutDidChange(layoutId);
    this.host.emitLayoutChange({ from: fromId, to: layoutId, reason });
    if (savePreference) {
      this.host.savePreference(layoutId);
    }
  }

  private haltError(signal: AbortSignal): Error {
    if (signal.reason instanceof Error) return signal.reason;
    return createAbortError(
      this.host.isDisposed() ? 'Container disposed' : 'Layout switch aborted'
    );
  }

  private assertNotHalted(signal: AbortSignal): void {
    if (this.host.isDisposed() || signal.aborted) {
      throw this.haltError(signal);
    }
  }

  private finishIdle(generation: number): void {
    if (generation !== this.generation) return;
    if (this.state === 'quarantined') return;
    this.state = 'idle';
    this.abort = null;
    this.phase = null;
    this.host.drainResize();
  }

  private enterQuarantine(generation: number, error: unknown): void {
    if (this.host.isDisposed()) return;
    this.clearPendingQueue();
    this.state = 'quarantined';
    this.lastError = error;
    this.host.emitSwitchError({
      generation,
      error,
      state: 'quarantined'
    });
  }

  private projectOwners(): void {
    this.host.mode.project('reproject');
    this.host.sidebar.project(this.host.container);
  }

  private capture(
    fromLayout: ILayout | null,
    generation: number
  ): LayoutSwitchSnapshot {
    const canvas =
      fromLayout
        ?.getSlots?.()
        ?.animation?.querySelector<HTMLCanvasElement>('canvas') ?? null;
    return {
      fromId: fromLayout?.id || null,
      fromLayout,
      canvas,
      canvasGeneration: generation,
      layoutState: fromLayout?.getLayoutState?.()
    };
  }

  private async runWillChange(
    fromId: string | null,
    toId: string,
    signal: AbortSignal,
    generation: number
  ): Promise<void> {
    const hook = this.host.getCurrentScene()?.onLayoutWillChange;
    if (!hook) return;
    const phase = this.beginPhase('willChange', true);
    const work = Promise.resolve(hook(fromId || '', toId, signal)).then(
      () => undefined
    );
    await this.awaitEffectful(phase, work, signal, generation);
  }

  private flushAckWaiters(): void {
    const waiters = this.ackWaiters;
    this.ackWaiters = [];
    for (const waiter of waiters) waiter();
  }

  private waitAck(isAcked: () => boolean): Promise<void> {
    if (isAcked() || this.host.isDisposed()) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve();
      };
      const timeoutId = setTimeout(finish, ACK_DEADLINE_MS);
      this.ackWaiters.push(() => {
        finish();
      });
    });
  }

  private async awaitEffectful(
    phase: SwitchPhase,
    work: Promise<void>,
    signal: AbortSignal,
    generation: number
  ): Promise<void> {
    const tracked = work.then(
      () => {
        this.ackPhase(phase);
      },
      (err: unknown) => {
        this.ackPhase(phase);
        throw err;
      }
    );
    try {
      await raceAbort(tracked, signal);
    } catch (err) {
      if (!isAbortError(err)) throw err;
      await this.waitAck(() => phase.acked);
      if (!phase.acked) {
        if (!this.host.isDisposed()) {
          this.enterQuarantine(generation, err);
        }
        throw err;
      }
      throw err;
    }
  }

  private async teardownOutgoing(
    fromLayout: ILayout | null,
    animate: boolean,
    transition: LayoutTransition,
    signal: AbortSignal,
    generation: number
  ): Promise<void> {
    if (fromLayout && animate && fromLayout.exit) {
      const phase = this.beginPhase('exit', true);
      const work = Promise.resolve(fromLayout.exit(transition)).then(
        () => undefined
      );
      try {
        await this.awaitEffectful(phase, work, signal, generation);
      } catch (err) {
        if (this.state === 'quarantined') throw err;
        if (!isAbortError(err)) {
          console.warn('[SceneContainer] Layout exit animation failed:', err);
        } else {
          throw err;
        }
      }
    }
    if (this.hasUnackedEffectfulPhase()) {
      this.enterQuarantine(
        generation,
        createAbortError('Layout exit did not acknowledge cancellation')
      );
      throw this.lastError ?? createAbortError();
    }
    if (fromLayout) {
      await raceAbort(
        Promise.resolve(fromLayout.unmount()).then(() => undefined),
        signal
      );
      layoutRegistry.returnInstance(
        this.host.container,
        fromLayout.id,
        fromLayout
      );
    }
  }

  private reportDisposeAllError(context: string, err: unknown): void {
    console.error(`[SceneContainer] ${context} disposeAll failed:`, err);
  }

  private disposeCapabilitiesBestEffort(context: string): void {
    try {
      this.host.orchestrator.disposeAll();
    } catch (err) {
      this.reportDisposeAllError(context, err);
    }
  }

  private async abandonIncoming(layout: ILayout | null): Promise<void> {
    if (!layout) return;
    this.disposeCapabilitiesBestEffort('abandonIncoming');
    if (this.host.isDisposed()) {
      if (this.incomingLayout === layout) this.incomingLayout = null;
      return;
    }
    try {
      await layout.unmount();
    } catch (err) {
      console.error('[SceneContainer] abandonIncoming unmount rejected:', err);
    }
    if (this.incomingLayout === layout) this.incomingLayout = null;
  }

  private async setupIncoming(
    layoutId: string,
    preservedCanvas: HTMLCanvasElement | null,
    signal: AbortSignal,
    generation: number
  ): Promise<ILayout> {
    if (this.host.isDisposed() || signal.aborted) {
      throw this.haltError(signal);
    }
    this.host.container.style.display = '';
    this.host.container.style.gridTemplateColumns = '';
    this.host.container.style.gridTemplateRows = '';

    let created: ILayout | null = null;
    try {
      created = await raceAbort(
        layoutRegistry.create(
          layoutId,
          this.host.container,
          {
            theme: this.host.getTheme(),
            ...this.host.resolveLayoutConfig(layoutId),
            preservedCanvas
          },
          { signal }
        ),
        signal
      );
    } catch (err) {
      if (created) await this.abandonIncoming(created);
      throw err;
    }

    this.assertNotHalted(signal);
    if (!created) {
      throw createAbortError('Layout create returned no instance');
    }
    const incoming = created;
    this.incomingLayout = incoming;

    const phase = this.beginPhase('mount', true);
    try {
      this.projectOwners();
      await this.awaitEffectful(
        phase,
        Promise.resolve(incoming.mount()).then(async () => {
          if (this.host.isDisposed() || signal.aborted) {
            try {
              await incoming.unmount();
            } catch (err) {
              console.error(
                '[SceneContainer] incoming unmount after halt rejected:',
                err
              );
            }
            throw this.haltError(signal);
          }
        }),
        signal,
        generation
      );
      this.assertNotHalted(signal);
      this.host.container.dataset.layoutId = layoutId;
      this.host.setCurrentLayout(incoming);
      incoming.setTheme(this.host.getTheme());
      const savedLayoutState = restoreLayoutStateFromStorage(
        this.host.storageKey,
        layoutId
      );
      if (savedLayoutState) {
        incoming.restoreLayoutState?.(savedLayoutState);
      }
      this.projectOwners();

      const scene = this.host.getCurrentScene();
      if (scene) {
        this.host.mountScene(scene, incoming);
      }
      this.canvasOwner = {
        generation,
        node:
          incoming
            .getSlots?.()
            ?.animation?.querySelector<HTMLCanvasElement>('canvas') ??
          preservedCanvas
      };
      return incoming;
    } catch (err) {
      if (this.state === 'quarantined' || this.hasUnackedEffectfulPhase()) {
        throw err;
      }
      await this.abandonIncoming(incoming);
      if (!this.hasUniqueCanvasOwner()) {
        this.enterQuarantine(generation, err);
      }
      throw err;
    }
  }

  private async finalize(
    newLayout: ILayout,
    fromId: string | null,
    layoutId: string,
    reason: string,
    animate: boolean,
    transition: LayoutTransition,
    savePreference: boolean,
    signal: AbortSignal,
    generation: number
  ): Promise<void> {
    if (animate && newLayout.enter) {
      const phase = this.beginPhase('enter', true);
      const work = Promise.resolve(
        newLayout.enter({
          ...transition,
          easing: 'ease-out'
        })
      ).then(() => undefined);
      try {
        await this.awaitEffectful(phase, work, signal, generation);
      } catch (err) {
        if (this.state === 'quarantined') throw err;
        if (!isAbortError(err)) {
          /* 动画被中断或失败，布局本身已可用 */
        } else {
          throw err;
        }
      }
    }
    this.assertNotHalted(signal);
    if (this.hasUnackedEffectfulPhase()) {
      this.enterQuarantine(
        generation,
        createAbortError('Layout enter did not acknowledge cancellation')
      );
      throw this.lastError ?? createAbortError();
    }
    if (signal.aborted) {
      throw signal.reason ?? createAbortError();
    }

    this.commitLayoutChange(fromId, layoutId, reason, savePreference);
  }

  private async rollback(
    snapshot: LayoutSwitchSnapshot | null,
    _error: unknown
  ): Promise<boolean> {
    const rollbackAbort = new AbortController();
    this.rollbackAbort = rollbackAbort;
    const signal = rollbackAbort.signal;
    const internalCleanup = (): void => {
      this.disposeCapabilitiesBestEffort('rollback');
      if (this.incomingLayout) this.incomingLayout = null;
    };
    try {
      if (this.host.isDisposed()) {
        if (this.incomingLayout) {
          await this.abandonIncoming(this.incomingLayout);
        }
        internalCleanup();
        return false;
      }
      if (this.hasUnackedEffectfulPhase()) return false;
      if (this.incomingLayout) {
        await this.abandonIncoming(this.incomingLayout);
        if (this.host.isDisposed()) {
          internalCleanup();
          return false;
        }
      }
      if (!snapshot?.fromId || !snapshot.fromLayout) {
        return false;
      }
      try {
        this.disposeCapabilitiesBestEffort('rollback');
        if (this.host.isDisposed()) return false;
        if (this.host.container.childElementCount > 0) {
          this.host.container.replaceChildren();
        }
        if (this.host.isDisposed()) return false;
        const recovered = await layoutRegistry.create(
          snapshot.fromId,
          this.host.container,
          {
            theme: this.host.getTheme(),
            ...this.host.resolveLayoutConfig(snapshot.fromId),
            preservedCanvas: snapshot.canvas ?? null
          },
          { signal }
        );
        if (this.host.isDisposed() || signal.aborted) {
          internalCleanup();
          return false;
        }
        this.projectOwners();
        await recovered.mount();
        if (this.host.isDisposed() || signal.aborted) {
          internalCleanup();
          return false;
        }
        recovered.setTheme(this.host.getTheme());
        const scene = this.host.getCurrentScene();
        if (scene) {
          this.host.mountScene(scene, recovered);
        }
        if (this.host.isDisposed()) {
          internalCleanup();
          return false;
        }
        this.host.setCurrentLayout(recovered);
        this.incomingLayout = null;
        this.canvasOwner = {
          generation: snapshot.canvasGeneration,
          node:
            recovered
              .getSlots?.()
              ?.animation?.querySelector<HTMLCanvasElement>('canvas') ??
            snapshot.canvas
        };
        this.projectOwners();
        console.warn(
          `[SceneContainer] Recovered layout "${snapshot.fromId}" after switch failure`
        );
        return true;
      } catch (recoveryErr) {
        console.error(
          '[SceneContainer] Recovery also failed, container is empty:',
          recoveryErr
        );
        if (this.host.isDisposed()) {
          internalCleanup();
          return false;
        }
        if (!this.hasUniqueCanvasOwner()) {
          this.enterQuarantine(this.generation, recoveryErr);
        }
        return false;
      }
    } finally {
      if (this.rollbackAbort === rollbackAbort) this.rollbackAbort = null;
    }
  }

  /**
   * Drain order is a Wave B/C contract: pendingScene first, then
   * pendingSwitchId. Queued `reason` / `savePreference` are passed
   * through; do not reorder these awaits without updating the test that
   * locks both this order and the quarantine-clears-pending invariant.
   */
  async drainPending(generation: number): Promise<void> {
    if (generation !== this.generation || this.host.isDisposed()) return;
    if (this.state === 'quarantined') return;
    if (this.hasUnackedEffectfulPhase()) return;
    const pendingScene = this.pendingScene;
    this.pendingScene = null;
    const pendingSwitchId = this.pendingSwitchId;
    const pendingSavePreference = this.pendingSwitchSavePreference;
    const pendingReason = this.pendingSwitchReason;
    this.pendingSwitchId = null;
    this.pendingSwitchSavePreference = false;
    this.pendingSwitchReason = 'manual';
    let sceneApplied = false;
    try {
      if (pendingScene) {
        await this.hostSetScene(pendingScene);
        sceneApplied = true;
        const pendingNotify = this.pendingApplyNotify;
        this.pendingApplyNotify = null;
        pendingNotify?.();
      }
      if (
        pendingSwitchId &&
        !this.host.isDisposed() &&
        this.host.getCurrentLayout()?.id !== pendingSwitchId
      ) {
        await this.switchLayout(pendingSwitchId, {
          reason: pendingReason,
          animate: true,
          savePreference: pendingSavePreference
        });
      }
    } catch (err) {
      console.error('[SceneContainer] Pending drain failed:', err);
      if (!sceneApplied && pendingScene && !this.pendingScene) {
        this.pendingScene = pendingScene;
      }
      if (pendingSwitchId && !this.pendingSwitchId) {
        this.pendingSwitchId = pendingSwitchId;
        this.pendingSwitchSavePreference = pendingSavePreference;
        this.pendingSwitchReason = pendingReason;
      }
    }
  }

  /** Injected by the container so drain can call setScene without a cycle. */
  hostSetScene: (scene: Scene) => Promise<void> = async () => {};
}
