/**
 * 高精度干涉测微仪 — 控制面板 schema
 */

import type { ControlsSchema } from '../../platform/controls-schema';

export const micrometerEyepieceControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '读数参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'initialReading',
          label: '初始读数',
          min: 0,
          max: 32,
          step: 0.01,
          value: 0.3,
          unit: 'mm',
        },
      ],
    },
    {
      title: '干涉条纹',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'stripeOffset',
          label: '十字准星偏移',
          min: -2000,
          max: 0,
          step: 10,
          value: -1200,
          unit: 'px',
        },
        {
          type: 'slider',
          key: 'stripeSpacing',
          label: '条纹间距',
          min: 20,
          max: 100,
          step: 1,
          value: 50,
          unit: 'px',
        },
        {
          type: 'text',
          key: 'stripeColor',
          label: '条纹颜色',
          value: 'rgba(200, 80, 20, 0.4)',
        },
        {
          type: 'slider',
          key: 'stripeAngle',
          label: '条纹角度',
          min: 0,
          max: 180,
          step: 1,
          value: 90,
          unit: '°',
        },
      ],
    },
  ],
};
