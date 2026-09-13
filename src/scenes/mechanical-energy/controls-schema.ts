import type { ControlsSchema } from '../../platform/controls-schema';
import { mechanicalEnergyConstants } from './scene.sim';

export const mechanicalEnergyControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验环境',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'environment',
          columns: 2,
          presets: [
            { id: 'resist', label: '包含阻力', desc: 'a < g，能量耗散' },
            { id: 'ideal', label: '只有重力', desc: '机械能守恒' }
          ],
          initialActive: 'resist'
        },
        {
          type: 'slider',
          key: 'resistance',
          label: '阻力调节',
          min: mechanicalEnergyConstants.resistanceMin,
          max: mechanicalEnergyConstants.resistanceMax,
          step: 0.01,
          value: mechanicalEnergyConstants.defaultResistance
        }
      ]
    },
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'mass',
          label: '质量 m',
          min: mechanicalEnergyConstants.massMin,
          max: mechanicalEnergyConstants.massMax,
          step: 0.1,
          value: mechanicalEnergyConstants.defaultMass,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'gravity',
          label: '重力加速度 g',
          min: mechanicalEnergyConstants.gravityMin,
          max: mechanicalEnergyConstants.gravityMax,
          step: 0.1,
          value: mechanicalEnergyConstants.defaultGravity,
          unit: 'm/s²'
        },
        {
          type: 'slider',
          key: 'pointPeriod',
          label: '计数点间隔 T₀',
          min: mechanicalEnergyConstants.pointPeriodMin,
          max: mechanicalEnergyConstants.pointPeriodMax,
          step: 0.01,
          value: mechanicalEnergyConstants.defaultPointPeriod,
          unit: 's'
        }
      ]
    },
    {
      title: '实验控制',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: false },
        { type: 'button', key: 'release', label: '释放重锤' },
        { type: 'button', key: 'reset', label: '重置装置', variant: 'danger' }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['ΔEₚ = mgh', 'v = (hₙ₊₁ − hₙ₋₁) / 2T₀', 'v²/2 ∝ h']
        }
      ]
    }
  ]
};
