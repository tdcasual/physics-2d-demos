import type { ControlsSchema } from '../../platform/controls-schema';

export const bellowsControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '机械动作',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'motion',
          columns: 3,
          presets: [
            { id: 'auto', label: '自动往复' },
            { id: 'left', label: '向左推动' },
            { id: 'right', label: '向右拉回' }
          ],
          initialActive: 'auto'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showFlow', label: '显示气流', value: true }
      ]
    },
    {
      title: '要点',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: ['压缩端排气，扩张端进气']
        }
      ]
    }
  ]
};
