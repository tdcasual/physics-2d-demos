import type { ControlsSchema } from '../../platform/controls-schema';
export const wedgeFilmInterferenceControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '厚度分布',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'profile',
          columns: 2,
          initialActive: 'linear',
          presets: [
            { id: 'linear', label: '均匀变化' },
            { id: 'quad', label: '非均匀变化' }
          ]
        }
      ]
    },
    {
      title: '光源与薄膜',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'lambda',
          label: '波长 λ',
          min: 400,
          max: 700,
          step: 1,
          value: 550,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'dTop',
          label: '顶厚',
          min: 0,
          max: 1000,
          step: 10,
          value: 0,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'dBottom',
          label: '底厚',
          min: 100,
          max: 2000,
          step: 10,
          value: 800,
          unit: 'nm'
        },
        {
          type: 'slider',
          key: 'n',
          label: '折射率 n',
          min: 1,
          max: 2.5,
          step: 0.05,
          value: 1.5,
          unit: ''
        },
        {
          type: 'slider',
          key: 'cursorY',
          label: '观察位置',
          min: 0,
          max: 100,
          step: 1,
          value: 50,
          unit: '%'
        }
      ]
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动扫描', value: true }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Δ = 2nd + λ/2', '明暗随厚度改变']
        }
      ]
    }
  ]
};
