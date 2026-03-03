import '../ui/teaching-demo.css';
import { createControlPanel } from '../ui/control-panel';
import { createLegacy2DAdapter } from './legacy-2d-adapter';
import { getLegacy2DAnimationById, resolveLegacy2DSceneIdFromSearch } from './legacy-animation-catalog';
import { createTeachingDemoShell, type ReadoutItem } from './teaching-demo-shell';

function fallbackReadout(sourcePath: string): ReadoutItem[] {
  return [
    { label: '迁移方式', value: '2D 兼容中间层' },
    { label: '控制协议', value: 'postMessage legacy:control' },
    { label: '原始页面', value: sourcePath }
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

  shell.stageCanvas.remove();
  shell.setReadout(fallbackReadout(scene.sourcePath));
  shell.setStatus('正在加载 2D 页面...');

  const adapter = createLegacy2DAdapter({
    stageSlot: shell.stageSlot,
    sceneId: scene.id,
    sourcePath: scene.sourcePath,
    onReadout: (items) => {
      shell.setReadout(items);
    },
    onStatus: (text) => {
      shell.setStatus(text);
    }
  });

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

  shell.modeButton.addEventListener('click', () => {
    const nextMode = shell.getMode() === 'normal' ? 'presentation' : 'normal';
    shell.setMode(nextMode);
    shell.setStatus(nextMode === 'presentation' ? '演示模式已开启' : '标准模式已开启');
  });

  window.addEventListener('beforeunload', () => adapter.dispose());
}

boot();
