/**
 * 游标卡尺使用演示 — SVG 视图（renderTech: 'svg' 的首个样例）
 *
 * 忽略 createView 传入的 canvas（隐藏之），在 canvas.parentElement 内
 * 插入 <svg> 兄弟节点渲染；主题全部走 var(--*) CSS 变量，随
 * documentElement 的 data-theme 自动切换，setTheme 无需重绘。
 *
 * 交互：游标尺可拖拽（pointer 事件换算 viewBox 坐标，命中区域限定在
 * 滑框/量爪的 y 范围内），拖拽结果通过 svg 上的
 * CustomEvent('instrument-param', { detail: { key, value }, bubbles: true })
 * 上报，由宿主页面回写 sim（契约见 STANDARDS.md 第 3 节）。
 *
 * 几何要点：
 * - 被测物尺寸固定（state.targetSize），只有卡爪动；
 * - 游标滑框宽度随分度自适应（50 分度游标跨 49mm，固定宽度会溢出）。
 */

import type {
  InstrumentViewport,
  InstrumentView
} from '../_contract/instrument-contract';
import type { TeachingTheme } from '../../platform/standards';
import { JAW_MAX, type VernierCaliperGuideState } from './instrument.sim';

const NS = 'http://www.w3.org/2000/svg';

/** 几何常量（viewBox 坐标系，1mm = 4px；游标刻度最密 0.98mm/格 ≈ 3.9px） */
const PX_PER_MM = 4;
const VIEW_W = 900;
const VIEW_H = 430;
const BEAM_X = 90; // 主尺零刻度 x（游标零线 jaw=0 时位置）
const BEAM_Y = 150; // 主尺上缘
const BEAM_H = 50; // 主尺高度（刻度在下缘）
const BEAM_END = BEAM_X + JAW_MAX * PX_PER_MM; // 主尺右端面 x
const JAW_TOP = 70; // 内测量爪刀尖 y
const JAW_BOTTOM = 390; // 外测量爪刀尖 y
const SLIDER_PAD = 60; // 滑框在游标刻度之外的余量（螺钉/边框）
/** 滑框上缘 = 主尺下缘：滑框体不遮挡主尺刻度带（判对齐要看清主尺刻线），
 *  游标刻线尖端与主尺下缘相隔 2px——真实卡尺的尺度贴合关系 */
const SLIDER_TOP = BEAM_Y + BEAM_H;
/** 拖拽命中的 y 范围（滑框体 + 标注区；排除读数面板等） */
const DRAG_Y_MIN = SLIDER_TOP - 4;
const DRAG_Y_MAX = BEAM_Y + BEAM_H + 90;

function el(tag: string, attrs: Record<string, string>): SVGElement {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function text(
  parent: SVGElement,
  x: number,
  y: number,
  content: string,
  size = 13,
  anchor: 'start' | 'middle' | 'end' = 'middle',
  fill = 'var(--text-secondary)'
): SVGElement {
  const t = el('text', {
    x: String(x),
    y: String(y),
    'font-size': String(size),
    'text-anchor': anchor,
    fill
  });
  t.textContent = content;
  parent.appendChild(t);
  return t;
}

function leader(
  parent: SVGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  parent.appendChild(
    el('line', {
      x1: String(x1),
      y1: String(y1),
      x2: String(x2),
      y2: String(y2),
      stroke: 'var(--text-muted)',
      'stroke-width': '1'
    })
  );
}

/** 滑框宽 = 游标刻度跨度 + 余量（50 分度 49mm 刻度必须完整容纳） */
function sliderWidth(state: VernierCaliperGuideState): number {
  return state.vernierLength * PX_PER_MM + SLIDER_PAD;
}

export type VernierCaliperGuideView = InstrumentView<VernierCaliperGuideState>;

export function createVernierCaliperGuideView(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
}): VernierCaliperGuideView {
  const canvas = options.canvas;
  const host = canvas.parentElement;
  if (!host) {
    throw new Error('vernier-caliper-guide: SVG 仪器需要 canvas 存在父容器');
  }
  canvas.style.display = 'none';

  const svg = el('svg', {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    width: '100%',
    height: '100%',
    role: 'img',
    'aria-label': '游标卡尺使用演示图'
  }) as SVGSVGElement;
  svg.style.display = 'block';
  host.appendChild(svg);

  // ── 静态骨架：主尺尺身、固定量爪、主尺刻度、部件标注 ──

  const frame = el('g', {}) as SVGGElement;
  svg.appendChild(frame);

  const ink = 'var(--text-primary)';
  const paper = 'var(--bg-card)';

  // 主尺尺身
  frame.appendChild(
    el('rect', {
      x: String(BEAM_X),
      y: String(BEAM_Y),
      width: String(JAW_MAX * PX_PER_MM),
      height: String(BEAM_H),
      fill: paper,
      stroke: ink,
      'stroke-width': '2'
    })
  );
  // 主尺刻度（下缘）：mm 短刻、5mm 中刻、cm 长刻 + 数字
  for (let mm = 0; mm <= JAW_MAX; mm += 1) {
    const x = BEAM_X + mm * PX_PER_MM;
    const isCm = mm % 10 === 0;
    const len = isCm ? 16 : mm % 5 === 0 ? 11 : 7;
    frame.appendChild(
      el('line', {
        x1: String(x),
        y1: String(BEAM_Y + BEAM_H),
        x2: String(x),
        y2: String(BEAM_Y + BEAM_H - len),
        stroke: ink,
        'stroke-width': isCm ? '1.6' : '1'
      })
    );
    if (isCm) {
      text(frame, x, BEAM_Y + 18, String(mm / 10), 12, 'middle', ink);
    }
  }

  // 固定内测量爪（尺身上侧，刀口朝右，测量面在主尺零刻度）
  frame.appendChild(
    el('path', {
      d: `M ${BEAM_X - 26} ${BEAM_Y} L ${BEAM_X - 26} ${JAW_TOP + 24} L ${BEAM_X - 14} ${JAW_TOP} L ${BEAM_X} ${JAW_TOP + 10} L ${BEAM_X} ${BEAM_Y} Z`,
      fill: paper,
      stroke: ink,
      'stroke-width': '2'
    })
  );
  // 固定外测量爪（尺身下侧，测量面朝右，位于主尺零刻度）
  frame.appendChild(
    el('path', {
      d: `M ${BEAM_X - 34} ${BEAM_Y + BEAM_H} L ${BEAM_X - 34} ${JAW_BOTTOM - 40} L ${BEAM_X - 16} ${JAW_BOTTOM} L ${BEAM_X} ${JAW_BOTTOM - 16} L ${BEAM_X} ${BEAM_Y + BEAM_H} Z`,
      fill: paper,
      stroke: ink,
      'stroke-width': '2'
    })
  );

  // 动态组：被测物、游标滑框、活动量爪、深度尺；overlay：高亮与读数面板
  const moving = el('g', {}) as SVGGElement;
  svg.appendChild(moving);
  const overlay = el('g', {}) as SVGGElement;
  svg.appendChild(overlay);

  // ── 部件标注（全部静态，避免与随滑框移动的标注碰撞） ──
  const labels = el('g', {}) as SVGGElement;
  svg.appendChild(labels);
  text(labels, 30, 52, '内测量爪');
  leader(labels, 48, 56, 66, 74);
  text(labels, 24, 140, '尺身');
  leader(labels, 38, 144, 58, 158);
  text(labels, 480, 138, '主尺');
  leader(labels, 492, 142, 510, 152);
  text(labels, BEAM_END + 60, 212, '深度尺');
  leader(labels, BEAM_END + 52, 208, BEAM_END + 24, 194);
  text(labels, 30, 414, '外测量爪');
  leader(labels, 48, 410, 62, 388);

  let lastState: VernierCaliperGuideState | null = null;

  // ── 拖拽：游标滑框 → jawPosition ──

  let dragStartX = 0;
  let dragStartJaw = 0;

  function toViewX(clientX: number): number {
    const ctm = (svg as SVGSVGElement).getScreenCTM();
    if (!ctm) return 0;
    return (clientX - ctm.e) / ctm.a;
  }

  function toViewY(clientY: number): number {
    const ctm = (svg as SVGSVGElement).getScreenCTM();
    if (!ctm) return 0;
    return (clientY - ctm.f) / ctm.d;
  }

  function onPointerMove(ev: PointerEvent): void {
    const dx = toViewX(ev.clientX) - dragStartX;
    const value = dragStartJaw + dx / PX_PER_MM;
    svg.dispatchEvent(
      new CustomEvent('instrument-param', {
        detail: { key: 'jawPosition', value: Math.round(value * 100) / 100 },
        bubbles: true
      })
    );
  }

  function onPointerUp(): void {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  // ── 渲染 ──

  function render(state: VernierCaliperGuideState): void {
    lastState = state;
    moving.replaceChildren();
    overlay.replaceChildren();

    const jawX = BEAM_X + state.jawPosition * PX_PER_MM;
    const sliderW = sliderWidth(state);
    const demo = state.demo;
    const hi = (step: number): Record<string, string> =>
      demo && state.demoStep === step
        ? { stroke: 'var(--accent-primary)', 'stroke-width': '3' }
        : {};

    // 深度尺（贴在主尺下缘的槽内，尖端随开度伸出尺身右端面）
    const rodStart = Math.min(jawX + sliderW - 20, BEAM_END);
    const rodProtrusion = Math.min(
      state.jawPosition * PX_PER_MM,
      VIEW_W - BEAM_END - 10
    );
    moving.appendChild(
      el('rect', {
        x: String(rodStart),
        y: String(BEAM_Y + BEAM_H - 14),
        width: String(Math.max(8, BEAM_END - rodStart + rodProtrusion)),
        height: '6',
        fill: 'var(--bg-secondary)',
        stroke: ink,
        'stroke-width': '1.2',
        ...(demo && state.mode === 2 ? hi(1) : {})
      })
    );

    // 被测物（尺寸固定 = targetSize，按测量方式装配；画在量爪之前，
    // 使量爪贴合时视觉上压在被测物前方）
    const targetR = (state.targetSize * PX_PER_MM) / 2;
    if (state.mode === 0) {
      // 外径：小球与固定爪测量面（x=BEAM_X）相切，夹在量爪之间
      moving.appendChild(
        el('circle', {
          cx: String(BEAM_X + targetR),
          cy: String(JAW_BOTTOM - 30),
          r: String(targetR),
          fill: 'var(--accent-secondary)',
          'fill-opacity': '0.35',
          stroke: 'var(--accent-primary)',
          'stroke-width': '2'
        })
      );
    } else if (state.mode === 1) {
      // 内径：管件固定，内径 = targetSize，套在两内测量爪刀口外
      const cx = BEAM_X + targetR;
      const cy = (JAW_TOP + BEAM_Y) / 2;
      moving.appendChild(
        el('circle', {
          cx: String(cx),
          cy: String(cy),
          r: String(targetR + 8),
          fill: 'none',
          stroke: 'var(--accent-primary)',
          'stroke-width': '2'
        })
      );
      moving.appendChild(
        el('circle', {
          cx: String(cx),
          cy: String(cy),
          r: String(targetR),
          fill: 'var(--bg-primary)',
          stroke: 'var(--accent-primary)',
          'stroke-width': '2',
          'stroke-dasharray': '4 3'
        })
      );
    } else {
      // 深度：右下角放大示意——尺身端面顶住槽口，深度尺伸入槽底。
      // 槽深固定 = targetSize（2px/mm），杆长 = 当前开度。
      const inset = el('g', {}) as SVGGElement;
      const ix = 620;
      const iy = 284;
      const slotDepth = state.targetSize * 2;
      inset.appendChild(
        el('rect', {
          x: String(ix),
          y: String(iy),
          width: '260',
          height: '136',
          rx: '8',
          fill: 'var(--bg-secondary)',
          stroke: 'var(--border-color)'
        })
      );
      text(inset, ix + 130, iy + 20, '深度测量示意（放大）', 12);
      // 槽体（开口朝左，槽深 = 被测深度）
      inset.appendChild(
        el('path', {
          d:
            `M ${ix + 120} ${iy + 34} h 110 v 92 h -110 v -22 ` +
            `h ${slotDepth} v -48 h ${-slotDepth} Z`,
          fill: 'var(--accent-secondary)',
          'fill-opacity': '0.3',
          stroke: 'var(--accent-primary)',
          'stroke-width': '1.5'
        })
      );
      // 尺身端面顶住槽口
      inset.appendChild(
        el('rect', {
          x: String(ix + 24),
          y: String(iy + 40),
          width: '96',
          height: '24',
          fill: paper,
          stroke: ink,
          'stroke-width': '1.5'
        })
      );
      // 深度尺伸入槽内，长度 ∝ 开度（钳位保证不越过槽底）；
      // 杆与尺身端面下缘相接，视觉上从尺身内伸出
      const rodLen = state.jawPosition * 2;
      inset.appendChild(
        el('rect', {
          x: String(ix + 104),
          y: String(iy + 58),
          width: String(16 + rodLen),
          height: '6',
          fill: 'var(--bg-card)',
          stroke: ink,
          'stroke-width': '1.2'
        })
      );
      text(inset, ix + 130, iy + 128, `槽深 ${state.targetSize} mm`, 11);
      moving.appendChild(inset);
    }

    // 活动内测量爪（刀口朝左，测量面在 jawX）
    moving.appendChild(
      el('path', {
        d: `M ${jawX + 14} ${BEAM_Y} L ${jawX + 14} ${JAW_TOP + 10} L ${jawX} ${JAW_TOP} L ${jawX - 8} ${JAW_TOP + 24} L ${jawX - 8} ${BEAM_Y} Z`,
        fill: paper,
        stroke: ink,
        'stroke-width': '2',
        ...(demo && state.mode === 1 ? hi(1) : {})
      })
    );
    // 活动外测量爪（测量面朝左，位于 jawX）
    moving.appendChild(
      el('path', {
        d: `M ${jawX + 20} ${BEAM_Y + BEAM_H} L ${jawX + 20} ${JAW_BOTTOM - 16} L ${jawX} ${JAW_BOTTOM} L ${jawX - 12} ${JAW_BOTTOM - 40} L ${jawX - 12} ${BEAM_Y + BEAM_H} Z`,
        fill: paper,
        stroke: ink,
        'stroke-width': '2',
        ...(demo && state.mode === 0 ? hi(1) : {})
      })
    );

    // 游标滑框（上缘贴主尺下缘，宽度随分度自适应）
    const sliderX = jawX - 6;
    const slider = el('g', { cursor: 'ew-resize' }) as SVGGElement;
    slider.style.touchAction = 'none';
    slider.appendChild(
      el('rect', {
        x: String(sliderX),
        y: String(SLIDER_TOP),
        width: String(sliderW),
        height: '64',
        fill: 'var(--bg-secondary)',
        'fill-opacity': '0.92',
        stroke: ink,
        'stroke-width': '2',
        ...(demo ? hi(3) : {})
      })
    );
    // 游标零线（探入尺身下缘 4px，便于对照主尺整毫米刻线）
    slider.appendChild(
      el('line', {
        x1: String(jawX),
        y1: String(SLIDER_TOP - 4),
        x2: String(jawX),
        y2: String(BEAM_Y + BEAM_H + 18),
        stroke: 'var(--accent-primary)',
        'stroke-width': '2'
      })
    );
    // 游标刻度：N 分度跨 length mm（画 0..N 共 N+1 条线）；
    // 主刻与数字间隔：10/20 分度取半程，50 分度按惯例每 10 格
    const n = state.vernierDivisions;
    const stepPx = (state.vernierLength / n) * PX_PER_MM;
    const majorEvery = n === 50 ? 10 : n / 2;
    for (let k = 0; k <= n; k += 1) {
      const x = jawX + k * stepPx;
      const major = k % majorEvery === 0;
      slider.appendChild(
        el('line', {
          x1: String(x),
          y1: String(BEAM_Y + BEAM_H + 18),
          x2: String(x),
          y2: String(BEAM_Y + BEAM_H + (major ? 2 : 8)),
          stroke: ink,
          'stroke-width': major ? '1.4' : '1'
        })
      );
      if (k % majorEvery === 0) {
        text(slider, x, BEAM_Y + BEAM_H + 46, String(k), 11, 'middle', ink);
      }
    }
    // 紧固螺钉（置于滑框体内右侧，标注紧随其后——随滑框移动但不与
    // 静态标注碰撞）
    const screwX = jawX + sliderW - 28;
    const screwY = BEAM_Y + BEAM_H + 10;
    slider.appendChild(
      el('circle', {
        cx: String(screwX),
        cy: String(screwY),
        r: '9',
        fill: paper,
        stroke: ink,
        'stroke-width': '2',
        ...(demo ? hi(2) : {})
      })
    );
    slider.appendChild(
      el('line', {
        x1: String(screwX - 7),
        y1: String(screwY - 7),
        x2: String(screwX + 7),
        y2: String(screwY + 7),
        stroke: ink,
        'stroke-width': '1.5'
      })
    );
    text(slider, screwX, screwY + 24, '紧固螺钉', 11);
    text(slider, jawX + sliderW / 2, BEAM_Y + BEAM_H + 76, '游标尺', 12);
    moving.appendChild(slider);

    // 对齐高亮：最优对齐的游标格与对应主尺刻度。
    // 练习模式（showReading=0）不画——高亮会直接泄露答案
    if (state.showReading) {
      const alignX = jawX + state.vernierAlignment * stepPx;
      overlay.appendChild(
        el('line', {
          x1: String(alignX),
          y1: String(BEAM_Y + BEAM_H - 20),
          x2: String(alignX),
          y2: String(BEAM_Y + BEAM_H + 20),
          stroke: 'var(--accent-primary)',
          'stroke-width': '2.5',
          'stroke-opacity': '0.9'
        })
      );
    }

    // 读数面板（练习模式隐藏答案；演示步骤①还未贴合，不显示读数）
    const panel = el('g', {}) as SVGGElement;
    const px = 620;
    const py = 24;
    panel.appendChild(
      el('rect', {
        x: String(px),
        y: String(py),
        width: '262',
        height: '104',
        rx: '8',
        fill: 'var(--bg-card)',
        stroke: 'var(--border-color)',
        ...(demo ? hi(3) : {})
      })
    );
    text(panel, px + 14, py + 24, state.modeName, 13, 'start', ink);
    const showNumbers = state.showReading && !(demo && state.demoStep === 0);
    if (showNumbers) {
      text(
        panel,
        px + 14,
        py + 48,
        `主尺读数：${state.mainScaleReading} mm`,
        13,
        'start'
      );
      text(
        panel,
        px + 14,
        py + 70,
        `游标：第 ${state.vernierAlignment} 格 × ${state.precision} mm`,
        13,
        'start'
      );
      text(
        panel,
        px + 14,
        py + 94,
        `测量值 = ${state.totalReading.toFixed(2)} mm`,
        15,
        'start',
        'var(--accent-primary)'
      );
    } else if (state.showReading) {
      text(panel, px + 14, py + 52, '① 选择测量方式', 13, 'start');
      text(panel, px + 14, py + 76, '（量爪贴合后显示读数）', 12, 'start');
    } else {
      text(panel, px + 14, py + 52, '练习模式：请先自行读数', 13, 'start');
      text(
        panel,
        px + 14,
        py + 76,
        '（打开「显示读数」核对答案）',
        12,
        'start'
      );
    }
    overlay.appendChild(panel);

    // 演示步骤提示
    if (demo) {
      const stepsText = [
        '① 选择测量方式',
        '② 量爪贴合被测物',
        '③ 锁紧紧固螺钉',
        '④ 读数：主尺 + 游标对齐格 × 精度'
      ];
      text(
        overlay,
        BEAM_X,
        30,
        stepsText[state.demoStep],
        15,
        'start',
        'var(--accent-primary)'
      );
    }
  }

  svg.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || !lastState) return;
    const x = toViewX(ev.clientX);
    const y = toViewY(ev.clientY);
    const jawX = BEAM_X + lastState.jawPosition * PX_PER_MM;
    const sliderW = sliderWidth(lastState);
    // 命中区域限定在滑框/量爪范围内（x 与 y 双向校验），
    // 避免点击读数面板等重叠区域时误触发拖拽
    if (
      x >= jawX - 10 &&
      x <= jawX - 6 + sliderW + 4 &&
      y >= DRAG_Y_MIN &&
      y <= DRAG_Y_MAX
    ) {
      dragStartX = x;
      dragStartJaw = lastState.jawPosition;
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      ev.preventDefault();
    }
  });

  return {
    render,
    resize(): void {
      /* viewBox 自适应容器，无需重算 */
    },
    setTheme(): void {
      /* 主题全部走 var(--*) CSS 变量，随 data-theme 自动切换 */
    },
    setViewport(): void {
      /* SVG 以 viewBox 等比缩放，不使用 canvas viewport 剪裁 */
    },
    dispose(): void {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      svg.remove();
      canvas.style.display = '';
    }
  };
}
