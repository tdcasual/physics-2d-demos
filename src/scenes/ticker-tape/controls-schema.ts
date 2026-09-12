import type { ControlsSchema } from '../../platform/controls-schema';

export const tickerTapeControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '纸带',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 2,
          initialActive: 'ua',
          presets: [
            { id: 'uniform', label: '匀速' },
            { id: 'ua', label: '匀加速' },
            { id: 'ud', label: '匀减速' },
            { id: 'variable', label: '变加速' }
          ]
        }
      ]
    },
    {
      title: '计数点',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'countEvery',
          label: '每 5 点取计数点',
          value: false
        },
        {
          type: 'button',
          key: 'fillRuler',
          label: '按尺填入 x'
        }
      ]
    },
    {
      title: '误差',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'noise',
          columns: 3,
          initialActive: 'off',
          presets: [
            { id: 'off', label: '无' },
            { id: 'typical', label: '典型' },
            { id: 'large', label: '偏大' }
          ]
        },
        {
          type: 'toggle',
          key: 'showA',
          label: '显示 a（逐差）',
          value: false
        }
      ]
    }
  ]
};
