import type { ControlsSchema } from '../../platform/controls-schema';

export const jouleControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验路径',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          presets: [
            { id: 'mechanical', label: '机械功' },
            { id: 'electric', label: '电功' }
          ],
          initialActive: 'mechanical'
        },
        { type: 'toggle', key: 'autoRun', label: '自动实验', value: true }
      ]
    },
    {
      title: '系统参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'mass',
          label: '总质量 m',
          min: 10,
          max: 60,
          step: 1,
          value: 42,
          unit: ' kg'
        },
        {
          type: 'slider',
          key: 'height',
          label: '下落高度 h',
          min: 5,
          max: 20,
          step: 1,
          value: 15,
          unit: ' m'
        },
        {
          type: 'slider',
          key: 'waterMass',
          label: '水的质量 M',
          min: 1,
          max: 4,
          step: 0.1,
          value: 2,
          unit: ' kg'
        },
        {
          type: 'slider',
          key: 'voltage',
          label: '电压 U',
          min: 6,
          max: 24,
          step: 1,
          value: 12,
          unit: ' V'
        },
        {
          type: 'slider',
          key: 'current',
          label: '电流 I',
          min: 0.5,
          max: 4,
          step: 0.1,
          value: 2,
          unit: ' A'
        },
        {
          type: 'slider',
          key: 'duration',
          label: '通电时间 t',
          min: 0,
          max: 300,
          step: 0.1,
          value: 26.3,
          unit: ' s'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'matchWork',
          label: '匹配等效做功',
          variant: 'primary'
        },
        {
          type: 'button',
          key: 'reset',
          label: '重置实验',
          variant: 'secondary'
        }
      ]
    },
    {
      title: '原理',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['ΔU = W + Q', '机械：W = mgh', '电功：W = UIt', 'ΔT = W / cM']
        }
      ]
    }
  ]
};
