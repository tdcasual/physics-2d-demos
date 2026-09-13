import type { ControlsSchema } from '../../platform/controls-schema';
import { alternatingElectricFieldConstants } from './scene.sim';

export const alternatingElectricFieldControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '电场参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'voltageAmplitude',
          label: '电压幅值 U₀',
          min: alternatingElectricFieldConstants.voltageAmplitudeMin,
          max: alternatingElectricFieldConstants.voltageAmplitudeMax,
          step: 10,
          value: alternatingElectricFieldConstants.defaultVoltageAmplitude,
          unit: 'V'
        },
        {
          type: 'slider',
          key: 'period',
          label: '周期 T',
          min: alternatingElectricFieldConstants.periodMin,
          max: alternatingElectricFieldConstants.periodMax,
          step: 0.5,
          value: alternatingElectricFieldConstants.defaultPeriod,
          unit: 's'
        },
        {
          type: 'slider',
          key: 'plateGap',
          label: '极板间距 d',
          min: alternatingElectricFieldConstants.plateGapMin,
          max: alternatingElectricFieldConstants.plateGapMax,
          step: 1,
          value: alternatingElectricFieldConstants.defaultPlateGap,
          unit: 'cm'
        },
        {
          type: 'slider',
          key: 'phaseOffset',
          label: '射入相位 t₀/T',
          min: alternatingElectricFieldConstants.phaseOffsetMin,
          max: alternatingElectricFieldConstants.phaseOffsetMax,
          step: 0.125,
          value: alternatingElectricFieldConstants.defaultPhaseOffset,
          unit: 'T'
        }
      ]
    },
    {
      title: '粒子与状态',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'charge',
          columns: 2,
          presets: [
            { id: 'electron', label: '电子（−q）' },
            { id: 'positive', label: '正离子（+q）' }
          ],
          initialActive: 'electron'
        },
        {
          type: 'button-grid',
          key: 'presets',
          columns: 3,
          buttons: [
            { key: 'start', label: 't₀=0' },
            { key: 'quarter', label: 't₀=T/4' },
            { key: 'reverse', label: 't₀=3T/8' }
          ]
        },
        { type: 'toggle', key: 'showFieldLines', label: '电场线', value: true },
        {
          type: 'toggle',
          key: 'showVelocityVector',
          label: '速度力矢量',
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
          lines: ['a = qU/(md)', 'Δv = ∫a dt', 'x = ∫v dt']
        }
      ]
    }
  ]
};
