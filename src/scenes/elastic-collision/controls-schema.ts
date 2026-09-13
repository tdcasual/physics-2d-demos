import type { ControlsSchema } from '../../platform/controls-schema';
import { collisionConstants } from './scene.sim';
export const collisionControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '小球 A 参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'massA',
          label: '质量 mₐ',
          min: collisionConstants.massMin,
          max: collisionConstants.massMax,
          step: 1,
          value: 5,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'velocityA',
          label: '初速 vₐ',
          min: collisionConstants.velocityMin,
          max: collisionConstants.velocityMax,
          step: 0.5,
          value: 5,
          unit: 'm/s'
        }
      ]
    },
    {
      title: '小球 B 参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'massB',
          label: '质量 mᵦ',
          min: collisionConstants.massMin,
          max: collisionConstants.massMax,
          step: 1,
          value: 4,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'velocityB',
          label: '初速 vᵦ',
          min: collisionConstants.velocityMin,
          max: collisionConstants.velocityMax,
          step: 0.5,
          value: -5,
          unit: 'm/s'
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'reset',
          label: '重置并重新碰撞',
          variant: 'primary'
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
          lines: ['总动量守恒 · 总动能守恒', '恢复系数 e = 1']
        }
      ]
    }
  ]
};
