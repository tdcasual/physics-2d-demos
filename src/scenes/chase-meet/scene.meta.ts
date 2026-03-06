import type { SceneMeta } from '../types';

export const chaseMeetMeta: SceneMeta = {
  id: 'chase-meet',
  title: '追及相遇',
  path: '/src/pages/chase-meet.html',
  subject: '力学',
  concept: '运动关系',
  subConcepts: ['位移比较', '相遇条件'],
  keywords: ['力学', '追及相遇', '2D'],
  objective: '演示一维追及场景中位置与速度图像的联动关系',
  defaultParams: {
    totalTime: 10,
    dt: 0.02,
    x0A: 0,
    x0B: 10
  }
};
