/**
 * 仪器组件库 — 审计页面
 *
 * 内部开发工具，用于预览和调试所有已注册的仪器组件。
 */

import {
  buildInstrumentRegistry,
  buildRegistryByCategory,
  getCategoryLabel
} from '../../instruments/instrument-registry';
import type { RegistryEntry } from '../../instruments/instrument-registry';
import type {
  InstrumentSim,
  InstrumentView,
  InstrumentState,
  InstrumentParams,
  InstrumentMeta
} from '../../instruments/_contract/instrument-contract';
import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import {
  getStoredTheme,
  resolveSystemTheme,
  resolveThemePreference
} from '../theme-store';

/**
 * 布局样式：桌面为「侧栏 + 预览 + 底部信息栏」；移动端（与全局断点
 * width < 768px 一致）改为「横向分类条 + 预览 + 底部 tab 页」，
 * 预览区随容器尺寸经 ResizeObserver 动态重算。
 */
const LIBRARY_CSS = `
.il-container{display:flex;flex-direction:column;height:100vh;background:var(--bg-primary);color:var(--text-primary);font-family:var(--font-body);}
.il-header{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--border-color);flex-shrink:0;}
.il-body{flex:1;display:flex;overflow:hidden;}
.il-sidebar{width:280px;border-right:1px solid var(--border-color);overflow-y:auto;flex-shrink:0;}
.il-cat{padding:12px 16px 6px;font-size:var(--text-xs);font-weight:var(--font-medium);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;}
.il-list{margin-bottom:8px;}
.il-item{width:100%;text-align:left;padding:10px 16px;font-size:var(--text-sm);background:transparent;border:none;color:var(--text-primary);cursor:pointer;transition:background var(--transition-fast);white-space:nowrap;}
.il-main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.il-preview{flex:1;position:relative;background:var(--bg-secondary);min-height:0;}
.il-info{height:220px;border-top:1px solid var(--border-color);flex-shrink:0;display:flex;}
.il-tabs{display:none;}
.il-meta{width:280px;border-right:1px solid var(--border-color);padding:16px;overflow-y:auto;flex-shrink:0;}
.il-params{flex:1;padding:16px;overflow-y:auto;}
@media (width < 768px){
  .il-header{padding:0 12px;}
  .il-body{flex-direction:column;}
  .il-sidebar{width:auto;border-right:none;border-bottom:1px solid var(--border-color);overflow-x:auto;overflow-y:hidden;display:flex;align-items:center;gap:2px;padding:4px 8px;}
  .il-cat{padding:4px 8px;flex-shrink:0;}
  .il-list{display:contents;}
  .il-item{width:auto;padding:8px 14px;border-radius:999px;flex-shrink:0;}
  .il-info{height:42%;flex-direction:column;}
  .il-tabs{display:flex;flex-shrink:0;border-bottom:1px solid var(--border-color);}
  .il-tab{flex:1;padding:8px;font-size:var(--text-sm);background:transparent;border:none;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;}
  .il-info[data-tab='params'] .il-tab-params,
  .il-info[data-tab='meta'] .il-tab-meta{color:var(--accent-link);border-bottom-color:var(--accent-link);font-weight:var(--font-medium);}
  .il-meta,.il-params{width:auto;border-right:none;flex:1;min-height:0;}
  .il-info[data-tab='params'] .il-meta{display:none;}
  .il-info[data-tab='meta'] .il-params{display:none;}
}
`;

function injectLibraryStyles(): void {
  if (document.getElementById('il-styles')) return;
  const style = document.createElement('style');
  style.id = 'il-styles';
  style.textContent = LIBRARY_CSS;
  document.head.appendChild(style);
}

export function bootInstrumentLibrary() {
  injectLibraryStyles();
  const registry = buildInstrumentRegistry();
  const byCategory = buildRegistryByCategory();

  const root = document.getElementById('app')!;
  root.innerHTML = '';

  // ── 根容器 ──
  const container = document.createElement('div');
  container.className = 'il-container';
  root.appendChild(container);

  // ── 顶部导航栏 ──
  const header = document.createElement('header');
  header.className = 'il-header';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:var(--text-lg);font-weight:var(--font-medium);">仪器组件库</span>
      <span style="font-size:var(--text-xs);padding:2px 10px;border-radius:999px;background:var(--bg-secondary);color:var(--text-muted);">${registry.length} 个组件</span>
    </div>
    <a href="/" style="font-size:var(--text-sm);color:var(--accent-link);text-decoration:none;">← 返回首页</a>
  `;
  container.appendChild(header);

  // ── 主体区域 ──
  const body = document.createElement('div');
  body.className = 'il-body';
  container.appendChild(body);

  // ── 左侧边栏（移动端变为横向分类条） ──
  const sidebar = document.createElement('aside');
  sidebar.className = 'il-sidebar';
  body.appendChild(sidebar);

  // ── 右侧主区域 ──
  const main = document.createElement('main');
  main.className = 'il-main';
  body.appendChild(main);

  // 预览区（Canvas；SVG 仪器隐藏 canvas 并在旁插 <svg>）
  const previewWrap = document.createElement('div');
  previewWrap.className = 'il-preview';
  main.appendChild(previewWrap);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  previewWrap.appendChild(canvas);

  // SVG 仪器的视口内交互（如拖动游标）通过冒泡的 instrument-param
  // 自定义事件上报参数变更，这里统一回写到当前 sim（见 STANDARDS.md
  // 第 3 节 renderTech: 'svg' 约定）
  previewWrap.addEventListener('instrument-param', (ev) => {
    const detail = (ev as CustomEvent<{ key: string; value: unknown }>).detail;
    if (activeSim && detail && typeof detail.key === 'string') {
      activeSim.setParams({
        [detail.key]: detail.value
      } as Partial<InstrumentParams>);
      // 同步参数编辑器显示值：编辑器 number 输入在失焦时会用显示值触发
      // change 回灌，不同步会把拖拽结果打回旧值
      if (typeof detail.value === 'number') {
        const editor = paramEditors.get(detail.key);
        if (editor) {
          editor.range.value = String(detail.value);
          editor.num.value = String(detail.value);
        }
      }
    }
  });

  // 信息面板（移动端带 tab：参数调节 / 组件信息）
  const infoPanel = document.createElement('div');
  infoPanel.className = 'il-info';
  infoPanel.dataset.tab = 'params';
  main.appendChild(infoPanel);

  const tabBar = document.createElement('div');
  tabBar.className = 'il-tabs';
  const tabParams = document.createElement('button');
  tabParams.className = 'il-tab il-tab-params';
  tabParams.textContent = '参数调节';
  tabParams.addEventListener('click', () => {
    infoPanel.dataset.tab = 'params';
  });
  const tabMeta = document.createElement('button');
  tabMeta.className = 'il-tab il-tab-meta';
  tabMeta.textContent = '组件信息';
  tabMeta.addEventListener('click', () => {
    infoPanel.dataset.tab = 'meta';
  });
  tabBar.append(tabParams, tabMeta);
  infoPanel.appendChild(tabBar);

  // 元数据区
  const metaWrap = document.createElement('div');
  metaWrap.className = 'il-meta';
  infoPanel.appendChild(metaWrap);

  // 参数编辑器区
  const paramsWrap = document.createElement('div');
  paramsWrap.className = 'il-params';
  infoPanel.appendChild(paramsWrap);

  // ── 状态 ──
  let activeEntry: RegistryEntry | null = null;
  let activeSim: InstrumentSim<InstrumentState, InstrumentParams> | null = null;
  let activeView: InstrumentView<InstrumentState> | null = null;
  let rafId = 0;
  let isLoading = false;
  // 当前参数编辑器的数值输入引用（key → range/num），供 instrument-param 同步
  const paramEditors = new Map<
    string,
    { range: HTMLInputElement; num: HTMLInputElement }
  >();

  // 检测当前主题：复用全站统一主题存储（用户偏好优先，回退系统偏好）
  function detectTheme(): TeachingTheme {
    const stored = getStoredTheme();
    return stored ? resolveThemePreference(stored) : resolveSystemTheme();
  }
  const currentTheme = detectTheme();

  // ── 渲染侧边栏 ──
  if (registry.length === 0) {
    sidebar.innerHTML = `
      <div style="padding:40px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">📭</div>
        <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:8px;">暂无仪器组件</p>
        <p style="font-size:var(--text-xs);color:var(--text-muted);">
          在 <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">src/instruments/</code> 下添加仪器后自动显示
        </p>
      </div>
    `;
    metaWrap.innerHTML = `<p style="font-size:var(--text-sm);color:var(--text-muted);">选择左侧仪器查看详情</p>`;
    paramsWrap.innerHTML = `<p style="font-size:var(--text-sm);color:var(--text-muted);">无参数可编辑</p>`;
    return () => {};
  }

  // 有仪器时渲染分类列表
  const categories = Object.keys(byCategory);
  for (const cat of categories) {
    const catHeader = document.createElement('div');
    catHeader.className = 'il-cat';
    catHeader.textContent = getCategoryLabel(cat);
    sidebar.appendChild(catHeader);

    const list = document.createElement('ul');
    list.className = 'il-list';
    for (const entry of byCategory[cat]) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'il-item';
      btn.textContent = entry.title;
      btn.addEventListener('mouseenter', () => {
        if (activeEntry?.id !== entry.id) {
          btn.style.background = 'var(--bg-secondary)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (activeEntry?.id !== entry.id) {
          btn.style.background = 'transparent';
        }
      });
      btn.addEventListener('click', () => selectInstrument(entry, btn));
      li.appendChild(btn);
      list.appendChild(li);
    }
    sidebar.appendChild(list);
  }

  // ── 选择仪器 ──
  async function selectInstrument(
    entry: RegistryEntry,
    btn: HTMLButtonElement
  ) {
    if (isLoading) return;
    isLoading = true;

    if (rafId) cancelAnimationFrame(rafId);
    if (activeView) activeView.dispose();

    activeEntry = entry;

    // 高亮当前选中
    sidebar.querySelectorAll('button').forEach((b) => {
      b.style.background = 'transparent';
      b.style.color = 'var(--text-primary)';
      b.style.fontWeight = 'var(--font-normal)';
    });
    btn.style.background = 'var(--bg-secondary)';
    btn.style.color = 'var(--accent-link)';
    btn.style.fontWeight = 'var(--font-medium)';

    // 显示加载中（不移除 canvas，只叠加 loading 层）
    const loadingEl = document.createElement('div');
    loadingEl.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: var(--text-sm);
      z-index: 10;
      background: var(--bg-secondary);
    `;
    loadingEl.textContent = `正在加载 ${entry.title}...`;
    previewWrap.appendChild(loadingEl);

    try {
      // 按需加载工厂代码（首次加载时会请求对应的 chunk）
      const factory = await entry.loadFactory();

      // 清理加载提示
      loadingEl.remove();

      const ctx = sizeCanvasToFill(canvas);
      if (!ctx) return;

      activeSim = factory.createSim();
      activeView = factory.createView({ canvas, theme: currentTheme });
      activeView.resize();

      renderMeta(entry, factory.meta);
      renderParams(entry, activeSim);

      let lastTime = performance.now();
      const loop = () => {
        if (activeSim && activeView) {
          const now = performance.now();
          const dtMs = now - lastTime;
          lastTime = now;
          // sim.step 与场景生态约定一致：dt 单位为秒
          activeSim.step(dtMs / 1000);
          activeView.render(activeSim.getState());
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    } catch (err) {
      loadingEl.remove();
      const errorEl = document.createElement('div');
      errorEl.style.cssText = `
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ef4444;
        font-size: var(--text-sm);
        padding: 20px;
        text-align: center;
        z-index: 10;
        background: var(--bg-secondary);
      `;
      errorEl.textContent = `加载失败: ${err instanceof Error ? err.message : String(err)}`;
      previewWrap.appendChild(errorEl);
    } finally {
      isLoading = false;
    }
  }

  // ── 渲染元数据 ──
  function renderMeta(
    entry: RegistryEntry,
    meta: InstrumentMeta<Record<string, unknown>>
  ) {
    metaWrap.innerHTML = '';

    const rows: [string, string][] = [
      ['ID', meta.id],
      ['名称', meta.title],
      ['分类', getCategoryLabel(meta.category)],
      ['描述', meta.description]
    ];
    if (meta.unit) rows.push(['单位', meta.unit]);
    if (meta.precision) rows.push(['精度', String(meta.precision)]);

    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:10px;';
      row.innerHTML = `
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px;">${label}</div>
        <div style="font-size:var(--text-sm);color:var(--text-primary);">${value}</div>
      `;
      metaWrap.appendChild(row);
    }
  }

  // ── 渲染参数编辑器 ──
  function renderParams(
    entry: RegistryEntry,
    sim: InstrumentSim<InstrumentState, InstrumentParams>
  ) {
    paramsWrap.innerHTML = '';
    paramEditors.clear();

    const defaults = entry.defaultParams;
    const keys = Object.keys(defaults);

    if (keys.length === 0) {
      paramsWrap.innerHTML = `<p style="font-size:var(--text-sm);color:var(--text-muted);">该仪器无可调参数</p>`;
      return;
    }

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    `;
    title.textContent = '参数调节';
    paramsWrap.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText =
      'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;';
    paramsWrap.appendChild(grid);

    for (const key of keys) {
      const defaultValue = defaults[key];
      const wrap = document.createElement('div');

      if (typeof defaultValue === 'number') {
        const label = document.createElement('label');
        label.style.cssText =
          'display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;';
        label.textContent = key;
        wrap.appendChild(label);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;';

        const range = document.createElement('input');
        range.type = 'range';
        range.style.cssText = 'flex:1;accent-color:var(--accent-primary);';
        const abs = Math.abs(defaultValue);
        const max = abs <= 1 ? 2 : abs <= 10 ? 20 : abs * 3;
        const min = max >= 0 ? 0 : -max;
        const step = abs <= 1 ? 0.001 : abs <= 10 ? 0.1 : 1;
        range.min = String(min);
        range.max = String(max);
        range.step = String(step);
        range.value = String(defaultValue);

        const num = document.createElement('input');
        num.type = 'number';
        num.style.cssText = `
          width: 72px;
          font-size: var(--text-xs);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
        `;
        num.step = String(step);
        num.value = String(defaultValue);

        const update = (value: number) => {
          range.value = String(value);
          num.value = String(value);
          sim.setParams({ [key]: value } as Partial<InstrumentParams>);
        };

        range.addEventListener('input', () => update(parseFloat(range.value)));
        num.addEventListener('change', () => update(parseFloat(num.value)));

        paramEditors.set(key, { range, num });

        row.appendChild(range);
        row.appendChild(num);
        wrap.appendChild(row);
      } else {
        const label = document.createElement('label');
        label.style.cssText =
          'display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;';
        label.textContent = key;
        wrap.appendChild(label);

        const input = document.createElement('input');
        input.type = 'text';
        input.style.cssText = `
          width: 100%;
          font-size: var(--text-xs);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
        `;
        input.value = String(defaultValue);
        input.addEventListener('change', () => {
          sim.setParams({ [key]: input.value } as Partial<InstrumentParams>);
        });
        wrap.appendChild(input);
      }

      grid.appendChild(wrap);
    }

    // 重置按钮
    const resetBtn = document.createElement('button');
    resetBtn.style.cssText = `
      grid-column: span 2;
      margin-top: 4px;
      padding: 6px 12px;
      font-size: var(--text-xs);
      border-radius: var(--radius-sm);
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all var(--transition-fast);
    `;
    resetBtn.textContent = '重置参数';
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'var(--border-color)';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'var(--bg-secondary)';
    });
    resetBtn.addEventListener('click', () => {
      sim.reset();
      renderParams(entry, sim);
    });
    grid.appendChild(resetBtn);
  }

  // ── 响应容器尺寸变化（窗口缩放、横竖屏切换、桌面/移动布局切换） ──
  // ResizeObserver 覆盖 window resize 的所有场景：预览区尺寸一变，
  // 就按新尺寸重设 canvas 并通知 view。SVG 仪器的 canvas 处于隐藏态，
  // 跳过重设（其 view 用 viewBox 自适应，resize 为空操作）。
  const resizeObserver = new ResizeObserver(() => {
    if (!activeView) return;
    if (canvas.style.display !== 'none') sizeCanvasToFill(canvas);
    activeView.resize();
  });
  resizeObserver.observe(previewWrap);

  // ── 清理 ──
  const handleBeforeUnload = () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (activeView) activeView.dispose();
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  // 提供 dispose 方法供外部调用（如页面切换时）
  return function dispose() {
    resizeObserver.disconnect();
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (rafId) cancelAnimationFrame(rafId);
    if (activeView) activeView.dispose();
    activeSim = null;
    activeView = null;
  };
}
