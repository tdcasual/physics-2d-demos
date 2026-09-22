/**
 * 主应用组件
 * 基于 Shruti 网站深度分析 - 丰富Hero区域
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
import { featuredScenes } from './data/featured-scenes';
import {
  CURRICULUM_DOMAIN_INFO,
  CURRICULUM_DOMAINS,
  SCENE_CURRICULUM
} from '../platform/curriculum';

const ExperimentsSection = lazy(() => import('./sections/ExperimentsSection'));

import '../styles/global.css';
import '../styles/app/home.css';

const App: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const domainCounts = CURRICULUM_DOMAINS.map((domain) => ({
    id: domain,
    label: CURRICULUM_DOMAIN_INFO[domain].label,
    count: Object.values(SCENE_CURRICULUM).filter(
      (scene) => scene.domain === domain
    ).length
  }));

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
            <a href="#about" onClick={closeNav}>
              关于
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
        {/* Hero 区域 - 内容丰富 */}
        <section className="hero">
          <div className="container hero-inner">
            {/* 主标题区 */}
            <div className="hero-main">
              <h1 className="hero-title">
                <span className="line line-1">交互式</span>
                <span className="line line-2">物理演示</span>
              </h1>
              <p className="hero-subtitle">
                六大课程领域 · 120 个交互实验 · 面向高中物理学习
              </p>
            </div>

            {/* 项目/实验列表 */}
            <div className="hero-experiments">
              {featuredScenes.slice(0, 4).map((scene, i) => (
                <a href={scene.path} className="exp-item" key={scene.id}>
                  <span className="exp-number">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="exp-name">{scene.title}</span>
                  <span className="exp-desc">{scene.description}</span>
                </a>
              ))}
            </div>

            {/* 技能/分类标签 */}
            <div className="hero-tags">
              <span className="tag">物理模拟</span>
              <span className="tag">交互演示</span>
              <span className="tag">数据可视化</span>
              <span className="tag">教学工具</span>
            </div>

            {/* CTA 按钮 */}
            <div className="hero-cta">
              <a href="#experiments" className="btn-primary">
                浏览全部实验
              </a>
              <a href="#about" className="btn-text">
                了解更多 →
              </a>
            </div>

            <aside className="hero-index" aria-label="课程领域导航">
              <div className="hero-index-heading">
                <span className="section-label">课程索引</span>
                <span className="hero-index-count">120 个演示</span>
              </div>
              <div className="hero-index-list">
                {domainCounts.map((domain) => (
                  <a
                    key={domain.id}
                    href={`/?domain=${domain.id}#experiments`}
                    className="hero-index-item"
                  >
                    <span>{domain.label}</span>
                    <span>{String(domain.count).padStart(2, '0')}</span>
                  </a>
                ))}
              </div>
            </aside>
          </div>

          {/* 右侧垂直标签 */}
          <div className="side-label" aria-hidden="true">
            <span>P</span>
            <span>H</span>
            <span>Y</span>
            <span>S</span>
            <span>I</span>
            <span>C</span>
            <span>S</span>
          </div>
        </section>

        {/* 实验区域 — 懒加载以减少首屏 bundle */}
        <Suspense
          fallback={
            <div className="app-loading-fallback">
              <span className="app-loading-text">正在加载实验列表…</span>
            </div>
          }
        >
          <ExperimentsSection />
        </Suspense>

        {/* 关于区域 */}
        <section id="about" className="about-section">
          <div className="container about-inner">
            <span className="section-label">关于</span>
            <h2 className="about-title">
              用交互的方式
              <br />
              理解物理概念
            </h2>
            <p className="about-text">
              通过可视化的模拟实验，让抽象的物理概念变得直观易懂。
              从力学、电磁学到光学、热学与近代物理，每个实验都经过精心设计，
              帮助学习者深入理解物理原理。
            </p>
          </div>
        </section>
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
