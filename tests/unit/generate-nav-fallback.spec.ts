import { describe, expect, it } from 'vitest';
import { toFallbackScript } from '../../scripts/generate-nav-fallback';

describe('toFallbackScript', () => {
  it('serializes pages into window global', () => {
    const script = toFallbackScript([
      {
        id: 'a',
        title: 'A',
        path: '/a',
        subject: '力学',
        concept: '曲线运动',
        subConcepts: ['速度分解', '轨迹方程']
      }
    ]);
    expect(script).toContain('window.__SCENE_FALLBACK__');
    expect(script).toContain('"id":"a"');
    expect(script).toContain('"concept":"曲线运动"');
  });
});
