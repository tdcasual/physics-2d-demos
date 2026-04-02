import { createPageLifecycle } from './page-lifecycle';
import { createLegacy2DAdapter } from './legacy-2d-adapter';
import { createTeachingDemoShell, type ReadoutItem } from './teaching-demo-shell';

export type Legacy2DSceneConfig = {
  sceneId: string;
  sourcePath: string;
};

export type BootLegacy2DBridgePageOptions = {
  mount: HTMLElement;
  title: string;
  subtitle: string;
  scene: Legacy2DSceneConfig;
  setupControls: (args: {
    shell: ReturnType<typeof createTeachingDemoShell>;
    adapter: ReturnType<typeof createLegacy2DAdapter>;
    lifecycle: ReturnType<typeof createPageLifecycle>;
  }) => void;
};

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

function isVisibleFocusable(node: Element): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  if (node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
  if (node.closest('[inert], [aria-hidden="true"]')) return false;
  if (node instanceof HTMLInputElement && node.type === 'hidden') return false;
  const style = window.getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && node.tabIndex >= 0;
}

function fallbackReadout(sourcePath: string): ReadoutItem[] {
  return [
    { label: '渲染模式', value: 'Legacy 右侧视图桥接' },
    { label: '控制协议', value: 'postMessage legacy:control + legacy:control-ext' },
    { label: '原始页面', value: sourcePath }
  ];
}

export function bootLegacy2DBridgePage(options: BootLegacy2DBridgePageOptions): void {
  const shell = createTeachingDemoShell({
    mount: options.mount,
    title: options.title,
    subtitle: options.subtitle,
    defaultMode: 'normal',
    hideHeader: true,
    readoutLabel: '数据区',
    layout: {
      defaultLeftRatio: 0.28,
      leftMinWidth: 240,
      leftMaxWidth: 350,
      hasGraph: false,
      controlColumns: 1,
      readoutCollapsed: true,
    }
  });

  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

  const moveFocusFromLegacyStage = (direction: 'forward' | 'backward'): void => {
    const iframe = shell.root.querySelector('.stage-iframe');
    if (!(iframe instanceof HTMLElement)) return;

    const focusableElements = Array.from(shell.root.querySelectorAll(focusableSelector)).filter(isVisibleFocusable);
    if (focusableElements.length < 2) return;

    const currentIndex = focusableElements.indexOf(iframe);
    if (currentIndex === -1) return;

    const nextIndex = direction === 'backward'
      ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
      : (currentIndex + 1) % focusableElements.length;
    const nextTarget = focusableElements[nextIndex];
    if (!nextTarget || nextTarget === iframe) return;

    if (isVisibleFocusable(nextTarget)) nextTarget.focus();
  };

  // Legacy scene renders inside iframe rather than shell canvas.
  shell.stageCanvas.remove();
  shell.setReadout(fallbackReadout(options.scene.sourcePath));
  shell.setStatus('正在加载历史场景...');

  const adapter = createLegacy2DAdapter({
    stageSlot: shell.stageSlot,
    sceneId: options.scene.sceneId,
    sourcePath: options.scene.sourcePath,
    embedQuery: {
      embed: '1',
      host: 'teaching-shell',
      theme: shell.getTheme()
    },
    onReadout: (items) => shell.setReadout(items),
    onStatus: (text) => shell.setStatus(text),
    onExitIframeFocus: (direction) => moveFocusFromLegacyStage(direction)
  });
  lifecycle.onDispose(() => adapter.dispose());

  options.setupControls({ shell, adapter, lifecycle });

  adapter.sendControlExt('set-presentation', { presentation: shell.getMode() === 'presentation' });
  adapter.sendControlExt('set-theme', { theme: shell.getTheme() });

  const onModeToggle = () => {
    const nextMode = shell.getMode() === 'normal' ? 'presentation' : 'normal';
    shell.setMode(nextMode);
    adapter.sendControlExt('set-presentation', { presentation: nextMode === 'presentation' });
    shell.setStatus(nextMode === 'presentation' ? '演示模式已开启' : '标准模式已开启');
  };

  const onThemeToggle = () => {
    const nextTheme = shell.getTheme() === 'dark' ? 'light' : 'dark';
    shell.setTheme(nextTheme);
    adapter.sendControlExt('set-theme', { theme: nextTheme });
    shell.setStatus(nextTheme === 'dark' ? '夜间主题已开启' : '白天主题已开启');
  };

  shell.modeButton.addEventListener('click', onModeToggle);
  shell.themeButton.addEventListener('click', onThemeToggle);
  lifecycle.onDispose(() => shell.modeButton.removeEventListener('click', onModeToggle));
  lifecycle.onDispose(() => shell.themeButton.removeEventListener('click', onThemeToggle));

  const onBeforeUnload = () => lifecycle.dispose();
  window.addEventListener('beforeunload', onBeforeUnload);
  lifecycle.onDispose(() => window.removeEventListener('beforeunload', onBeforeUnload));
}
