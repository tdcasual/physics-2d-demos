import type { ControlsSchema } from '../../platform/controls-schema';
import { binaryStarsConstants as C } from './scene.sim';

export const binaryStarsControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '质量与距离',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'm1',
          label: '星球 1 质量 m₁',
          min: C.mMin,
          max: C.mMax,
          step: 1,
          value: C.m1Default,
          unit: 'M'
        },
        {
          type: 'slider',
          key: 'm2',
          label: '星球 2 质量 m₂',
          min: C.mMin,
          max: C.mMax,
          step: 1,
          value: C.m2Default,
          unit: 'M'
        },
        {
          type: 'slider',
          key: 'distance',
          label: '星际总距离 L',
          min: C.distanceMin,
          max: C.distanceMax,
          step: 1,
          value: C.distanceDefault,
          unit: 'R'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动运行', value: true },
        { type: 'toggle', key: 'showVectors', label: '显示矢量', value: true }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['m₁r₁ = m₂r₂', 'ω₁ = ω₂', 'F = Gm₁m₂ / L²']
        }
      ]
    }
  ]
};
