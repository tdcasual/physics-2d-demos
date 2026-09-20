/**
 * Data-workspace capability — optional fillable table below the stage.
 *
 * Opt-in via LayoutConfig.dataWorkspace. Does not replace readout or graph.
 * Entry is a shared stage-toolbar action, independent of transport-bar.
 * Scene pages that enable this capability must import
 * `src/styles/capability/data-workspace.css` from their page.ts so non-opt-in
 * scenes do not pay the CSS budget.
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../types';
import {
  shouldShowChartAnalysis,
  type DataWorkspaceHost
} from '../../../platform/data-workspace';
import { createDataWorkspacePanel } from '../../../ui/components/data-workspace-panel';
import {
  ensureStageToolbar,
  releaseStageToolbar
} from '../../../ui/stage-toolbar';
import type {
  DataWorkspaceConfig,
  DataWorkspaceUpdateData
} from './data-workspace-declarations';

export type { DataWorkspaceConfig, DataWorkspaceUpdateData };

const WORKSPACE_CLASS = 'is-data-workspace';
const CHART_CLASS = 'is-data-workspace-chart';
const INSTRUMENT_ONLY_CLASS = 'is-data-workspace-instrument-only';

function placeWorkspaceHost(
  slots: LayoutSlots,
  container: HTMLElement,
  hostEl: HTMLElement
): void {
  const animation = slots.animation;
  const stageFrame =
    animation?.closest(
      '.teaching-stage-frame, .srgb-stage-frame, .mobile-animation-section, .lab-stage-anim'
    ) ?? animation;
  if (stageFrame?.parentElement) {
    stageFrame.parentElement.insertBefore(hostEl, stageFrame.nextSibling);
    return;
  }
  container.appendChild(hostEl);
}

function requestLayoutResize(): void {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

export function createDataWorkspace(
  cfg: DataWorkspaceConfig = {}
): CapabilityDefinition<DataWorkspaceConfig, DataWorkspaceUpdateData, unknown> {
  return {
    id: 'data-workspace',

    mount(
      slots: LayoutSlots,
      config: DataWorkspaceConfig,
      ctx: CapabilityContext
    ): CapabilityInstance<DataWorkspaceUpdateData> {
      void cfg;
      void config;
      const ac = new AbortController();
      let host: DataWorkspaceHost | null = null;
      let chromeOpen = false;
      let panel: ReturnType<typeof createDataWorkspacePanel> | null = null;
      let adoptedGraph: {
        node: HTMLElement;
        parent: HTMLElement;
        next: ChildNode | null;
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

      function syncButton(): void {
        const reason = eligibilityReason();
        const inPresentation = ctx.getMode() === 'presentation';
        const disabled = inPresentation || (Boolean(reason) && !chromeOpen);
        btn.disabled = disabled;
        btn.setAttribute('aria-disabled', String(disabled));
        btn.setAttribute('aria-pressed', String(chromeOpen));
        btn.textContent = chromeOpen ? '返回实验' : '数据处理';
        if (inPresentation) {
          btn.title = '演示模式下不可进入数据处理';
        } else if (reason && !chromeOpen) {
          btn.title = reason;
        } else {
          btn.title = chromeOpen ? '返回原实验布局' : '打开数据处理工作区';
        }
      }

      function adoptGraphIfNeeded(chartMount: HTMLElement | null): void {
        if (!host || !shouldShowChartAnalysis(host.getSpec())) return;
        const graph = slots.graph;
        if (!graph || !chartMount) return;
        const section =
          (graph.closest(
            '.srgb-graph-section, .teaching-graph-section, .lab-float-graph, .graph-section'
          ) as HTMLElement | null) ?? graph;
        if (!section.parentElement) return;
        adoptedGraph = {
          node: section,
          parent: section.parentElement,
          next: section.nextSibling
        };
        chartMount.appendChild(section);
      }

      function restoreGraph(): void {
        if (!adoptedGraph) return;
        const { node, parent, next } = adoptedGraph;
        if (next && next.parentNode === parent) parent.insertBefore(node, next);
        else parent.appendChild(node);
        adoptedGraph = null;
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
        if (shouldShowChartAnalysis(host.getSpec())) {
          ctx.container.classList.add(CHART_CLASS);
        }
        host.setActive(true);
        panel = createDataWorkspacePanel({
          host,
          onExit: () => exitWorkspace(true),
          onChange: () => {
            panel?.update();
          }
        });
        placeWorkspaceHost(slots, ctx.container, panel.root);
        adoptGraphIfNeeded(panel.chartMount);
        syncButton();
        requestLayoutResize();
      }

      function exitWorkspace(clearActive: boolean): void {
        if (!chromeOpen) return;
        chromeOpen = false;
        restoreGraph();
        panel?.dispose();
        panel = null;
        ctx.container.classList.remove(
          WORKSPACE_CLASS,
          CHART_CLASS,
          INSTRUMENT_ONLY_CLASS
        );
        if (clearActive) host?.setActive(false);
        syncButton();
        requestLayoutResize();
      }

      function toggle(): void {
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
        },
        dispose() {
          ac.abort();
          unsubMode();
          restoreGraph();
          panel?.dispose();
          panel = null;
          ctx.container.classList.remove(
            WORKSPACE_CLASS,
            CHART_CLASS,
            INSTRUMENT_ONLY_CLASS
          );
          chromeOpen = false;
          btn.remove();
          releaseStageToolbar(toolbar.host, toolbar.created);
        }
      };

      syncButton();
      return instance;
    }
  };
}
