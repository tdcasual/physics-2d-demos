import type { ControlsSchema } from '../../platform/controls-schema';

export const vtIntegralControlsSchema: ControlsSchema = {
  sections: [
    {
      title: '子场景',
      collapsed: false,
      fields: [
        {
          type: 'scene-selector',
          key: 'scene',
          scenes: [
            {
              id: 'scene1',
              label: 'v-t面积',
              desc: '矩形逼近 v-t 图面积'
            },
            {
              id: 'scene2',
              label: '化曲为直',
              desc: '拖动 A、B 比较直线与轨迹'
            },
            { id: 'scene3', label: '割圆术', desc: '内接多边形逼近圆周' }
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
      title: '分割',
      collapsed: false,
      fields: [
        {
          type: 'slider',
          key: 'n',
          label: '分割数 n',
          min: 4,
          max: 50,
          step: 1,
          value: 10
        }
      ]
    }
  ]
};
