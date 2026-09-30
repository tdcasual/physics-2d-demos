import { describe, expect, it, vi } from 'vitest';
import { createSpringOscillatorScene } from '../../src/scenes/spring-oscillator/scene.entry';
import { createSpringOscillatorControls } from '../../src/scenes/spring-oscillator/controls';
import { createControlCard } from '../../src/ui/components/ControlCard';

const controlCardFactory = createControlCard;

describe('spring-oscillator controls', () => {
  function setup() {
    const mount = document.createElement('div');
    const scene = createSpringOscillatorScene();
    scene.init();
    const onStatus = vi.fn();
    const controls = createSpringOscillatorControls({
      mount,
      scene,
      onStatus,
      ui: { createControlCard: controlCardFactory }
    });
    // controls 使用 setTimeout 延迟渲染，在 happy-dom 中需要手动刷新
    controls.syncFromScene();
    return { mount, scene, controls, onStatus };
  }

  it('creates control DOM structure', () => {
    const { mount } = setup();
    // 至少有一个控制卡片
    expect(mount.children.length).toBeGreaterThanOrEqual(1);
  });

  it('has a list card with "振子列表" header', () => {
    const { mount } = setup();
    const text = mount.textContent || '';
    expect(text).toContain('振子列表');
  });

  it('has a preset card with "相位演示" header', () => {
    const { mount } = setup();
    const text = mount.textContent || '';
    expect(text).toContain('相位演示');
  });

  it('renders oscillator items in the list', () => {
    const { mount, scene } = setup();
    // init() 添加了两个振子
    expect(scene.sim.oscillators.length).toBe(2);
    // 控制面板通过 setTimeout 延迟渲染，需要等待
    // 在 happy-dom 中 setTimeout 是同步的
    const listText = mount.textContent || '';
    // 至少能看到滑块标签 k, m, x₀
    expect(listText).toContain('k');
    expect(listText).toContain('m');
    expect(listText).toContain('x'); // x₀ 在 DOM 中可能显示为 x
  });

  it('has preset buttons for all phase presets', () => {
    const { mount } = setup();
    const text = mount.textContent || '';
    expect(text).toContain('同相');
    expect(text).toContain('反相');
    expect(text).toContain('1/2');
    expect(text).toContain('1/4');
  });

  it('add button calls scene.addOscillator', () => {
    const { mount, scene } = setup();
    const addBtn = Array.from(mount.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('添加')
    );
    expect(addBtn).toBeTruthy();
    const before = scene.sim.oscillators.length;
    addBtn!.click();
    expect(scene.sim.oscillators.length).toBe(before + 1);
  });

  it('in-phase preset resets to two oscillators', () => {
    const { mount, scene } = setup();
    // 先添加一个额外的振子
    scene.addOscillator();
    expect(scene.sim.oscillators.length).toBe(3);

    const presetBtn = Array.from(mount.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('同相')
    );
    expect(presetBtn).toBeTruthy();
    presetBtn!.click();
    expect(scene.sim.oscillators.length).toBe(2);
    expect(scene.sim.oscillators[0].startDelay).toBe(0);
    expect(scene.sim.oscillators[1].startDelay).toBe(0);
  });

  it('anti-phase preset sets T/2 delay', () => {
    const { mount, scene } = setup();
    const presetBtn = Array.from(mount.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('反相')
    );
    expect(presetBtn).toBeTruthy();
    presetBtn!.click();
    const T = 2 * Math.PI * Math.sqrt(1 / 10);
    expect(scene.sim.oscillators[1].startDelay).toBeCloseTo(T / 2, 6);
  });

  it('syncFromScene re-renders the list', () => {
    const { mount, scene, controls } = setup();
    const before = mount.innerHTML;
    scene.addOscillator();
    controls.syncFromScene();
    const after = mount.innerHTML;
    expect(after).not.toBe(before);
  });

  it('dispose clears the mount', () => {
    const { mount, controls } = setup();
    expect(mount.children.length).toBeGreaterThan(0);
    controls.dispose();
    expect(mount.children.length).toBe(0);
    expect(mount.innerHTML).toBe('');
  });

  it('each oscillator row has orientation toggle button', () => {
    const { mount } = setup();
    const orientBtns = Array.from(mount.querySelectorAll('button')).filter(
      (b) => b.textContent === '横' || b.textContent === '竖'
    );
    expect(orientBtns.length).toBe(2);
  });

  it('each oscillator row has delete button', () => {
    const { mount, scene } = setup();
    const delBtns = Array.from(mount.querySelectorAll('button')).filter(
      (b) => b.textContent === '✕'
    );
    expect(delBtns.length).toBe(scene.sim.oscillators.length);
  });

  it('delete button removes oscillator', () => {
    const { mount, scene } = setup();
    const delBtn = Array.from(mount.querySelectorAll('button')).find(
      (b) => b.textContent === '✕'
    );
    expect(delBtn).toBeTruthy();
    const before = scene.sim.oscillators.length;
    delBtn!.click();
    expect(scene.sim.oscillators.length).toBe(before - 1);
  });

  it('orientation toggle switches between horizontal and vertical', () => {
    const { mount, scene } = setup();
    const orientBtn = Array.from(mount.querySelectorAll('button')).find(
      (b) => b.textContent === '横'
    );
    expect(orientBtn).toBeTruthy();
    const osc = scene.sim.oscillators[0];
    expect(osc.params.orientation).toBe('horizontal');
    orientBtn!.click();
    expect(osc.params.orientation).toBe('vertical');
  });
});
