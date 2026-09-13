import type { ControlsSchema } from '../../platform/controls-schema';

export const displacementTimeControlsSchema: ControlsSchema = {
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
          value: 5,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'acceleration',
          label: '加速度 a',
          min: -6,
          max: 6,
          step: 1,
          value: 4,
          unit: 'm/s²'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showArea', label: '显示面积', value: true },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['v = v₀ + at', 'x = v₀t + ½at²', '图像面积 = 位移']
        }
      ]
    }
  ]
};
