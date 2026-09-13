import type { ControlsSchema } from '../../platform/controls-schema';

export const cyclotronControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '粒子',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'particle',
          columns: 3,
          presets: [
            { id: 'proton', label: '质子' },
            { id: 'deuteron', label: '氘核' },
            { id: 'alpha', label: 'α粒子' }
          ],
          initialActive: 'proton'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'B',
          label: '磁场 B',
          min: 1,
          max: 3,
          step: 1,
          value: 3,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'U',
          label: '电压 U',
          min: 10,
          max: 50,
          step: 10,
          value: 30,
          unit: 'kV'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showField', label: '显示电场', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: false,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'T = 2πm / (qB)',
            'Eₖ,max = q²B²R² / (2m)',
            'Eₖ,max 与 U 无关'
          ]
        }
      ]
    }
  ]
};
