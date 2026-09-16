import type { ControlsSchema } from '../../platform/controls-schema';

export const springBallControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '释放',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 2,
          initialActive: 'h0',
          presets: [
            { id: 'h0', label: 'h=0' },
            { id: 'h-x0', label: 'h=x₀' },
            { id: 'h-2x0', label: 'h=2x₀' },
            { id: 'h-3x0', label: 'h=3x₀' }
          ]
        },
        {
          type: 'slider',
          key: 'releaseHeight',
          label: '高度 h',
          min: 0,
          max: 0.75,
          step: 0.05,
          value: 0,
          unit: 'm'
        }
      ]
    },
    {
      title: '运行',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'single',
          presets: [
            { id: 'single', label: '单次' },
            { id: 'continuous', label: '连续' }
          ]
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'slow', label: '慢动作', value: false }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['x₀ = mg/k = 0.25 m', 'h=0：x底 = 2x₀', '向下为正']
        }
      ]
    }
  ]
};
