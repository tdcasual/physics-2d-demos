import type { ControlsSchema } from '../../platform/controls-schema';
import { electricDeflectionConstants } from './scene.sim';

export const electricDeflectionControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '粒子',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'particle',
          columns: 2,
          presets: [
            { id: 'electron', label: '电子 e⁻' },
            { id: 'proton', label: '质子 p⁺' }
          ],
          initialActive: 'electron'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'voltage',
          label: '偏转电压 U',
          min: electricDeflectionConstants.voltageMin,
          max: electricDeflectionConstants.voltageMax,
          step: 5,
          value: electricDeflectionConstants.defaultVoltage,
          unit: 'V'
        },
        {
          type: 'slider',
          key: 'plateGap',
          label: '极板间距 d',
          min: electricDeflectionConstants.plateGapMin,
          max: electricDeflectionConstants.plateGapMax,
          step: 1,
          value: electricDeflectionConstants.defaultPlateGap,
          unit: 'cm'
        },
        {
          type: 'slider',
          key: 'initialSpeed',
          label: '初速度 v₀',
          min: electricDeflectionConstants.speedMin,
          max: electricDeflectionConstants.speedMax,
          step: 0.5,
          value: electricDeflectionConstants.defaultInitialSpeed,
          unit: '×10⁶ m/s'
        },
        { type: 'toggle', key: 'showField', label: '显示电场', value: true },
        {
          type: 'toggle',
          key: 'showComponents',
          label: '显示分量',
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
          lines: ['E = U/d', 'y = ½at²', 'tan θ = vᵧ/v₀']
        }
      ]
    }
  ]
};
