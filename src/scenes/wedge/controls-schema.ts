import type { ControlsSchema } from '../../platform/controls-schema';

export const wedgeControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '光源',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'lambda',
          label: '波长',
          min: 400,
          max: 700,
          step: 1,
          value: 650,
          unit: 'nm'
        }
      ]
    },
    {
      title: '劈尖参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'theta',
          label: '劈尖角 θ',
          min: 0.001,
          max: 1.0,
          step: 0.001,
          value: 0.05,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'L',
          label: '板长 L',
          min: 1.0,
          max: 10.0,
          step: 0.5,
          value: 5.0,
          unit: 'cm'
        }
      ]
    },
    {
      title: '观察点',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'cursorX',
          label: '观察点位置',
          min: 0,
          max: 100,
          step: 1,
          value: 30,
          unit: '%'
        }
      ]
    },
    {
      title: '推导步骤',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'step',
          columns: 2,
          presets: [
            { id: 'geometry', label: '1. 几何结构' },
            { id: 'path-diff', label: '2. 光程差' },
            { id: 'equal-thickness', label: '3. 等厚线' },
            { id: 'result', label: '4. 结论' }
          ],
          initialActive: 'geometry'
        }
      ]
    }
  ]
};
