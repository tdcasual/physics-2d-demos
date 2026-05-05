import type { ControlsSchema } from '../../platform/controls-schema';

export const micrometerControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '读数控制',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'reading',
          label: '测量读数',
          min: 0,
          max: 10,
          step: 0.001,
          value: 4.25,
          unit: 'mm'
        }
      ]
    },
    {
      title: '常见读数预设',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'preset',
          columns: 2,
          presets: [
            { id: '0.000', label: '零点校准' },
            { id: '0.500', label: '半毫米线' },
            { id: '1.000', label: '1.000 mm' },
            { id: '2.150', label: '2.150 mm' },
            { id: '3.700', label: '3.700 mm' },
            { id: '4.593', label: '4.593 mm' },
            { id: '5.620', label: '5.620 mm' },
            { id: '6.725', label: '6.725 mm' },
            { id: '8.116', label: '8.116 mm' },
            { id: '9.998', label: '9.998 mm' }
          ],
          initialActive: '4.593'
        }
      ]
    }
  ]
};
