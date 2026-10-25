import type { ReadoutItem } from '../../platform/readout';
import type { ElectrificationSnapshot } from './scene.sim';

export function formatReadout(
  snapshot: ElectrificationSnapshot
): ReadoutItem[] {
  return [
    {
      key: 'scene',
      label: '场景',
      value:
        snapshot.state.scene === 'friction'
          ? '摩擦起电'
          : snapshot.state.scene === 'induction'
            ? '感应起电'
            : '接触起电'
    },
    { key: 'next', label: '下一步动作', value: snapshot.state.nextActionLabel },
    { key: 'info', label: '说明', value: snapshot.state.explanation }
  ];
}
