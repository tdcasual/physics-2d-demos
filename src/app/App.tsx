/**
 * 主应用组件：站点壳层 + 实验目录（目录即首页，无 hero 宣传区）。
 */

import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  Suspense,
  lazy
} from 'react';
import { useTheme } from './hooks';

const ExperimentsSection = lazy(() => import('./sections/ExperimentsSection'));

import '../styles/global.css';
import '../styles/app/home.css';

const App: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const placeholder = document.getElementById('loading-placeholder');
    if (!placeholder) return;
    placeholder.classList.add('hidden');
    const timer = window.setTimeout(() => placeholder.remove(), 300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.title = '物理实验室';

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#0a0a0a' : '#fafafa'
      );
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (!navOpen) return;

    const firstLink = navRef.current?.querySelector<HTMLAnchorElement>('a');
    firstLink?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNavOpen(false);
        navToggleRef.current?.focus();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !navRef.current?.contains(target) &&
        !navToggleRef.current?.contains(target)
      ) {
        setNavOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [navOpen]);

  const closeNav = () => setNavOpen(false);

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      {/* 点阵网格背景 */}
      <div className="dot-grid" />

      {/* 头部 */}
      <header className="site-header">
        <div className="container header-inner">
          <a href="/" className="logo">
            物理实验室
          </a>
          <button
            type="button"
            className="nav-toggle"
            ref={navToggleRef}
            aria-label={navOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={navOpen}
            aria-controls="main-navigation"
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? '×' : '☰'}
          </button>
          <nav
            id="main-navigation"
            ref={navRef}
            className={`nav${navOpen ? ' is-open' : ''}`}
            aria-label="主导航"
          >
            <a href="#experiments" onClick={closeNav}>
              实验
            </a>
            <a href="/src/pages/instruments.html" onClick={closeNav}>
              组件库
            </a>
          </nav>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              resolvedTheme === 'light' ? '切换到暗色模式' : '切换到亮色模式'
            }
          >
            {resolvedTheme === 'light' ? '☾' : '☀'}
          </button>
        </div>
      </header>

      <main id="main-content">
        {/* 实验目录 — 目录即首页，懒加载以减少首屏 bundle */}
        <Suspense
          fallback={
            <div className="app-loading-fallback">
              <span className="app-loading-text">正在加载实验列表…</span>
            </div>
          }
        >
          <ExperimentsSection />
        </Suspense>
      </main>

      {/* 页脚 */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <p>物理实验室 © 2025</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
