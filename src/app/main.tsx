/**
 * React 应用入口
 * React Application Entry
 */

import '../styles/design-tokens.css';
import '../styles/themes.css';
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
    } catch (error) {
      console.error('[Main] Error:', error);
    }
  } else {
    console.error('[Main] Could not find root element #app');
  }
});
