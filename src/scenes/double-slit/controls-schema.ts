import type { ControlsSchema } from '../../platform/controls-schema';

const lightSourceSection = {
  title: '光源',
  collapsed: false,
  span: 'full' as const,
  fields: [
    {
      type: 'slider' as const,
      key: 'lambda',
      label: '波长',
      min: 400,
      max: 700,
      step: 1,
      value: 532,
      unit: 'nm'
    }
  ]
};

const paramsSection = {
  title: '参数',
  collapsed: false,
  fields: [
    {
      type: 'slider' as const,
      key: 'slitDistance',
      label: '双缝间距 (d)',
      min: 10,
      max: 50,
      step: 1,
      value: 20,
      unit: '0.01mm'
    }
  ]
};

const stepPresets = [
  { id: '1', label: '1. 光源与透镜' },
  { id: '2', label: '2. 单缝衍射' },
  { id: '3', label: '3. 双缝波前分裂' },
  { id: '4', label: '4. 空间干涉与叠加' },
  { id: '5', label: '5. 毛玻璃上的条纹' },
  { id: '6', label: '6. 目镜观察' }
];

const instrumentSection = {
  title: '测量仪器',
  collapsed: false,
  fields: [
    {
      type: 'preset-group' as const,
      key: 'activeInstrument',
      columns: 2 as const,
      presets: [
        { id: 'caliper', label: '干涉读数游标卡尺' },
        { id: 'micrometer', label: '高精度干涉测微仪' }
      ],
      initialActive: 'caliper'
    },

    {
      type: 'slider' as const,
      key: 'stripeOffset',
      label: '十字准星位移',
      min: 0,
      max: 32,
      step: 0.01,
      value: 12,
      unit: 'mm'
    }
  ]
};

// 步骤 1–5 的 schema
export const doubleSlitControlsSchema: ControlsSchema = {
  sections: [
    lightSourceSection,
    paramsSection,
    {
      title: '实验步骤',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'step',
          columns: 2,
          presets: stepPresets,
          initialActive: '1'
        }
      ]
    }
  ]
};

// 步骤 6 的 schema（新增仪器选择）
export const doubleSlitStep6ControlsSchema: ControlsSchema = {
  sections: [
    lightSourceSection,
    paramsSection,
    {
      title: '实验步骤',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'step',
          columns: 2,
          presets: stepPresets,
          initialActive: '6'
        }
      ]
    },
    instrumentSection
  ]
};
