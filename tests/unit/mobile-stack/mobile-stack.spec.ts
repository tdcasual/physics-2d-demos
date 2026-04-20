/**
 * MobileStackLayout 高级版单元测试
 *
 * @version 0.3.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MobileStackLayout,
  type MobileStackConfig
} from '../../../src/app/layouts/masters/mobile-stack/mobile-stack';

// 模拟 DOM
describe('MobileStackLayout Advanced', () => {
  let container: HTMLElement;
  let layout: MobileStackLayout;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '390px';
    container.style.height = '844px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    layout?.unmount();
    container.remove();
  });

  describe('基础渲染', () => {
    it('应该正确渲染所有区域', () => {
      layout = new MobileStackLayout(container);
      layout.render(container);

      expect(container.querySelector('.mobile-controls-bar')).toBeTruthy();
      expect(container.querySelector('.mobile-animation-section')).toBeTruthy();
      expect(container.querySelector('.mobile-graph-section')).toBeTruthy();
      expect(container.querySelector('.mobile-control-section')).toBeTruthy();
    });

    it('应该创建 Canvas 元素', () => {
      layout = new MobileStackLayout(container);
      layout.render(container);

      const canvas = layout.getCanvas();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas?.classList.contains('mobile-stage-canvas')).toBe(true);
    });
  });

  describe('配置系统', () => {
    it('应该应用自定义标题', () => {
      const config: MobileStackConfig = {
        sectionTitles: {
          graph: '📊 自定义图表',
          control: '🔧 自定义控制'
        }
      };

      layout = new MobileStackLayout(container, config);
      layout.render(container);

      const toggle = container.querySelector(
        '.mobile-section-toggle .toggle-title'
      );
      expect(toggle?.textContent).toBe('📊 自定义图表');
    });

    it('应该根据配置隐藏控制按钮', () => {
      const config: MobileStackConfig = {
        controls: {
          showPlayPause: false,
          showReset: true,
          showSpeed: false
        }
      };

      layout = new MobileStackLayout(container, config);
      layout.render(container);
      layout.setFloatingControls({});

      const buttons = container.querySelectorAll('.mobile-control-btn');
      expect(buttons.length).toBe(1); // 只有重置按钮
    });

    it('应该应用动画区尺寸配置', () => {
      // happy-dom 不支持 dvh 单位，临时 mock CSS.supports 使用 vh
      const cssObj = (
        globalThis as unknown as {
          CSS: { supports: (...args: string[]) => boolean };
        }
      ).CSS;
      const spy = vi.spyOn(cssObj, 'supports').mockReturnValue(false);

      const config: MobileStackConfig = {
        animationHeightVh: 60,
        animationMinHeight: 300
      };

      layout = new MobileStackLayout(container, config);
      layout.render(container);

      const animationSection = container.querySelector(
        '.mobile-animation-section'
      ) as HTMLElement;
      expect(animationSection?.style.height).toBe('60vh');

      spy.mockRestore();
    });
  });

  describe('图表折叠', () => {
    it('应该切换图表展开状态', () => {
      layout = new MobileStackLayout(container);
      layout.render(container);

      const graphSection = container.querySelector('.mobile-graph-section');
      const toggle = container.querySelector('.mobile-section-toggle');

      expect(graphSection?.classList.contains('is-expanded')).toBe(false);

      (toggle as HTMLElement)?.click();

      expect(graphSection?.classList.contains('is-expanded')).toBe(true);
    });

    it('应该触发自定义事件', () => {
      layout = new MobileStackLayout(container);
      layout.render(container);

      const handler = vi.fn();
      container.addEventListener('graphToggle', handler);

      const toggle = container.querySelector('.mobile-section-toggle');
      (toggle as HTMLElement)?.click();

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].detail.expanded).toBe(true);
    });
  });

  describe('状态管理', () => {
    it('应该持久化状态到 localStorage', () => {
      const config: MobileStackConfig = {
        persistState: true,
        stateKey: 'test-mobile-state'
      };

      layout = new MobileStackLayout(container, config);
      layout.render(container);

      // 展开图表
      const toggle = container.querySelector('.mobile-section-toggle');
      (toggle as HTMLElement)?.click();

      // 验证状态已保存
      const saved = localStorage.getItem('test-mobile-state');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved!).graphExpanded).toBe(true);

      // 清理
      localStorage.removeItem('test-mobile-state');
    });

    it('应该从 localStorage 恢复状态', () => {
      localStorage.setItem(
        'test-mobile-state',
        JSON.stringify({
          graphExpanded: true,
          timestamp: Date.now()
        })
      );

      const config: MobileStackConfig = {
        persistState: true,
        stateKey: 'test-mobile-state'
      };

      layout = new MobileStackLayout(container, config);
      layout.render(container);

      const graphSection = container.querySelector('.mobile-graph-section');
      expect(graphSection?.classList.contains('is-expanded')).toBe(true);

      localStorage.removeItem('test-mobile-state');
    });
  });

  describe('读数更新', () => {
    it('应该正确更新读数', () => {
      layout = new MobileStackLayout(container);
      layout.render(container);

      const items = [
        { label: '时间', value: '1.5s' },
        { label: '位移', value: '10m' },
        { label: '速度', value: '5m/s' }
      ];

      layout.setReadout(items);

      const readoutBar = container.querySelector('.mobile-readout-bar');
      expect(readoutBar?.children.length).toBe(3);
      expect(readoutBar?.textContent).toContain('时间');
      expect(readoutBar?.textContent).toContain('1.5s');
    });

    it('应该限制读数项数量', () => {
      const config: MobileStackConfig = {
        maxReadoutItems: 3
      };

      layout = new MobileStackLayout(container, config);
      layout.render(container);

      const items = Array.from({ length: 10 }, (_, i) => ({
        label: `项${i}`,
        value: `${i}`
      }));

      layout.setReadout(items);

      const readoutBar = container.querySelector('.mobile-readout-bar');
      expect(readoutBar?.children.length).toBe(3);
    });
  });

  describe('错误处理', () => {
    it('应该安全处理异常', () => {
      layout = new MobileStackLayout(container);
      layout.render(container);

      // 模拟错误条件
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // 调用可能导致错误的方法，不应该抛出
      expect(() => {
        layout.updateTransportState({
          isPlaying: undefined as unknown as boolean
        });
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('清理', () => {
    it('应该正确清理资源', async () => {
      layout = new MobileStackLayout(container);
      layout.render(container);

      // 设置一些状态
      const toggle = container.querySelector('.mobile-section-toggle');
      (toggle as HTMLElement)?.click();

      await layout.unmount();

      // 验证所有引用已清理
      expect(
        (layout as unknown as { scrollContainer: unknown }).scrollContainer
      ).toBeNull();
      expect(
        (layout as unknown as { gestureRecognizer: unknown }).gestureRecognizer
      ).toBeNull();
      expect(
        (layout as unknown as { themeManager: unknown }).themeManager
      ).toBeNull();
    });
  });

  describe('性能配置', () => {
    it('应该应用虚拟滚动优化', () => {
      const config: MobileStackConfig = {
        performance: {
          enableVirtualScroll: true
        }
      };

      layout = new MobileStackLayout(container, config);
      layout.render(container);

      const scrollContainer = container.querySelector(
        '.mobile-scroll-container'
      );
      expect((scrollContainer as HTMLElement)?.style.contain).toBe('strict');
    });
  });
});
