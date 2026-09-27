import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { readSceneParams } from '../../app/url-sync';
import { createSingleLoopScene } from './scene.entry';
import { singleLoopMeta } from './scene.meta';
import { asBool, type SingleLoopParams } from './scene.sim';
import {
  createSingleLoopControls,
  withSingleLoopUrlSync
} from '../../pages/single-loop-integration';

const rawInitial = readSceneParams(singleLoopMeta);
const NUMBER_KEYS = [
  'initialVelocity',
  'fieldStrength',
  'mass',
  'resistance'
] as const;

bootScenePage({
  meta: singleLoopMeta,
  autoPlay:
    rawInitial.autoRun === undefined ? true : asBool(rawInitial.autoRun, true),
  preferredLayout: 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 440,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '数据读数',
    hasGraph: true,
    graphHeight: 250,
    graphMinHeight: 180,
    graphMaxHeight: 340,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('single-loop requires a canvas');
    const scene = createSingleLoopScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return withSingleLoopUrlSync(
      {
        ...scene,
        step(dt: number): void {
          scene.step(dt);
          scheduler.schedule();
        },
        dispose(): void {
          scheduler.dispose();
          dispose();
        }
      },
      sceneWriter
    );
  },
  createControls: (options) => createSingleLoopControls(options),
  paramSync: {
    applyParam: (key, value, ctx) => {
      if ((NUMBER_KEYS as readonly string[]).includes(key)) {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ [key]: n } as Partial<SingleLoopParams>);
        ctx.setControlValue(key, n);
        return true;
      }
      if (key === 'autoRun') {
        ctx.scene.setParams({ autoRun: asBool(value, false) });
        return true;
      }
      return false;
    }
  }
});
