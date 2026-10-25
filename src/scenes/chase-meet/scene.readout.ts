import type { ReadoutItem } from '../../platform/readout';
import type { TeachingMode } from '../../platform/standards';
import type { ChaseMeetSnapshot } from './scene.sim';

export function formatReadout(
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
    {
      key: 't',
      label: '当前时间',
      value: snapshot.state.t,
      digits: 2,
      unit: 's'
    },
    {
      key: 'distance',
      label: '当前距离',
      value: snapshot.state.distance,
      digits: 2,
      unit: 'm'
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
