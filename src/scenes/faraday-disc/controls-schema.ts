import type { ControlsSchema } from '../../platform/controls-schema';

export const faradayControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '场景',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'rotation',
          columns: 2,
          presets: [
            { id: 'cw', label: '顺时针' },
            { id: 'ccw', label: '逆时针' }
          ],
          initialActive: 'cw'
        },
        {
          type: 'preset-group',
          key: 'field',
          columns: 2,
          presets: [
            { id: 'into', label: 'B 垂直向里' },
            { id: 'out', label: 'B 垂直向外' }
          ],
          initialActive: 'into'
        }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'B',
          label: '磁感应强度 B',
          min: 0.2,
          max: 2,
          step: 0.2,
          value: 1,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'omega',
          label: '角速度 ω',
          min: 2,
          max: 20,
          step: 1,
          value: 10,
          unit: 'rad/s'
        },
        {
          type: 'slider',
          key: 'radius',
          label: '圆盘半径 R',
          min: 0.1,
          max: 0.4,
          step: 0.05,
          value: 0.2,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'externalResistance',
          label: '外接电阻',
          min: 0.5,
          max: 5,
          step: 0.5,
          value: 2,
          unit: 'Ω'
        }
      ]
    },
    {
      title: '电路',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'closed', label: '闭合回路', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: false,
      fields: [
        { type: 'hint', key: 'formula', lines: ['E = ½BωR²', 'P机械 = P电热'] }
      ]
    }
  ]
};
