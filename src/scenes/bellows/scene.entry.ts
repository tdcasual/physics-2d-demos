import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createBellowsSim,
  type BellowsMotion,
  type BellowsParams,
  type BellowsState
} from './scene.sim';
import { createBellowsView } from './scene.view';

export type CreateBellowsSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: BellowsState) => void;
};

function valveReadout(open: boolean, role: 'exhaust' | 'intake'): string {
  if (!open) return '闭合';
  return role === 'exhaust' ? '开·排气' : '开·进气';
}

export function createBellowsScene(options: CreateBellowsSceneOptions = {}) {
  const sim = createBellowsSim();
  const view = createBellowsView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  function getReadoutItems() {
    const state = sim.getState();
    return [
      {
        key: 'direction',
        label: '动作',
        value: state.direction === 'left' ? '向左推动' : '向右拉回'
      },
      {
        key: 'leftPressure',
        label: '左室',
        value: state.leftPressure === 'high' ? '压缩升压' : '扩张降压'
      },
      {
        key: 'rightPressure',
        label: '右室',
        value: state.rightPressure === 'high' ? '压缩升压' : '扩张降压'
      },
      {
        key: 'valveC',
        label: '阀 C',
        value: valveReadout(state.valves.C, 'exhaust')
      },
      {
        key: 'valveD',
        label: '阀 D',
        value: valveReadout(state.valves.D, 'exhaust')
      },
      {
        key: 'valveA',
        label: '阀 A',
        value: valveReadout(state.valves.A, 'intake')
      },
      {
        key: 'valveB',
        label: '阀 B',
        value: valveReadout(state.valves.B, 'intake')
      }
    ];
  }
  return {
    ...base,
    getState: (): BellowsState => sim.getState(),
    getSnapshot: (): BellowsState => sim.getSnapshot(),
    getParams: (): BellowsParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<BellowsParams>): BellowsParams => sim.setParams(next)
    ),
    setMotion: base.wrapAction(
      (motion: BellowsMotion): BellowsParams => sim.setMotion(motion)
    ),
    getReadoutItems
  };
}
