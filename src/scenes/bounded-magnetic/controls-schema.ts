import type { ControlsSchema } from '../../platform/controls-schema';
export const boundedMagneticControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '磁场形状',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'shape',
          columns: 2,
          initialActive: 'circle',
          presets: [
            { id: 'half-plane', label: '半无界直线' },
            { id: 'circle', label: '圆形磁场' },
            { id: 'triangle', label: '正三角形磁场' }
          ]
        }
      ]
    },
    {
      title: '教学模型',
      collapsed: false,
      fields: [
        {
          type: 'preset-group',
          key: 'model',
          columns: 3,
          initialActive: 'scale',
          presets: [
            { id: 'standard', label: '标准' },
            { id: 'rotate', label: '旋转' },
            { id: 'scale', label: '缩放' }
          ]
        }
      ]
    },
    {
      title: '参数',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'entryAngle',
          label: '入射角 θ',
          min: -45,
          max: 45,
          step: 1,
          value: 30,
          unit: '°'
        },
        {
          type: 'slider',
          key: 'orbitRadius',
          label: '洛伦兹半径 r',
          min: 60,
          max: 180,
          step: 1,
          value: 100
        },
        {
          type: 'slider',
          key: 'fieldSize',
          label: '磁场尺寸 L',
          min: 140,
          max: 240,
          step: 1,
          value: 200
        }
      ]
    },
    {
      title: '操作',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'actions',
          columns: 2,
          buttons: [
            { key: 'emit', label: '发射粒子' },
            { key: 'clear', label: '清除轨迹' }
          ]
        },
        { type: 'toggle', key: 'autoRun', label: '自动演示', value: true },
        {
          type: 'toggle',
          key: 'showVectors',
          label: '显示速度与力',
          value: true
        }
      ]
    },
    {
      title: '判据',
      collapsed: true,
      fields: [
        {
          type: 'hint',
          key: 'rule',
          lines: ['qvB = mv²/r', 'r = mv/|q|B', '边界决定出射方向']
        }
      ]
    }
  ]
};
