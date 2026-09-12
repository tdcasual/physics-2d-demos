import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../types';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'instrument',
  transport: 'visible',
  renderHints: { contentScale: 1.3 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['preset', 'countEvery', 'fillRuler']
  }
};

export const tickerTapeMeta: SceneMeta = {
  id: 'ticker-tape',
  title: '打点计时器纸带',
  path: '/src/pages/ticker-tape.html',
  subject: '力学',
  concept: '纸带分析',
  subConcepts: ['计数点', 'v–t 图像'],
  keywords: ['打点计时器', '纸带', '计数点', '刻度尺', '匀变速', 'v-t图像'],
  objective:
    '用毫米刻度尺一次测量各计数点到起点的位移，填写实验表并描 v–t 图，判断运动性质',
  description:
    '对照人教必修一 2.1：四种纸带、尺读 x、手算 Δx 与 v、描点作图；匀加速 x–t 为抛物线，v–t 为直线',
  difficulty: 2,
  icon: '📏',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    speed: 1,
    countEvery: 1,
    noise: 0,
    showA: 0
  },
  urlSyncKeys: ['preset'],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
