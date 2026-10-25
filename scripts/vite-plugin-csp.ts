/**
 * Vite plugin: Content-Security-Policy 单源注入
 *
 * 此前只有 index.html 手写了 CSP meta，虚拟场景页与工具页都没有。
 * 现在由本插件在 transformIndexHtml 阶段为所有 HTML（含 vite-plugin-scene-pages
 * 的虚拟页）注入同一份策略；index.html 不再保留手写副本。
 *
 * 'unsafe-inline' 是必需的：主题防闪烁脚本（vite-plugin-theme-noflash）与
 * 首页关键 CSS 都是内联的。standalone 构建（file:// 打开、资源内联为 data:）
 * 不挂本插件。
 */

import type { IndexHtmlTransformResult, Plugin } from 'vite';

export const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

const CSP_MARKER = 'http-equiv="Content-Security-Policy"';

export function injectCsp(html: string): string {
  if (html.includes(CSP_MARKER)) return html;
  const charsetMeta = html.match(/<meta\s+charset="[^"]*"\s*\/?>/i);
  if (!charsetMeta) {
    throw new Error('[csp] HTML 缺少 <meta charset>，无法定位 CSP 注入点');
  }
  return html.replace(
    charsetMeta[0],
    `${charsetMeta[0]}\n    <meta ${CSP_MARKER} content="${CSP_POLICY};" />`
  );
}

export function contentSecurityPolicy(): Plugin {
  return {
    name: 'vite-plugin-csp',
    transformIndexHtml: {
      order: 'pre',
      handler(html): IndexHtmlTransformResult {
        return injectCsp(html);
      }
    }
  };
}
