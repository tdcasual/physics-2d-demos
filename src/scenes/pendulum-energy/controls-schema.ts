import type { ControlsSchema } from '../../platform/controls-schema';
import { pendulumEnergyConstants } from './scene.sim';

export const pendulumEnergyControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '摆动参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'amplitude',
          label: '初始释放角 θ',
          min: pendulumEnergyConstants.amplitudeMin,
          max: pendulumEnergyConstants.amplitudeMax,
          step: 1,
          value: pendulumEnergyConstants.defaultAmplitude,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'length',
          label: '摆线长度 L',
          min: pendulumEnergyConstants.lengthMin,
          max: pendulumEnergyConstants.lengthMax,
          step: 0.1,
          value: pendulumEnergyConstants.defaultLength,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'gravity',
          label: '重力加速度 g',
          min: pendulumEnergyConstants.gravityMin,
          max: pendulumEnergyConstants.gravityMax,
          step: 0.1,
          value: pendulumEnergyConstants.defaultGravity,
          unit: 'm/s²'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '摆球质量 m',
          min: pendulumEnergyConstants.massMin,
          max: pendulumEnergyConstants.massMax,
          step: 0.01,
          value: pendulumEnergyConstants.defaultMass,
          unit: 'kg'
        }
      ]
    },
    {
      title: '实验控制',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'airDrag',
          label: '空气阻力（模拟耗散）',
          value: false
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true },
        { type: 'button', key: 'reset', label: '重置', variant: 'secondary' }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Eₚ = mgh', 'Eₖ = ½mv²', 'E机械 = Eₚ + Eₖ']
        }
      ]
    }
  ]
};
