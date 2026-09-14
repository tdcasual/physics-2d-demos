import type { ControlsSchema } from '../../platform/controls-schema';
import { electrostaticShieldingConstants as C } from './scene.sim';

export const electrostaticShieldingControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验环境',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'externalField',
          label: '施加外部电场 E₀',
          value: true
        },
        {
          type: 'toggle',
          key: 'cavityCharge',
          label: '腔内放入点电荷 +q',
          value: true
        },
        {
          type: 'slider',
          key: 'cavityChargeValue',
          label: '内部电荷量 +q',
          min: C.cavityChargeMin,
          max: C.cavityChargeMax,
          step: 0.5,
          value: C.cavityChargeDefault,
          unit: 'q'
        },
        {
          type: 'toggle',
          key: 'grounded',
          label: '导体外壳接地（V=0）',
          value: true
        },
        {
          type: 'toggle',
          key: 'showGaussian',
          label: '开启高斯定理分析',
          value: true
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'slowMode', label: '慢速模式', value: false },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'reset', label: '复位', variant: 'secondary' }
      ]
    },
    {
      title: '结论',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            '导体内部 E = 0',
            '腔内 +q 感应 −q',
            '接地使外部不受腔内电荷影响'
          ]
        }
      ]
    }
  ]
};
