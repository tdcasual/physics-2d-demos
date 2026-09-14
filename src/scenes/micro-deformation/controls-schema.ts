import type { ControlsSchema } from '../../platform/controls-schema';
import { microDeformationConstants as C } from './scene.sim';

export const microDeformationControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '桌面材料',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'material',
          columns: 3,
          initialActive: 'wood',
          presets: [
            { id: 'wood', label: '松木板' },
            { id: 'marble', label: '大理石' },
            { id: 'steel', label: '厚钢板' }
          ]
        }
      ]
    },
    {
      title: '加载砝码',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'loadKg',
          columns: 4,
          initialActive: '0',
          presets: [
            { id: '0', label: '空载' },
            { id: '10', label: '+10 kg' },
            { id: '20', label: '+20 kg' },
            { id: '50', label: '+50 kg' }
          ]
        },
        {
          type: 'slider',
          key: 'mirrorGap',
          label: '镜架间距 d',
          min: C.gapMin,
          max: C.gapMax,
          step: 0.01,
          value: 0.1,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'screenDistance',
          label: '光屏距离 D',
          min: C.distanceMin,
          max: C.distanceMax,
          step: 0.1,
          value: 4.5,
          unit: 'm'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'deformationMode',
          columns: 2,
          initialActive: 'physical',
          presets: [
            { id: 'physical', label: '物理真实' },
            { id: 'concept', label: '概念夸张' }
          ]
        },
        {
          type: 'toggle',
          key: 'showOpticalPath',
          label: '显示光路',
          value: true
        },
        { type: 'toggle', key: 'autoRun', label: '光斑微动', value: true }
      ]
    },
    {
      title: '关系',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: ['Δy = F / K', 'ΔY = M · Δy', 'M = 6D / d']
        }
      ]
    }
  ]
};
