import type { ControlsSchema } from '../../platform/controls-schema';
import { bindingEnergyConstants as C } from './scene.sim';

export const bindingEnergyControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '核素',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 2,
          presets: [
            { id: 'he4', label: 'He-4' },
            { id: 'c12', label: 'C-12' },
            { id: 'fe56', label: 'Fe-56' },
            { id: 'u235', label: 'U-235' },
            { id: 'u238', label: 'U-238' }
          ],
          initialActive: 'u238'
        }
      ]
    },
    {
      title: '显示',
      collapsed: false,
      fields: [
        { type: 'toggle', key: 'autoRun', label: '自动巡游', value: true },
        {
          type: 'toggle',
          key: 'showRegions',
          label: '聚变 / 裂变',
          value: true
        }
      ]
    },
    {
      title: '质量数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'A',
          label: 'A',
          min: C.aMin,
          max: C.aMax,
          step: 1,
          value: C.aDefault
        }
      ]
    },
    {
      title: '要点',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'formula',
          lines: [
            'E = A × (E/A)',
            '比结合能大才更稳定',
            '轻核聚变、重核裂变都趋向铁',
            '← → 切换核素'
          ]
        }
      ]
    }
  ]
};
