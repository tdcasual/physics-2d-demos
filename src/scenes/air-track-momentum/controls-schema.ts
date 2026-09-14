import { airTrackMomentumConstants as C } from './scene.sim';
import type { ControlsSchema } from '../../platform/controls-schema';

export const airTrackMomentumControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验模式',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'mode',
          columns: 2,
          initialActive: 'conservation',
          presets: [
            { id: 'conservation', label: '动量守恒' },
            { id: 'theorem', label: '动量定理' }
          ]
        }
      ]
    },
    {
      title: '碰撞预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 2,
          initialActive: 'equalElastic',
          presets: [
            { id: 'equalElastic', label: '等质量弹性' },
            { id: 'heavyMoving', label: '大碰小' },
            { id: 'lightMoving', label: '小碰大' },
            { id: 'inelastic', label: '完全非弹性' }
          ]
        }
      ]
    },
    {
      title: '滑块参数',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'massA',
          label: '红滑块质量 mA',
          min: C.massMin,
          max: C.massMax,
          step: 0.5,
          value: 1,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'velocityA',
          label: '红滑块初速度 vA0',
          min: C.velocityMin,
          max: C.velocityMax,
          step: C.velocityStep,
          value: 1.5,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'massB',
          label: '蓝滑块质量 mB',
          min: C.massMin,
          max: C.massMax,
          step: 0.5,
          value: 1,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'velocityB',
          label: '蓝滑块初速度 vB0',
          min: C.velocityMin,
          max: C.velocityMax,
          step: C.velocityStep,
          value: 0,
          unit: 'm/s'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showVectors',
          label: '显示速度矢量',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'relaunch', label: '重新实验' },
        { type: 'button', key: 'reset', label: '复位' }
      ]
    }
  ]
};
