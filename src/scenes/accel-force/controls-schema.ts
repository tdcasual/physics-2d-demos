import type { ControlsSchema } from '../../platform/controls-schema';
export const accelForceControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '控制变量法',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          presets: [
            { id: 'force', label: 'a—F' },
            { id: 'inverseMass', label: 'a—1/M' }
          ],
          initialActive: 'force'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'cartMass',
          label: '小车质量 M',
          min: 0.2,
          max: 1,
          step: 0.05,
          value: 0.4,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'hangerMass',
          label: '槽码质量 m',
          min: 0,
          max: 0.2,
          step: 0.01,
          value: 0.03,
          unit: 'kg'
        }
      ]
    },
    {
      title: '实验',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'balanced', label: '平衡摩擦力', value: true },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['F = Ma', 'a = F/M', '控制变量，逐点记录']
        }
      ]
    }
  ]
};
