import type { ControlsSchema } from '../../platform/controls-schema';

export const freeFallControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '初速度',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'initialSpeed',
          columns: 3,
          initialActive: '20',
          presets: [
            { id: '10', label: '10 m/s' },
            { id: '20', label: '20 m/s' },
            { id: '30', label: '30 m/s' }
          ]
        }
      ]
    },
    {
      title: '运动模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'compare',
          presets: [
            { id: 'compare', label: '分段对照' },
            { id: 'single', label: '单球全程' },
            { id: 'reverse', label: '上升段倒放' }
          ]
        },
        {
          type: 'slider',
          key: 'timeProgress',
          label: '时间进度',
          min: 0,
          max: 1,
          step: 0.01,
          value: 0,
          unit: ''
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showVelocity', label: '速度箭头', value: true },
        { type: 'toggle', key: 'showHeight', label: '高度标线', value: true },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'reset', label: '重置', variant: 'secondary' }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['v = v₀ − gt', 'h = v₀t − ½gt²', 't上 = v₀/g']
        }
      ]
    }
  ]
};
