import type { SceneMeta } from '../types';

export const chaseMeetMeta: SceneMeta = {
  id: 'chase-meet',
  title: '追及相遇演示动画（2D）',
  path: '/src/pages/chase-meet.html',
  keywords: ['力学', '追及相遇', '2D'],
  objective: '演示一维追及场景中位置与速度图像的联动关系',
  defaultParams: {
    totalTime: 10,
    dt: 0.02,
    x0A: 0,
    x0B: 10
  }
};
