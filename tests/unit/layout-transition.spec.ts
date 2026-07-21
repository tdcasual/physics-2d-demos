import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enterLayout,
  exitLayout
} from '../../src/app/layouts/_shared/layout-transition';
import type { LayoutTransition } from '../../src/app/layouts/types';

/** 可控的假 Animation：可手动 resolve / 通过 cancel reject finished */
interface FakeAnimation {
  finished: Promise<void>;
  cancel: ReturnType<typeof vi.fn>;
  resolve: () => void;
}

function createFakeElement(opts?: { supportsAnimate?: boolean }) {
  const animations: FakeAnimation[] = [];
  const animate = vi.fn((_keyframes: Keyframe[], _options?: unknown) => {
    let resolve!: () => void;
    let reject!: (e?: unknown) => void;
    const finished = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const anim: FakeAnimation = {
      finished,
      cancel: vi.fn(() => reject(new Error('cancelled'))),
      resolve
    };
    animations.push(anim);
    return anim as unknown as Animation;
  });

  const el = {
    animate: opts?.supportsAnimate === false ? undefined : animate
  } as unknown as HTMLElement;

  return { el, animate, animations };
}

const FADE: LayoutTransition = { type: 'fade', duration: 200, easing: 'ease' };

beforeEach(() => {
  // 默认：用户未偏好减少动态效果
  (window as unknown as { matchMedia: unknown }).matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('layout-transition', () => {
  it('type "none" 时不执行动画，立即完成', async () => {
    const { el, animate } = createFakeElement();
    await enterLayout(el, { type: 'none', duration: 200, easing: 'ease' });
    expect(animate).not.toHaveBeenCalled();
  });

  it('duration <= 0 时不执行动画', async () => {
    const { el, animate } = createFakeElement();
    await enterLayout(el, { type: 'fade', duration: 0, easing: 'ease' });
    expect(animate).not.toHaveBeenCalled();
  });

  it('环境不支持 Element.animate 时安全降级（不抛错）', async () => {
    const { el, animate } = createFakeElement({ supportsAnimate: false });
    await expect(enterLayout(el, FADE)).resolves.toBeUndefined();
    await expect(exitLayout(el, FADE)).resolves.toBeUndefined();
    expect(animate).not.toHaveBeenCalled();
  });

  it('用户偏好减少动态效果时不执行动画', async () => {
    (window as unknown as { matchMedia: unknown }).matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true });
    const { el, animate } = createFakeElement();
    await enterLayout(el, FADE);
    expect(animate).not.toHaveBeenCalled();
  });

  it('enter：fade 关键帧从透明到不透明，并透传 duration/easing', async () => {
    const { el, animate, animations } = createFakeElement();
    const p = enterLayout(el, FADE);
    expect(animate).toHaveBeenCalledTimes(1);

    const [keyframes, options] = animate.mock.calls[0] as [
      Keyframe[],
      { duration: number; easing: string; fill: string }
    ];
    expect(keyframes[0]).toMatchObject({ opacity: 0 });
    expect(keyframes[keyframes.length - 1]).toMatchObject({ opacity: 1 });
    expect(options.duration).toBe(200);
    expect(options.easing).toBe('ease');

    animations[0].resolve();
    await p;
    // enter 完成后取消动画以恢复自然 CSS
    expect(animations[0].cancel).toHaveBeenCalled();
  });

  it('exit：关键帧方向相反（不透明 → 透明），且完成后保留结束态', async () => {
    const { el, animate, animations } = createFakeElement();
    const p = exitLayout(el, FADE);
    const [keyframes] = animate.mock.calls[0] as [Keyframe[]];
    expect(keyframes[0]).toMatchObject({ opacity: 1 });
    expect(keyframes[keyframes.length - 1]).toMatchObject({ opacity: 0 });

    animations[0].resolve();
    await p;
    // exit 不取消动画（保留透明态直到容器移除元素）
    expect(animations[0].cancel).not.toHaveBeenCalled();
  });

  it('slide 类型使用 translateX，scale 类型使用 scale', async () => {
    const slide = createFakeElement();
    const pSlide = enterLayout(slide.el, {
      type: 'slide',
      duration: 200,
      easing: 'ease'
    });
    const [slideKf] = slide.animate.mock.calls[0] as [Keyframe[]];
    expect(String(slideKf[0].transform)).toContain('translateX');
    slide.animations[0].resolve();
    await pSlide;

    const scale = createFakeElement();
    const pScale = enterLayout(scale.el, {
      type: 'scale',
      duration: 200,
      easing: 'ease'
    });
    const [scaleKf] = scale.animate.mock.calls[0] as [Keyframe[]];
    expect(String(scaleKf[0].transform)).toContain('scale');
    scale.animations[0].resolve();
    await pScale;
  });

  it('中断保护：启动新动画会取消同一元素上仍在进行的旧动画', async () => {
    const { el, animations } = createFakeElement();

    const p1 = enterLayout(el, FADE);
    expect(animations).toHaveLength(1);

    // 第一个动画尚未完成时启动第二个
    const p2 = enterLayout(el, FADE);
    expect(animations).toHaveLength(2);
    expect(animations[0].cancel).toHaveBeenCalled();

    animations[1].resolve();
    await p2;
    // 被中断的旧动画 promise 也应静默 resolve（从不 reject）
    await expect(p1).resolves.toBeUndefined();
  });
});
