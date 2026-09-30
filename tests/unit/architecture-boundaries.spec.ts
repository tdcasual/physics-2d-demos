import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function listSourceFiles(dir: string): string[] {
  const absoluteDir = resolve(root, dir);
  return readdirSync(absoluteDir).flatMap((entry) => {
    const absolutePath = resolve(absoluteDir, entry);
    const relativePath = `${dir}/${entry}`;
    if (statSync(absolutePath).isDirectory()) {
      return listSourceFiles(relativePath);
    }
    return /\.(ts|tsx)$/.test(entry) ? [relativePath] : [];
  });
}

// ── 相对 import 真实解析 ──
// 不做字符串前缀匹配：把每个相对 specifier 相对文件所在目录 resolve，
// 再判断解析结果落在哪个分层目录，任意深度的 `../` 都无处可逃。

type LayerName = 'app' | 'ui' | 'catalog' | 'core' | 'platform' | 'instruments';

type ResolvedTarget =
  | { kind: 'layer'; layer: LayerName }
  | { kind: 'scene'; sceneId: string | null };

const LAYER_NAMES: ReadonlySet<string> = new Set([
  'app',
  'ui',
  'catalog',
  'core',
  'platform',
  'instruments'
]);

/** 粗略去除注释，避免注释里的 import 字样造成误报 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** 提取静态 import/export-from 与动态 import() 的 specifier */
function extractImportSpecifiers(source: string): string[] {
  const stripped = stripComments(source);
  const specifiers: string[] = [];
  const patterns = [
    /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];
  for (const pattern of patterns) {
    for (const match of stripped.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) {
        specifiers.push(specifier);
      }
    }
  }
  return specifiers;
}

/**
 * 把 specifier 相对 file 所在目录 resolve 后归类：
 * - 包名 / 非 src 路径 → null（不检查）
 * - src/scenes/<id>/... → { kind: 'scene', sceneId }
 * - src/<layer>/... → { kind: 'layer', layer }
 */
function resolveImportTarget(
  file: string,
  specifier: string
): ResolvedTarget | null {
  if (!specifier.startsWith('.')) {
    return null;
  }
  const absolute = resolve(root, dirname(file), specifier);
  const rel = relative(root, absolute).split(sep).join('/');
  const segments = rel.split('/');
  if (segments[0] !== 'src') {
    return null;
  }
  const layer = segments[1];
  if (layer === 'scenes') {
    const id = segments[2];
    if (id !== undefined) {
      const maybeDir = resolve(root, 'src/scenes', id);
      if (existsSync(maybeDir) && statSync(maybeDir).isDirectory()) {
        return { kind: 'scene', sceneId: id };
      }
    }
    // src/scenes 根级共享模块（types.ts / page-utils.ts 等），sceneId 为 null
    return { kind: 'scene', sceneId: null };
  }
  if (layer !== undefined && LAYER_NAMES.has(layer)) {
    return { kind: 'layer', layer: layer as LayerName };
  }
  return null;
}

/**
 * 对 files 中的每个 import 应用规则；rule 返回违规消息字符串或 null。
 */
function assertImportRules(
  files: string[],
  rule: (target: ResolvedTarget, file: string) => string | null
): void {
  for (const file of files) {
    for (const specifier of extractImportSpecifiers(readSource(file))) {
      const target = resolveImportTarget(file, specifier);
      if (!target) {
        continue;
      }
      const violation = rule(target, file);
      expect(violation, violation ?? undefined).toBeNull();
    }
  }
}

function targetLabel(target: ResolvedTarget): string {
  return target.kind === 'scene'
    ? `scene "${target.sceneId ?? '(scenes root)'}"`
    : `${target.layer} layer`;
}

function layerRule(
  forbiddenLayers: ReadonlySet<LayerName>,
  options: { forbidScenes?: boolean } = {}
): (target: ResolvedTarget, file: string) => string | null {
  return (target, file) => {
    if (target.kind === 'scene') {
      return options.forbidScenes
        ? `${file} must not import ${targetLabel(target)}`
        : null;
    }
    return forbiddenLayers.has(target.layer)
      ? `${file} must not import ${targetLabel(target)}`
      : null;
  };
}

// A2 已清偿：imperative controls.ts 经 page.ts 注入 ui 工厂，清单必须保持空。
const UI_EXEMPT_SCENE_CONTROLS: ReadonlySet<string> = new Set();

function sceneFileRule(
  file: string
): (target: ResolvedTarget) => string | null {
  const ownSceneId = file.split('/')[2];
  const isPage = file.endsWith('/page.ts');
  return (target) => {
    // 跨场景 import：所有场景文件（含 page.ts）一律禁止；
    // 场景根共享模块（sceneId 为 null）允许
    if (target.kind === 'scene') {
      if (target.sceneId === null || target.sceneId === ownSceneId) {
        return null;
      }
      return `${file} must not import ${targetLabel(target)}`;
    }
    // scenes → catalog：一律禁止（catalog 仅经 registry 自动发现场景）
    if (target.layer === 'catalog') {
      return `${file} must not import catalog layer`;
    }
    if (target.layer === 'app' || target.layer === 'ui') {
      if (isPage) {
        return null;
      }
      return `${file} must not import ${target.layer} layer`;
    }
    return null;
  };
}

describe('architecture boundaries', () => {
  it('scene.sim modules do not import app or ui layer', () => {
    assertImportRules(
      ['src/scenes/projectile/scene.sim.ts'],
      layerRule(new Set(['app', 'ui']))
    );
  });

  it('scene modules do not import app, ui, catalog, or other scenes', () => {
    expect(
      UI_EXEMPT_SCENE_CONTROLS.size,
      'UI_EXEMPT_SCENE_CONTROLS 必须保持空（A2 已清偿，禁止回潮）'
    ).toBe(0);
    assertImportRules(listSourceFiles('src/scenes'), (target, file) =>
      sceneFileRule(file)(target)
    );
  });

  it('core modules do not import app layer', () => {
    assertImportRules(
      listSourceFiles('src/core'),
      layerRule(new Set(['app', 'ui', 'platform', 'catalog']), {
        forbidScenes: true
      })
    );
  });

  it('ui and catalog modules respect their declared dependencies', () => {
    assertImportRules(
      listSourceFiles('src/ui'),
      layerRule(new Set(['app', 'catalog', 'instruments']), {
        forbidScenes: true
      })
    );
    assertImportRules(
      listSourceFiles('src/catalog'),
      layerRule(new Set(['app', 'ui']), { forbidScenes: true })
    );
  });

  it('instruments and platform modules stay independent', () => {
    // 作为 ESLint glob 深度限制的备份防线：真实解析后任意深度均覆盖
    assertImportRules(
      listSourceFiles('src/instruments'),
      layerRule(new Set(['app', 'ui']), { forbidScenes: true })
    );
    assertImportRules(
      listSourceFiles('src/platform'),
      layerRule(new Set(['app', 'ui']), { forbidScenes: true })
    );
  });
});
