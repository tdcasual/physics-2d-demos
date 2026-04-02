/**
 * React 应用入口
 * React Application Entry
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 调试信息
console.log('[Main] Script loaded');
console.log('[Main] React:', React);
console.log('[Main] ReactDOM:', ReactDOM);

// 挂载应用
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Main] DOMContentLoaded');
  const rootElement = document.getElementById('app');
  console.log('[Main] Root element:', rootElement);

  if (rootElement) {
    try {
      const root = ReactDOM.createRoot(rootElement);
      console.log('[Main] Root created:', root);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log('[Main] Render called');
      
      // 隐藏加载占位符
      const placeholder = document.getElementById('loading-placeholder');
      if (placeholder) {
        placeholder.classList.add('hidden');
        setTimeout(() => placeholder.remove(), 300);
      }
    } catch (error) {
      console.error('[Main] Error:', error);
    }
  } else {
    console.error('[Main] Could not find root element #app');
  }
});
