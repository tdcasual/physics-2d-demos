import { describe, expect, it } from 'vitest';
import { instrumentManifest } from '../../src/instruments/_manifest/manifest';
import { micrometerEyepieceMeta } from '../../src/instruments/micrometer-eyepiece/instrument.meta';
import { interferenceVernierCaliperMeta } from '../../src/instruments/interference-vernier-caliper/instrument.meta';
import { vernierCaliperGuideMeta } from '../../src/instruments/vernier-caliper-guide/instrument.meta';

describe('instrument manifest contract', () => {
  it('keeps manifest metadata and defaults aligned with instrument.meta', () => {
    const metas = [
      micrometerEyepieceMeta,
      interferenceVernierCaliperMeta,
      vernierCaliperGuideMeta
    ];

    expect(
      instrumentManifest,
      'manifest 条目数与仪器数不一致：新增仪器后请在 ' +
        'src/instruments/_manifest/manifest.ts 注册条目，' +
        '并在本文件中 import 对应 instrument.meta 加入校验列表'
    ).toHaveLength(metas.length);
    for (const meta of metas) {
      const manifestEntry = instrumentManifest.find(
        (entry) => entry.id === meta.id
      );
      expect(
        manifestEntry,
        `仪器 "${meta.id}" 未在 manifest 注册：在 ` +
          'src/instruments/_manifest/manifest.ts 中添加该条目，' +
          '参考 micrometer-eyepiece 条目'
      ).toBeDefined();
      expect(
        manifestEntry,
        `仪器 "${meta.id}" 的 manifest 条目与 instrument.meta.ts 不一致：` +
          `同步 src/instruments/_manifest/manifest.ts 中的 title/category/` +
          'description/unit/precision/defaultParams，使其与 ' +
          `src/instruments/${meta.id}/instrument.meta.ts 保持一致`
      ).toMatchObject({
        title: meta.title,
        category: meta.category,
        description: meta.description,
        unit: meta.unit,
        precision: meta.precision,
        defaultParams: meta.defaultParams
      });
    }
  });
});
