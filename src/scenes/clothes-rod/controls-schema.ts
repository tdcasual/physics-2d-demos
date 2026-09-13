import type { ControlsSchema } from '../../platform/controls-schema';
import { clothesRodConstants } from './scene.sim';
export const clothesRodControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'model',
          columns: 2,
          presets: [
            { id: 'smooth', label: '光滑活结 · 等张力' },
            { id: 'fixed', label: '固定死结 · 分段受力' }
          ],
          initialActive: 'smooth'
        }
      ]
    },
    {
      title: '几何与物理参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'distance',
          label: '两杆间距 d',
          min: clothesRodConstants.distanceMin,
          max: clothesRodConstants.distanceMax,
          step: 0.5,
          value: clothesRodConstants.defaultDistance,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'length',
          label: '绳子总长 L',
          min: clothesRodConstants.lengthMin,
          max: clothesRodConstants.lengthMax,
          step: 0.5,
          value: clothesRodConstants.defaultLength,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'height',
          label: 'B 端竖直位移',
          min: clothesRodConstants.heightMin,
          max: clothesRodConstants.heightMax,
          step: 0.1,
          value: clothesRodConstants.defaultHeight,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'weight',
          label: '悬挂重物 G',
          min: clothesRodConstants.weightMin,
          max: clothesRodConstants.weightMax,
          step: 5,
          value: clothesRodConstants.defaultWeight,
          unit: 'N'
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
          lines: ['sinθ = d / L', '2T cosθ = G', '光滑活结：T₁ = T₂']
        }
      ]
    }
  ]
};
