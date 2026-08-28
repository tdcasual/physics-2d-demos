/**
 * Vite plugin: 场景页 HTML 虚拟生成
 *
 * 16 个场景页 HTML 此前是 src/pages/<id>.html 的同构手抄模板
 * （#app 挂载点 + <script src="../scenes/<id>/page.ts">，仅 title 不同）。
 * 现在由本插件从 src/scenes/<id>/scene.meta.ts 派生，手抄文件已删除：
 *
 * - build：rollupOptions.input 使用 discoverScenePageEntries() 返回的
 *   虚拟入口 id（<root>/src/pages/<id>.html 绝对路径形式，以 .html 结尾），
 *   由本插件的 resolveId/load 提供内容，vite:build-html 照常处理，
 *   产物路径 dist/src/pages/<id>.html 与手抄时代完全一致。
 * - dev：configureServer 中间件拦截 /src/pages/<scene>.html 请求，
 *   生成 HTML 后走 server.transformIndexHtml（vite 自身的脚本重写与
 *   vite-plugin-theme-noflash 的注入因此对虚拟页面同样生效）。
 *
 * 工具页（index-layout-test、instruments，见 scripts/utility-pages.ts）
 * 仍是真实文件，不经过本插件。
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import type { Plugin } from 'vite';

const TITLE_SUFFIX = ' - 物理演示';

/** 列出含 scene.meta.ts 的场景 id（与 catalog 自动发现口径一致）。 */
export function listSceneIds(root: string): string[] {
  const scenesDir = join(root, 'src/scenes');
  return readdirSync(scenesDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(scenesDir, entry.name, 'scene.meta.ts'))
    )
    .map((entry) => entry.name)
    .sort();
}

/** 虚拟入口 id：以 .html 结尾的绝对路径，dev URL 与产物路径均不变。 */
export function scenePageEntryId(root: string, sceneId: string): string {
  return join(root, 'src/pages', `${sceneId}.html`);
}

/** build.rollupOptions.input 用的场景页入口表（键名与手抄时代一致）。 */
export function discoverScenePageEntries(root: string): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const id of listSceneIds(root)) {
    entries[id] = scenePageEntryId(root, id);
  }
  return entries;
}

/** 与 check-scenes.ts 相同的 AST 取值方式，从 scene.meta.ts 读取 title。 */
function readMetaTitle(root: string, sceneId: string): string {
  const metaPath = join(root, 'src/scenes', sceneId, 'scene.meta.ts');
  const sourceFile = ts.createSourceFile(
    metaPath,
    readFileSync(metaPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  let title: string | null = null;
  const visit = (node: ts.Node): void => {
    if (
      title === null &&
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'title' &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      title = node.initializer.text;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (title === null) {
    throw new Error(`[scene-pages] ${metaPath} 缺少 title 字段`);
  }
  return title;
}

/** 生成场景页 HTML（与历史手抄模板逐字同构）。 */
export function renderScenePageHtml(root: string, sceneId: string): string {
  const title = readMetaTitle(root, sceneId);
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}${TITLE_SUFFIX}</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="../scenes/${sceneId}/page.ts"></script>
  </body>
</html>
`;
}

export function scenePages(root: string): Plugin {
  // build 入口在配置期固定；dev 中间件按请求动态扫描，
  // 使得 pnpm new:scene 脚手架的新场景无需重启 dev server。
  const buildEntries = new Map<string, string>(
    listSceneIds(root).map((id) => [scenePageEntryId(root, id), id])
  );

  return {
    name: 'vite-plugin-scene-pages',

    resolveId(source) {
      const sceneId = buildEntries.get(source);
      return sceneId ? source : null;
    },

    load(id) {
      const sceneId = buildEntries.get(id);
      return sceneId ? renderScenePageHtml(root, sceneId) : null;
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(
          /^\/src\/pages\/([a-z0-9-]+)\.html(?:\?.*)?$/
        );
        if (!match) {
          next();
          return;
        }
        const sceneId = match[1];
        if (!listSceneIds(root).includes(sceneId)) {
          next();
          return;
        }
        server
          .transformIndexHtml(
            req.url ?? `/src/pages/${sceneId}.html`,
            renderScenePageHtml(root, sceneId)
          )
          .then(
            (html) => {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(html);
            },
            (error: unknown) => next(error)
          );
      });
    }
  };
}
