import { describe, it, expect } from 'vitest';
import { drawArrow, pathRoundRect } from '../../src/core/draw-primitives';

type Call = { name: string; args: number[] };

/**
 * 记录调用的假 2D 上下文。
 * happy-dom 没有真实的 canvas 2D 实现，这里用手写 stub 验证绘制调用序列。
 */
function makeStubCtx(): {
  ctx: CanvasRenderingContext2D;
  calls: Call[];
  style: {
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    lineCap: string;
  };
} {
  const calls: Call[] = [];
  const record =
    (name: string) =>
    (...args: number[]) => {
      calls.push({ name, args });
    };
  const style = {
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt'
  };
  const ctx = {
    ...style,
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    closePath: record('closePath'),
    stroke: record('stroke'),
    fill: record('fill'),
    arcTo: record('arcTo')
  };
  // style 与 ctx 共享属性引用：drawArrow 写入 ctx.strokeStyle 时
  // 需要能在断言中读到，因此直接代理到同一个对象上
  const proxy = new Proxy(ctx, {
    set(target, prop, value) {
      if (prop in style) {
        Reflect.set(style, prop, value);
        return true;
      }
      return Reflect.set(target, prop, value);
    }
  });
  return {
    ctx: proxy as unknown as CanvasRenderingContext2D,
    calls,
    style
  };
}

function callsOf(calls: Call[], name: string): Call[] {
  return calls.filter((c) => c.name === name);
}

describe('drawArrow', () => {
  it('短于 1px 的线段直接返回，不产生任何绘制调用', () => {
    const { ctx, calls } = makeStubCtx();
    drawArrow(ctx, 10, 10, 10.5, 10.5);
    expect(calls).toHaveLength(0);
  });

  it('默认实心头：先描箭杆再填充三角头，并设置颜色/线宽/圆线帽', () => {
    const { ctx, calls, style } = makeStubCtx();
    drawArrow(ctx, 10, 10, 110, 10, { color: 'red', lineWidth: 2 });

    expect(style.strokeStyle).toBe('red');
    expect(style.fillStyle).toBe('red');
    expect(style.lineWidth).toBe(2);
    expect(style.lineCap).toBe('round');

    // 调用序列：save → 杆(begin/move/line/stroke) → 头(begin/move/line/line/close/fill) → restore
    const seq = calls.map((c) => c.name);
    expect(seq).toEqual([
      'save',
      'beginPath',
      'moveTo',
      'lineTo',
      'stroke',
      'beginPath',
      'moveTo',
      'lineTo',
      'lineTo',
      'closePath',
      'fill',
      'restore'
    ]);

    // 箭杆
    expect(callsOf(calls, 'moveTo')[0].args).toEqual([10, 10]);
    expect(callsOf(calls, 'lineTo')[0].args).toEqual([110, 10]);

    // 实心三角头：tip 在终点，两翼按 headSize=8、headAngle=π/6 展开
    const cos = Math.cos(Math.PI / 6);
    const sin = Math.sin(Math.PI / 6);
    expect(callsOf(calls, 'moveTo')[1].args).toEqual([110, 10]);
    const wing1 = callsOf(calls, 'lineTo')[1].args;
    const wing2 = callsOf(calls, 'lineTo')[2].args;
    expect(wing1[0]).toBeCloseTo(110 - 8 * cos);
    expect(wing1[1]).toBeCloseTo(10 + 8 * sin);
    expect(wing2[0]).toBeCloseTo(110 - 8 * cos);
    expect(wing2[1]).toBeCloseTo(10 - 8 * sin);
    expect(callsOf(calls, 'fill')).toHaveLength(1);
  });

  it('fillHead: false 时头部为开口 V 形描边，不填充', () => {
    const { ctx, calls } = makeStubCtx();
    drawArrow(ctx, 0, 0, 100, 0, { fillHead: false, headSize: 10 });

    expect(callsOf(calls, 'fill')).toHaveLength(0);
    // 1 次箭杆 stroke + 1 次 V 头 stroke
    expect(callsOf(calls, 'stroke')).toHaveLength(2);
    expect(callsOf(calls, 'closePath')).toHaveLength(0);

    // V 头路径：moveTo(wing1) → lineTo(tip) → lineTo(wing2)
    const cos = Math.cos(Math.PI / 6);
    const sin = Math.sin(Math.PI / 6);
    const headMove = callsOf(calls, 'moveTo')[1].args;
    expect(headMove[0]).toBeCloseTo(100 - 10 * cos);
    expect(headMove[1]).toBeCloseTo(0 + 10 * sin);
    expect(callsOf(calls, 'lineTo')[1].args).toEqual([100, 0]);
    const wing2 = callsOf(calls, 'lineTo')[2].args;
    expect(wing2[0]).toBeCloseTo(100 - 10 * cos);
    expect(wing2[1]).toBeCloseTo(0 - 10 * sin);
  });

  it('doubleEnded: 起点也绘制头部（双向箭头）', () => {
    const { ctx, calls } = makeStubCtx();
    drawArrow(ctx, 10, 10, 110, 10, { doubleEnded: true, headSize: 8 });

    // 杆 stroke 一次，两个实心头各 fill 一次
    expect(callsOf(calls, 'stroke')).toHaveLength(1);
    expect(callsOf(calls, 'fill')).toHaveLength(2);

    // 起点头：tip 在 (10,10)，两翼朝终点方向张开
    const cos = Math.cos(Math.PI / 6);
    const sin = Math.sin(Math.PI / 6);
    const startTip = callsOf(calls, 'moveTo')[2].args;
    expect(startTip).toEqual([10, 10]);
    const wing1 = callsOf(calls, 'lineTo')[3].args;
    const wing2 = callsOf(calls, 'lineTo')[4].args;
    expect(wing1[0]).toBeCloseTo(10 + 8 * cos);
    expect(wing1[1]).toBeCloseTo(10 - 8 * sin);
    expect(wing2[0]).toBeCloseTo(10 + 8 * cos);
    expect(wing2[1]).toBeCloseTo(10 + 8 * sin);
  });

  it('不传 color/lineWidth 时沿用 ctx 当前样式', () => {
    const { ctx, style } = makeStubCtx();
    style.strokeStyle = 'rgb(1,2,3)';
    style.lineWidth = 5;
    drawArrow(ctx, 0, 0, 50, 0);
    expect(style.strokeStyle).toBe('rgb(1,2,3)');
    expect(style.fillStyle).toBe('#000000');
    expect(style.lineWidth).toBe(5);
  });
});

describe('pathRoundRect', () => {
  it('按 beginPath → moveTo → 4×arcTo → closePath 构建路径', () => {
    const { ctx, calls } = makeStubCtx();
    pathRoundRect(ctx, 10, 20, 100, 50, 8);

    const seq = calls.map((c) => c.name);
    expect(seq).toEqual([
      'beginPath',
      'moveTo',
      'arcTo',
      'arcTo',
      'arcTo',
      'arcTo',
      'closePath'
    ]);

    expect(callsOf(calls, 'moveTo')[0].args).toEqual([18, 20]);
    const arcs = callsOf(calls, 'arcTo');
    expect(arcs[0].args).toEqual([110, 20, 110, 70, 8]);
    expect(arcs[1].args).toEqual([110, 70, 10, 70, 8]);
    expect(arcs[2].args).toEqual([10, 70, 10, 20, 8]);
    expect(arcs[3].args).toEqual([10, 20, 110, 20, 8]);
  });

  it('半径钳制到 min(w,h)/2', () => {
    const { ctx, calls } = makeStubCtx();
    pathRoundRect(ctx, 0, 0, 40, 20, 999);

    // r 被钳制为 10
    expect(callsOf(calls, 'moveTo')[0].args).toEqual([10, 0]);
    for (const arc of callsOf(calls, 'arcTo')) {
      expect(arc.args[4]).toBe(10);
    }
  });

  it('负半径钳制为 0（退化为直角矩形）', () => {
    const { ctx, calls } = makeStubCtx();
    pathRoundRect(ctx, 5, 5, 30, 30, -4);

    expect(callsOf(calls, 'moveTo')[0].args).toEqual([5, 5]);
    for (const arc of callsOf(calls, 'arcTo')) {
      expect(arc.args[4]).toBe(0);
    }
  });
});
