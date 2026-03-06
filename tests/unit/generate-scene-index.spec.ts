import { describe, expect, it } from 'vitest';
import { toSceneIndex } from '../../scripts/generate-scene-index';

describe('toSceneIndex', () => {
  it('sorts scene metadata by title and keeps required fields', () => {
    const result = toSceneIndex([
      {
        id: 'b',
        title: 'B',
        path: '/b.html',
        subject: '力学',
        concept: '曲线运动',
        subConcepts: ['速度分解', '轨迹方程']
      },
      {
        id: 'a',
        title: 'A',
        path: '/a.html',
        subject: '电磁学',
        concept: '电场分布',
        subConcepts: ['电荷叠加', '场线疏密']
      }
    ]);

    expect(result.map((x) => x.id)).toEqual(['a', 'b']);
    expect(result[0]).toMatchObject({
      subject: '电磁学',
      concept: '电场分布',
      subConcepts: ['电荷叠加', '场线疏密']
    });
  });
});
