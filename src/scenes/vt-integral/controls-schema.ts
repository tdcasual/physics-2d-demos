import type { ControlsSchema } from '../../platform/controls-schema';
import { VT_N_MAX, VT_N_MIN } from './scene.sim';

/** 仅场景一（v-t 面积）使用的 section / 字段，切到其他子场景时隐藏。 */
export const VT_CURVE_SECTION = '函数类型';
export const VT_SPLIT_SECTION = '分割';

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
      title: VT_CURVE_SECTION,
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
      title: VT_SPLIT_SECTION,
      collapsed: false,
      fields: [
        {
          type: 'select',
          key: 'rule',
          label: '矩形高度',
          value: '0',
          options: [
            { label: '左端点（每段初速度）', value: '0' },
            { label: '右端点（每段末速度）', value: '1' }
          ]
        },
        {
          type: 'slider',
          key: 'n',
          label: '分割数 n',
          min: VT_N_MIN,
          max: VT_N_MAX,
          step: 1,
          value: 10
        }
      ]
    }
  ]
};
