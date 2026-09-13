import type { ControlsSchema } from '../../platform/controls-schema';

export const precisionToolControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模式选择',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'caliper50',
          presets: [
            { id: 'caliper10', label: '游标卡尺 (10分度)' },
            { id: 'caliper20', label: '游标卡尺 (20分度)' },
            { id: 'caliper50', label: '游标卡尺 (50分度)' },
            { id: 'micrometer', label: '螺旋测微器' }
          ]
        }
      ]
    },
    {
      title: '读数控制',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'adjustment',
          label: '滑片 / 旋钮',
          min: 0,
          max: 1,
          step: 0.01,
          value: 0.32
        },
        {
          type: 'toggle',
          key: 'showGuides',
          label: '高亮对齐基准线',
          value: true
        },
        {
          type: 'toggle',
          key: 'showReading',
          label: '显示读数解析',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            '游标：主尺 + 对齐格 × 分度值',
            '螺旋：主尺 + 微分筒 × 0.01 mm',
            '小格差值放大测量精度'
          ]
        }
      ]
    }
  ]
};
