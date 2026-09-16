import type { ControlsSchema } from '../../platform/controls-schema';

export const emfInternalControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验操作',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'actions',
          columns: 2,
          buttons: [
            { key: 'toggleSwitch', label: '开关' },
            { key: 'record', label: '记录' },
            { key: 'fit', label: '拟合' },
            { key: 'clear', label: '清除' }
          ]
        }
      ]
    },
    {
      title: '电源模型',
      collapsed: false,
      fields: [
        {
          type: 'select',
          key: 'sourceVoltage',
          label: '电动势 E',
          value: '1.5',
          options: [
            { label: '1.50 V', value: '1.5' },
            { label: '3.00 V', value: '3' },
            { label: '6.00 V', value: '6' }
          ]
        },
        {
          type: 'select',
          key: 'internalResistance',
          label: '内阻 r',
          value: '0.5',
          options: [
            { label: '0.50 Ω', value: '0.5' },
            { label: '1.00 Ω', value: '1' },
            { label: '2.00 Ω', value: '2' }
          ]
        },
        {
          type: 'slider',
          key: 'rheostatResistance',
          label: '变阻器 R',
          min: 1,
          max: 15,
          step: 0.5,
          value: 5,
          unit: 'Ω'
        }
      ]
    },
    {
      title: '读数设置',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'systematicError',
          label: '电压表分流',
          value: false
        },
        { type: 'toggle', key: 'autoRun', label: '电子流动', value: true }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'U = E − Ir',
            '纵截距为 E，斜率绝对值为 r',
            '电压表分流：E测、r测偏小'
          ]
        }
      ]
    }
  ]
};
