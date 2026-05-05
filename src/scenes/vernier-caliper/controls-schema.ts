import type { ControlsSchema } from '../../platform/controls-schema';

export const caliperControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '被测物品',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'objectType',
          columns: 3,
          presets: [
            { id: '0', label: '小球直径 (5.24 mm)' },
            { id: '1', label: '金属块长度 (12.36 mm)' },
            { id: '2', label: '管内径 (8.50 mm)' }
          ],
          initialActive: '0'
        }
      ]
    },
    {
      title: '仪器精度',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'precision',
          columns: 3,
          presets: [
            { id: '0.02', label: '0.02 mm' },
            { id: '0.05', label: '0.05 mm' },
            { id: '0.1', label: '0.1 mm' }
          ],
          initialActive: '0.02'
        }
      ]
    }
  ]
};
