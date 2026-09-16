import type { ControlsSchema } from '../../platform/controls-schema';

export const magneticMirrorControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '观察模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          presets: [
            { id: 'trajectory', label: '轨迹与磁场' },
            { id: 'velocity', label: '速度分解' },
            { id: 'force', label: '磁场与约束力' },
            { id: 'summary', label: '核心命题' }
          ],
          initialActive: 'trajectory'
        }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'pitchAngle',
          label: '入射角 θ',
          min: 5,
          max: 85,
          step: 1,
          value: 35,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'mirrorRatio',
          label: '磁镜比 Rₘ',
          min: 1,
          max: 10,
          step: 0.1,
          value: 6,
          unit: ''
        }
      ]
    },
    {
      title: '矢量图层',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showVelocity', label: '速度 v', value: true },
        { type: 'toggle', key: 'showField', label: '磁场 B', value: true },
        { type: 'toggle', key: 'showForce', label: '约束力 F', value: false },
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
          lines: [
            'B/B₀ = 1+(Rₘ−1)|x|⁴',
            'μ = mv⊥²/(2B)，Eₖ = ½mv²',
            'd = v∥·2πm/(qB)',
            'sin²θ·Rₘ>1 时在镜点反射'
          ]
        }
      ]
    }
  ]
};
