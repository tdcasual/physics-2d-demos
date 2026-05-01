import '../../styles/scene/chase-modern.css';
import { bootScenePage } from '../../app/scene-bootstrapper';
import type { ReadoutItem } from '../../app/layouts/types';
import type { TeachingMode } from '../../platform/standards';
import { chaseMeetMeta } from './scene.meta';
import { createChaseMeetScene } from './scene.entry';
import { createSceneListener } from '../../app/scene-listener';
import { chaseMeetControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { ChaseMeetSnapshot, ChaseMeetParams } from './scene.sim';

function formatReadout(
  snapshot: ChaseMeetSnapshot,
  isPlaying: boolean,
  mode: TeachingMode
): ReadoutItem[] {
  return [
    {
      label: '显示模式',
      value: mode === 'presentation' ? '演示模式' : '标准模式'
    },
    { label: '动画状态', value: isPlaying ? '运行中' : '已暂停' },
    { label: '当前时间', value: `${snapshot.state.t.toFixed(2)} s` },
    { label: '当前距离', value: `${snapshot.state.distance.toFixed(2)} m` },
    { label: '相遇信息', value: snapshot.state.meetMessage },
    {
      label: 'T / Δt',
      value: `${snapshot.params.totalTime.toFixed(2)} / ${snapshot.params.dt.toFixed(3)}`
    },
    { label: 'vA(t)', value: snapshot.params.vExprA },
    { label: 'vB(t)', value: snapshot.params.vExprB }
  ];
}

bootScenePage({
  meta: chaseMeetMeta,
  createScene: ({ canvas, slots, theme, mode, demoHints }) => {
    const stageSlot = canvas.parentElement;
    if (!stageSlot) {
      throw new Error('Missing animation container for chase-meet');
    }

    // 检测是否为移动端布局：mobile-stack 提供 graph slot
    const isMobileStack = !!slots.graph;

    const scene = createChaseMeetScene({
      stageSlot,
      graphSlot: isMobileStack ? slots.graph : undefined,
      mode,
      demoHints,
      theme,
      onReadout: () => {}
    });

    let currentMode = mode;
    let isPlaying = false;

    const originalDispose = scene.dispose.bind(scene);
    const originalSetParams = scene.setParams.bind(scene);
    const originalReset = scene.reset.bind(scene);
    const { subscribe, notify } = createSceneListener();

    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      },
      getReadoutItems() {
        return formatReadout(scene.getSnapshot(), isPlaying, currentMode);
      },
      getTransportState() {
        return { isPlaying, speed: 1 };
      },
      subscribe,
      setMode(m: 'normal' | 'presentation', hints?: unknown) {
        currentMode = m;
        scene.setMode(m, hints as Parameters<typeof scene.setMode>[1]);
        notify();
      },
      setParams(next: Partial<ChaseMeetParams>) {
        const result = originalSetParams(next);
        originalReset();
        scene.render();
        notify();
        return result;
      },
      startAll() {
        isPlaying = true;
        notify();
      },
      pauseAll() {
        isPlaying = false;
        notify();
      },
      reset() {
        isPlaying = false;
        originalReset();
        scene.render();
        notify();
      },
      dispose() {
        originalDispose();
      }
    };
  },
  createControls: ({ mount, scene, onStatus }) => {
    const renderer = renderSchema({
      mount,
      schema: chaseMeetControlsSchema,
      onChange: () => {
        // Values are read on apply; no-op here
      },
      onAction: (key) => {
        if (key === 'apply') {
          const totalTime = renderer.getValue<number>('totalTime') ?? 10;
          const dt = renderer.getValue<number>('dt') ?? 0.05;
          const x0A = renderer.getValue<number>('x0A') ?? 0;
          const x0B = renderer.getValue<number>('x0B') ?? 10;
          const vExprA = renderer.getValue<string>('vExprA') ?? '2';
          const vExprB = renderer.getValue<string>('vExprB') ?? '1';

          const next: Partial<ChaseMeetParams> = {
            totalTime: Math.max(1, Math.min(120, totalTime)),
            dt: Math.max(0.005, Math.min(1, dt)),
            x0A,
            x0B,
            vExprA,
            vExprB
          };
          scene.setParams(next);
          onStatus?.('参数已更新');
        } else if (key === 'uniform') {
          renderer.setValue('vExprA', '2');
          renderer.setValue('vExprB', '1');
          renderer.setValue('x0A', 0);
          renderer.setValue('x0B', 10);
          onStatus?.('应用预设: 匀速追赶');
        } else if (key === 'accelerated') {
          renderer.setValue('vExprA', '0.5*t');
          renderer.setValue('vExprB', '2');
          renderer.setValue('x0A', 0);
          renderer.setValue('x0B', 15);
          onStatus?.('应用预设: 加速追赶');
        }
      }
    });

    return {
      dispose: () => {
        renderer.dispose();
      }
    };
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    hasGraph: false,
    controlColumns: 1,
    readoutCollapsed: true
  }
});
