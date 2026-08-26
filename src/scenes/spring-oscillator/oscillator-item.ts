import type { Oscillator } from './scene.sim';
import type { SpringOscillatorScene } from './scene.entry';
import { createMiniSlider } from './mini-slider';

export interface OscillatorItemHandle {
  element: HTMLElement;
  dispose: () => void;
}

export function renderOscillatorItem(
  scene: SpringOscillatorScene,
  osc: Oscillator,
  index: number,
  onUpdate: () => void,
  onStatus?: (text: string) => void
): OscillatorItemHandle {
  const disposers: Array<() => void> = [];

  const item = document.createElement('div');
  // 紧凑的布局：色块 | k滑块 m滑块 x0滑块 | 方向 | 删除
  item.style.cssText = `
    display: flex;
    align-items: center;
    gap: calc(5px * var(--ui-scale, 1));
    padding: calc(4px * var(--ui-scale, 1)) calc(8px * var(--ui-scale, 1));
    background: var(--bg-card);
    border-radius: 5px;
    border: 1px solid var(--border-color);
    min-height: calc(36px * var(--ui-scale, 1));
  `;
  item.style.borderLeft = `3px solid ${osc.color}`;

  // 色块标识 - 响应式大小
  const colorDot = document.createElement('div');
  colorDot.className = 'rounded-full shrink-0';
  colorDot.style.width = 'calc(8px * var(--ui-scale, 1))';
  colorDot.style.height = 'calc(8px * var(--ui-scale, 1))';
  colorDot.style.background = osc.color;

  // 参数控制区（三个滑块紧凑排列）
  const paramsContainer = document.createElement('div');
  paramsContainer.className = 'flex-1 flex items-center gap-[2px] min-w-0';
  paramsContainer.style.flexWrap = 'wrap';
  paramsContainer.style.rowGap = '2px';

  // k 滑块
  const kControl = createMiniSlider('k', osc.params.k, 1, 100, 1, '', (val) => {
    scene.updateOscillator(osc.id, { k: val });
    scene.resetOscillator(osc.id);
    scene.render();
  });
  disposers.push(kControl.dispose);

  // m 滑块
  const mControl = createMiniSlider(
    'm',
    osc.params.m,
    0.1,
    10,
    0.1,
    '',
    (val) => {
      scene.updateOscillator(osc.id, { m: val });
      scene.resetOscillator(osc.id);
      scene.render();
    }
  );
  disposers.push(mControl.dispose);

  // x0 滑块
  const x0Control = createMiniSlider(
    'x₀',
    osc.params.x0,
    -20,
    20,
    0.5,
    '',
    (val) => {
      scene.updateOscillator(osc.id, { x0: val });
      scene.resetOscillator(osc.id);
      scene.render();
    }
  );
  disposers.push(x0Control.dispose);

  paramsContainer.append(kControl.element, mControl.element, x0Control.element);

  // 方向切换按钮（点击切换）
  const isHorizontal = osc.params.orientation === 'horizontal';
  const orientBtn = document.createElement('button');
  orientBtn.type = 'button';
  orientBtn.className =
    'font-bold rounded shrink-0 cursor-pointer transition-all';
  orientBtn.style.cssText = `
    width: calc(28px * var(--ui-scale, 1));
    height: calc(24px * var(--ui-scale, 1));
    font-size: calc(14px * var(--ui-scale, 1));
    border: 1px solid var(--border-color);
    background: var(--btn-bg);
    color: var(--text-primary);
  `;

  const onOrientEnter = () => {
    orientBtn.style.background = 'var(--btn-hover-bg)';
  };
  const onOrientLeave = () => {
    orientBtn.style.background = 'var(--btn-bg)';
  };
  orientBtn.addEventListener('mouseenter', onOrientEnter);
  orientBtn.addEventListener('mouseleave', onOrientLeave);

  orientBtn.textContent = isHorizontal ? '横' : '竖';
  orientBtn.title = '点击切换方向';

  const onOrientClick = () => {
    const newOrientation = isHorizontal ? 'vertical' : 'horizontal';
    scene.updateOscillator(osc.id, { orientation: newOrientation });
    scene.resetOscillator(osc.id);
    scene.render();
    onUpdate();
    onStatus?.(
      `${index + 1}号${newOrientation === 'horizontal' ? '横向' : '竖向'}`
    );
  };
  orientBtn.addEventListener('click', onOrientClick);

  disposers.push(
    () => orientBtn.removeEventListener('mouseenter', onOrientEnter),
    () => orientBtn.removeEventListener('mouseleave', onOrientLeave),
    () => orientBtn.removeEventListener('click', onOrientClick)
  );

  // 删除按钮
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.style.cssText = `
    width: calc(22px * var(--ui-scale, 1));
    height: calc(22px * var(--ui-scale, 1));
    font-size: calc(14px * var(--ui-scale, 1));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FF6B6B;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  `;

  const onDelEnter = () => {
    delBtn.style.background = 'rgba(255,107,107,0.1)';
  };
  const onDelLeave = () => {
    delBtn.style.background = 'transparent';
  };
  delBtn.addEventListener('mouseenter', onDelEnter);
  delBtn.addEventListener('mouseleave', onDelLeave);

  delBtn.textContent = '✕';
  delBtn.title = '删除';

  const onDelClick = () => {
    scene.removeOscillator(osc.id);
    onUpdate();
    scene.render();
    onStatus?.(`删除振子 ${index + 1}`);
  };
  delBtn.addEventListener('click', onDelClick);

  disposers.push(
    () => delBtn.removeEventListener('mouseenter', onDelEnter),
    () => delBtn.removeEventListener('mouseleave', onDelLeave),
    () => delBtn.removeEventListener('click', onDelClick)
  );

  item.append(colorDot, paramsContainer, orientBtn, delBtn);

  return {
    element: item,
    dispose() {
      disposers.forEach((fn) => fn());
      disposers.length = 0;
    }
  };
}
