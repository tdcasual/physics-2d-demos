import type { ControlsSchema } from '../../platform/controls-schema';

export const interferenceVernierCaliperControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '读数参数',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'initialReading',
          label: '当前读数',
          min: 0,
          max: 2.1,
          step: 0.002,
          value: 1.4,
          unit: 'cm'
        },
        {
          type: 'slider',
          key: 'zeroOffset',
          label: '零位修正',
          min: -0.1,
          max: 0.1,
          step: 0.001,
          value: 0,
          unit: 'cm'
        }
      ]
    },
    {
      title: '干涉条纹',
      collapsed: true,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'fringeSpacing',
          label: '条纹间距',
          min: 8,
          max: 40,
          step: 1,
          value: 16,
          unit: 'px'
        },
        {
          type: 'slider',
          key: 'fringeBlur',
          label: '条纹模糊度',
          min: 0,
          max: 5,
          step: 0.1,
          value: 1.5,
          unit: 'px'
        },
        {
          type: 'slider',
          key: 'fringeOpacity',
          label: '条纹不透明度',
          min: 0.1,
          max: 1.0,
          step: 0.05,
          value: 0.85
        },
        {
          type: 'slider',
          key: 'fringeEnvelopeWidth',
          label: '衍射包络半宽',
          min: 100,
          max: 600,
          step: 10,
          value: 320,
          unit: 'px'
        }
      ]
    },
    {
      title: '操作说明',
      collapsed: true,
      span: 'full',
      fields: [
        {
          type: 'custom',
          key: 'hint',
          label: '',
          render(mount: HTMLElement) {
            mount.className = 'text-sm text-[#555]';
            mount.innerHTML =
              '<p>• 拖动中间滑块进行粗调，横向拖动右侧旋钮进行精确微调</p>' +
              '<p>• 微调旋钮减速比 10:1，适合精确对准干涉条纹</p>' +
              '<p>• 主尺量程 0–7 cm，有效测量范围 0–2.1 cm</p>' +
              '<p>• 使用「零位修正」校准仪器系统误差</p>';
          }
        }
      ]
    }
  ]
};
