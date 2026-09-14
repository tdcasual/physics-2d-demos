import type { ControlsSchema } from '../../platform/controls-schema';

export const electrostaticInductionControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 3,
          initialActive: 'separate',
          presets: [
            { id: 'separate', label: '分离导体' },
            { id: 'grounding', label: '接地起电' },
            { id: 'equilibrium', label: '静电平衡' }
          ]
        }
      ]
    },
    {
      title: '带电棒',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'rodPolarity',
          columns: 2,
          initialActive: 'positive',
          presets: [
            { id: 'positive', label: '带正电 (+Q)' },
            { id: 'negative', label: '带负电 (−Q)' }
          ]
        }
      ]
    },
    {
      title: '实验动作',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'actions',
          columns: 2,
          buttons: [
            { key: 'approach', label: '靠近棒' },
            { key: 'separate', label: '分离 / 接地' },
            { key: 'moveRod', label: '移开棒' },
            { key: 'reset', label: '复位' }
          ]
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showCharges',
          label: '显示微观电荷',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    }
  ]
};
