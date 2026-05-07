/**
 * 仪器组件库 — 审计页面
 *
 * 内部开发工具，用于预览和调试所有已注册的仪器组件。
 */

import { buildInstrumentRegistry, buildRegistryByCategory, getCategoryLabel } from '../../instruments/instrument-registry';
import type { RegistryEntry } from '../../instruments/instrument-registry';
import type { InstrumentSim, InstrumentView, InstrumentState, InstrumentParams, InstrumentMeta } from '../../instruments/_contract/instrument-contract';
import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';

export function bootInstrumentLibrary() {
  const registry = buildInstrumentRegistry();
  const byCategory = buildRegistryByCategory();

  const root = document.getElementById('app')!;
  root.innerHTML = '';

  // ── 根容器 ──
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-body);
  `;
  root.appendChild(container);

  // ── 顶部导航栏 ──
  const header = document.createElement('header');
  header.style.cssText = `
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  `;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:var(--text-lg);font-weight:var(--font-medium);">仪器组件库</span>
      <span style="font-size:var(--text-xs);padding:2px 10px;border-radius:999px;background:var(--bg-secondary);color:var(--text-muted);">${registry.length} 个组件</span>
    </div>
    <a href="/" style="font-size:var(--text-sm);color:var(--accent-primary);text-decoration:none;">← 返回首页</a>
  `;
  container.appendChild(header);

  // ── 主体区域 ──
  const body = document.createElement('div');
  body.style.cssText = 'flex:1;display:flex;overflow:hidden;';
  container.appendChild(body);

  // ── 左侧边栏 ──
  const sidebar = document.createElement('aside');
  sidebar.style.cssText = `
    width: 280px;
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
    flex-shrink: 0;
  `;
  body.appendChild(sidebar);

  // ── 右侧主区域 ──
  const main = document.createElement('main');
  main.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
  body.appendChild(main);

  // 预览区（Canvas）
  const previewWrap = document.createElement('div');
  previewWrap.style.cssText = 'flex:1;position:relative;background:var(--bg-secondary);';
  main.appendChild(previewWrap);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  previewWrap.appendChild(canvas);

  // 信息面板
  const infoPanel = document.createElement('div');
  infoPanel.style.cssText = `
    height: 220px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
    display: flex;
  `;
  main.appendChild(infoPanel);

  // 元数据区
  const metaWrap = document.createElement('div');
  metaWrap.style.cssText = `
    width: 280px;
    border-right: 1px solid var(--border-color);
    padding: 16px;
    overflow-y: auto;
    flex-shrink: 0;
  `;
  infoPanel.appendChild(metaWrap);

  // 参数编辑器区
  const paramsWrap = document.createElement('div');
  paramsWrap.style.cssText = 'flex:1;padding:16px;overflow-y:auto;';
  infoPanel.appendChild(paramsWrap);

  // ── 状态 ──
  let activeEntry: RegistryEntry | null = null;
  let activeSim: InstrumentSim<InstrumentState, InstrumentParams> | null = null;
  let activeView: InstrumentView<InstrumentState> | null = null;
  let rafId = 0;
  let isLoading = false;

  // 检测当前主题（从 html data-theme 属性或系统偏好）
  function detectTheme(): TeachingTheme {
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme === 'dark' || htmlTheme === 'light') return htmlTheme;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
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
    catHeader.style.cssText = `
      padding: 12px 16px 6px;
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    `;
    catHeader.textContent = getCategoryLabel(cat);
    sidebar.appendChild(catHeader);

    const list = document.createElement('ul');
    list.style.cssText = 'margin-bottom:8px;';
    for (const entry of byCategory[cat]) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100%;
        text-align: left;
        padding: 10px 16px;
        font-size: var(--text-sm);
        background: transparent;
        border: none;
        color: var(--text-primary);
        cursor: pointer;
        transition: background var(--transition-fast);
      `;
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
  async function selectInstrument(entry: RegistryEntry, btn: HTMLButtonElement) {
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
    btn.style.color = 'var(--accent-primary)';
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
          const dt = now - lastTime;
          lastTime = now;
          activeSim.step(dt);
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
  function renderMeta(entry: RegistryEntry, meta: InstrumentMeta<Record<string, unknown>>) {
    metaWrap.innerHTML = '';

    const rows: [string, string][] = [
      ['ID', meta.id],
      ['名称', meta.title],
      ['分类', getCategoryLabel(meta.category)],
      ['描述', meta.description],
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
  function renderParams(entry: RegistryEntry, sim: InstrumentSim<InstrumentState, InstrumentParams>) {
    paramsWrap.innerHTML = '';

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
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;';
    paramsWrap.appendChild(grid);

    for (const key of keys) {
      const defaultValue = defaults[key];
      const wrap = document.createElement('div');

      if (typeof defaultValue === 'number') {
        const label = document.createElement('label');
        label.style.cssText = 'display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;';
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

        row.appendChild(range);
        row.appendChild(num);
        wrap.appendChild(row);
      } else {
        const label = document.createElement('label');
        label.style.cssText = 'display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;';
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

  // ── 响应窗口尺寸变化 ──
  const handleResize = () => {
    if (activeView) activeView.resize();
  };
  window.addEventListener('resize', handleResize);

  // ── 清理 ──
  const handleBeforeUnload = () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (activeView) activeView.dispose();
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  // 提供 dispose 方法供外部调用（如页面切换时）
  return function dispose() {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (rafId) cancelAnimationFrame(rafId);
    if (activeView) activeView.dispose();
    activeSim = null;
    activeView = null;
  };
}
