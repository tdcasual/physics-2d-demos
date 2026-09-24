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
  chartStepReady,
  shouldEnableStagePanZoom,
  shouldShowChartAnalysis,
  type DataWorkspaceHost
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
      // disabled = 数据处理未完成（chartStepReady，忽略选填项）。
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
        }
      });

      function eligibilityReason(): string {
        if (!host) return '当前场景未提供数据任务';
        const eligibility = host.getEligibility();
        return eligibility.ok ? '' : eligibility.reason;
      }

      function chartReady(): boolean {
        if (!host || !chromeOpen) return false;
        return chartStepReady(host.getSession(), host.getSpec());
      }

      function syncChartButton(): void {
        if (!host || !shouldShowChartAnalysis(host.getSpec())) {
          if (chartBtn) chartBtn.hidden = true;
          return;
        }
        const cb = ensureChartButton();
        cb.hidden = false;
        if (!chromeOpen || !chartMode) {
          const ready = chartReady();
          cb.disabled = !ready;
          cb.setAttribute('aria-disabled', String(!ready));
          cb.setAttribute('aria-pressed', 'false');
          cb.textContent = '图像分析';
          cb.title = ready
            ? '进入图像分析环节'
            : '请先完成数据处理再进入图像分析';
        } else {
          cb.disabled = false;
          cb.setAttribute('aria-disabled', 'false');
          cb.setAttribute('aria-pressed', 'true');
          cb.textContent = '返回数据处理';
          cb.title = '返回数据处理工作区';
        }
      }

      function enterChartMode(): void {
        if (!chromeOpen || chartMode || !host) return;
        // The panel first harvests live input drafts, then applies the same
        // readiness guard. The session alone may still contain old checked data.
        if (!panel?.setChartMode(true)) {
          syncChartButton();
          return;
        }
        chartMode = true;
        syncButton();
        syncChartButton();
      }

      function exitChartMode(): void {
        if (!chartMode) return;
        chartMode = false;
        panel?.setChartMode(false);
        syncButton();
        syncChartButton();
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
        if (!host || !shouldShowChartAnalysis(host.getSpec())) return;
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
      }

      function exitWorkspace(clearActive: boolean): void {
        if (!chromeOpen) return;
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
        syncButton();
        syncChartButton();
        requestLayoutResize();
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
          if (host?.getSession().active && !chromeOpen) {
            enterWorkspace();
          } else if (chromeOpen && host && !host.getSession().active) {
            exitWorkspace(false);
          } else if (chromeOpen) {
            panel?.update();
          }
          syncButton();
          syncChartButton();
        },
        dispose() {
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
          btn.remove();
          chartBtn?.remove();
          releaseStageToolbar(toolbar.host, toolbar.created);
        }
      };

      syncButton();
      syncChartButton();
      return instance;
    }
  };
}
