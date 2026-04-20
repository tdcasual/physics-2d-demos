import type { ControlsSchema } from '../../platform/controls-schema';

export const projectileControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'v0',
          label: 'v₀',
          min: 0,
          max: 80,
          step: 0.5,
          value: 30,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'theta',
          label: 'θ',
          min: 0,
          max: 90,
          step: 0.1,
          value: 45,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'h0',
          label: 'h₀',
          min: 0,
          max: 50,
          step: 0.5,
          value: 0,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'g',
          label: 'g',
          min: 1.6,
          max: 20,
          step: 0.1,
          value: 9.8,
          unit: 'm/s²'
        },
        {
          type: 'slider',
          key: 'c',
          label: 'c',
          min: 0,
          max: 0.5,
          step: 0.001,
          value: 0,
          unit: ''
        }
      ]
    },
    {
      title: '环境预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          label: '环境预设',
          columns: 2,
          presets: [
            { id: 'earth', label: '地球', desc: 'g=9.8' },
            { id: 'moon', label: '月球', desc: 'g=1.6' },
            { id: 'mars', label: '火星', desc: 'g=3.7' },
            { id: 'wind', label: '强风', desc: '阻力' }
          ],
          initialActive: 'earth'
        }
      ]
    }
  ]
};
