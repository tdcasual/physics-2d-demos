import type { ControlsSchema } from '../../platform/controls-schema';

export const vtIntegralControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '播放控制',
      collapsed: false,
      fields: [
        {
          type: 'transport',
          key: 'transport',
          showPlay: true,
          showPause: true,
          showReset: true,
          showStep: true
        }
      ]
    },
    {
      title: '子场景',
      collapsed: false,
      fields: [
        {
          type: 'scene-selector',
          key: 'scene',
          scenes: [
            { id: 'scene1', label: 'v-t面积', desc: '速度时间图面积' },
            { id: 'scene2', label: '曲线逼近', desc: '用矩形逼近曲线下面积' },
            { id: 'scene3', label: '圆面积', desc: '圆面积微元法' },
            { id: 'scene4', label: '表面积', desc: '表面积微元法' },
            { id: 'scene5', label: '旋转体', desc: '旋转体体积' }
          ]
        }
      ]
    },
    {
      title: '函数类型',
      collapsed: false,
      fields: [
        {
          type: 'button-grid',
          key: 'preset',
          columns: 2,
          buttons: [
            { key: 'constant', label: '匀速', desc: 'v(t)=2' },
            { key: 'linear', label: '匀加速', desc: 'v(t)=0.5t' },
            { key: 'quadratic', label: '变加速', desc: 'v(t)=0.1t²' },
            { key: 'sine', label: '正弦', desc: 'v(t)=sin(t)' }
          ]
        }
      ]
    },
    {
      title: '微元设置',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'rects',
          label: '矩形数量',
          min: 1,
          max: 50,
          step: 1,
          value: 10
        },
        {
          type: 'slider',
          key: 'division',
          label: '分割数 n',
          min: 4,
          max: 100,
          step: 1,
          value: 8
        }
      ]
    },
    {
      title: '高级参数',
      collapsed: true,
      fields: [
        {
          type: 'slider',
          key: 'time',
          label: '时间 t',
          min: 0,
          max: 10,
          step: 0.1,
          value: 5,
          unit: 's'
        },
        {
          type: 'slider',
          key: 'amplitude',
          label: '振幅',
          min: 0.5,
          max: 3,
          step: 0.1,
          value: 1
        },
        {
          type: 'slider',
          key: 'circle-n',
          label: '分割数',
          min: 4,
          max: 100,
          step: 1,
          value: 8
        },
        {
          type: 'slider',
          key: 'surface-n',
          label: '网格密度',
          min: 10,
          max: 100,
          step: 5,
          value: 20
        }
      ]
    }
  ]
};
