import type { ControlsSchema } from '../../platform/controls-schema';

export const tickerTimerControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验步骤',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'action',
          columns: 1,
          buttons: [
            { key: 'power', label: '接通电源' },
            { key: 'release', label: '释放纸带' },
            { key: 'reset', label: '重置实验' }
          ]
        }
      ]
    },
    {
      title: '纸带运动',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'model',
          columns: 3,
          initialActive: 'ua',
          presets: [
            { id: 'uniform', label: '匀速' },
            { id: 'ua', label: '匀加速' },
            { id: 'ud', label: '匀减速' }
          ]
        },
        {
          type: 'slider',
          key: 'initialVelocity',
          label: '初速度 v₀',
          min: 0,
          max: 2,
          step: 0.1,
          value: 0.5,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'acceleration',
          label: '加速度 a',
          min: -5,
          max: 5,
          step: 0.5,
          value: 2.5,
          unit: 'm/s²'
        }
      ]
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动打点', value: true }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['T = 0.020 s', 'vₙ = (xₙ₊₁ − xₙ₋₁) / 2T', 'a = Δs / T²']
        }
      ]
    }
  ]
};
