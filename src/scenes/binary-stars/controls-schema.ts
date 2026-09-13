import type { ControlsSchema } from '../../platform/controls-schema';

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
          min: 1,
          max: 8,
          step: 1,
          value: 4,
          unit: 'M'
        },
        {
          type: 'slider',
          key: 'm2',
          label: '星球 2 质量 m₂',
          min: 1,
          max: 8,
          step: 1,
          value: 2,
          unit: 'M'
        },
        {
          type: 'slider',
          key: 'distance',
          label: '星际总距离 L',
          min: 20,
          max: 40,
          step: 1,
          value: 30,
          unit: 'R'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showVectors', label: '显示矢量', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: false,
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
