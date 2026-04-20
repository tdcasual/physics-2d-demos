/**
 * React 应用入口
 * React Application Entry
 */

import '../styles/teaching-shell.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// 应用入口

// 挂载应用
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('app');

  if (rootElement) {
    try {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );

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
