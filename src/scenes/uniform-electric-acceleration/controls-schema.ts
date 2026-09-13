import type { ControlsSchema } from '../../platform/controls-schema';
import { uniformElectricAccelerationConstants } from './scene.sim';

export const uniformElectricAccelerationControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '实验参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'voltage',
          label: '极板电压 U',
          min: uniformElectricAccelerationConstants.voltageMin,
          max: uniformElectricAccelerationConstants.voltageMax,
          step: 5,
          value: uniformElectricAccelerationConstants.defaultVoltage,
          unit: 'V'
        },
        {
          type: 'slider',
          key: 'plateGap',
          label: '极板间距 d',
          min: uniformElectricAccelerationConstants.plateGapMin,
          max: uniformElectricAccelerationConstants.plateGapMax,
          step: 1,
          value: uniformElectricAccelerationConstants.defaultPlateGap,
          unit: 'cm'
        },
        {
          type: 'slider',
          key: 'charge',
          label: '电荷量 q',
          min: uniformElectricAccelerationConstants.chargeMin,
          max: uniformElectricAccelerationConstants.chargeMax,
          step: 0.5,
          value: uniformElectricAccelerationConstants.defaultCharge,
          unit: 'e'
        },
        {
          type: 'slider',
          key: 'mass',
          label: '质量 m',
          min: uniformElectricAccelerationConstants.massMin,
          max: uniformElectricAccelerationConstants.massMax,
          step: 0.5,
          value: uniformElectricAccelerationConstants.defaultMass,
          unit: 'mₚ'
        }
      ]
    },
    {
      title: '实验状态',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'presets',
          columns: 3,
          buttons: [
            { key: 'narrow', label: '窄间距 d=6' },
            { key: 'wide', label: '宽间距 d=18' },
            { key: 'reset', label: '重置' }
          ]
        },
        { type: 'toggle', key: 'showVectors', label: '显示矢量', value: true },
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
          lines: ['E = U/d', 'F = qE', 'W = qU = ½mv²']
        }
      ]
    }
  ]
};
