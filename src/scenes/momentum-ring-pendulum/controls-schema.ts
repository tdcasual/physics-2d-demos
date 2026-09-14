import type { ControlsSchema } from '../../platform/controls-schema';
import { ringPendulumConstants as C } from './scene.sim';
export const ringPendulumControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '物理参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'ringMass',
          label: '圆环质量 M',
          min: C.ringMassMin,
          max: C.ringMassMax,
          step: 0.1,
          value: 2,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'ballMass',
          label: '摆球质量 m',
          min: C.ballMassMin,
          max: C.ballMassMax,
          step: 0.1,
          value: 1,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'length',
          label: '摆线长度 L',
          min: C.lengthMin,
          max: C.lengthMax,
          step: 0.1,
          value: 1.5,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'angle',
          label: '释放角度 θ',
          min: C.angleMin,
          max: C.angleMax,
          step: 0.01,
          value: 0.84,
          unit: 'rad'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'showForces', label: '受力分析', value: true },
        { type: 'toggle', key: 'showTrail', label: '运动轨迹', value: true },
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    },
    {
      title: '规律',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Pₓ = MvM + mvₘx = 0', 'Eₚ + Eₖ = 常量']
        }
      ]
    }
  ]
};
