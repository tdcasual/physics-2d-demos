import type { ControlsSchema } from '../../platform/controls-schema';

export const projectileDataControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '视图',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          presets: [
            { id: 'trajectory', label: '轨迹分析' },
            { id: 'strobe', label: '频闪还原' }
          ],
          initialActive: 'strobe'
        },
        {
          type: 'toggle',
          key: 'showVectors',
          label: '速度分解',
          value: true
        }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'v0',
          label: '初速度 v₀',
          min: 0.5,
          max: 5,
          step: 0.1,
          value: 2,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'gravity',
          label: '重力加速度 g',
          min: 1.6,
          max: 15,
          step: 0.1,
          value: 10,
          unit: 'm/s²'
        },
        {
          type: 'slider',
          key: 'period',
          label: '频闪周期 T',
          min: 0.05,
          max: 0.3,
          step: 0.01,
          value: 0.15,
          unit: 's'
        }
      ]
    },
    {
      title: '结论',
      collapsed: false,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Δx=v₀T', 'Δ²y=gT²']
        }
      ]
    }
  ]
};
