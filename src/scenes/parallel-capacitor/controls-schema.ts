import type { ControlsSchema } from '../../platform/controls-schema';
import { parallelCapacitorConstants } from './scene.sim';
export const parallelCapacitorControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '探究预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'probe',
          columns: 3,
          presets: [
            { id: 'area', label: '探究面积 S' },
            { id: 'distance', label: '探究距离 d' },
            { id: 'dielectric', label: '探究介质 εᵣ' }
          ],
          initialActive: 'area'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'distance',
          label: '极板距离 d',
          min: parallelCapacitorConstants.distanceMin,
          max: parallelCapacitorConstants.distanceMax,
          step: 0.5,
          value: parallelCapacitorConstants.defaultDistance,
          unit: 'cm'
        },
        {
          type: 'slider',
          key: 'area',
          label: '正对面积 S',
          min: parallelCapacitorConstants.areaMin,
          max: parallelCapacitorConstants.areaMax,
          step: 0.05,
          value: parallelCapacitorConstants.defaultArea,
          unit: '×'
        },
        {
          type: 'slider',
          key: 'dielectric',
          label: '相对介电常数 εᵣ',
          min: parallelCapacitorConstants.dielectricMin,
          max: parallelCapacitorConstants.dielectricMax,
          step: 0.1,
          value: parallelCapacitorConstants.defaultDielectric
        }
      ]
    },
    {
      title: '公式',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['C ∝ εᵣS / d', 'Q 不变：U = Q / C', 'θ 变大 ⇒ C 变小']
        }
      ]
    }
  ]
};
