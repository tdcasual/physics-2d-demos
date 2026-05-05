/**
 * 高精度干涉测微仪 — 控制面板 schema
 */

import type { ControlsSchema } from '../../platform/controls-schema';

export const micrometerEyepieceControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'initialReading',
          label: '初始读数',
          min: 0,
          max: 25,
          step: 0.01,
          value: 0.3,
          unit: 'mm',
        },
      ],
    },
  ],
};
