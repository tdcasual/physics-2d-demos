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
import {
  isDesktopDemoLayout,
  type ResolvedDemoProfile
} from '../../../platform/demo-profile';

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
        merged.graphSectionSelector ?? '.graph-section, .layout-graph-section';

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
      let savedGraphParent: HTMLElement | null = null;
      let savedGraphNext: ChildNode | null = null;
      let savedGraphHeight: string | null = null;
      let savedTransportDisplay: string | null = null;
      const savedControlDisplays = new Map<HTMLElement, string>();
      const savedControlSectionDisplays = new Map<HTMLElement, string>();
      const savedChromeDisplays = new Map<HTMLElement, string>();
      const savedChipHomes = new Map<
        HTMLElement,
        { parent: HTMLElement; next: ChildNode | null }
      >();
      let chipSlot: HTMLElement | null = null;

      const geometryOn = () => isDesktopDemoLayout(ctx.getCurrentLayoutId());

      const resizerOf = () =>
        ctx.container.querySelector(
          '[role="separator"][aria-orientation="vertical"]'
        ) as HTMLElement | null;

      const notifyResize = () => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      };

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

      const reparentGraphIfNeeded = (profile: ResolvedDemoProfile) => {
        if (!geometryOn() || profile.graphPanel !== 'visible') return;
        if (
          profile.controlPanel !== 'hidden' &&
          profile.controlPanel !== 'collapsed'
        ) {
          return;
        }
        if (ctx.container.dataset.hasGraph === 'false') return;
        const graph = ctx.container.querySelector(
          graphSel
        ) as HTMLElement | null;
        if (!graph || !graph.closest('.layout-left-panel')) return;
        if (!_slots.animation) return;
        savedGraphParent = graph.parentElement;
        savedGraphNext = graph.nextSibling;
        savedGraphHeight = graph.style.height;
        graph.classList.add('is-demo-stage-graph');
        _slots.animation.classList.add('is-demo-stage-with-graph');
        _slots.animation.appendChild(graph);
        notifyResize();
      };

      const restoreGraphHome = () => {
        const graph = ctx.container.querySelector(
          graphSel
        ) as HTMLElement | null;
        if (graph && savedGraphParent) {
          graph.classList.remove('is-demo-stage-graph');
          _slots.animation?.classList.remove('is-demo-stage-with-graph');
          if (savedGraphHeight !== null) graph.style.height = savedGraphHeight;
          if (
            savedGraphNext &&
            savedGraphNext.parentNode === savedGraphParent
          ) {
            savedGraphParent.insertBefore(graph, savedGraphNext);
          } else {
            savedGraphParent.appendChild(graph);
          }
        }
        savedGraphParent = null;
        savedGraphNext = null;
        savedGraphHeight = null;
      };

      const mountChips = (profile: ResolvedDemoProfile) => {
        if (
          !geometryOn() ||
          profile.controlPanel !== 'hidden' ||
          !profile.visibleControlKeys.length
        ) {
          return;
        }
        const rp = ctx.container.querySelector(
          '[class*="-readout-panel"]'
        ) as HTMLElement | null;
        const controlRoot = _slots.control;
        if (!rp || !controlRoot) return;
        chipSlot = document.createElement('div');
        chipSlot.className = 'demo-chip-slot';
        rp.appendChild(chipSlot);
        profile.visibleControlKeys.forEach((key) => {
          const node = controlRoot.querySelector<HTMLElement>(
            `[data-control-key="${key}"]`
          );
          if (!node || !node.parentElement) return;
          savedChipHomes.set(node, {
            parent: node.parentElement,
            next: node.nextSibling
          });
          chipSlot?.appendChild(node);
          node.style.display = '';
        });
      };

      const restoreChips = () => {
        savedChipHomes.forEach((home, node) => {
          if (home.next && home.next.parentNode === home.parent) {
            home.parent.insertBefore(node, home.next);
          } else {
            home.parent.appendChild(node);
          }
        });
        savedChipHomes.clear();
        chipSlot?.remove();
        chipSlot = null;
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
              case 'visible':
                graph.style.display = savedGraphDisplay ?? '';
                graph.setAttribute('data-collapsed', 'false');
                graph.classList.remove('is-collapsed-demo');
                reparentGraphIfNeeded(profile);
                break;
            }
          }
        }

        if (profile.readoutPanel) {
          const rp = ctx.container.querySelector(
            '[class*="-readout-panel"]'
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
        restoreGraphHome();

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
          '[class*="-readout-panel"]'
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
