import type { ControlsSchema } from '../../platform/controls-schema';

export const thinFilmControlsSchema: ControlsSchema = {
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
      title: '薄膜参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'd',
          label: '薄膜厚度 d',
          min: 100,
          max: 2000,
          step: 10,
          value: 500,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'n',
          label: '折射率 n',
          min: 1.0,
          max: 2.5,
          step: 0.05,
          value: 1.5,
          unit: ''
        },
        {
          type: 'slider',
          key: 'incidence',
          label: '入射角 i',
          min: 0,
          max: 60,
          step: 1,
          value: 30,
          unit: '°'
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
            { id: 'half-wave', label: '3. 半波损失' },
            { id: 'result', label: '4. 结论' }
          ],
          initialActive: 'geometry'
        }
      ]
    }
  ]
};
