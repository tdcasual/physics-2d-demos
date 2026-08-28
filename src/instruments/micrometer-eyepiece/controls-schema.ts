import type { ControlsSchema } from '../../platform/controls-schema';

export const micrometerEyepieceControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '读数参数',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'slider',
          key: 'initialReading',
          label: '初始读数',
          min: 0,
          max: 32,
          step: 0.01,
          value: 0,
          unit: 'mm'
        },
        {
          type: 'slider',
          key: 'zeroOffset',
          label: '零位修正',
          min: -0.5,
          max: 0.5,
          step: 0.001,
          value: 0,
          unit: 'mm'
        }
      ]
    },
    {
      title: '视场模式',
      collapsed: false,
      span: 'full',
      fields: [
        {
          type: 'select',
          key: 'viewMode',
          label: '移动对象',
          value: 'crosshair',
          options: [
            { label: '准星移动（默认）', value: 'crosshair' },
            { label: '条纹移动', value: 'fringe' }
          ]
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
          key: 'stripeOffset',
          label: '十字准星位移',
          min: 0,
          max: 32,
          step: 0.01,
          value: 12,
          unit: 'mm'
        },
        {
          type: 'slider',
          key: 'stripeSpacing',
          label: '条纹间距',
          min: 20,
          max: 100,
          step: 1,
          value: 50,
          unit: 'px'
        },
        {
          type: 'text',
          key: 'stripeColor',
          label: '条纹颜色',
          value: 'rgba(200,80,20,0.4)'
        },
        {
          type: 'slider',
          key: 'stripeAngle',
          label: '条纹角度',
          min: 0,
          max: 180,
          step: 1,
          value: 90,
          unit: '°'
        }
      ]
    },
    {
      title: '操作说明',
      collapsed: true,
      span: 'full',
      fields: [
        {
          type: 'hint',
          key: 'hint',
          lines: [
            '• 拖动右侧测微螺杆（或鼠标滚轮）旋转副尺',
            '• 拖动左侧目镜壳体可整体移动仪器位置',
            '• 十字准星对准干涉条纹中心时触发对齐事件',
            '• 使用「零位修正」校准仪器系统误差'
          ]
        }
      ]
    }
  ]
};
