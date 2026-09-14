import type { ControlsSchema } from '../../platform/controls-schema';
import { brownianConstants as C } from './scene.sim';
export const brownianMotionControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'temperature',
          label: '液体温度 T',
          min: C.temperatureMin,
          max: C.temperatureMax,
          step: 1,
          value: C.temperatureDefault,
          unit: '%'
        },
        {
          type: 'slider',
          key: 'particleRadius',
          label: '悬浮颗粒半径 r',
          min: C.particleMinRadius,
          max: C.particleMaxRadius,
          step: 1,
          value: C.radiusDefault,
          unit: 'μm'
        },
        {
          type: 'toggle',
          key: 'showMolecules',
          label: '显示液体分子',
          value: true
        },
        {
          type: 'toggle',
          key: 'showTrail',
          label: '保留运动轨迹',
          value: true
        },
        {
          type: 'toggle',
          key: 'showForce',
          label: '显示瞬时受力箭头',
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
          lines: ['布朗运动不是分子运动', '碰撞不平衡 → 粒子无规则运动']
        }
      ]
    }
  ]
};
