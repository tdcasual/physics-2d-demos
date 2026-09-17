import type { ControlsSchema } from '../../platform/controls-schema';

export const rodModelControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'model',
          columns: 2,
          initialActive: 'resistor',
          presets: [
            { id: 'resistor', label: '纯电阻棒' },
            { id: 'capacitor', label: '纯电容棒' }
          ]
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'fieldStrength',
          label: 'B',
          min: 0.2,
          max: 3,
          step: 0.1,
          value: 1,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'railGap',
          label: 'L',
          min: 0.5,
          max: 2,
          step: 0.1,
          value: 1,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'externalForce',
          label: 'F',
          min: 0.5,
          max: 6,
          step: 0.5,
          value: 2,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'mass',
          label: 'm',
          min: 0.2,
          max: 2,
          step: 0.1,
          value: 0.5,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'resistance',
          label: 'R',
          min: 0.2,
          max: 4,
          step: 0.1,
          value: 1,
          unit: 'Ω'
        },
        {
          type: 'slider',
          key: 'capacitance',
          label: 'C',
          min: 0.1,
          max: 2,
          step: 0.1,
          value: 0.5,
          unit: 'F'
        }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            '电阻棒：γ=B²L²/R，m dv/dt=F−γv，vₘ=F/γ',
            '电容棒：a=F/(m+B²L²C)'
          ]
        }
      ]
    }
  ]
};
