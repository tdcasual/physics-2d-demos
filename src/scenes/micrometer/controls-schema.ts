import type { ControlsSchema } from '../../platform/controls-schema';
import { micrometerMeta } from './scene.meta';

export const MICROMETER_PRESET_MM: Record<string, number> = {
  zero: 0,
  'sample-a': 0.5,
  'sample-b': 1,
  'sample-c': 2.15,
  'sample-d': 3.7,
  'sample-e': 4.593,
  'sample-f': 5.62,
  'sample-g': 6.725,
  'sample-h': 8.116
};

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
          value: micrometerMeta.defaultParams.reading,
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
            { id: 'zero', label: '零点校准', presentationLabel: '零点' },
            {
              id: 'sample-a',
              label: '0.500 mm',
              presentationLabel: '样品A'
            },
            {
              id: 'sample-b',
              label: '1.000 mm',
              presentationLabel: '样品B'
            },
            {
              id: 'sample-c',
              label: '2.150 mm',
              presentationLabel: '样品C'
            },
            {
              id: 'sample-d',
              label: '3.700 mm',
              presentationLabel: '样品D'
            },
            {
              id: 'sample-e',
              label: '4.593 mm',
              presentationLabel: '样品E'
            },
            {
              id: 'sample-f',
              label: '5.620 mm',
              presentationLabel: '样品F'
            },
            {
              id: 'sample-g',
              label: '6.725 mm',
              presentationLabel: '样品G'
            },
            {
              id: 'sample-h',
              label: '8.116 mm',
              presentationLabel: '样品H'
            }
          ],
          initialActive: 'sample-e'
        }
      ]
    },
    {
      title: '读数',
      collapsed: false,
      fields: [
        {
          type: 'button',
          key: 'reveal',
          label: '显示读数',
          presentationLabel: '揭示'
        }
      ]
    }
  ]
};
