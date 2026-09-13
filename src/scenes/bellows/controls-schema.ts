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
            { id: 'auto', label: '自动' },
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
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showFlow', label: '显示气流', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: false,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['压缩端排气', '扩张端进气', '往复运动，持续出风']
        }
      ]
    }
  ]
};
