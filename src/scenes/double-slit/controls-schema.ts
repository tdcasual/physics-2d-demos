import type { ControlsSchema } from '../../platform/controls-schema';

const lightModeSection = {
  title: '光源模式',
  collapsed: false,
  span: 'full' as const,
  fields: [
    {
      type: 'preset-group' as const,
      key: 'lightMode',
      columns: 2 as const,
      presets: [
        { id: 'mono', label: '单色光' },
        { id: 'white', label: '白光' }
      ],
      initialActive: 'mono'
    }
  ]
};

const filterSection = {
  title: '滤光片',
  collapsed: false,
  span: 'full' as const,
  fields: [
    {
      type: 'preset-group' as const,
      key: 'filterColor',
      columns: 3 as const,
      presets: [
        { id: 'none', label: '无滤光片' },
        { id: 'red', label: '🔴 红' },
        { id: 'orange', label: '🟠 橙' },
        { id: 'yellow', label: '🟡 黄' },
        { id: 'green', label: '🟢 绿' },
        { id: 'blue', label: '🔵 蓝' },
        { id: 'violet', label: '🟣 紫' }
      ],
      initialActive: 'none'
    }
  ]
};

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
      label: '双缝间距 d',
      min: 16,
      max: 43,
      step: 1,
      value: 20,
      unit: 'mm',
      formatValue: (value: number) => (value * 0.01).toFixed(2)
    },
    {
      type: 'slider' as const,
      key: 'L',
      label: '缝屏距 (L)',
      min: 30,
      max: 200,
      step: 1,
      value: 70,
      unit: 'cm'
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
      type: 'preset-group' as const,
      key: 'viewMode',
      columns: 2 as const,
      presets: [
        { id: 'fringe', label: '准星不动' },
        { id: 'crosshair', label: '准星移动' }
      ],
      initialActive: 'fringe'
    },

    {
      type: 'slider' as const,
      key: 'crosshairAngle',
      label: '分划板角度',
      min: 0,
      max: 90,
      step: 1,
      value: 0,
      unit: '°'
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

const wavelengthMeasurementSection = {
  title: '波长测量与计算',
  collapsed: false,
  span: 'full' as const,
  fields: [
    {
      type: 'hint' as const,
      key: 'wavelengthFormula',
      lines: [
        'λ = d·Δx/L',
        '先用仪器测量 Δx，再结合实验状态中的 d、L 计算波长并输入校验。',
        '白光模式以有效波长（滤光片中心波长）为真值。'
      ]
    },
    {
      type: 'number' as const,
      key: 'inputLambda',
      label: '计算波长 λ',
      value: 532,
      min: 380,
      max: 780,
      step: 1,
      unit: 'nm'
    },
    {
      type: 'button' as const,
      key: 'verifyLambda',
      label: '校验波长',
      variant: 'primary' as const
    }
  ]
};

// 步骤 1–5 的 schema
export const doubleSlitControlsSchema: ControlsSchema = {
  sections: [
    lightModeSection,
    filterSection,
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
    lightModeSection,
    filterSection,
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
    instrumentSection,
    wavelengthMeasurementSection
  ]
};
