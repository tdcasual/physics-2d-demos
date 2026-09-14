import type { ControlsSchema } from '../../platform/controls-schema';

export const capacitorControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验状态',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 3,
          presets: [
            { id: '0', label: '断开' },
            { id: '1', label: '充电' },
            { id: '2', label: '放电' }
          ],
          initialActive: '1'
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '参数设置',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'voltage',
          columns: 3,
          label: '电源电动势 E',
          presets: [
            { id: '3', label: '3.0 V' },
            { id: '6', label: '6.0 V' },
            { id: '9', label: '9.0 V' }
          ],
          initialActive: '6'
        },
        {
          type: 'preset-group',
          key: 'resistance',
          columns: 3,
          label: '电阻值 R',
          presets: [
            { id: '10', label: '10 kΩ' },
            { id: '20', label: '20 kΩ' },
            { id: '30', label: '30 kΩ' }
          ],
          initialActive: '20'
        },
        {
          type: 'preset-group',
          key: 'capacitance',
          columns: 3,
          label: '电容量 C',
          presets: [
            { id: '100', label: '100 μF' },
            { id: '200', label: '200 μF' },
            { id: '300', label: '300 μF' }
          ],
          initialActive: '200'
        }
      ]
    },
    {
      title: '显示与复位',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showCurrent',
          label: '显示电流曲线',
          value: true
        },
        {
          type: 'button',
          key: 'reset',
          label: '重置实验曲线',
          variant: 'secondary'
        }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['τ = RC', 'Uc = E(1 − e⁻ᵗ⧸τ)', 'Q = C·Uc']
        }
      ]
    }
  ]
};
