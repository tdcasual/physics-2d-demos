import type { ControlsSchema } from '../../platform/controls-schema';

export const centripetalControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '系统参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'mass',
          label: '质点质量 m',
          min: 0.5,
          max: 5,
          step: 0.5,
          value: 2,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'radius',
          label: '轨道半径 r',
          min: 1,
          max: 4,
          step: 0.1,
          value: 2.5,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'angularVelocity',
          label: '角速度 ω',
          min: 0.5,
          max: 3,
          step: 0.1,
          value: 1.5,
          unit: 'rad/s'
        }
      ]
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '规律',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['v = ωr', 'aₙ = ω²r', 'Fₙ = mω²r']
        }
      ]
    }
  ]
};
