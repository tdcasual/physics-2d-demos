import type { ControlsSchema } from '../../platform/controls-schema';

export const springBallControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '释放高度',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 2,
          initialActive: 'h0',
          presets: [
            { id: 'h0', label: '原长释放 (h=0)' },
            { id: 'h-x0', label: '低位 (h=x₀)' },
            { id: 'h-2x0', label: '中位 (h=2x₀)' },
            { id: 'h-3x0', label: '高位 (h=3x₀)' }
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
      title: '播放',
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
        { type: 'toggle', key: 'slow', label: '慢动作 0.3×', value: false }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['x₀ = mg/k', '最低点：x = 2x₀', '|a| = g']
        }
      ]
    }
  ]
};
