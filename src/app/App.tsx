/**
 * 主应用组件
 * 基于 Shruti 网站深度分析 - 丰富Hero区域
 */

import React, { useEffect, useState } from 'react';
import { ExperimentsSection } from './sections';
import { useTheme } from './hooks';

import '../styles/design-tokens.css';
import '../styles/themes.css';
import '../styles/global.css';

const App: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.title = '物理实验室';
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#0a0a0a' : '#fafafa'
      );
    }
  }, [resolvedTheme]);

  if (!mounted) return null;

  return (
    <div className="app">
      {/* 点阵网格背景 */}
      <div className="dot-grid" />
      
      {/* 头部 */}
      <header className="site-header">
        <div className="container header-inner">
          <a href="/" className="logo">物理实验室</a>
          <nav className="nav">
            <a href="#experiments">实验</a>
            <a href="#about">关于</a>
          </nav>
          <button className="theme-toggle" onClick={toggleTheme}>
            {resolvedTheme === 'light' ? '☾' : '☀'}
          </button>
        </div>
      </header>

      <main>
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
                力学 · 电磁学 · 可视化模拟 · 交互式学习
              </p>
            </div>

            {/* 项目/实验列表 */}
            <div className="hero-experiments">
              <a href="/src/pages/projectile.html" className="exp-item">
                <span className="exp-number">01</span>
                <span className="exp-name">抛体运动</span>
                <span className="exp-desc">抛物线轨迹模拟</span>
              </a>
              <a href="/src/pages/spring-oscillator.html" className="exp-item">
                <span className="exp-number">02</span>
                <span className="exp-name">弹簧振子</span>
                <span className="exp-desc">简谐运动可视化</span>
              </a>
              <a href="/src/pages/field-lines.html" className="exp-item">
                <span className="exp-number">03</span>
                <span className="exp-name">电场分布</span>
                <span className="exp-desc">场线绘制演示</span>
              </a>
              <a href="/src/pages/chase-meet.html" className="exp-item">
                <span className="exp-number">04</span>
                <span className="exp-name">追及相遇</span>
                <span className="exp-desc">相对运动分析</span>
              </a>
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
              <a href="#experiments" className="btn-primary">浏览全部实验</a>
              <a href="#about" className="btn-text">了解更多 →</a>
            </div>
          </div>

          {/* 右侧垂直标签 */}
          <div className="side-label">
            <span>P</span>
            <span>H</span>
            <span>Y</span>
            <span>S</span>
            <span>I</span>
            <span>C</span>
            <span>S</span>
          </div>
        </section>

        {/* 实验区域 */}
        <ExperimentsSection />

        {/* 关于区域 */}
        <section id="about" className="about-section">
          <div className="container about-inner">
            <span className="section-label">关于</span>
            <h2 className="about-title">
              用交互的方式<br />
              理解物理概念
            </h2>
            <p className="about-text">
              通过可视化的模拟实验，让抽象的物理概念变得直观易懂。
              从力学到电磁学，每个实验都经过精心设计，
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

      <style>{`
        /* 点阵网格 */
        .dot-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.3;
          background-image: radial-gradient(circle, var(--text-muted) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        
        /* 头部 */
        .site-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: rgba(250, 250, 250, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-light);
        }
        
        [data-theme="dark"] .site-header {
          background: rgba(10, 10, 10, 0.8);
        }
        
        .header-inner {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .logo {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: var(--font-medium);
          color: var(--text-primary);
          text-decoration: none;
        }
        
        .nav {
          display: flex;
          gap: var(--space-10);
        }
        
        .nav a {
          font-size: var(--text-base);
          font-weight: var(--font-medium);
          color: var(--text-secondary);
          text-decoration: none;
          transition: color var(--transition-fast);
        }
        
        .nav a:hover {
          color: var(--text-primary);
        }
        
        .theme-toggle {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          font-size: var(--text-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .theme-toggle:hover {
          border-color: var(--text-primary);
          color: var(--text-primary);
        }
        
        /* Hero 区域 */
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: calc(72px + var(--space-16)) 0 var(--space-16);
          overflow: hidden;
        }
        
        .hero-inner {
          display: flex;
          flex-direction: column;
          gap: var(--space-12);
        }
        
        /* Hero 主标题 */
        .hero-main {
          max-width: 900px;
        }
        
        .hero-title {
          margin-bottom: var(--space-6);
        }
        
        .hero-title .line {
          display: block;
          font-family: var(--font-display);
          font-size: clamp(4rem, 12vw, 9rem);
          font-weight: var(--font-medium);
          line-height: 0.95;
          letter-spacing: -0.03em;
        }
        
        .hero-title .line-1 {
          color: var(--text-secondary);
          animation: slideUp 1s var(--ease-out-expo) forwards;
          opacity: 0;
          transform: translateY(60px);
        }
        
        .hero-title .line-2 {
          color: var(--text-primary);
          animation: slideUp 1s 0.1s var(--ease-out-expo) forwards;
          opacity: 0;
          transform: translateY(60px);
        }
        
        @keyframes slideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .hero-subtitle {
          font-size: var(--text-lg);
          color: var(--text-tertiary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          animation: fadeIn 1s 0.3s ease forwards;
          opacity: 0;
        }
        
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        
        /* Hero 实验列表 */
        .hero-experiments {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          max-width: 600px;
          animation: fadeIn 1s 0.5s ease forwards;
          opacity: 0;
        }
        
        .exp-item {
          display: flex;
          align-items: baseline;
          gap: var(--space-6);
          padding: var(--space-4) 0;
          border-bottom: 1px solid var(--border-light);
          text-decoration: none;
          color: inherit;
          transition: all var(--transition-fast);
          position: relative;
        }
        
        .exp-item::before {
          content: '';
          position: absolute;
          left: -20px;
          right: -20px;
          top: 0;
          bottom: 0;
          background: var(--bg-secondary);
          opacity: 0;
          transition: opacity var(--transition-fast);
          z-index: -1;
          border-radius: var(--radius-md);
        }
        
        .exp-item:hover::before {
          opacity: 1;
        }
        
        .exp-item:hover .exp-name {
          color: var(--text-primary);
        }
        
        .exp-number {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          color: var(--text-muted);
          width: 40px;
          flex-shrink: 0;
        }
        
        .exp-name {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: var(--font-medium);
          color: var(--text-secondary);
          transition: color var(--transition-fast);
          flex: 1;
        }
        
        .exp-desc {
          font-size: var(--text-base);
          color: var(--text-tertiary);
          text-align: right;
        }
        
        /* Hero 标签 */
        .hero-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          animation: fadeIn 1s 0.6s ease forwards;
          opacity: 0;
        }
        
        .tag {
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          color: var(--text-secondary);
          padding: var(--space-2) var(--space-4);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }
        
        .tag:hover {
          border-color: var(--text-primary);
          color: var(--text-primary);
        }
        
        /* Hero CTA */
        .hero-cta {
          display: flex;
          align-items: center;
          gap: var(--space-6);
          animation: fadeIn 1s 0.7s ease forwards;
          opacity: 0;
        }
        
        .btn-primary {
          display: inline-flex;
          align-items: center;
          padding: var(--space-4) var(--space-8);
          background: var(--text-primary);
          color: var(--bg-primary);
          font-family: var(--font-body);
          font-size: var(--text-base);
          font-weight: var(--font-medium);
          text-decoration: none;
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }
        
        .btn-primary:hover {
          opacity: 0.85;
          transform: translateY(-2px);
        }
        
        .btn-text {
          font-size: var(--text-base);
          font-weight: var(--font-medium);
          color: var(--text-secondary);
          text-decoration: none;
          transition: color var(--transition-fast);
        }
        
        .btn-text:hover {
          color: var(--text-primary);
        }
        
        /* 右侧垂直标签 */
        .side-label {
          position: fixed;
          right: var(--space-8);
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-family: var(--font-display);
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          letter-spacing: var(--tracking-wider);
          color: var(--text-muted);
          z-index: 10;
          pointer-events: none;
        }
        
        /* 关于区域 */
        .about-section {
          padding: var(--space-32) 0;
          background: var(--bg-secondary);
        }
        
        .about-inner {
          max-width: 680px;
          margin: 0 auto;
          text-align: center;
        }
        
        .section-label {
          display: block;
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wider);
          color: var(--text-muted);
          margin-bottom: var(--space-4);
        }
        
        .about-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: var(--font-medium);
          line-height: 1.1;
          color: var(--text-primary);
          margin-bottom: var(--space-6);
        }
        
        .about-text {
          font-size: var(--text-lg);
          line-height: var(--leading-relaxed);
          color: var(--text-secondary);
        }
        
        /* 页脚 */
        .site-footer {
          padding: var(--space-8) 0;
          border-top: 1px solid var(--border-light);
          text-align: center;
        }
        
        .footer-inner p {
          font-size: var(--text-sm);
          color: var(--text-muted);
        }
        
        /* 响应式 */
        @media (max-width: 1024px) {
          .side-label {
            display: none;
          }
          
          .hero-title .line {
            font-size: clamp(3rem, 10vw, 5rem);
          }
          
          .exp-desc {
            display: none;
          }
        }
        
        @media (max-width: 768px) {
          .nav {
            display: none;
          }
          
          .hero-experiments {
            max-width: 100%;
          }
          
          .exp-item {
            gap: var(--space-4);
          }
          
          .exp-name {
            font-size: var(--text-xl);
          }
          
          .hero-cta {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
