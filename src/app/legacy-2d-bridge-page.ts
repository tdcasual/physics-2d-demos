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
    desktopReadoutCollapsible: false,
    desktopReadoutDefaultCollapsed: false,
    desktopReadoutDraggable: false
  });

  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

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
    onStatus: (text) => shell.setStatus(text)
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
