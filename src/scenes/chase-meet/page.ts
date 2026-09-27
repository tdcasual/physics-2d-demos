import '../../styles/scene/chase-modern.css';
import { bootScenePage } from '../../app/scene-bootstrapper';
import type { ReadoutItem } from '../../app/layouts/types';
import type { TeachingMode } from '../../platform/standards';
import { chaseMeetMeta } from './scene.meta';
import { createChaseMeetScene } from './scene.entry';
import { chaseMeetControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { ChaseMeetSnapshot, ChaseMeetParams } from './scene.sim';

function formatReadout(
  snapshot: ChaseMeetSnapshot,
  isPlaying: boolean,
  mode: TeachingMode
): ReadoutItem[] {
  return [
    {
      key: 'mode',
      label: '显示模式',
      value: mode === 'presentation' ? '演示模式' : '标准模式'
    },
    {
      key: 'playing',
      label: '动画状态',
      value: isPlaying ? '运行中' : '已暂停'
    },
    { key: 't', label: '当前时间', value: `${snapshot.state.t.toFixed(2)} s` },
    {
      key: 'distance',
      label: '当前距离',
      value: `${snapshot.state.distance.toFixed(2)} m`
    },
    { key: 'meet', label: '相遇信息', value: snapshot.state.meetMessage },
    {
      key: 'T-dt',
      label: 'T / Δt',
      value: `${snapshot.params.totalTime.toFixed(2)} / ${snapshot.params.dt.toFixed(3)}`
    },
    { key: 'vA', label: 'vA(t)', value: snapshot.params.vExprA },
    { key: 'vB', label: 'vB(t)', value: snapshot.params.vExprB }
  ];
}

bootScenePage({
  meta: chaseMeetMeta,
  createScene: ({ canvas, slots, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('chase-meet requires a canvas render surface');
    const stageSlot = canvas.parentElement;
    if (!stageSlot) {
      throw new Error('Missing animation container for chase-meet');
    }

    const layoutId = stageSlot
      .closest('[data-layout-id]')
      ?.getAttribute('data-layout-id');
    const graphSlot =
      layoutId === 'mobile-stack' && slots.graph ? slots.graph : undefined;

    const scene = createChaseMeetScene({
      stageSlot,
      graphSlot,
      mode,
      demoHints,
      theme,
      onReadout: () => {}
    });

    let currentMode = mode;
    let isPlaying = false;

    const originalSetParams = scene.setParams.bind(scene);
    const originalReset = scene.reset.bind(scene);
    const originalSetMode = scene.setMode.bind(scene);

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
      setMode(m: 'normal' | 'presentation', hints?: unknown) {
        currentMode = m;
        originalSetMode(m, hints as Parameters<typeof scene.setMode>[1]);
      },
      setParams(next: Partial<ChaseMeetParams>) {
        const result = originalSetParams(next);
        originalReset();
        scene.render();
        return result;
      },
      startAll() {
        isPlaying = true;
        scene.render();
      },
      pauseAll() {
        isPlaying = false;
        scene.render();
      },
      reset() {
        isPlaying = false;
        originalReset();
      },
      attachStageSlot(slot: HTMLElement) {
        scene.attachStageSlot(slot);
      },
      attachGraphSlot(slot: HTMLElement) {
        scene.attachGraphSlot(slot);
      },
      reattach({ container, slots: nextSlots }) {
        scene.attachStageSlot(container);
        const nextLayoutId = container
          .closest('[data-layout-id]')
          ?.getAttribute('data-layout-id');
        if (nextLayoutId === 'mobile-stack' && nextSlots.graph) {
          scene.attachGraphSlot(nextSlots.graph);
        }
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
          scene.setParams({ vExprA: '2', vExprB: '1', x0A: 0, x0B: 10 });
          onStatus?.('应用预设: 匀速追赶');
        } else if (key === 'accelerated') {
          renderer.setValue('vExprA', '0.5*t');
          renderer.setValue('vExprB', '2');
          renderer.setValue('x0A', 0);
          renderer.setValue('x0B', 15);
          scene.setParams({ vExprA: '0.5*t', vExprB: '2', x0A: 0, x0B: 15 });
          onStatus?.('应用预设: 加速追赶');
        }
      }
    });

    return exposeSchemaHandle(renderer);
  },
  preferredLayout: 'split-right',
  // hasGraph 仅 mobile-stack 打开：桌面图在舞台内，移动端用 graph 槽。
  layoutConfig: {
    defaultLeftRatio: 0.32,
    hasGraph: false,
    layoutOverrides: {
      'mobile-stack': { hasGraph: true }
    },
    controlColumns: 'auto',
    readoutCollapsed: true
  }
});
