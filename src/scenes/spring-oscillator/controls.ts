import type { OscillatorParams, Orientation } from './scene.sim';
import type { SpringOscillatorScene } from './scene.entry';

export type SpringOscillatorControlsOptions = {
  container: HTMLElement;
  scene: SpringOscillatorScene;
  onStatus?: (text: string) => void;
};

export function createSpringOscillatorControls(options: SpringOscillatorControlsOptions) {
  const { container, scene, onStatus } = options;

  container.innerHTML = `
    <div class="oscillator-controls">
      <div class="control-section">
        <div class="section-header collapsible" data-target="listSection">
          <h3>振子列表</h3>
          <button type="button" class="collapse-btn expanded" title="折叠/展开">▼</button>
        </div>
        <div class="section-content" id="listSection">
          <div class="oscillator-list"></div>
          <button type="button" class="control-btn btn-primary btn-add" data-action="add">+ 添加振子</button>
        </div>
      </div>
      
      <div class="control-section">
        <div class="section-header collapsible" data-target="demoSection">
          <h3>相位演示</h3>
          <button type="button" class="collapse-btn expanded" title="折叠/展开">▼</button>
        </div>
        <div class="section-content" id="demoSection">
          <div class="demo-buttons">
            <button type="button" class="control-btn" data-action="demo-in-phase">同相演示</button>
            <button type="button" class="control-btn" data-action="demo-anti-phase">反相演示</button>
          </div>
        </div>
      </div>
      
      <div class="hint-box">
        💡 提示：点击右侧小球可直接开始/暂停
      </div>
    </div>
  `;

  const listContainer = container.querySelector('.oscillator-list') as HTMLElement;

  // 折叠功能
  container.querySelectorAll('.section-header.collapsible').forEach(header => {
    header.addEventListener('click', (e) => {
      // 如果点击的是按钮，不触发折叠（防止冲突）
      if ((e.target as HTMLElement).classList.contains('collapse-btn')) {
        e.stopPropagation();
      }
      
      const targetId = (header as HTMLElement).dataset.target;
      if (!targetId) return;
      
      const content = container.querySelector(`#${targetId}`) as HTMLElement;
      const btn = header.querySelector('.collapse-btn') as HTMLElement;
      
      if (content && btn) {
        const isExpanded = btn.classList.contains('expanded');
        if (isExpanded) {
          content.style.display = 'none';
          btn.classList.remove('expanded');
          btn.classList.add('collapsed');
          btn.textContent = '▶';
        } else {
          content.style.display = 'block';
          btn.classList.remove('collapsed');
          btn.classList.add('expanded');
          btn.textContent = '▼';
        }
      }
    });
  });

  function renderOscillatorList(): void {
    listContainer.innerHTML = '';
    
    scene.sim.oscillators.forEach((osc, index) => {
      const item = document.createElement('div');
      item.className = 'oscillator-item';
      item.dataset.id = osc.id;
      
      const isHorizontal = osc.params.orientation === 'horizontal';
      const statusIcon = osc.isPlaying ? '▶' : '⏸';
      
      item.innerHTML = `
        <div class="oscillator-header" style="border-left-color: ${osc.color}">
          <div class="oscillator-info">
            <span class="oscillator-name">振子 #${index + 1} <span class="status-icon">${statusIcon}</span></span>
            <span class="oscillator-status">${osc.isPlaying ? '运行中' : '已暂停'}</span>
          </div>
          <button type="button" class="icon-btn btn-danger" data-action="remove" title="删除">✕</button>
        </div>
        <div class="oscillator-params">
          <div class="param-row">
            <label>劲度系数 k</label>
            <input type="range" min="1" max="100" step="1" value="${osc.params.k}" data-param="k">
            <span class="param-value">${osc.params.k}</span>
          </div>
          <div class="param-row">
            <label>质量 m (kg)</label>
            <input type="range" min="0.1" max="10" step="0.1" value="${osc.params.m}" data-param="m">
            <span class="param-value">${osc.params.m}</span>
          </div>
          <div class="param-row">
            <label>初始位移 x₀</label>
            <input type="range" min="-20" max="20" step="0.5" value="${osc.params.x0}" data-param="x0">
            <span class="param-value">${osc.params.x0}</span>
          </div>
          <div class="param-row">
            <label>摆放方向</label>
            <div class="orientation-toggle">
              <button type="button" class="toggle-btn ${isHorizontal ? 'active' : ''}" data-orientation="horizontal">横向</button>
              <button type="button" class="toggle-btn ${!isHorizontal ? 'active' : ''}" data-orientation="vertical">竖向</button>
            </div>
          </div>
        </div>
      `;
      
      listContainer.appendChild(item);
    });
    
    attachEventListeners();
  }

  function attachEventListeners(): void {
    // 全局按钮
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', handleAction);
    });
    
    // 振子项内的控制
    listContainer.querySelectorAll('.oscillator-item').forEach(item => {
      const id = item.getAttribute('data-id')!;
      
      // 删除按钮
      item.querySelectorAll('[data-action="remove"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          scene.removeOscillator(id);
          onStatus?.(`振子 #${id.slice(-4)} 已删除`);
          renderOscillatorList();
          scene.render();
        });
      });
      
      // 参数滑块
      item.querySelectorAll('input[type="range"]').forEach(input => {
        input.addEventListener('input', (e) => {
          const target = e.target as HTMLInputElement;
          const value = parseFloat(target.value);
          const valueSpan = target.nextElementSibling as HTMLElement;
          if (valueSpan) valueSpan.textContent = String(value);
        });
        
        input.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          const param = target.dataset.param as keyof OscillatorParams;
          const value = parseFloat(target.value);
          
          scene.updateOscillator(id, { [param]: value });
          scene.resetOscillator(id);
          scene.render();
          onStatus?.(`振子 #${id.slice(-4)} ${param}=${value}`);
        });
      });
      
      // 方向切换
      item.querySelectorAll('[data-orientation]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const orientation = (e.target as HTMLElement).dataset.orientation as Orientation;
          scene.updateOscillator(id, { orientation });
          scene.resetOscillator(id);
          scene.render();
          
          item.querySelectorAll('[data-orientation]').forEach(b => {
            b.classList.toggle('active', (b as HTMLElement).dataset.orientation === orientation);
          });
          onStatus?.(`振子 #${id.slice(-4)} 方向改为 ${orientation === 'horizontal' ? '横向' : '竖向'}`);
        });
      });
    });
  }

  function handleAction(e: Event): void {
    const action = (e.target as HTMLElement).dataset.action;
    
    switch (action) {
      case 'add': {
        const newOsc = scene.addOscillator({
          k: 10 + Math.floor(Math.random() * 20),
          m: 1,
          x0: 5 + Math.floor(Math.random() * 5),
          orientation: 'horizontal'
        });
        renderOscillatorList();
        scene.render();
        onStatus?.(`添加振子 #${newOsc.id.slice(-4)}，点击小球开始`);
        break;
      }
      case 'demo-in-phase': {
        while (scene.sim.oscillators.length > 0) {
          scene.removeOscillator(scene.sim.oscillators[0].id);
        }
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' });
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' });
        renderOscillatorList();
        scene.reset();
        scene.render();
        onStatus?.('同相演示：两振子从相同位置释放');
        break;
      }
      case 'demo-anti-phase': {
        while (scene.sim.oscillators.length > 0) {
          scene.removeOscillator(scene.sim.oscillators[0].id);
        }
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' });
        scene.addOscillator({ k: 10, m: 1, x0: -8, orientation: 'horizontal' });
        renderOscillatorList();
        scene.reset();
        scene.render();
        onStatus?.('反相演示：两振子从相反位置释放');
        break;
      }
    }
  }

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .oscillator-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .control-section {
      background: rgba(255, 252, 247, 0.7);
      border: 1px solid #dce6d7;
      border-radius: 10px;
      overflow: hidden;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: rgba(0, 0, 0, 0.03);
      cursor: pointer;
      user-select: none;
    }
    
    .section-header:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    
    .section-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #2a3d31;
    }
    
    .collapse-btn {
      width: 22px;
      height: 22px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 10px;
      color: #5a7a6a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .collapse-btn:hover {
      color: #2a3d31;
    }
    
    .section-content {
      padding: 12px;
    }
    
    .oscillator-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 320px;
      overflow-y: auto;
      margin-bottom: 10px;
    }
    
    .oscillator-item {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #e0e7dc;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .oscillator-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      background: rgba(0, 0, 0, 0.02);
      border-left: 3px solid;
    }
    
    .oscillator-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .oscillator-name {
      font-weight: 600;
      font-size: 13px;
      color: #2a3d31;
    }
    
    .status-icon {
      font-size: 11px;
    }
    
    .oscillator-status {
      font-size: 11px;
      color: #5a7a6a;
    }
    
    .icon-btn {
      width: 22px;
      height: 22px;
      padding: 0;
      border: 1px solid #d0ddd0;
      border-radius: 5px;
      background: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #666;
    }
    
    .icon-btn:hover {
      background: #f5f8f0;
    }
    
    .btn-danger {
      color: #c44;
    }
    
    .oscillator-params {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .param-row {
      display: grid;
      grid-template-columns: 80px 1fr 40px;
      align-items: center;
      gap: 6px;
    }
    
    .param-row label {
      font-size: 11px;
      color: #5a7a6a;
    }
    
    .param-row input[type="range"] {
      width: 100%;
      accent-color: #5f7d58;
    }
    
    .param-value {
      font-size: 11px;
      color: #2a3d31;
      text-align: right;
      font-family: monospace;
    }
    
    .orientation-toggle {
      display: flex;
      gap: 4px;
    }
    
    .toggle-btn {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid #d0ddd0;
      border-radius: 5px;
      background: #fff;
      font-size: 11px;
      cursor: pointer;
      color: #5a7a6a;
    }
    
    .toggle-btn.active {
      background: #5f7d58;
      border-color: #5f7d58;
      color: #fff;
    }
    
    .control-btn {
      padding: 8px 12px;
      border: 1px solid #c0d0c0;
      border-radius: 6px;
      background: #f0f5f0;
      color: #2a3d31;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
    }
    
    .control-btn:hover {
      background: #e5efe5;
    }
    
    .btn-primary {
      background: #5f7d58;
      border-color: #5f7d58;
      color: #fff;
    }
    
    .btn-primary:hover {
      background: #4a6344;
    }
    
    .btn-add {
      margin-top: 4px;
    }
    
    .demo-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .hint-box {
      padding: 10px 12px;
      background: rgba(95, 125, 88, 0.08);
      border-radius: 8px;
      font-size: 12px;
      color: #4a6344;
      border: 1px solid rgba(95, 125, 88, 0.15);
    }
    
    /* 深色主题 */
    [data-theme="dark"] .control-section {
      background: rgba(20, 35, 45, 0.6);
      border-color: #1e3a4a;
    }
    
    [data-theme="dark"] .section-header {
      background: rgba(0, 0, 0, 0.15);
    }
    
    [data-theme="dark"] .section-header h3 {
      color: #e0f0f5;
    }
    
    [data-theme="dark"] .collapse-btn {
      color: #8aa8b5;
    }
    
    [data-theme="dark"] .collapse-btn:hover {
      color: #e0f0f5;
    }
    
    [data-theme="dark"] .oscillator-item {
      background: rgba(16, 30, 40, 0.8);
      border-color: #1e3a4a;
    }
    
    [data-theme="dark"] .oscillator-header {
      background: rgba(0, 0, 0, 0.1);
    }
    
    [data-theme="dark"] .oscillator-name {
      color: #e0f0f5;
    }
    
    [data-theme="dark"] .oscillator-status {
      color: #8aa8b5;
    }
    
    [data-theme="dark"] .icon-btn {
      background: #1a3344;
      border-color: #2a5066;
      color: #b0d0e0;
    }
    
    [data-theme="dark"] .param-row label {
      color: #8aa8b5;
    }
    
    [data-theme="dark"] .param-value {
      color: #e0f0f5;
    }
    
    [data-theme="dark"] .toggle-btn {
      background: #1a3344;
      border-color: #2a5066;
      color: #b0d0e0;
    }
    
    [data-theme="dark"] .toggle-btn.active {
      background: #2a8a9e;
      border-color: #2a8a9e;
    }
    
    [data-theme="dark"] .control-btn {
      background: #1a3344;
      border-color: #2a5066;
      color: #e0f0f5;
    }
    
    [data-theme="dark"] .control-btn:hover {
      background: #234058;
    }
    
    [data-theme="dark"] .hint-box {
      background: rgba(42, 138, 158, 0.1);
      border-color: rgba(42, 138, 158, 0.2);
      color: #a0d0e0;
    }
  `;
  document.head.appendChild(style);

  // 初始渲染
  renderOscillatorList();

  return {
    refresh(): void {
      renderOscillatorList();
    },
    dispose(): void {
      style.remove();
    }
  };
}
