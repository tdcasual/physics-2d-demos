import type { ControlsSchema } from '../../platform/controls-schema';

export const singleLoopControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'initialVelocity',
          label: '初速度 v₀',
          min: 2,
          max: 20,
          step: 1,
          value: 10,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'fieldStrength',
          label: '磁感应强度 B',
          min: 0.2,
          max: 3,
          step: 0.1,
          value: 1.5,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '线框质量 m',
          min: 0.5,
          max: 4,
          step: 0.5,
          value: 2,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'resistance',
          label: '线框电阻 R',
          min: 0.5,
          max: 8,
          step: 0.5,
          value: 2,
          unit: 'Ω'
        }
      ]
    },
    {
      title: '播放',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        {
          type: 'toggle',
          key: 'showCurrent',
          label: '显示电流箭头',
          value: true
        }
      ]
    },
    {
      title: '规律',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'E = Bdv，i = E/R',
            '进入/穿出：v-x 斜率 = −B²d²/(mR)',
            '匀速区：i = 0'
          ]
        }
      ]
    }
  ]
};
