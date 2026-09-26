/**
 * Data-workspace capability — optional fillable table below the stage.
 *
 * Opt-in via LayoutConfig.dataWorkspace. Does not replace readout or graph.
 * Entry is a shared stage-toolbar action, independent of transport-bar.
 * The capability stylesheet travels with this lazily loaded runtime chunk, so
 * non-opt-in scenes and opt-in page entry bundles do not pay its initial CSS
 * cost. Awaiting Vite's dynamic CSS import before defining the runtime also
 * ensures the runtime-created entry button is styled when it appears.
 */

await import('../../../styles/capability/data-workspace.css');
import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../types';
import {
  shouldEnableStagePanZoom,
  shouldShowChartAnalysis,
  type DataWorkspaceHost,
  type DataWorkspaceSpec
} from '../../../platform/data-workspace';
import {
  createDataWorkspacePanel,
  type DataWorkspacePanelStep
} from '../../../ui/components/data-workspace-panel';
import {
  ensureStageToolbar,
  releaseStageToolbar
} from '../../../ui/stage-toolbar';
import type { DataWorkspaceUpdateData } from './data-workspace-declarations';
import { createStagePanzoom, type StagePanzoomHandle } from './stage-panzoom';
import { layoutRegistry } from '../registry';
import { requestLayoutResize } from '../request-layout-resize';
import { moveNode, type MovedNode } from '../../../ui/utils/node-mover';
import {
  GRAPH_SECTION_ATTR,
  STAGE_FRAME_ATTR
} from '../../../platform/stage-chrome';

export type { DataWorkspaceUpdateData };

const WORKSPACE_CLASS = 'is-data-workspace';
const CHART_CLASS = 'is-data-workspace-chart';
const INSTRUMENT_ONLY_CLASS = 'is-data-workspace-instrument-only';
const STAGE_LOCK_CLASS = 'is-data-workspace-stage-lock';

/** Inline geometry written by makeDraggable / makeResizable (and CSS fallbacks). */
const GRAPH_GEOMETRY_PROPS = [
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'inset',
  'width',
  'height',
  'max-width',
  'max-height',
  'min-width',
  'min-height',
  'z-index'
] as const;

function readInlineStyle(el: HTMLElement): string {
  return el.getAttribute('style') ?? '';
}

function clearInlineGeometry(el: HTMLElement): void {
  for (const prop of GRAPH_GEOMETRY_PROPS) {
    el.style.removeProperty(prop);
  }
}

function writeInlineStyle(el: HTMLElement, saved: string): void {
  if (saved) el.setAttribute('style', saved);
  else el.removeAttribute('style');
}

function placeWorkspaceHost(
  slots: LayoutSlots,
  container: HTMLElement,
  hostEl: HTMLElement
): void {
  const animation = slots.animation;
  const stageFrame =
    container.querySelector<HTMLElement>(`[${STAGE_FRAME_ATTR}]`) ??
    animation?.closest(
      '.teaching-stage-frame, .srgb-stage-frame, .mobile-animation-section, .lab-stage-anim'
    ) ??
    animation;
  if (stageFrame?.parentElement) {
    stageFrame.parentElement.insertBefore(hostEl, stageFrame.nextSibling);
    return;
  }
  container.appendChild(hostEl);
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
      const ac = new AbortController();
      let host: DataWorkspaceHost | null = null;
      let chromeOpen = false;
      let chartMode = false;
      let panel: ReturnType<typeof createDataWorkspacePanel> | null = null;
      let panzoom: StagePanzoomHandle | null = null;
      let stageSplitter: HTMLElement | null = null;
      let adoptedGraph: {
        node: HTMLElement;
        mover: MovedNode;
        hidden: boolean;
        collapsed: boolean;
        inlineStyle: string;
      } | null = null;
      const toolbar = ensureStageToolbar({
        animation: slots.animation ?? null,
        container: ctx.container,
        owner: 'data-workspace'
      });

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'data-workspace-entry';
      btn.textContent = '数据处理';
      btn.setAttribute('aria-pressed', 'false');
      toolbar.host.appendChild(btn);

      // 图像分析环节入口（独立环节，非面板内步骤）。仅在场景声明
      // chartAnalysis 时创建——非图像分析场景的 DOM 里没有第二个按钮。
      // 资格通过即可进入；描点仍由场景在数据完成后开放。
      let chartBtn: HTMLButtonElement | null = null;
      function ensureChartButton(): HTMLButtonElement {
        if (!chartBtn) {
          chartBtn = document.createElement('button');
          chartBtn.type = 'button';
          chartBtn.className = 'data-workspace-entry graph-analysis-entry';
          chartBtn.textContent = '图像分析';
          chartBtn.setAttribute('aria-pressed', 'false');
          toolbar.host.appendChild(chartBtn);
          chartBtn.addEventListener(
            'click',
            () => {
              if (chartMode) exitChartMode();
              else enterChartMode();
            },
            { signal: ac.signal }
          );
        }
        return chartBtn;
      }

      const unsubMode = ctx.on('modechange', (payload) => {
        if (payload.mode === 'presentation' && chromeOpen) {
          exitWorkspace(false);
        } else {
          syncButton();
          syncChartButton();
        }
      });

      /**
       * 外层 host 的 getSpec 在场景数据任务模块动态加载完成前会 throw
       * （spec 与任务实现同 chunk）。这里统一兜底：未就绪视为「无图任务」，
       * 各调用点走各自的安全分支；加载完成后的下一次 notify 自愈。
       */
      function readSpec(): DataWorkspaceSpec | null {
        if (!host) return null;
        try {
          return host.getSpec();
        } catch {
          return null;
        }
      }

      function eligibilityReason(): string {
        if (!host) return '当前场景未提供数据任务';
        const eligibility = host.getEligibility();
        return eligibility.ok ? '' : eligibility.reason;
      }

      function chartEntryAllowed(): boolean {
        if (!host) return false;
        if (ctx.getMode() === 'presentation') return false;
        return host.getEligibility().ok;
      }

      function syncChartButton(): void {
        const spec = readSpec();
        if (!spec || !shouldShowChartAnalysis(spec)) {
          if (chartBtn) chartBtn.hidden = true;
          return;
        }
        const cb = ensureChartButton();
        cb.hidden = false;
        if (!chartMode) {
          const allowed = chartEntryAllowed();
          cb.disabled = !allowed;
          cb.setAttribute('aria-disabled', String(!allowed));
          cb.setAttribute('aria-pressed', 'false');
          cb.textContent = '图像分析';
          cb.title = allowed
            ? '进入图像分析环节'
            : eligibilityReason() || '当前场景未提供数据任务';
        } else {
          cb.disabled = false;
          cb.setAttribute('aria-disabled', 'false');
          cb.setAttribute('aria-pressed', 'true');
          cb.textContent = '返回数据处理';
          cb.title = '返回数据处理工作区';
        }
      }

      function enterChartMode(): void {
        if (chartMode || !host || !chartEntryAllowed()) return;
        if (!chromeOpen) enterWorkspace();
        if (!chromeOpen || !panel) return;
        if (!panel.setChartMode(true)) {
          syncChartButton();
          syncStageSplitter();
          return;
        }
        chartMode = true;
        syncButton();
        syncChartButton();
        syncStageSplitter();
      }

      function exitChartMode(): void {
        if (!chartMode) return;
        chartMode = false;
        panel?.setChartMode(false);
        syncButton();
        syncChartButton();
        syncStageSplitter();
      }

      function syncButton(): void {
        const reason = eligibilityReason();
        const inPresentation = ctx.getMode() === 'presentation';
        const disabled = inPresentation || (Boolean(reason) && !chromeOpen);
        btn.disabled = disabled;
        btn.setAttribute('aria-disabled', String(disabled));
        btn.setAttribute('aria-pressed', String(chromeOpen));
        btn.textContent = chartMode
          ? '数据处理'
          : chromeOpen
            ? '返回实验'
            : '数据处理';
        if (inPresentation) {
          btn.title = '演示模式下不可进入数据处理';
        } else if (chartMode) {
          btn.title = '返回数据处理工作区';
        } else if (reason && !chromeOpen) {
          btn.title = reason;
        } else {
          btn.title = chromeOpen ? '返回原实验布局' : '打开数据处理工作区';
        }
      }

      function adoptGraphIfNeeded(chartMount: HTMLElement | null): void {
        if (adoptedGraph) return;
        const spec = readSpec();
        if (!spec || !shouldShowChartAnalysis(spec)) return;
        const graph = slots.graph;
        if (!graph || !chartMount) return;
        // 收养层级由布局元数据决定：'slot'（mobile）收养 slots.graph 本身；
        // 缺省 'section' 收养外层图区（属性优先，class 旧链兜底）。
        // getCurrentLayoutId 为空串时元数据为 undefined，走 'section' 兜底。
        const adoptTarget =
          layoutRegistry.getMetadata(ctx.getCurrentLayoutId())
            ?.graphAdoptTarget ?? 'section';
        const section =
          adoptTarget === 'slot'
            ? graph
            : ((graph.closest(
                `[${GRAPH_SECTION_ATTR}]`
              ) as HTMLElement | null) ??
              (graph.closest(
                '.srgb-graph-section, .teaching-graph-section, .lab-float-graph, .graph-section'
              ) as HTMLElement | null) ??
              graph);
        if (!section.parentElement) return;
        // parent/next 快照与还原由 node-mover 负责；hidden/collapsed/
        // inlineStyle/geometry 清理是本能力的收养语义，留在调用方
        const hidden = section.hasAttribute('hidden') || section.hidden;
        const collapsed = section.classList.contains('is-collapsed');
        const inlineStyle = readInlineStyle(section);
        const mover = moveNode(section, chartMount);
        adoptedGraph = { node: section, mover, hidden, collapsed, inlineStyle };
        section.hidden = false;
        section.removeAttribute('hidden');
        section.classList.remove('is-collapsed');
        clearInlineGeometry(section);
      }

      function restoreGraph(): void {
        if (!adoptedGraph) return;
        const { node, mover, hidden, collapsed, inlineStyle } = adoptedGraph;
        mover.restore();
        if (hidden) {
          node.hidden = true;
          node.setAttribute('hidden', '');
        }
        if (collapsed) node.classList.add('is-collapsed');
        writeInlineStyle(node, inlineStyle);
        adoptedGraph = null;
      }

      function applyChartStep(step: DataWorkspacePanelStep): void {
        if (step === 'chartAnalysis') {
          ctx.container.classList.add(CHART_CLASS);
          adoptGraphIfNeeded(panel?.chartMount ?? null);
        } else {
          restoreGraph();
          ctx.container.classList.remove(CHART_CLASS);
        }
        requestLayoutResize();
        syncStageSplitter();
      }

      const STAGE_SPLIT_MIN = 0.28;
      const STAGE_SPLIT_MAX = 0.72;

      function stageSplitKey(): string {
        // spec 未就绪时用无 id 的通用键；分栏拖拽需要可见 splitter，
        // 而 stageHalfActive 在 spec 为 null 时即 false，该键不会被读写。
        return `dw-stage-split-${readSpec()?.id ?? ''}`;
      }

      function stageColumn(): HTMLElement | null {
        const found =
          ctx.container.querySelector('.lab-stage-main') ??
          ctx.container.querySelector('.teaching-right-panel') ??
          ctx.container.querySelector('.srgb-right-panel');
        if (found instanceof HTMLElement) return found;
        if (ctx.container.classList.contains('mobile-stack-layout')) {
          return ctx.container;
        }
        return null;
      }

      function stageFrame(): HTMLElement | null {
        const column = stageColumn();
        if (!column) return null;
        const found =
          column.querySelector('.lab-stage-anim') ??
          column.querySelector('.teaching-stage-frame') ??
          column.querySelector('.srgb-stage-frame') ??
          column.querySelector('.mobile-animation-section');
        return found instanceof HTMLElement ? found : null;
      }

      function readStageSplit(): number | null {
        try {
          const stored = Number(window.localStorage.getItem(stageSplitKey()));
          if (
            Number.isFinite(stored) &&
            stored >= STAGE_SPLIT_MIN &&
            stored <= STAGE_SPLIT_MAX
          ) {
            return stored;
          }
        } catch {
          /* storage may be unavailable */
        }
        return null;
      }

      function stageHalfActive(): boolean {
        return (
          Boolean(readSpec()?.stageHalfSplit) &&
          chromeOpen &&
          !ctx.container.classList.contains(CHART_CLASS) &&
          window.innerHeight >= 640 &&
          stageFrame() !== null
        );
      }

      function placeStageSplitter(ratio: number): void {
        const frame = stageFrame();
        if (!stageSplitter || !frame) return;
        stageSplitter.hidden = false;
        stageSplitter.setAttribute(
          'aria-valuenow',
          String(Math.round(ratio * 100))
        );
        stageSplitter.style.top = `${frame.offsetTop + frame.offsetHeight}px`;
      }

      function applyStageRatio(ratio: number, persist: boolean): void {
        const frame = stageFrame();
        const column = stageColumn();
        if (!frame || !column) return;
        const clamped = Math.max(
          STAGE_SPLIT_MIN,
          Math.min(STAGE_SPLIT_MAX, ratio)
        );
        const offsetTop = frame.offsetTop;
        if (offsetTop > 0) {
          const span = Math.max(0, column.clientHeight - offsetTop);
          frame.style.flex = `0 0 ${(clamped * span).toFixed(2)}px`;
        } else {
          frame.style.flex = `0 0 ${(clamped * 100).toFixed(2)}%`;
        }
        placeStageSplitter(clamped);
        if (!persist) return;
        try {
          window.localStorage.setItem(
            stageSplitKey(),
            String(Math.round(clamped * 1000) / 1000)
          );
        } catch {
          /* private mode */
        }
      }

      function useDefaultStageSplit(): void {
        const frame = stageFrame();
        if (frame) frame.style.flex = '';
        if (stageSplitter) stageSplitter.removeAttribute('aria-valuetext');
        placeStageSplitter(0.5);
        requestAnimationFrame(() => {
          if (!stageHalfActive()) return;
          placeStageSplitter(0.5);
        });
      }

      function bindStageSplitter(handle: HTMLElement): void {
        const ratioFromPointer = (clientY: number): number => {
          const column = stageColumn();
          const frame = stageFrame();
          if (!column || !frame) return STAGE_SPLIT_MIN;
          const rect = column.getBoundingClientRect();
          const span = (column.clientHeight || rect.height) - frame.offsetTop;
          if (span <= 0) return STAGE_SPLIT_MIN;
          return Math.max(
            STAGE_SPLIT_MIN,
            Math.min(
              STAGE_SPLIT_MAX,
              (clientY - rect.top - frame.offsetTop) / span
            )
          );
        };
        handle.addEventListener(
          'pointerdown',
          (event) => {
            try {
              if (typeof handle.setPointerCapture === 'function') {
                handle.setPointerCapture(event.pointerId);
              }
            } catch {
              /* capture is optional */
            }
            applyStageRatio(ratioFromPointer(event.clientY), true);
            const move = (moveEvent: PointerEvent): void => {
              applyStageRatio(ratioFromPointer(moveEvent.clientY), true);
            };
            const up = (): void => {
              handle.removeEventListener('pointermove', move);
              handle.removeEventListener('pointerup', up);
              handle.removeEventListener('pointercancel', up);
            };
            handle.addEventListener('pointermove', move);
            handle.addEventListener('pointerup', up);
            handle.addEventListener('pointercancel', up);
          },
          { signal: ac.signal }
        );
        handle.addEventListener(
          'keydown',
          (event) => {
            const frame = stageFrame();
            const column = stageColumn();
            const span = column
              ? column.clientHeight - (frame?.offsetTop ?? 0)
              : 0;
            const current = frame && span > 0 ? frame.offsetHeight / span : 0.5;
            const step =
              event.key === 'PageUp' || event.key === 'PageDown' ? 0.05 : 0.01;
            if (event.key === 'ArrowUp' || event.key === 'PageUp') {
              event.preventDefault();
              applyStageRatio(current - step, true);
            } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
              event.preventDefault();
              applyStageRatio(current + step, true);
            } else if (event.key === 'Home') {
              event.preventDefault();
              applyStageRatio(STAGE_SPLIT_MIN, true);
            } else if (event.key === 'End') {
              event.preventDefault();
              applyStageRatio(STAGE_SPLIT_MAX, true);
            }
          },
          { signal: ac.signal }
        );
      }

      function ensureStageSplitter(): HTMLElement | null {
        const column = stageColumn();
        if (!column) return null;
        if (!stageSplitter) {
          stageSplitter = document.createElement('div');
          stageSplitter.className = 'data-workspace-stage-splitter';
          stageSplitter.setAttribute('role', 'separator');
          stageSplitter.setAttribute('aria-orientation', 'horizontal');
          stageSplitter.setAttribute('aria-valuemin', '28');
          stageSplitter.setAttribute('aria-valuemax', '72');
          stageSplitter.setAttribute('aria-label', '调整动画区与数据面板分界');
          stageSplitter.tabIndex = 0;
          stageSplitter.style.touchAction = 'none';
          bindStageSplitter(stageSplitter);
        }
        if (stageSplitter.parentElement !== column)
          column.appendChild(stageSplitter);
        return stageSplitter;
      }

      function clearStageSplitInline(): void {
        const frame = stageFrame();
        if (frame) frame.style.flex = '';
      }

      function syncStageSplitter(): void {
        if (!stageHalfActive()) {
          ctx.container.removeAttribute('data-stage-half');
          clearStageSplitInline();
          if (stageSplitter) stageSplitter.hidden = true;
          return;
        }
        ctx.container.setAttribute('data-stage-half', 'true');
        const handle = ensureStageSplitter();
        if (!handle) return;
        handle.hidden = false;
        const stored = readStageSplit();
        if (stored == null) useDefaultStageSplit();
        else applyStageRatio(stored, false);
      }

      function teardownPanzoom(): void {
        panzoom?.dispose();
        panzoom = null;
      }

      function enterWorkspace(): void {
        if (!host || chromeOpen) return;
        if (ctx.getMode() === 'presentation') return;
        const eligibility = host.getEligibility();
        if (!eligibility.ok) {
          syncButton();
          return;
        }
        chromeOpen = true;
        ctx.container.classList.add(WORKSPACE_CLASS);
        if (host.getSpec().stageMode === 'instrument-only') {
          ctx.container.classList.add(INSTRUMENT_ONLY_CLASS);
        }
        if (host.getSpec().stageLock) {
          ctx.container.classList.add(STAGE_LOCK_CLASS);
        }
        if (shouldEnableStagePanZoom(host.getSpec()) && slots.animation) {
          panzoom = createStagePanzoom({
            slot: slots.animation,
            onZoomSettled: () => ctx.requestStageRepaint(),
            stageLock: Boolean(host.getSpec().stageLock)
          });
        }
        host.setActive(true);
        panel = createDataWorkspacePanel({
          host,
          onChange: () => {
            panel?.update();
          },
          onStepChange: (step) => {
            applyChartStep(step);
          }
        });
        placeWorkspaceHost(slots, ctx.container, panel.root);
        syncButton();
        syncChartButton();
        requestLayoutResize();
        syncStageSplitter();
      }

      let suppressing = false;

      function exitWorkspace(clearActive: boolean): void {
        if (!chromeOpen || suppressing) return;
        suppressing = true;
        chromeOpen = false;
        chartMode = false;
        teardownPanzoom();
        restoreGraph();
        panel?.dispose();
        panel = null;
        ctx.container.classList.remove(
          WORKSPACE_CLASS,
          CHART_CLASS,
          INSTRUMENT_ONLY_CLASS,
          STAGE_LOCK_CLASS
        );
        if (clearActive) host?.setActive(false);
        // 演示模式挂起：保留 session.active 以便结束后自动重进，
        // 只把场景的舞台视觉副作用（画布隐藏/仪器撑满等）还原。
        else host?.setActiveVisual?.(false);
        suppressing = false;
        syncButton();
        syncChartButton();
        requestLayoutResize();
        syncStageSplitter();
      }

      function toggle(): void {
        if (chromeOpen && chartMode) {
          exitChartMode();
          return;
        }
        if (chromeOpen) {
          exitWorkspace(true);
          return;
        }
        enterWorkspace();
      }

      btn.addEventListener('click', toggle, { signal: ac.signal });

      const instance: CapabilityInstance<DataWorkspaceUpdateData> = {
        update(data: DataWorkspaceUpdateData) {
          host = data?.host ?? null;
          if (suppressing) return;
          if (host?.getSession().active && !chromeOpen) {
            enterWorkspace();
          } else if (chromeOpen && host && !host.getSession().active) {
            exitWorkspace(false);
          } else if (chromeOpen) {
            panel?.update();
          }
          syncButton();
          syncChartButton();
          syncStageSplitter();
        },
        dispose() {
          suppressing = true;
          ac.abort();
          unsubMode();
          teardownPanzoom();
          restoreGraph();
          panel?.dispose();
          panel = null;
          ctx.container.classList.remove(
            WORKSPACE_CLASS,
            CHART_CLASS,
            INSTRUMENT_ONLY_CLASS,
            STAGE_LOCK_CLASS
          );
          chromeOpen = false;
          chartMode = false;
          stageSplitter?.remove();
          stageSplitter = null;
          ctx.container.removeAttribute('data-stage-half');
          btn.remove();
          chartBtn?.remove();
          releaseStageToolbar(toolbar.host, toolbar.created);
        }
      };

      window.addEventListener('resize', () => syncStageSplitter(), {
        signal: ac.signal
      });
      syncButton();
      syncChartButton();
      return instance;
    }
  };
}
