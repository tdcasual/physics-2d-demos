import type { ControlsSchema } from '../../platform/controls-schema';
import { velocitySelectorConstants as C } from './scene.sim';

export const velocitySelectorControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '正交场参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'electricField',
          label: '电场强度 E',
          min: C.electricFieldMin,
          max: C.electricFieldMax,
          step: 0.1,
          value: C.defaultElectricField,
          unit: 'E₀'
        },
        {
          type: 'slider',
          key: 'magneticField',
          label: '磁感应强度 B',
          min: C.magneticFieldMin,
          max: C.magneticFieldMax,
          step: 0.1,
          value: C.defaultMagneticField,
          unit: 'B₀'
        },
        {
          type: 'slider',
          key: 'plateGap',
          label: '极板间距 d',
          min: C.plateGapMin,
          max: C.plateGapMax,
          step: 0.1,
          value: C.defaultPlateGap,
          unit: 'd'
        }
      ]
    },
    {
      title: '粒子状态',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'initialSpeed',
          label: '入射速度 v₀',
          min: C.initialSpeedMin,
          max: C.initialSpeedMax,
          step: 0.05,
          value: C.defaultInitialSpeed,
          unit: 'v₀*'
        },
        {
          type: 'preset-group',
          key: 'charge',
          columns: 2,
          presets: [
            { id: 'positive', label: '正电荷 +q' },
            { id: 'negative', label: '负电荷 −q' }
          ],
          initialActive: 'positive'
        },
        { type: 'toggle', key: 'showField', label: '显示场线', value: true },
        { type: 'toggle', key: 'showVectors', label: '显示受力', value: true },
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
          lines: ['Fₑ = qE', 'Fᴮ = qvB', 'v = E/B']
        }
      ]
    }
  ]
};
