import type { ControlsSchema } from '../../platform/controls-schema';
export const uvtControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '运动参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'v0',
          label: '初速度 v₀',
          min: -10,
          max: 20,
          step: 1,
          value: 10,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'acceleration',
          label: '加速度 a',
          min: -4,
          max: 4,
          step: 1,
          value: -3,
          unit: 'm/s²'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'toggle', key: 'showArea', label: '显示面积', value: true }
      ]
    },
    {
      title: '结论',
      collapsed: false,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['v = v₀ + at', '图线斜率 = a', '图线面积 = 位移']
        }
      ]
    }
  ]
};
