import type { ControlsSchema } from '../../platform/controls-schema';
import { chargedParticleElectricConstants } from './scene.sim';

export const chargedParticleElectricControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '粒子模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'particle',
          columns: 3,
          presets: [
            { id: 'proton', label: '质子 p' },
            { id: 'alpha', label: 'α 粒子' },
            { id: 'electron', label: '电子' }
          ],
          initialActive: 'proton'
        }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'accelVoltage',
          label: '加速电压 U₁',
          min: chargedParticleElectricConstants.accelVoltageMin,
          max: chargedParticleElectricConstants.accelVoltageMax,
          step: 10,
          value: chargedParticleElectricConstants.defaultAccelVoltage,
          unit: 'V'
        },
        {
          type: 'slider',
          key: 'deflectVoltage',
          label: '偏转电压 U₂',
          min: chargedParticleElectricConstants.deflectVoltageMin,
          max: chargedParticleElectricConstants.deflectVoltageMax,
          step: 10,
          value: chargedParticleElectricConstants.defaultDeflectVoltage,
          unit: 'V'
        },
        {
          type: 'slider',
          key: 'plateGap',
          label: '极板间距 d',
          min: chargedParticleElectricConstants.plateGapMin,
          max: chargedParticleElectricConstants.plateGapMax,
          step: 1,
          value: chargedParticleElectricConstants.defaultPlateGap,
          unit: 'cm'
        },
        {
          type: 'toggle',
          key: 'showComponents',
          label: '速度分解',
          value: true
        },
        {
          type: 'toggle',
          key: 'showReverse',
          label: '反向延长线',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '自动播放', value: true }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['|q|U₁ = ½mv₀²', 'F = |q|U₂/d', '|y| = |U₂|L²/(4dU₁)']
        }
      ]
    }
  ]
};
