/**
 * Vite plugin: 主题防闪烁脚本单源注入
 *
 * 此前 19 个 HTML 入口各自手抄同一份 ~43 行内联脚本（md5 一致）。
 * 现在由本插件在 transformIndexHtml 阶段从唯一模板注入，
 * dev 与 build 模式均生效；HTML 源文件中不再保留手抄副本。
 *
 * 注意：脚本读取的 localStorage key 与 src/app/theme-store.ts 是同一事实源，
 * 修改主题存储格式时两侧必须同步。
 */

import type { IndexHtmlTransformResult, Plugin } from 'vite';

/**
 * 防闪烁脚本（含 <script> 标签，4 空格缩进）。
 * 与此前各 HTML 手抄版本逐字一致。
 */
export const THEME_NOFLASH_SNIPPET = `    <script>
      // 阻止 theme flash：在 JS 运行前从统一主题存储或系统偏好恢复主题
      (function () {
        function parseTheme(raw) {
          if (!raw) return null;
          if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
          try {
            var parsed = JSON.parse(raw);
            if (
              parsed &&
              parsed.v === 1 &&
              (parsed.theme === 'light' ||
                parsed.theme === 'dark' ||
                parsed.theme === 'system')
            ) {
              return parsed.theme;
            }
          } catch (e) {}
          return null;
        }
        try {
          var theme = parseTheme(localStorage.getItem('physics-lab-theme'));
          // 兼容旧版容器状态中的 theme 字段
          if (!theme) {
            theme = parseTheme(
              localStorage.getItem('physics-demos-container-state')
            );
          }
          if (theme === 'system') {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light';
          }
          if (theme) {
            document.documentElement.setAttribute('data-theme', theme);
            return;
          }
        } catch (e) {}
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      })();
    </script>`;

/** 幂等标记：脚本首行注释，已注入过的 HTML 不重复注入 */
const IDEMPOTENCY_MARKER = '阻止 theme flash';

export function injectThemeNoFlash(html: string): string {
  if (html.includes(IDEMPOTENCY_MARKER)) return html;
  const viewportMeta = html.match(/<meta\s+name="viewport"[^>]*\/?>/);
  if (!viewportMeta) {
    throw new Error(
      '[theme-noflash] HTML 缺少 <meta name="viewport">，无法定位防闪烁脚本注入点'
    );
  }
  return html.replace(
    viewportMeta[0],
    `${viewportMeta[0]}\n${THEME_NOFLASH_SNIPPET}`
  );
}

export function themeNoFlash(): Plugin {
  return {
    name: 'vite-plugin-theme-noflash',
    transformIndexHtml: {
      order: 'pre',
      handler(html): IndexHtmlTransformResult {
        return injectThemeNoFlash(html);
      }
    }
  };
}
