import type { ControlsSchema } from '../../platform/controls-schema';

export const rodModelControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '切换回路模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'model',
          columns: 2,
          initialActive: 'resistor',
          presets: [
            { id: 'resistor', label: '纯电阻棒模型' },
            { id: 'capacitor', label: '纯电容棒模型' }
          ]
        }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'fieldStrength',
          label: '磁感应强度 B',
          min: 0.2,
          max: 3,
          step: 0.1,
          value: 1,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'railGap',
          label: '导轨间距 L',
          min: 0.5,
          max: 2,
          step: 0.1,
          value: 1,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'externalForce',
          label: '恒定外力 F',
          min: 0.5,
          max: 6,
          step: 0.5,
          value: 2,
          unit: 'N'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '导体棒质量 m',
          min: 0.2,
          max: 2,
          step: 0.1,
          value: 0.5,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'resistance',
          label: '回路总电阻 R',
          min: 0.2,
          max: 4,
          step: 0.1,
          value: 1,
          unit: 'Ω'
        },
        {
          type: 'slider',
          key: 'capacitance',
          label: '电容 C',
          min: 0.1,
          max: 2,
          step: 0.1,
          value: 0.5,
          unit: 'F'
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
          lines: ['电阻棒：a=(F−B²L²v/R)/m', '电容棒：a=F/(m+B²L²C)']
        }
      ]
    }
  ]
};
