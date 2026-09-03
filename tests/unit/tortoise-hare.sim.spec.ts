import { describe, expect, it } from 'vitest';
import {
  createRaceSim,
  getRacePreset,
  RACE_T_MAX,
  RACE_X_MAX
} from '../../src/scenes/tortoise-hare/scene.sim';

describe('tortoise-hare sim', () => {
  /* ── 经典龟兔赛跑：龟先到终点 ── */

  it('classic-race：兔领跑后睡觉（v=0），龟匀速 1.6 m/s 先到终点', () => {
    const sim = createRaceSim('classic-race');
    // 兔第一段 (0→12，2 s)：v = 6；x(1) = 6
    sim.step(1);
    let s = sim.getState();
    expect(s.xb).toBeCloseTo(6, 10);
    expect(s.vb).toBeCloseTo(6, 10);
    // 睡觉段 (t=2..9.5)：x 恒为 12，v = 0；此时龟 x(5) = 1.6×5 = 8
    sim.step(4);
    s = sim.getState();
    expect(s.xb).toBeCloseTo(12, 10);
    expect(s.vb).toBeCloseTo(0, 10);
    expect(s.xa).toBeCloseTo(8, 10);
    // t=10：龟到终点 16（1.6×10），兔 12 + 6×0.5 = 15 → 龟赢
    sim.step(5);
    s = sim.getState();
    expect(s.xa).toBeCloseTo(16, 10);
    expect(s.xb).toBeCloseTo(15, 10);
  });

  /* ── 双匀速：间距随时间线性拉大 ── */

  it('two-uniform：t=4 时龟 x=4、兔 x=10，间距 6', () => {
    const sim = createRaceSim('two-uniform');
    sim.step(4);
    const s = sim.getState();
    expect(s.xa).toBeCloseTo(4, 10);
    expect(s.xb).toBeCloseTo(10, 10);
    expect(s.xb - s.xa).toBeCloseTo(6, 10);
  });

  /* ── 相遇点（手算解析解） ── */

  it('opposite：2t = 16−2t → t=4 相遇于 x=8', () => {
    const sim = createRaceSim('opposite');
    sim.step(4);
    const s = sim.getState();
    expect(s.xa).toBeCloseTo(8, 10);
    expect(s.xb).toBeCloseTo(8, 10);
    expect(s.vb).toBeCloseTo(-2, 10); // 兔朝 −x 方向
  });

  it('late-start：t = 3(t−3) → t=4.5 追上，x=4.5；兔出发前原地待命', () => {
    const sim = createRaceSim('late-start');
    // t=2 < delay 3：兔仍在起点
    sim.step(2);
    let s = sim.getState();
    expect(s.xb).toBeCloseTo(0, 10);
    expect(s.vb).toBeCloseTo(0, 10);
    // t=4.5：龟 x = 4.5，兔 x = 3×(4.5−3) = 4.5 → 相遇
    sim.step(2.5);
    s = sim.getState();
    expect(s.xa).toBeCloseTo(4.5, 10);
    expect(s.xb).toBeCloseTo(4.5, 10);
  });

  it('accel-chase：2t = 0.25t² → t=8 在终点 x=16 追上；x(4)=4, v(4)=2', () => {
    const sim = createRaceSim('accel-chase');
    // 兔 x(t) = 0.25t²：x(4) = 4，v(4) = 0.5×4 = 2；龟 x(4) = 8（领先）
    sim.step(4);
    let s = sim.getState();
    expect(s.xb).toBeCloseTo(4, 10);
    expect(s.vb).toBeCloseTo(2, 10);
    expect(s.xa).toBeCloseTo(8, 10);
    // t=8：龟 x = 16，兔 x = 0.25×64 = 16 → 终点处相遇
    sim.step(4);
    s = sim.getState();
    expect(s.xa).toBeCloseTo(16, 10);
    expect(s.xb).toBeCloseTo(16, 10);
  });

  it('late-accel：兔晚出发 2 s，x(6) = 0.5×(6−2)² = 8，v(6) = 4', () => {
    const sim = createRaceSim('late-accel');
    sim.step(6);
    const s = sim.getState();
    expect(s.xb).toBeCloseTo(8, 10);
    expect(s.vb).toBeCloseTo(4, 10);
    // 龟 x(6) = 1.5×6 = 9，仍领先 1 m
    expect(s.xa).toBeCloseTo(9, 10);
  });

  /* ── 边界钳制：到达端点后停下 ── */

  it('到达赛道端点后位置钳制、速度归零', () => {
    const sim = createRaceSim('two-uniform');
    // 兔 v=2.5：t=6.4 到终点 16；t=7 时应停在 16 且 v=0
    sim.step(7);
    const s = sim.getState();
    expect(s.xb).toBe(RACE_X_MAX);
    expect(s.vb).toBe(0);
    // 龟 x(7) = 7，仍在途中
    expect(s.xa).toBeCloseTo(7, 10);
    expect(s.va).toBeCloseTo(1, 10);
  });

  it('opposite 中兔到达 x=0 后停下（不越过起点）', () => {
    const sim = createRaceSim('opposite');
    // 兔 v=−2：t=8 到 x=0；t=9 时钳制在 0
    sim.step(9);
    const s = sim.getState();
    expect(s.xb).toBe(0);
    expect(s.vb).toBe(0);
  });

  /* ── 不变量：v 是 x 的时间导数（中心差分，取光滑点 t=3.7） ── */

  it('每个预设两名运动者的 v(t) 都是 x(t) 的导数', () => {
    const eps = 1e-6;
    for (const id of [
      'classic-race',
      'two-uniform',
      'opposite',
      'late-start',
      'accel-chase',
      'late-accel'
    ] as const) {
      const p = getRacePreset(id);
      for (const mover of [p.a, p.b]) {
        const numeric = (mover.x(3.7 + eps) - mover.x(3.7 - eps)) / (2 * eps);
        expect(mover.v(3.7)).toBeCloseTo(numeric, 4);
      }
    }
  });

  /* ── 通用行为 ── */

  it('到达 T_MAX 后 clamp 并标记 finished，后续 step 为空操作', () => {
    const sim = createRaceSim('classic-race');
    sim.step(RACE_T_MAX + 5);
    expect(sim.getState().t).toBe(RACE_T_MAX);
    expect(sim.getState().finished).toBe(true);
    sim.step(1);
    expect(sim.getState().t).toBe(RACE_T_MAX);
  });

  it('reset 回到 t=0；setPreset 切换预设并回零；未知 id 回退默认', () => {
    const sim = createRaceSim('opposite');
    sim.step(3);
    sim.reset();
    expect(sim.getState().t).toBe(0);
    expect(sim.getState().finished).toBe(false);
    sim.step(2);
    sim.setPreset('two-uniform');
    expect(sim.getState().preset).toBe('two-uniform');
    expect(sim.getState().t).toBe(0);
    sim.setPreset('not-a-preset');
    expect(sim.getState().preset).toBe('classic-race');
  });
});
