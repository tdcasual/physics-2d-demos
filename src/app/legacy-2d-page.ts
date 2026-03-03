import '../ui/teaching-demo.css';
import { createControlPanel } from '../ui/control-panel';
import { createLegacy2DAdapter } from './legacy-2d-adapter';
import { getLegacy2DAnimationById, resolveLegacy2DSceneIdFromSearch } from './legacy-animation-catalog';
import { createLegacyChaseMeetControls } from './legacy-chase-meet-controls';
import { createLegacyElectrificationControls } from './legacy-electrification-controls';
import { createLegacyEmfAnalogyControls } from './legacy-emf-analogy-controls';
import { createLegacyFieldLinesControls } from './legacy-field-lines-controls';
import { createLegacyVtIntegralControls } from './legacy-vt-integral-controls';
import { toNavFileName } from './navigation-display';
import { createPageLifecycle } from './page-lifecycle';
import { createTeachingDemoShell, type ReadoutItem } from './teaching-demo-shell';

function fallbackReadout(sourcePath: string): ReadoutItem[] {
  return [
    { label: '迁移方式', value: '2D 兼容中间层' },
    { label: '控制协议', value: 'postMessage legacy:control + legacy:control-ext' },
    { label: '原始页面', value: toNavFileName(sourcePath) }
  ];
}

function boot(): void {
  const mount = document.getElementById('app');
  if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing #app container');
  }

  const sceneId = resolveLegacy2DSceneIdFromSearch(window.location.search);
  const scene = sceneId ? getLegacy2DAnimationById(sceneId) : undefined;

  if (!scene) {
    mount.innerHTML = '<p style="padding:20px;font-size:18px;">未找到 2D 场景配置，请检查 URL 参数 scene。</p>';
    return;
  }

  const shell = createTeachingDemoShell({
    mount,
    title: scene.title,
    subtitle: `2D 迁移中间层：${scene.objective}`,
    defaultMode: 'normal'
  });
  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

  shell.stageCanvas.remove();
  shell.setReadout(fallbackReadout(scene.sourcePath));
  shell.setStatus('正在加载 2D 页面...');

  const adapter = createLegacy2DAdapter({
    stageSlot: shell.stageSlot,
    sceneId: scene.id,
    sourcePath: scene.sourcePath,
    embedQuery: { embed: '1', host: 'teaching-shell', theme: shell.getTheme() },
    onReadout: (items) => {
      shell.setReadout(items);
    },
    onStatus: (text) => {
      shell.setStatus(text);
    }
  });
  lifecycle.onDispose(() => adapter.dispose());

  if (scene.id === 'legacy-field-lines') {
    const controls = createLegacyFieldLinesControls({
      container: shell.controlSlot,
      onCommand: (command, payload) => adapter.sendControlExt(command, payload),
      onStatus: (text) => shell.setStatus(text)
    });
    lifecycle.onDispose(() => controls.dispose());
    shell.setStatus('左侧可调场景、密度与电荷参数');
  } else if (scene.id === 'legacy-emf-analogy') {
    const controls = createLegacyEmfAnalogyControls({
      container: shell.controlSlot,
      onCommand: (command, payload) => adapter.sendControlExt(command, payload),
      onStatus: (text) => shell.setStatus(text)
    });
    lifecycle.onDispose(() => controls.dispose());
    shell.setStatus('左侧可调通路开关与水龙头开度');
  } else if (scene.id === 'legacy-electrification') {
    const controls = createLegacyElectrificationControls({
      container: shell.controlSlot,
      onCommand: (command, payload) => adapter.sendControlExt(command, payload),
      onStatus: (text) => shell.setStatus(text)
    });
    lifecycle.onDispose(() => controls.dispose());
    shell.setStatus('左侧可切换起电场景并执行步骤');
  } else if (scene.id === 'legacy-chase-meet') {
    const controls = createLegacyChaseMeetControls({
      container: shell.controlSlot,
      onControl: (action) => adapter.sendControl(action),
      onCommand: (command, payload) => adapter.sendControlExt(command, payload),
      onStatus: (text) => shell.setStatus(text)
    });
    lifecycle.onDispose(() => controls.dispose());
    shell.setStatus('左侧可配置参数并控制播放流程');
  } else if (scene.id === 'legacy-vt-integral') {
    const controls = createLegacyVtIntegralControls({
      container: shell.controlSlot,
      onCommand: (command, payload) => adapter.sendControlExt(command, payload),
      onStatus: (text) => shell.setStatus(text)
    });
    lifecycle.onDispose(() => controls.dispose());
    shell.setStatus('左侧可切换微元法子场景并调参');
  } else {
    createControlPanel(shell.controlSlot, {
      onPlay: () => {
        adapter.sendControl('play');
        shell.setStatus('已发送播放指令');
      },
      onPause: () => {
        adapter.sendControl('pause');
        shell.setStatus('已发送暂停指令');
      },
      onReset: () => {
        adapter.sendControl('reset');
        shell.setStatus('已发送重置指令');
        shell.setReadout(fallbackReadout(scene.sourcePath));
      },
      onStep: () => {
        adapter.sendControl('step');
        shell.setStatus('已发送单步指令');
      }
    });
  }

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

boot();
