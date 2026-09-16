import type { ControlsSchema } from '../../platform/controls-schema';

export const precisionToolControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'caliper50',
          presets: [
            { id: 'caliper10', label: '卡尺 10 分度' },
            { id: 'caliper20', label: '卡尺 20 分度' },
            { id: 'caliper50', label: '卡尺 50 分度' },
            { id: 'micrometer', label: '螺旋测微器' }
          ]
        }
      ]
    },
    {
      title: '读数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'adjustment',
          label: '开口 / 旋钮',
          min: 0,
          max: 1,
          step: 0.01,
          value: 0.32
        },
        {
          type: 'toggle',
          key: 'showGuides',
          label: '对齐基准线',
          value: true
        },
        {
          type: 'toggle',
          key: 'showReading',
          label: '读数解析',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    }
  ]
};
