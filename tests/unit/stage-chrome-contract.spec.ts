/**
 * Stage chrome 自标契约测试
 *
 * 单一事实源：会成为 stage slot 直接子节点的 chrome 必须在创建点打
 * data-stage-chrome（src/platform/stage-chrome.ts）。本测试挂载真实
 * split-right 布局 + transport-bar / readout-panel / data-workspace
 * 能力并进入工作区（panzoom wrap 发生），断言 .teaching-stage-slot 的
 * 每个非 canvas、非 .stage-viewport 直接子节点都带该属性。
 */
import { afterEach, describe, expect, it } from 'vitest';
import { SplitRightLayout } from '../../src/app/layouts/layouts/split-right/split-right';
import { createTransportBar } from '../../src/app/layouts/capabilities/transport-bar';
import { createReadoutPanel } from '../../src/app/layouts/capabilities/readout-panel';
import { createDataWorkspace } from '../../src/app/layouts/capabilities/data-workspace';
import { STAGE_CHROME_ATTR } from '../../src/platform/stage-chrome';
import {
  addSessionTrial,
  applyFieldDrafts,
  createEmptySession,
  removeSessionTrial,
  type DataWorkspaceDraft,
  type DataWorkspaceHost,
  type DataWorkspaceSpec
} from '../../src/platform/data-workspace';
import { doubleSlitDataWorkspaceSpec } from '../../src/scenes/double-slit/data-task';
import type {
  CapabilityContext,
  LayoutSlots
} from '../../src/app/layouts/types';
import { SidebarStateOwner } from '../../src/app/layouts/sidebar-state';
import { WorkspaceUiState } from '../../src/app/layouts/workspace-ui-state';

function createCtx(container: HTMLElement): CapabilityContext {
  return {
    container,
    getTheme: () => 'light',
    setTheme() {},
    getMode: () => 'normal',
    setMode() {},
    switchLayout() {},
    getCurrentLayoutId: () => 'split-right',
    getAvailableLayouts: () => [],
    on: () => () => {},
    requestStageRepaint() {},
    sidebar: new SidebarStateOwner(),
    workspaceUi: new WorkspaceUiState()
  };
}

function createHost(
  overrides: Partial<DataWorkspaceSpec> = {}
): DataWorkspaceHost {
  const spec: DataWorkspaceSpec = {
    ...doubleSlitDataWorkspaceSpec,
    ...overrides
  };
  let session = createEmptySession(spec);
  return {
    getSpec: () => spec,
    getEligibility: () => ({ ok: true }),
    getSession: () => session,
    getKnowns: () => [{ key: 'd', label: '双缝间距 d', value: '0.20 mm' }],
    getHint: () => '对准亮纹后读取',
    setActive(active: boolean) {
      session = { ...session, active };
    },
    submitField() {
      return { feedback: { ok: true, message: 'ok' }, session };
    },
    applyDrafts(drafts: readonly DataWorkspaceDraft[]) {
      session = applyFieldDrafts(session, spec, drafts);
      return session;
    },
    resetSession() {
      session = createEmptySession(spec);
    },
    syncInstrument() {},
    addTrial() {
      session = addSessionTrial(session, spec);
      return session;
    },
    removeTrial(rowId: string, confirmed = false) {
      const result = removeSessionTrial(session, spec, rowId, confirmed);
      session = result.session;
      return result;
    }
  };
}

/** slot 内违反 chrome 自标契约的直接子节点（canvas 与 viewport 豁免） */
function contractViolations(slot: HTMLElement): string[] {
  return Array.from(slot.children)
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .filter(
      (el) =>
        el.tagName !== 'CANVAS' &&
        !el.classList.contains('stage-viewport') &&
        !el.hasAttribute(STAGE_CHROME_ATTR)
    )
    .map((el) => el.className || el.tagName);
}

describe('stage chrome 自标契约', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('split-right + 工作区：slot 直接子节点全部自标，panzoom 不包裹 chrome', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const layout = new SplitRightLayout(container, { hideHeader: true });
    const slots: LayoutSlots = await layout.mount();
    const slot = container.querySelector('.teaching-stage-slot') as HTMLElement;
    expect(slot).toBeTruthy();
    const canvas = slot.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toBeTruthy();

    const ctx = createCtx(container);
    const transport = createTransportBar().mount(slots, {}, ctx);
    const readout = createReadoutPanel().mount(slots, {}, ctx);
    const workspace = createDataWorkspace().mount(slots, {}, ctx);
    workspace.update?.({ host: createHost() });

    // 进入工作区前：transport 浮条与 readout 面板已是 slot 内 chrome
    expect(contractViolations(slot)).toEqual([]);
    expect(canvas.hasAttribute(STAGE_CHROME_ATTR)).toBe(false);

    // 工作区入口应复用 transport 浮条宿主（与生产一致）
    const entry = container.querySelector(
      '.data-workspace-entry'
    ) as HTMLButtonElement;
    expect(entry).toBeTruthy();
    expect(entry.closest('.teaching-stage-floating-controls')).toBeTruthy();

    entry.click();
    expect(container.classList.contains('is-data-workspace')).toBe(true);

    const viewport = slot.querySelector('.stage-viewport') as HTMLElement;
    expect(viewport).toBeTruthy();
    expect(viewport.contains(canvas)).toBe(true);

    // 契约主体：wrap 之后 slot 内非 canvas、非 viewport 的直接子节点
    // （panzoom 控件 / transport 浮条 / readout 面板）必须全部自标
    expect(contractViolations(slot)).toEqual([]);
    // viewport 自身不打标；场景内容（canvas）不打标
    expect(viewport.hasAttribute(STAGE_CHROME_ATTR)).toBe(false);
    expect(canvas.hasAttribute(STAGE_CHROME_ATTR)).toBe(false);
    // chrome 未被包进 viewport（viewport 兄弟，不受 scale）
    for (const selector of [
      '.stage-panzoom-controls',
      '.teaching-stage-floating-controls',
      '.teaching-readout-panel'
    ]) {
      const chrome = slot.querySelector(selector) as HTMLElement | null;
      expect(chrome, selector).toBeTruthy();
      expect(chrome!.hasAttribute(STAGE_CHROME_ATTR)).toBe(true);
      expect(viewport.contains(chrome), selector).toBe(false);
    }

    // 退出工作区：unwrap 还原，契约仍然成立
    entry.click();
    expect(slot.querySelector('.stage-viewport')).toBeNull();
    expect(canvas.parentElement).toBe(slot);
    expect(contractViolations(slot)).toEqual([]);

    workspace.dispose();
    readout.dispose();
    transport.dispose();
    await layout.unmount();
    container.remove();
  });
});
