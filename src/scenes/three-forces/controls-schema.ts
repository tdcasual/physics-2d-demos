import type { ControlsSchema } from '../../platform/controls-schema';

export const threeForcesControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '性质力',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'tab',
          columns: 3,
          presets: [
            { id: 'gravity', label: '重力' },
            { id: 'friction', label: '摩擦力' },
            { id: 'spring', label: '弹力' }
          ],
          initialActive: 'gravity'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'mass',
          label: '质量 m',
          min: 1,
          max: 6,
          step: 0.5,
          value: 3,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'inclineAngle',
          label: '斜面角 θ',
          min: 10,
          max: 55,
          step: 1,
          value: 30,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'mu',
          label: '摩擦因数 μ',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.4
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        {
          type: 'toggle',
          key: 'showComponents',
          label: '显示分解',
          value: true
        }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['G = mg', 'G₁ = G sinθ', 'G₂ = G cosθ']
        }
      ]
    }
  ]
};
