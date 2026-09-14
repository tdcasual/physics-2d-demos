import type { ControlsSchema } from '../../platform/controls-schema';
export const mechanicalEnergyTwoBallControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '系统参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'length',
          label: '轻杆长度 L',
          min: 0.5,
          max: 1.5,
          step: 0.1,
          value: 1,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'angle',
          label: '初始角度 θ',
          min: -1.5,
          max: 1.5,
          step: 0.1,
          value: 0.9,
          unit: 'rad'
        },
        {
          type: 'slider',
          key: 'massA',
          label: '小球 a 质量',
          min: 0.5,
          max: 3,
          step: 0.1,
          value: 1,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'massB',
          label: '小球 b 质量',
          min: 0.5,
          max: 3,
          step: 0.1,
          value: 1,
          unit: 'kg'
        }
      ]
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['x² + y² = L²', 'E = Ep + Eka + Ekb = 常量']
        }
      ]
    }
  ]
};
