/**
 * 游标卡尺使用演示 sim — 读数规则测试
 *
 * 期望值全部手算（游标读数规则：测量值 = 主尺整毫米 + 对齐格 × 精度，
 * 10 分度游标 9mm/格距 0.9mm，20 分度 19mm/0.95mm，50 分度 49mm/0.98mm），
 * 不从实现抄公式。写法遵循 docs/physics-testing-guide.md。
 */

import { describe, expect, it } from 'vitest';
import {
  computeReading,
  createVernierCaliperGuideSim,
  JAW_MAX
} from '../../src/instruments/vernier-caliper-guide/instrument.sim';
import type { VernierCaliperGuideParams } from '../../src/instruments/vernier-caliper-guide/instrument.sim';

const base: VernierCaliperGuideParams = {
  precision: 0.1,
  mode: 0,
  jawPosition: 23.7,
  showReading: 1,
  demo: 0
};

describe('vernier-caliper-guide sim', () => {
  describe('读数引擎（手算期望值）', () => {
    it('0.1mm 精度：23.7mm → 主尺 23，第 7 格对齐（23.7 + 7×0.9 = 30.0）', () => {
      const r = computeReading(23.7, 0.1);
      expect(r.mainScaleReading).toBe(23);
      expect(r.vernierAlignment).toBe(7);
      expect(r.alignOffset).toBeCloseTo(0, 10);
      expect(r.totalReading).toBeCloseTo(23.7, 10);
    });

    it('0.1mm 精度：34.2mm → 主尺 34，第 2 格对齐（34.2 + 2×0.9 = 36.0）', () => {
      const r = computeReading(34.2, 0.1);
      expect(r.mainScaleReading).toBe(34);
      expect(r.vernierAlignment).toBe(2);
      expect(r.totalReading).toBeCloseTo(34.2, 10);
    });

    it('0.05mm 精度：10.55mm → 主尺 10，第 11 格对齐（10.55 + 11×0.95 = 21.0）', () => {
      const r = computeReading(10.55, 0.05);
      expect(r.mainScaleReading).toBe(10);
      expect(r.vernierAlignment).toBe(11);
      expect(r.totalReading).toBeCloseTo(10.55, 10);
    });

    it('0.02mm 精度：5.24mm → 主尺 5，第 12 格对齐（与既有卡尺 spec 交叉核对）', () => {
      // 5.24 + 12×0.98 = 17.0（游标第 12 格线与主尺 17mm 线对齐）
      const r = computeReading(5.24, 0.02);
      expect(r.mainScaleReading).toBe(5);
      expect(r.vernierAlignment).toBe(12);
      expect(r.totalReading).toBeCloseTo(5.24, 10);
    });

    it('0.1mm 精度：深度目标 41.9mm → 第 9 格对齐（41.9 + 9×0.9 = 50.0）', () => {
      const r = computeReading(41.9, 0.1);
      expect(r.mainScaleReading).toBe(41);
      expect(r.vernierAlignment).toBe(9);
      expect(r.totalReading).toBeCloseTo(41.9, 10);
    });

    it('零位：0mm 时零格对齐，读数为 0', () => {
      const r = computeReading(0, 0.02);
      expect(r.mainScaleReading).toBe(0);
      expect(r.vernierAlignment).toBe(0);
      expect(r.totalReading).toBe(0);
    });

    it('进位边界：99.97mm 应读 100.0mm（零线对齐右侧 100 刻线），而非 99.0', () => {
      // 回归：旧「floor + 逐格搜索」算法在此情形误读为 99.0（误差近 1mm）
      const r = computeReading(99.97, 0.1);
      expect(r.mainScaleReading).toBe(100);
      expect(r.vernierAlignment).toBe(0);
      expect(r.totalReading).toBeCloseTo(100.0, 10);
      expect(r.alignOffset).toBeCloseTo(0.03, 10);
    });

    it('性质（不变量）：读数量化误差不超过半个分度值', () => {
      // 游标原理的数学性质：任意位置的读数与真值偏差 ≤ 精度/2，
      // 且对齐格读数分解与总读数自洽（与实现细节无关）
      for (const precision of [0.1, 0.05, 0.02] as const) {
        for (const jaw of [3.14, 12.5, 23.7, 57.31, 99.97, 149.2]) {
          const r = computeReading(jaw, precision);
          expect(Math.abs(r.totalReading - jaw)).toBeLessThanOrEqual(
            precision / 2 + 1e-9
          );
          expect(
            r.mainScaleReading + r.vernierAlignment * precision
          ).toBeCloseTo(r.totalReading, 10);
        }
      }
    });
  });

  describe('参数归一化', () => {
    it('非法精度吸附到最近合法档（0.03 → 0.02）', () => {
      const sim = createVernierCaliperGuideSim({
        ...base,
        precision: 0.03 as 0.02
      });
      expect(sim.getState().precision).toBe(0.02);
    });

    it('字符串输入经 setParams 归一化（控件可能传字符串）', () => {
      const sim = createVernierCaliperGuideSim(base);
      sim.setParams({ precision: '0.05' as unknown as 0.05 });
      expect(sim.getState().precision).toBe(0.05);
      expect(sim.getState().vernierDivisions).toBe(20);
    });

    it('卡爪位置按测量方式物理钳位（被测物固定）', () => {
      const sim = createVernierCaliperGuideSim(base); // mode 0，外径 23.7
      // 外径：开度不能小于被测外径（球挡住），不超过量程
      sim.setParams({ jawPosition: -5 });
      expect(sim.getState().jawPosition).toBe(23.7);
      sim.setParams({ jawPosition: 200 });
      expect(sim.getState().jawPosition).toBe(JAW_MAX);
      // 内径：开度不能超过被测内径（管壁挡住），不小于 0
      sim.setParams({ mode: 1, jawPosition: 100 });
      expect(sim.getState().jawPosition).toBe(34.2);
      sim.setParams({ jawPosition: -5 });
      expect(sim.getState().jawPosition).toBe(0);
      // 深度：杆长不能超过槽深
      sim.setParams({ mode: 2, jawPosition: 100 });
      expect(sim.getState().jawPosition).toBe(41.9);
    });

    it('非法 mode 吸附到 0（外径）', () => {
      const sim = createVernierCaliperGuideSim(base);
      sim.setParams({ mode: 7 as 0 });
      expect(sim.getState().mode).toBe(0);
      expect(sim.getState().modeName).toContain('外径');
    });
  });

  describe('三种测量方式', () => {
    it('各模式携带各自的目标被测尺寸与名称', () => {
      const sim = createVernierCaliperGuideSim(base);
      expect(sim.getState().targetSize).toBe(23.7);

      sim.setParams({ mode: 1 });
      expect(sim.getState().targetSize).toBe(34.2);
      expect(sim.getState().modeName).toContain('内径');

      sim.setParams({ mode: 2 });
      expect(sim.getState().targetSize).toBe(41.9);
      expect(sim.getState().modeName).toContain('深度');
    });

    it('三模式共用同一读数引擎：jaw=34.2 在任一模式下读数一致', () => {
      const sim = createVernierCaliperGuideSim({ ...base, jawPosition: 34.2 });
      const readings = ([0, 1, 2] as const).map((mode) => {
        sim.setParams({ mode });
        return sim.getState().totalReading;
      });
      expect(readings[0]).toBeCloseTo(34.2, 10);
      expect(readings[1]).toBeCloseTo(readings[0], 10);
      expect(readings[2]).toBeCloseTo(readings[0], 10);
    });
  });

  describe('练习与演示', () => {
    it('showReading=0 时状态暴露练习标记（视图据此隐藏答案）', () => {
      const sim = createVernierCaliperGuideSim({ ...base, showReading: 0 });
      expect(sim.getState().showReading).toBe(false);
      // 读数仍照常计算——只是视图不显示，便于「先读数后核对」
      expect(sim.getState().totalReading).toBeCloseTo(23.7, 10);
    });

    it('demo=1 时 step 推进演示步骤，卡爪向目标尺寸贴合', () => {
      const sim = createVernierCaliperGuideSim({ ...base, demo: 1 });
      // 步骤 0（选方式）：首个 step 后卡爪张开到 target+30
      sim.step(0.016);
      expect(sim.getState().demoStep).toBe(0);
      expect(sim.getState().jawPosition).toBe(23.7 + 30);

      // 步骤 1（贴合中）：卡爪应在 target 与 target+30 之间
      sim.step(1.6 + 0.8);
      const s = sim.getState();
      expect(s.demoStep).toBe(1);
      expect(s.jawPosition).toBeGreaterThan(23.7);
      expect(s.jawPosition).toBeLessThan(23.7 + 30);

      // 步骤 2/3：贴合完成
      sim.step(1.6);
      expect(sim.getState().demoStep).toBe(2);
      expect(sim.getState().jawPosition).toBe(23.7);
    });

    it('内径 demo 反向贴合：从收拢张向目标内径，不越过管壁', () => {
      const sim = createVernierCaliperGuideSim({ ...base, mode: 1, demo: 1 });
      // 步骤 0：卡爪收拢到 target-30（钳位上限是被测内径 34.2，不能从外侧来）
      sim.step(0.016);
      expect(sim.getState().jawPosition).toBeCloseTo(34.2 - 30, 10);
      // 步骤 2/3：贴合完成，开度 = 内径
      sim.step(1.6 * 2 + 0.1);
      expect(sim.getState().demoStep).toBe(2);
      expect(sim.getState().jawPosition).toBe(34.2);
    });

    it('demo 循环播放：超过 4 步后回到步骤 0', () => {
      const sim = createVernierCaliperGuideSim({ ...base, demo: 1 });
      sim.step(1.6 * 4 + 0.1);
      expect(sim.getState().demoStep).toBe(0);
    });

    it('demo 播放中手动拖爪（外部写入 jawPosition）自动退出演示', () => {
      const sim = createVernierCaliperGuideSim({ ...base, demo: 1 });
      sim.step(0.5);
      expect(sim.getState().demo).toBe(true);
      // 宿主回写拖拽结果（instrument-param → setParams）
      sim.setParams({ jawPosition: 60 });
      expect(sim.getState().demo).toBe(false);
      expect(sim.getState().jawPosition).toBe(60);
      // 退出后 step 不再覆盖用户位置
      sim.step(5);
      expect(sim.getState().jawPosition).toBe(60);
    });

    it('demo=0 时 step 不改变任何状态', () => {
      const sim = createVernierCaliperGuideSim(base);
      const before = sim.getState();
      sim.step(5);
      expect(sim.getState()).toEqual(before);
    });
  });

  describe('reset', () => {
    it('恢复到初始参数并清零演示时钟', () => {
      const sim = createVernierCaliperGuideSim({ ...base, demo: 1 });
      sim.setParams({ jawPosition: 80, mode: 2 });
      sim.step(3.2);
      sim.reset();
      const s = sim.getState();
      expect(s.jawPosition).toBe(23.7); // 张开位由 demo 的首个 step 施加，reset 后尚未 step
      expect(s.mode).toBe(0);
      expect(s.demoStep).toBe(0);
    });
  });
});
