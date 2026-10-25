import { STAGE_CHROME_ATTR } from '../../platform/stage-chrome';

const NOTICE_ATTR = 'data-scene-error';

/**
 * 在舞台上显示场景错误提示（启动失败或运行中异常）。
 *
 * 课堂投屏时控制台不可见：异常若只进 console，老师只会看到空白或冻结的
 * 画面。提示条为 role="alert"，同一宿主只保留一条，可手动关闭。
 */
export function showSceneErrorNotice(
  host: HTMLElement | null | undefined,
  message: string
): void {
  if (!host) return;
  host.querySelector(`[${NOTICE_ATTR}]`)?.remove();

  const notice = document.createElement('div');
  notice.setAttribute(NOTICE_ATTR, '');
  notice.setAttribute(STAGE_CHROME_ATTR, '');
  notice.setAttribute('role', 'alert');
  notice.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:12px',
    'transform:translateX(-50%)',
    'z-index:20',
    'display:flex',
    'gap:8px',
    'align-items:center',
    'max-width:calc(100% - 24px)',
    'padding:8px 12px',
    'border-radius:8px',
    'border:1px solid var(--danger)',
    'background:var(--bg-primary)',
    'color:var(--danger)',
    'font-size:var(--text-sm)',
    'box-shadow:0 2px 8px rgba(0,0,0,0.12)'
  ].join(';');

  const text = document.createElement('span');
  text.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', '关闭提示');
  close.style.cssText =
    'border:0;background:transparent;color:inherit;font-size:1.1em;cursor:pointer';
  close.addEventListener('click', () => notice.remove());

  notice.append(text, close);
  host.appendChild(notice);
}

export function clearSceneErrorNotice(
  host: HTMLElement | null | undefined
): void {
  host?.querySelector(`[${NOTICE_ATTR}]`)?.remove();
}

const MESSAGES = {
  load: '演示加载失败，请刷新页面重试。',
  runtime: '演示运行出错，已自动暂停。可按「重置」后重试。'
} as const;

/** 记录并在舞台提示场景错误；'runtime' 时调用方须已暂停 transport。 */
export function reportSceneError(
  host: HTMLElement | null | undefined,
  sceneId: string,
  phase: keyof typeof MESSAGES,
  error: unknown
): void {
  console.error(`[SceneAdapter] ${sceneId} ${phase} error:`, error);
  showSceneErrorNotice(host, MESSAGES[phase]);
}
