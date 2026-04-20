import type { SceneMeta } from '../types';

export const projectileMeta: SceneMeta = {
  id: 'projectile',
  title: '抛体运动',
  path: '/src/pages/projectile.html',
  subject: '力学',
  concept: '曲线运动',
  subConcepts: ['速度分解', '轨迹方程'],
  keywords: ['力学', '抛体', '二维'],
  objective: '演示初速度与重力对轨迹的影响',
  description: '探索抛物线轨迹的奥秘，理解水平与竖直运动的独立性',
  difficulty: 2,
  icon: '🎯',
  category: 'mechanics',
  featured: true,
  defaultParams: {
    speed: 18,
    angleDeg: 45,
    gravity: 9.8,
    initialHeight: 0,
    windAccel: 0,
    drag: 0.02
  }
};
