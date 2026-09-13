import type { ControlsSchema } from '../../platform/controls-schema';
export const bindingEnergyControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '核素档案',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'A',
          label: '质量数 A',
          min: 1,
          max: 238,
          step: 1,
          value: 238
        }
      ]
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动巡游', value: true },
        {
          type: 'toggle',
          key: 'showRegions',
          label: '显示裂变/聚变',
          value: true
        }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['E = A × (E/A)', '铁附近比结合能最大', '聚变、裂变均趋向铁']
        }
      ]
    }
  ]
};
