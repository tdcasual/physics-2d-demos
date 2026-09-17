import type { ControlsSchema } from '../../platform/controls-schema';
import { formatResistance, mechanicalEnergyConstants } from './scene.sim';

export const mechanicalEnergyControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '环境',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'environment',
          columns: 2,
          presets: [
            { id: 'resist', label: '含阻力' },
            { id: 'ideal', label: '仅重力' }
          ],
          initialActive: 'resist'
        },
        {
          type: 'slider',
          key: 'resistance',
          label: '阻力系数 k',
          min: mechanicalEnergyConstants.resistanceMin,
          max: mechanicalEnergyConstants.resistanceMax,
          step: 0.0001,
          value: mechanicalEnergyConstants.defaultResistance,
          formatValue: formatResistance
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'mass',
          label: 'm',
          min: mechanicalEnergyConstants.massMin,
          max: mechanicalEnergyConstants.massMax,
          step: 0.1,
          value: mechanicalEnergyConstants.defaultMass,
          unit: 'kg'
        },
        {
          type: 'slider',
          key: 'gravity',
          label: 'g',
          min: mechanicalEnergyConstants.gravityMin,
          max: mechanicalEnergyConstants.gravityMax,
          step: 0.1,
          value: mechanicalEnergyConstants.defaultGravity,
          unit: 'm/s²'
        },
        {
          type: 'slider',
          key: 'pointPeriod',
          label: 'T₀',
          min: mechanicalEnergyConstants.pointPeriodMin,
          max: mechanicalEnergyConstants.pointPeriodMax,
          step: 0.02,
          value: mechanicalEnergyConstants.defaultPointPeriod,
          unit: 's'
        }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'a = g(1 − k)，理想时 k = 0',
            'ΔEₚ = mgh，ΔEₖ = ½mv²',
            'vₙ = (hₙ₊₁ − hₙ₋₁) / 2T₀',
            'T = 0.02 s；计数间隔 T₀ = nT'
          ]
        }
      ]
    }
  ]
};
