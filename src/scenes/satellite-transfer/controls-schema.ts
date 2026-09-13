import type { ControlsSchema } from '../../platform/controls-schema';

export const satelliteControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '轨道预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'orbit',
          columns: 2,
          initialActive: 'low',
          presets: [
            { id: 'low', label: '轨道 I（近地圆轨道）' },
            { id: 'transfer', label: '变轨转移轨道' },
            { id: 'high', label: '轨道 II（高轨圆轨道）' }
          ]
        }
      ]
    },
    {
      title: '位置探针',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'progress',
          label: '轨道位置',
          min: 0,
          max: 100,
          step: 1,
          value: 72.7,
          unit: '%'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'raise',
          label: '轨道提升（离心变轨）',
          variant: 'primary'
        },
        {
          type: 'button',
          key: 'lower',
          label: '轨道降低（向心变轨）',
          variant: 'secondary'
        },
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [{ type: 'hint', key: 'rule', lines: ['v = √(μ/r)', 'a = μ/r²'] }]
    }
  ]
};
