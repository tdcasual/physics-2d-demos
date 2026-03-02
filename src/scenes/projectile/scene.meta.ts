import type { SceneMeta } from '../types';

export const projectileMeta: SceneMeta = {
  id: 'projectile',
  title: '抛体运动（2D）',
  path: '/src/pages/projectile.html',
  keywords: ['力学', '抛体', '二维'],
  objective: '演示初速度与重力对轨迹的影响',
  defaultParams: {
    speed: 18,
    angleDeg: 45,
    gravity: 9.8
  }
};
