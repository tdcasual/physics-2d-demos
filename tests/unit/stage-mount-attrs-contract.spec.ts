/**
 * 舞台挂载点属性契约测试（批 2 · 语义定案 + 挂载点属性化）
 *
 * 锁定四类打标：
 * - [data-stage-frame]：每个注册布局 mount 后必有
 * - [data-graph-section] / [data-graph-body]：graphAdoptTarget 为
 *   'section'（缺省）且有 slots.graph 的布局必有；mobile（'slot'）不打
 * - [data-stage-toolbar-host] 单一宿主语义：mobile 落
 *   .mobile-transport-toggles；split/srgb/lab 有 transport 时落浮条、
 *   无 transport 时由 ensureStageToolbar 补标到布局自带工具条
 * - hasGraph:false 的"图 DOM 不出现"只对 split-right / mobile-stack
 *   （srgb 无条件建图 section、lab 永远建 .lab-float-graph，不参与）
 */
import { describe, it, expect, afterEach } from 'vitest';
import { SplitRightLayout } from '../../src/app/layouts/layouts/split-right/split-right';
import { SplitRightGraphBottomLayout } from '../../src/app/layouts/layouts/split-right-graph-bottom/split-right-graph-bottom';
import { MobileStackLayout } from '../../src/app/layouts/layouts/mobile-stack/mobile-stack';
import { LabStageLayout } from '../../src/app/layouts/layouts/lab-stage/lab-stage';
import { createTransportBar } from '../../src/app/layouts/capabilities/transport-bar';
import { ensureStageToolbar } from '../../src/ui/stage-toolbar';
import { registerAllLayouts } from '../../src/app/layouts/auto-register';
import { layoutRegistry } from '../../src/app/layouts/registry';
import {
  GRAPH_BODY_ATTR,
  GRAPH_SECTION_ATTR,
  STAGE_FRAME_ATTR,
  STAGE_TOOLBAR_HOST_ATTR
} from '../../src/platform/stage-chrome';
import type {
  CapabilityContext,
  ILayout,
  LayoutSlots
} from '../../src/app/layouts/types';

function createContainer(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'width:1200px; height:800px; overflow:hidden;';
  document.body.appendChild(el);
  return el;
}

function createCtx(
  container: HTMLElement,
  layoutId: string
): CapabilityContext {
  return {
    container,
    getTheme: () => 'light',
    setTheme() {},
    getMode: () => 'normal',
    setMode() {},
    switchLayout() {},
    getCurrentLayoutId: () => layoutId,
    getAvailableLayouts: () => [],
    on: () => () => {},
    requestStageRepaint() {}
  };
}

interface LayoutCase {
  id: string;
  make: (container: HTMLElement) => ILayout;
}

const LAYOUTS: LayoutCase[] = [
  { id: 'split-right', make: (c) => new SplitRightLayout(c) },
  {
    id: 'split-right-graph-bottom',
    make: (c) => new SplitRightGraphBottomLayout(c)
  },
  { id: 'mobile-stack', make: (c) => new MobileStackLayout(c) },
  { id: 'lab-stage', make: (c) => new LabStageLayout(c) }
];

describe('stage mount attributes contract', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    layoutRegistry.clear();
  });

  describe('data-stage-frame', () => {
    for (const { id, make } of LAYOUTS) {
      it(`${id}: mount 后必有 [data-stage-frame]`, async () => {
        const container = createContainer();
        const layout = make(container);
        await layout.mount();
        expect(container.querySelector(`[${STAGE_FRAME_ATTR}]`)).not.toBeNull();
        await layout.unmount();
      });
    }
  });

  describe('graph 收养锚点', () => {
    for (const { id, make } of LAYOUTS) {
      it(`${id}: graphAdoptTarget 决定 section/body 打标`, async () => {
        registerAllLayouts();
        const meta = layoutRegistry.getMetadata(id);
        const container = createContainer();
        const layout = make(container);
        const slots = await layout.mount();

        if (!slots.graph) {
          // 无 graph slot 的布局不要求打标
          await layout.unmount();
          return;
        }
        const target = meta?.graphAdoptTarget ?? 'section';
        if (target === 'section') {
          const section = container.querySelector(`[${GRAPH_SECTION_ATTR}]`);
          const body = container.querySelector(`[${GRAPH_BODY_ATTR}]`);
          expect(section).not.toBeNull();
          expect(body).not.toBeNull();
          // 收养层级必须包住 graph slot
          expect(section!.contains(slots.graph)).toBe(true);
        } else {
          // slot 目标（mobile）：不打 section/body，收养 slots.graph 本身
          expect(container.querySelector(`[${GRAPH_SECTION_ATTR}]`)).toBeNull();
          expect(container.querySelector(`[${GRAPH_BODY_ATTR}]`)).toBeNull();
        }
        await layout.unmount();
      });
    }

    it('split/srgb 的 graph-body 是带 flex 契约的中间层（包住 slot、不含 header）', async () => {
      for (const make of [
        (c: HTMLElement) => new SplitRightLayout(c),
        (c: HTMLElement) => new SplitRightGraphBottomLayout(c)
      ]) {
        const container = createContainer();
        const layout = make(container);
        const slots = await layout.mount();
        const body = container.querySelector<HTMLElement>(
          `[${GRAPH_BODY_ATTR}]`
        );
        expect(body).not.toBeNull();
        expect(body!.contains(slots.graph!)).toBe(true);
        expect(body!.style.flexGrow).toBe('1');
        expect(body!.style.minHeight).toBe('0');
        expect(body!.style.display).toBe('flex');
        expect(body!.style.flexDirection).toBe('column');
        // 打标不得落在 slot 上（scene-adapter 会 replaceChildren 清空 slot）
        expect(slots.graph!.hasAttribute(GRAPH_BODY_ATTR)).toBe(false);
        await layout.unmount();
        container.remove();
      }
    });
  });

  describe('hasGraph:false 时图 DOM 不出现（仅 split-right / mobile-stack）', () => {
    it('split-right: hasGraph=false 无 graph section', async () => {
      const container = createContainer();
      const layout = new SplitRightLayout(container, { hasGraph: false });
      const slots = await layout.mount();
      expect(slots.graph).toBeUndefined();
      expect(container.querySelector('.graph-section')).toBeNull();
      expect(container.querySelector(`[${GRAPH_SECTION_ATTR}]`)).toBeNull();
      await layout.unmount();
    });

    it('mobile-stack: hasGraph=false 无 graph tab', async () => {
      const container = createContainer();
      const layout = new MobileStackLayout(container, { hasGraph: false });
      const slots = await layout.mount();
      expect(slots.graph).toBeUndefined();
      expect(container.querySelector('.mobile-graph-slot')).toBeNull();
      expect(container.querySelector(`[${GRAPH_SECTION_ATTR}]`)).toBeNull();
      await layout.unmount();
    });
  });

  describe('data-stage-toolbar-host 单一宿主语义', () => {
    it('mobile fixture A：mount 即打标 .mobile-transport-toggles', async () => {
      const container = createContainer();
      const layout = new MobileStackLayout(container);
      await layout.mount();
      const group = container.querySelector('.mobile-transport-toggles');
      expect(group).not.toBeNull();
      expect(group!.hasAttribute(STAGE_TOOLBAR_HOST_ATTR)).toBe(true);
      await layout.unmount();
    });

    it('mobile fixture B：ensureStageToolbar 命中 .mobile-transport-toggles', async () => {
      const container = createContainer();
      const layout = new MobileStackLayout(container);
      const slots = await layout.mount();
      const { host, created } = ensureStageToolbar({
        animation: slots.animation ?? null,
        container,
        owner: 'test'
      });
      expect(created).toBe(false);
      expect(host.classList.contains('mobile-transport-toggles')).toBe(true);
      expect(host.hasAttribute(STAGE_TOOLBAR_HOST_ATTR)).toBe(true);
      await layout.unmount();
    });

    const DESKTOP_CASES: Array<{
      id: string;
      make: (c: HTMLElement) => ILayout;
      ownToolbar: string;
    }> = [
      {
        id: 'split-right',
        make: (c) => new SplitRightLayout(c),
        ownToolbar: '.stage-toolbar'
      },
      {
        id: 'split-right-graph-bottom',
        make: (c) => new SplitRightGraphBottomLayout(c),
        ownToolbar: '.stage-toolbar'
      },
      {
        id: 'lab-stage',
        make: (c) => new LabStageLayout(c),
        ownToolbar: '.lab-stage-toolbar'
      }
    ];

    for (const { id, make, ownToolbar } of DESKTOP_CASES) {
      it(`${id}：只 mount 布局时没有宿主（浮条由能力创建）`, async () => {
        const container = createContainer();
        const layout = make(container);
        await layout.mount();
        expect(
          container.querySelector(`[${STAGE_TOOLBAR_HOST_ATTR}]`)
        ).toBeNull();
        await layout.unmount();
      });

      it(`${id} + transport：宿主 = 浮条，布局自带工具条不得同时带标`, async () => {
        const container = createContainer();
        const layout = make(container);
        const slots = await layout.mount();
        const transport = createTransportBar({}).mount(
          slots as LayoutSlots,
          { mountSlot: 'animation' },
          createCtx(container, id)
        );
        const host = container.querySelector(`[${STAGE_TOOLBAR_HOST_ATTR}]`);
        expect(host).not.toBeNull();
        expect(host!.classList.contains('stage-floating-controls')).toBe(true);
        expect(
          container
            .querySelector(ownToolbar)
            ?.hasAttribute(STAGE_TOOLBAR_HOST_ATTR)
        ).toBe(false);
        // ensureStageToolbar 属性优先命中浮条
        const resolved = ensureStageToolbar({
          animation: slots.animation ?? null,
          container,
          owner: 'test'
        });
        expect(resolved.host).toBe(host);
        transport.dispose();
        await layout.unmount();
      });

      it(`${id} 无 transport：ensureStageToolbar 补标到 ${ownToolbar}`, async () => {
        const container = createContainer();
        const layout = make(container);
        const slots = await layout.mount();
        const { host, created } = ensureStageToolbar({
          animation: slots.animation ?? null,
          container,
          owner: 'test'
        });
        expect(created).toBe(false);
        expect(host).toBe(container.querySelector(ownToolbar));
        expect(host.hasAttribute(STAGE_TOOLBAR_HOST_ATTR)).toBe(true);
        await layout.unmount();
      });
    }
  });
});
