import type { ControlsSchema } from '../../platform/controls-schema';

export const resistorControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '控制电路接法',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'circuitMode',
          columns: 2,
          initialActive: 'divider',
          presets: [
            { id: 'divider', label: '分压接法' },
            { id: 'limiting', label: '限流接法' }
          ]
        }
      ]
    },
    {
      title: '测量接法',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'meterMode',
          columns: 2,
          initialActive: 'external',
          presets: [
            { id: 'external', label: '电流表外接' },
            { id: 'internal', label: '电流表内接' }
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
          key: 'targetResistance',
          label: '待测电阻 Rx',
          min: 5,
          max: 60,
          step: 1,
          value: 25,
          unit: 'Ω'
        },
        {
          type: 'slider',
          key: 'rheostatPosition',
          label: '滑片位置',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.9
        },
        {
          type: 'slider',
          key: 'supplyVoltage',
          label: '电源电压 E',
          min: 3,
          max: 12,
          step: 0.5,
          value: 6,
          unit: 'V'
        }
      ]
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '电子流动', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            '外接：R测 = Rx ∥ RV',
            '内接：R测 = Rx + RA',
            '分压调 U，限流调 I'
          ]
        }
      ]
    }
  ]
};
