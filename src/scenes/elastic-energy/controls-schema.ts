import type { ControlsSchema } from '../../platform/controls-schema';
import { energyConstants } from './scene.sim';

export const energyControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '经典质量关系预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 2,
          presets: [
            { id: 'equal', label: '等质量碰撞（速度交换）' },
            { id: 'heavy-light', label: '重碰轻（同向运动）' },
            { id: 'light-heavy', label: '轻碰重（反弹回退）' }
          ],
          initialActive: 'equal'
        }
      ]
    },
    {
      title: '参数精调',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'massA',
          label: 'A球质量 m₁',
          min: energyConstants.massMin,
          max: energyConstants.massMax,
          step: 1,
          value: 1,
          unit: '千克'
        },
        {
          type: 'slider',
          key: 'massB',
          label: 'B球质量 m₂',
          min: energyConstants.massMin,
          max: energyConstants.massMax,
          step: 1,
          value: 1,
          unit: '千克'
        },
        {
          type: 'slider',
          key: 'velocityA',
          label: 'A球初速度 v₁₀',
          min: energyConstants.velocityMin,
          max: energyConstants.velocityMax,
          step: 0.5,
          value: 4,
          unit: '米/秒'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'replay',
          label: '重新演示',
          variant: 'primary'
        },
        {
          type: 'toggle',
          key: 'slowMotion',
          label: '慢动作演示（0.25倍速）',
          value: false
        }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: ['动量守恒：Σp = 常数', '弹性碰撞：ΣEₖ = 常数']
        }
      ]
    }
  ]
};
