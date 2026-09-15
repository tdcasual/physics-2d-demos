import type { ControlsSchema } from '../../platform/controls-schema';

export const dynamicCircleControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'tab',
          columns: 2,
          presets: [
            { id: 'scaling', label: '放缩圆' },
            { id: 'rotating', label: '旋转圆' },
            { id: 'translating', label: '平移圆' },
            { id: 'comprehensive', label: '综合聚焦' }
          ],
          initialActive: 'scaling'
        },
        {
          type: 'preset-group',
          key: 'boundary',
          columns: 3,
          presets: [
            { id: 'straight', label: '直线/矩形' },
            { id: 'triangle', label: '三角形' },
            { id: 'circle', label: '圆形' }
          ],
          initialActive: 'straight'
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'B',
          label: '磁场 B',
          min: -0.25,
          max: 0.25,
          step: 0.01,
          value: 0.1,
          unit: 'T'
        },
        {
          type: 'slider',
          key: 'v',
          label: '速度 v',
          min: 4,
          max: 25,
          step: 0.5,
          value: 11.5,
          unit: 'm/s'
        },
        {
          type: 'slider',
          key: 'theta',
          label: '入射角 θ',
          min: -90,
          max: 90,
          step: 1,
          value: -90,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'y0',
          label: '入射位置 y',
          min: 150,
          max: 510,
          step: 5,
          value: 330,
          unit: 'm'
        }
      ]
    },
    {
      title: '边界',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'xBound',
          label: '右边界 x',
          min: 320,
          max: 600,
          step: 5,
          value: 480,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'triX',
          label: '三角顶点 x',
          min: 320,
          max: 600,
          step: 5,
          value: 480,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'triH',
          label: '三角高度 h',
          min: 150,
          max: 450,
          step: 10,
          value: 300,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'circleR',
          label: '圆域半径 r_f',
          min: 50,
          max: 200,
          step: 5,
          value: 120,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'circleX',
          label: '圆心 x_c',
          min: 280,
          max: 520,
          step: 5,
          value: 380,
          unit: 'm'
        },
        {
          type: 'slider',
          key: 'circleY',
          label: '圆心 y_c',
          min: 180,
          max: 480,
          step: 5,
          value: 330,
          unit: 'm'
        }
      ]
    },
    {
      title: '显示',
      collapsed: true,
      fields: [
        { type: 'toggle', key: 'autoSweep', label: '自动扫掠', value: false },
        { type: 'toggle', key: 'showCenter', label: '显示圆心', value: true }
      ]
    }
  ]
};
