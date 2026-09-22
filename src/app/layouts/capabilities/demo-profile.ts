/**
 * Demo Profile Capability — 演示模式/标准模式切换
 *
 * 根据 ResolvedDemoProfile 调整布局元素（侧边栏、控制区、图表区、读数面板）。
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../types';
import type { ResolvedDemoProfile } from '../../../platform/demo-profile';
import { layoutRegistry } from '../registry';
import { GRAPH_SECTION_ATTR } from '../../../platform/stage-chrome';
import { requestLayoutResize } from '../request-layout-resize';
import {
  adoptDemoGraph,
  restoreDemoGraph,
  type GraphAdoptionState
} from './demo-profile/graph-adoption';
import {
  mountDemoChips,
  restoreDemoChips,
  type DemoChipsState
} from './demo-profile/chips';

export interface DemoProfileUpdateData {
  mode: 'normal' | 'presentation';
  profile: ResolvedDemoProfile | null;
}

export interface DemoProfileConfig {
  sidebarSelector?: string;
  graphSectionSelector?: string;
  controlSectionSelector?: string;
}

export function syncPresentationLabels(
  root: ParentNode,
  presentation: boolean
): void {
  root
    .querySelectorAll<HTMLElement>('[data-presentation-label]')
    .forEach((node) => {
      const next = presentation
        ? node.dataset.presentationLabel
        : node.dataset.standardLabel;
      if (next) node.textContent = next;
    });
}

export function createDemoProfile(
  cfg: DemoProfileConfig = {}
): CapabilityDefinition<DemoProfileConfig, DemoProfileUpdateData> {
  return {
    id: 'demo-profile',

    mount(
      _slots: LayoutSlots,
      config: DemoProfileConfig,
      ctx: CapabilityContext
    ): CapabilityInstance<DemoProfileUpdateData> {
      const merged = { ...cfg, ...config };
      const sidebarSel = merged.sidebarSelector ?? '.layout-left-panel';
      const graphSel =
        merged.graphSectionSelector ??
        `[${GRAPH_SECTION_ATTR}], .graph-section`;

      let currentProfile: ResolvedDemoProfile | null = null;
      let savedSidebarDisplay: string | null = null;
      let savedGraphDisplay: string | null = null;
      let savedReadoutCollapsed: boolean | null = null;
      let savedReadoutBox: {
        top: string;
        left: string;
        right: string;
        bottom: string;
        width: string;
        maxWidth: string;
      } | null = null;
      let savedGridColumns: string | null = null;
      let savedResizerDisplay: string | null = null;
      let graphAdoption: GraphAdoptionState | null = null;
      let savedTransportDisplay: string | null = null;
      const savedControlDisplays = new Map<HTMLElement, string>();
      const savedControlSectionDisplays = new Map<HTMLElement, string>();
      const savedChromeDisplays = new Map<HTMLElement, string>();
      const chips: DemoChipsState = {
        slot: null,
        movers: new Map()
      };

      // 演示几何改造由布局元数据声明（demoCapable）；查找留在 app 能力层
      // （platform 不可 import registry）。空 layout id → 元数据 undefined
      // → false，与旧 DESKTOP_DEMO_LAYOUTS 名单的缺省一致。
      const geometryOn = () =>
        layoutRegistry.getMetadata(ctx.getCurrentLayoutId())?.demoCapable ===
        true;

      const resizerOf = () =>
        ctx.container.querySelector(
          '[role="separator"][aria-orientation="vertical"]'
        ) as HTMLElement | null;

      const notifyResize = requestLayoutResize;

      const collapseGridSidebar = (zero: boolean) => {
        if (!geometryOn()) return;
        const cols = ctx.container.style.gridTemplateColumns;
        if (cols.includes(' ') && savedGridColumns === null) {
          savedGridColumns = cols;
        }
        if (cols.includes(' ') || savedGridColumns) {
          ctx.container.style.gridTemplateColumns = zero
            ? '0px 0px 1fr'
            : '48px 0px 1fr';
        }
        const resizer = resizerOf();
        if (resizer && savedResizerDisplay === null) {
          savedResizerDisplay = resizer.style.display;
          resizer.style.display = 'none';
        }
        notifyResize();
      };

      const compactGridSidebar = () => {
        if (!geometryOn()) return;
        const cols = ctx.container.style.gridTemplateColumns;
        if (cols.includes(' ') && savedGridColumns === null) {
          savedGridColumns = cols;
        }
        if (ctx.container.style.gridTemplateColumns.includes(' ')) {
          ctx.container.style.gridTemplateColumns =
            'minmax(260px, 22rem) 8px 1fr';
        }
        const resizer = resizerOf();
        if (resizer && savedResizerDisplay !== null) {
          resizer.style.display = savedResizerDisplay;
          savedResizerDisplay = null;
        }
        notifyResize();
      };

      const restoreGridSidebar = () => {
        if (savedGridColumns !== null) {
          ctx.container.style.gridTemplateColumns = savedGridColumns;
          savedGridColumns = null;
        }
        const resizer = resizerOf();
        if (resizer && savedResizerDisplay !== null) {
          resizer.style.display = savedResizerDisplay;
          savedResizerDisplay = null;
        }
        notifyResize();
      };

      const resetMinimalControls = () => {
        savedControlDisplays.forEach((display, node) => {
          node.style.display = display;
        });
        savedControlDisplays.clear();
        savedControlSectionDisplays.forEach((display, node) => {
          node.style.display = display;
        });
        savedControlSectionDisplays.clear();
      };

      const rememberDisplay = (node: HTMLElement) => {
        if (!savedControlDisplays.has(node)) {
          savedControlDisplays.set(node, node.style.display);
        }
      };

      const keyVisible = (
        el: HTMLElement,
        visibleKeys: Set<string>
      ): boolean => {
        const own = el.dataset.controlKey ?? '';
        if (own && visibleKeys.has(own)) return true;
        if (
          Array.from(
            el.querySelectorAll<HTMLElement>('[data-control-key]')
          ).some((child) => visibleKeys.has(child.dataset.controlKey ?? ''))
        ) {
          return true;
        }
        const ancestor =
          el.parentElement?.closest<HTMLElement>('[data-control-key]');
        return Boolean(
          ancestor?.dataset.controlKey &&
          visibleKeys.has(ancestor.dataset.controlKey)
        );
      };

      const applyMinimalControls = (root: HTMLElement, keys: string[]) => {
        const visibleKeys = new Set(keys);
        const keyed = Array.from(
          root.querySelectorAll<HTMLElement>('[data-control-key]')
        );
        const sections = Array.from(
          root.querySelectorAll<HTMLElement>('[data-control-section]')
        );

        keyed.forEach((field) => {
          rememberDisplay(field);
          field.style.display = keyVisible(field, visibleKeys)
            ? (savedControlDisplays.get(field) ?? '')
            : 'none';
        });

        Array.from(root.children).forEach((child) => {
          if (!(child instanceof HTMLElement)) return;
          if (child.classList.contains('graph-section')) return;
          const hasKey =
            child.matches('[data-control-key]') ||
            child.querySelector('[data-control-key]');
          if (!hasKey) {
            rememberDisplay(child);
            child.style.display = 'none';
          }
        });

        sections.forEach((section) => {
          if (!savedControlSectionDisplays.has(section)) {
            savedControlSectionDisplays.set(section, section.style.display);
          }
          const hasVisibleField = keyed.some(
            (field) =>
              field.closest('[data-control-section]') === section &&
              field.style.display !== 'none'
          );
          section.style.display = hasVisibleField
            ? (savedControlSectionDisplays.get(section) ?? '')
            : 'none';
        });
      };

      const hideChrome = () => {
        if (!geometryOn()) return;
        ctx.container
          .querySelectorAll<HTMLElement>(
            '.layout-switch-btn, .teaching-readout-toggle, .srgb-readout-toggle, .debug-overlay, .sidebar-toggle-btn, .shell-theme-toggle'
          )
          .forEach((node) => {
            if (!savedChromeDisplays.has(node)) {
              savedChromeDisplays.set(node, node.style.display);
            }
            node.style.display = 'none';
          });
      };

      const restoreChrome = () => {
        savedChromeDisplays.forEach((display, node) => {
          node.style.display = display;
        });
        savedChromeDisplays.clear();
      };

      const applyTransport = (profile: ResolvedDemoProfile) => {
        if (!geometryOn() || !profile.transport) return;
        const bar = ctx.container.querySelector(
          '.stage-floating-controls'
        ) as HTMLElement | null;
        if (!bar) return;
        if (savedTransportDisplay === null) {
          savedTransportDisplay = bar.style.display;
        }
        bar.style.display = profile.transport === 'hidden' ? 'none' : '';
      };

      const restoreTransport = () => {
        const bar = ctx.container.querySelector(
          '.stage-floating-controls'
        ) as HTMLElement | null;
        if (bar && savedTransportDisplay !== null) {
          bar.style.display = savedTransportDisplay;
        }
        savedTransportDisplay = null;
      };

      const mountChips = (profile: ResolvedDemoProfile) => {
        mountDemoChips(chips, {
          profile,
          geometryEnabled: geometryOn(),
          container: ctx.container,
          controlRoot: _slots.control ?? null
        });
      };

      const restoreChips = () => {
        restoreDemoChips(chips);
      };

      const apply = (profile: ResolvedDemoProfile) => {
        currentProfile = profile;
        const geometry = geometryOn();
        syncPresentationLabels(ctx.container, true);

        const controlRoot = _slots.control;
        if (profile.visibleControlKeys.length && controlRoot) {
          applyMinimalControls(controlRoot, profile.visibleControlKeys);
        } else {
          resetMinimalControls();
        }

        if (profile.controlPanel && geometry) {
          const sidebar = ctx.container.querySelector(
            sidebarSel
          ) as HTMLElement | null;
          if (sidebar) {
            if (savedSidebarDisplay === null) {
              savedSidebarDisplay =
                sidebar.style.display ||
                window.getComputedStyle(sidebar).display;
            }
            sidebar.classList.remove('is-collapsed-demo', 'is-demo-rail');
            switch (profile.controlPanel) {
              case 'hidden':
                sidebar.style.display = 'none';
                collapseGridSidebar(true);
                break;
              case 'collapsed':
                sidebar.style.display = savedSidebarDisplay ?? '';
                sidebar.classList.add('is-demo-rail');
                collapseGridSidebar(false);
                break;
              case 'minimal':
                sidebar.style.display = savedSidebarDisplay ?? '';
                compactGridSidebar();
                break;
              case 'full':
                restoreGridSidebar();
                sidebar.style.display = savedSidebarDisplay ?? '';
                break;
            }
          }
        }

        if (profile.graphPanel && geometry) {
          const graph = ctx.container.querySelector(
            graphSel
          ) as HTMLElement | null;
          if (graph) {
            if (savedGraphDisplay === null) {
              savedGraphDisplay =
                graph.style.display || window.getComputedStyle(graph).display;
            }
            switch (profile.graphPanel) {
              case 'hidden':
                graph.style.display = 'none';
                break;
              case 'collapsed':
                graph.setAttribute('data-collapsed', 'true');
                graph.classList.add('is-collapsed-demo');
                break;
              case 'visible': {
                graph.style.display = savedGraphDisplay ?? '';
                graph.setAttribute('data-collapsed', 'false');
                graph.classList.remove('is-collapsed-demo');
                const nextGraphAdoption = adoptDemoGraph({
                  profile,
                  geometryEnabled: geometry,
                  container: ctx.container,
                  graphSelector: graphSel,
                  animationSlot: _slots.animation ?? null,
                  hasGraph: ctx.container.dataset.hasGraph !== 'false',
                  notifyResize
                });
                if (nextGraphAdoption) graphAdoption = nextGraphAdoption;
                break;
              }
            }
          }
        }

        if (profile.readoutPanel) {
          const rp = ctx.container.querySelector(
            '.readout-panel'
          ) as HTMLElement | null;
          if (rp) {
            if (savedReadoutCollapsed === null) {
              savedReadoutCollapsed = rp.classList.contains('is-collapsed');
            }
            if (savedReadoutBox === null) {
              savedReadoutBox = {
                top: rp.style.top,
                left: rp.style.left,
                right: rp.style.right,
                bottom: rp.style.bottom,
                width: rp.style.width,
                maxWidth: rp.style.maxWidth
              };
            }
            const prefix = Array.from(rp.classList)
              .find((c) => c.endsWith('-readout-panel'))
              ?.replace('-readout-panel', '');
            switch (profile.readoutPanel) {
              case 'hidden':
                rp.style.display = 'none';
                break;
              case 'overlay':
                rp.style.display = '';
                rp.classList.remove('is-collapsed');
                if (prefix) {
                  rp.classList.add(`${prefix}-is-overlay`);
                  rp.classList.remove(
                    `${prefix}-is-docked-top`,
                    `${prefix}-is-docked-bottom`
                  );
                  rp.classList.add(`${prefix}-readout-enlarged`);
                }
                break;
              case 'docked-top':
                rp.style.display = '';
                rp.classList.remove('is-collapsed');
                if (prefix) {
                  rp.classList.add(`${prefix}-is-docked-top`);
                  rp.classList.remove(
                    `${prefix}-is-overlay`,
                    `${prefix}-is-docked-bottom`
                  );
                  rp.classList.add(`${prefix}-readout-enlarged`);
                }
                break;
              case 'docked-bottom':
                rp.style.display = '';
                rp.style.top = 'auto';
                rp.style.bottom = '0';
                rp.style.left = '0';
                rp.style.right = '0';
                rp.style.width = '100%';
                rp.style.maxWidth = 'none';
                rp.classList.remove('is-collapsed');
                if (prefix) {
                  rp.classList.add(`${prefix}-is-docked-bottom`);
                  rp.classList.remove(
                    `${prefix}-is-overlay`,
                    `${prefix}-is-docked-top`
                  );
                  rp.classList.add(`${prefix}-readout-enlarged`);
                }
                break;
            }
          }
        }

        applyTransport(profile);
        hideChrome();
        mountChips(profile);

        if (profile.touchTargetMinSize) {
          ctx.container.classList.add('teaching-demo-touch-optimized');
          ctx.container.style.setProperty(
            '--demo-touch-min',
            `${profile.touchTargetMinSize}px`
          );
        }
      };

      const reset = () => {
        currentProfile = null;
        restoreChips();
        syncPresentationLabels(ctx.container, false);

        const sidebar = ctx.container.querySelector(
          sidebarSel
        ) as HTMLElement | null;
        if (sidebar) {
          sidebar.style.display = savedSidebarDisplay ?? '';
          savedSidebarDisplay = null;
          sidebar.classList.remove('is-collapsed-demo', 'is-demo-rail');
        }
        restoreGridSidebar();
        resetMinimalControls();
        restoreDemoGraph(graphAdoption, _slots.animation ?? null);
        graphAdoption = null;

        const graph = ctx.container.querySelector(
          graphSel
        ) as HTMLElement | null;
        if (graph) {
          graph.style.display = savedGraphDisplay ?? '';
          savedGraphDisplay = null;
          graph.setAttribute('data-collapsed', 'false');
          graph.classList.remove('is-collapsed-demo');
        }

        const rp = ctx.container.querySelector(
          '.readout-panel'
        ) as HTMLElement | null;
        if (rp) {
          const prefix = Array.from(rp.classList)
            .find((c) => c.endsWith('-readout-panel'))
            ?.replace('-readout-panel', '');
          rp.style.display = '';
          rp.classList.toggle('is-collapsed', savedReadoutCollapsed ?? true);
          savedReadoutCollapsed = null;
          if (savedReadoutBox) {
            rp.style.top = savedReadoutBox.top;
            rp.style.left = savedReadoutBox.left;
            rp.style.right = savedReadoutBox.right;
            rp.style.bottom = savedReadoutBox.bottom;
            rp.style.width = savedReadoutBox.width;
            rp.style.maxWidth = savedReadoutBox.maxWidth;
            savedReadoutBox = null;
          }
          if (prefix) {
            rp.classList.remove(
              `${prefix}-is-overlay`,
              `${prefix}-is-docked-top`,
              `${prefix}-is-docked-bottom`,
              `${prefix}-readout-enlarged`
            );
          }
        }

        restoreTransport();
        restoreChrome();
        ctx.container.classList.remove('teaching-demo-touch-optimized');
        ctx.container.style.removeProperty('--demo-touch-min');
      };

      return {
        update(data: DemoProfileUpdateData) {
          if (data.mode === 'presentation' && data.profile) {
            apply(data.profile);
          } else if (data.mode === 'normal') {
            reset();
          }
        },
        dispose() {
          if (currentProfile) reset();
        }
      };
    }
  };
}
