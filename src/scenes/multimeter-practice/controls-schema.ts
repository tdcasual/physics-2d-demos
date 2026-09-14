import type { ControlsSchema } from '../../platform/controls-schema';

export const multimeterControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '自由测量',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 3,
          presets: [
            { id: 'resistance', label: '电阻 Ω' },
            { id: 'voltage', label: '直流电压 V' },
            { id: 'diode', label: '二极管' }
          ],
          initialActive: 'resistance'
        },
        {
          type: 'preset-group',
          key: 'target',
          columns: 2,
          presets: [
            { id: 'short', label: '短接表笔（调零）' },
            { id: 'resistor15', label: '15 Ω 电阻' },
            { id: 'resistor150', label: '150 Ω 电阻' },
            { id: 'resistor1500', label: '1.5 kΩ 电阻' },
            { id: 'diodeForward', label: '二极管正向' },
            { id: 'diodeReverse', label: '二极管反向' },
            { id: 'battery15', label: '1.5 V 电池' },
            { id: 'battery9', label: '9.0 V 电池' }
          ],
          initialActive: 'short'
        },
        {
          type: 'preset-group',
          key: 'range',
          columns: 3,
          presets: [
            { id: 'ohm1', label: 'Ω×1' },
            { id: 'ohm10', label: '×10' },
            { id: 'ohm100', label: '×100' },
            { id: 'ohm1k', label: '×1k' },
            { id: 'volt2_5', label: 'V−2.5' },
            { id: 'volt10', label: 'V−10' }
          ],
          initialActive: 'ohm1'
        }
      ]
    },
    {
      title: '表笔与调零',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'autoConnect',
          label: '自动贴合测量点',
          variant: 'primary'
        },
        {
          type: 'button',
          key: 'calibrateZero',
          label: '一键校准欧姆零点',
          variant: 'secondary'
        },
        {
          type: 'button',
          key: 'disconnect',
          label: '断开表笔',
          variant: 'secondary'
        },
        { type: 'toggle', key: 'autoRun', label: '指针微动', value: true }
      ]
    },
    {
      title: '原理',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'R = 刻度 × 倍率',
            '欧姆挡：先调零，再测量',
            '电压挡：并联接入'
          ]
        }
      ]
    }
  ]
};
