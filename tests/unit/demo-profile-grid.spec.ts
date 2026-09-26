import { describe, expect, it, beforeEach } from 'vitest';
import { createDemoProfile } from '../../src/app/layouts/capabilities/demo-profile';
import type { CapabilityContext } from '../../src/app/layouts/types';
import type { ResolvedDemoProfile } from '../../src/platform/demo-profile';
import { registerAllLayouts } from '../../src/app/layouts/auto-register';

/**
 * Fix 6：演示网格恢复的「形态漂移检测」——未漂移还原快照；
 * 演示期间发生过响应式重写时跳过模板恢复（只还原 resizer），交给重算。
 */
describe('demo-profile grid restore drift detection (Fix 6)', () => {
  let container: HTMLElement;
  let resizer: HTMLElement;

  function makeProfile(
    controlPanel: 'hidden' | 'collapsed' | 'minimal' | 'full'
  ): ResolvedDemoProfile {
    return {
      lessonTask: 'unmigrated',
      controlPanel,
      readoutPanel: 'hidden',
      readoutKeys: [],
      visibleControlKeys: [],
      renderHints: {},
      touchTargetMinSize: 0
    } as unknown as ResolvedDemoProfile;
  }

  function makeCapability(): {
    update(data: {
      mode: 'normal' | 'presentation';
      profile: ResolvedDemoProfile | null;
    }): void;
  } {
    // CapabilityInstance.update 为可选方法；本能力定义必然提供。
    const ctx = {
      container,
      getTheme: () => 'light',
      setTheme: () => {},
      getMode: () => 'normal',
      setMode: () => {},
      switchLayout: () => {},
      getCurrentLayoutId: () => 'split-right',
      getAvailableLayouts: () => [],
      on: () => () => {},
      requestStageRepaint: () => {}
    } as unknown as CapabilityContext;
    const instance = createDemoProfile().mount(
      { control: document.createElement('div'), animation: container },
      {},
      ctx
    );
    const update = instance.update?.bind(instance);
    if (!update) throw new Error('demo-profile capability missing update()');
    return { update };
  }

  beforeEach(() => {
    // geometryOn 依赖 registry 元数据（split-right demoCapable: true）
    registerAllLayouts();
    container = document.createElement('div');
    container.style.width = '1280px';
    container.style.height = '800px';
    // split 形态：300px 侧栏 + 8px 分隔条 + 主列
    container.style.gridTemplateColumns = '300px 8px 1fr';
    resizer = document.createElement('div');
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('aria-orientation', 'vertical');
    container.appendChild(resizer);
    // demo 的侧栏收缩在 `.layout-left-panel` 存在时才级联到网格
    const sidebar = document.createElement('aside');
    sidebar.className = 'layout-left-panel';
    container.appendChild(sidebar);
  });

  it('restores the snapshot when the grid shape did not drift', () => {
    const capability = makeCapability();
    capability.update({
      mode: 'presentation',
      profile: makeProfile('hidden')
    });
    expect(container.style.gridTemplateColumns).toBe('0px 0px 1fr');
    expect(resizer.style.display).toBe('none');
    expect(container.dataset.sidebarHidden).toBe('true');

    capability.update({ mode: 'normal', profile: null });
    expect(container.style.gridTemplateColumns).toBe('300px 8px 1fr');
    expect(resizer.style.display).toBe('');
    // 演示前标记不存在 → 精确还原为不存在（而非写成 false）
    expect(container.dataset.sidebarHidden).toBeUndefined();
  });

  it('skips the template restore after a responsive rewrite during presentation', () => {
    const capability = makeCapability();
    capability.update({
      mode: 'presentation',
      profile: makeProfile('hidden')
    });
    expect(container.style.gridTemplateColumns).toBe('0px 0px 1fr');

    // 演示期间窗口落入移动断点：applyResponsiveColumns 重写为单列
    container.style.gridTemplateColumns = '1fr';

    capability.update({ mode: 'normal', profile: null });
    // 漂移 → 不回写过期快照；resizer 仍还原，重算交给 handleResize
    expect(container.style.gridTemplateColumns).toBe('1fr');
    expect(resizer.style.display).toBe('');
  });

  it('restores the rail template for the collapsed strategy when undrifted', () => {
    const capability = makeCapability();
    capability.update({
      mode: 'presentation',
      profile: makeProfile('collapsed')
    });
    expect(container.style.gridTemplateColumns).toBe('48px 0px 1fr');

    capability.update({ mode: 'normal', profile: null });
    expect(container.style.gridTemplateColumns).toBe('300px 8px 1fr');
  });

  it('does not touch the template on flex layouts (lab-stage has no grid)', () => {
    container.style.gridTemplateColumns = '';
    const capability = makeCapability();
    capability.update({
      mode: 'presentation',
      profile: makeProfile('hidden')
    });
    expect(container.style.gridTemplateColumns).toBe('');
    capability.update({ mode: 'normal', profile: null });
    expect(container.style.gridTemplateColumns).toBe('');
  });

  it('treats a cleared template as drift and skips the restore (Fix 6, Codex)', () => {
    const capability = makeCapability();
    capability.update({
      mode: 'presentation',
      profile: makeProfile('hidden')
    });
    expect(container.style.gridTemplateColumns).toBe('0px 0px 1fr');

    // 演示期间模板被清空：不属于演示形态 → 跳过模板恢复（v2 撤回了
    // !current 分支，清空视同漂移）
    container.style.gridTemplateColumns = '';

    capability.update({ mode: 'normal', profile: null });
    expect(container.style.gridTemplateColumns).toBe('');
    expect(resizer.style.display).toBe('');
  });

  it('restores the snapshot after a desktop rewrite during presentation (multi-column drift keeps snapshot)', () => {
    const capability = makeCapability();
    capability.update({
      mode: 'presentation',
      profile: makeProfile('hidden')
    });
    // 演示期间真实 resize：容器 RO 触发 applyResponsiveColumns，
    // 多列形态重写（隐藏态 + 新宽度）
    container.style.gridTemplateColumns = '448px 8px 1fr';

    capability.update({ mode: 'normal', profile: null });
    // 多列形态不视为漂移：还原快照（合成 resize 不触发重算，快照为最优值）
    expect(container.style.gridTemplateColumns).toBe('300px 8px 1fr');
    expect(resizer.style.display).toBe('');
  });

  it('restores the pre-demo sidebarHidden flag exactly (Codex challenge)', () => {
    // 演示前用户已用 sidebar-toggle 隐藏侧栏（标记 true + 隐藏形态）
    container.dataset.sidebarHidden = 'true';
    container.style.gridTemplateColumns = '0px 8px 1fr';

    const capability = makeCapability();
    capability.update({
      mode: 'presentation',
      profile: makeProfile('hidden')
    });
    expect(container.dataset.sidebarHidden).toBe('true');

    capability.update({ mode: 'normal', profile: null });
    // 标记回到演示前的 true（不是演示写入态，也不是 false）
    expect(container.dataset.sidebarHidden).toBe('true');
    expect(container.style.gridTemplateColumns).toBe('0px 8px 1fr');
  });
});
