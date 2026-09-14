import type { ControlsSchema } from '../../platform/controls-schema';
import { pendulumConstants } from './scene.sim';

export const pendulumControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'length',
          label: '摆长 L',
          min: pendulumConstants.lengthMin,
          max: pendulumConstants.lengthMax,
          step: 0.01,
          value: pendulumConstants.defaultLength,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'gravity',
          label: '重力加速度 g',
          min: pendulumConstants.gravityMin,
          max: pendulumConstants.gravityMax,
          step: 0.01,
          value: pendulumConstants.defaultGravity,
          unit: 'm/s²'
        },
        {
          type: 'preset-group',
          key: 'environment',
          columns: 3,
          presets: [
            { id: 'earth', label: '地球 (9.80)' },
            { id: 'moon', label: '月球 (1.63)' },
            { id: 'mars', label: '火星 (3.71)' }
          ],
          initialActive: 'earth'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '摆球质量 m',
          min: pendulumConstants.massMin,
          max: pendulumConstants.massMax,
          step: 0.01,
          value: pendulumConstants.defaultMass,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'amplitude',
          label: '初始振幅 θmax',
          min: pendulumConstants.amplitudeMin,
          max: pendulumConstants.amplitudeMax,
          step: 0.5,
          value: pendulumConstants.defaultAmplitude,
          unit: '°'
        }
      ]
    },
    {
      title: '受力与实验',
      collapsed: false,
      fields: [
        {
          type: 'toggle',
          key: 'showForces',
          label: '显示外力 G、F_T',
          value: true
        },
        {
          type: 'toggle',
          key: 'showComponents',
          label: '显示重力分量',
          value: false
        },
        {
          type: 'button',
          key: 'resetSmallAngle',
          label: '复位小角 (5°)',
          variant: 'secondary'
        },
        {
          type: 'button',
          key: 'startPhotogate',
          label: '启动光电计时',
          variant: 'primary'
        },
        {
          type: 'button',
          key: 'resetMeasurement',
          label: '重置数据',
          variant: 'secondary'
        },
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['T = 2π√(L/g)', 'g测 = 4π²L/T²', 'Gₜ = −mg·sinθ']
        }
      ]
    }
  ]
};
