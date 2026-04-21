/**
 * 实验展示区域
 */

import React, { useState } from 'react';
import {
  sceneRegistry,
  categoryInfo,
  getDifficultyLabel
} from '../data/scenes';
import { useScrollReveal } from '../hooks';

type FilterCategory = 'all' | 'mechanics' | 'electromagnetism' | 'method';

export const ExperimentsSection: React.FC = () => {
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.1 });
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredScenes = sceneRegistry.filter(
    (scene) => activeFilter === 'all' || scene.category === activeFilter
  );

  const filters: { id: FilterCategory; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'mechanics', label: '力学' },
    { id: 'electromagnetism', label: '电磁学' },
    { id: 'method', label: '方法' }
  ];

  return (
    <section
      id="experiments"
      className="experiments-section"
      ref={sectionRef as React.RefObject<HTMLDivElement>}
    >
      <div className="container">
        <div className={`section-header ${isVisible ? 'visible' : ''}`}>
          <span className="section-label">实践</span>
          <h2 className="section-title">物理实验</h2>
          <p className="section-desc">选择实验开始探索</p>
        </div>

        <div className={`filter-bar ${isVisible ? 'visible' : ''}`}>
          {filters.map((filter) => (
            <button
              type="button"
              key={filter.id}
              className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="experiments-grid">
          {filteredScenes.map((scene, index) => (
            <a
              key={scene.id}
              href={`/src/pages/${scene.id}.html`}
              className={`experiment-card ${isVisible ? 'visible' : ''} ${hoveredId === scene.id ? 'hovered' : ''}`}
              style={{ transitionDelay: `${index * 0.05}s` }}
              onMouseEnter={() => setHoveredId(scene.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="card-meta">
                <span className="card-number">0{index + 1}</span>
                <span className={`difficulty level-${scene.difficulty}`}>
                  {getDifficultyLabel(scene.difficulty)}
                </span>
              </div>

              <div className="card-content">
                <h3 className="card-title">{scene.title}</h3>
                <p className="card-desc">{scene.description}</p>
              </div>

              <div className="card-footer">
                <span
                  className="card-category"
                  style={{ color: categoryInfo[scene.category].color }}
                >
                  {categoryInfo[scene.category].label}
                </span>
                <span className="card-arrow">→</span>
              </div>

              <div className="card-border" />
            </a>
          ))}
        </div>
      </div>

      <style>{`
        .experiments-section {
          position: relative;
          padding: var(--space-32) 0;
          background: var(--bg-primary);
        }

        .section-header {
          max-width: 600px;
          margin-bottom: var(--space-12);
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo);
        }

        .section-header.visible {
          opacity: 1;
          transform: translateY(0);
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

        .section-title {
          font-family: var(--font-display);
          font-size: var(--text-4xl);
          font-weight: var(--font-medium);
          color: var(--text-primary);
          margin-bottom: var(--space-3);
        }

        .section-desc {
          font-size: var(--text-lg);
          color: var(--text-secondary);
        }

        .filter-bar {
          display: flex;
          gap: var(--space-2);
          margin-bottom: var(--space-10);
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s 0.1s var(--ease-out-expo), transform 0.8s 0.1s var(--ease-out-expo);
        }

        .filter-bar.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .filter-btn {
          padding: var(--space-2) var(--space-5);
          background: transparent;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-full);
          font-family: var(--font-body);
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .filter-btn:hover {
          border-color: var(--text-primary);
          color: var(--text-primary);
        }

        .filter-btn.active {
          background: var(--text-primary);
          border-color: var(--text-primary);
          color: var(--bg-primary);
        }

        .experiments-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }

        .experiment-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: var(--space-6);
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          text-decoration: none;
          color: inherit;
          opacity: 0;
          transform: translateY(20px);
          transition: 
            opacity 0.6s var(--ease-out-expo),
            transform 0.6s var(--ease-out-expo),
            border-color var(--transition-fast),
            box-shadow var(--transition-fast);
        }

        .experiment-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .experiment-card:hover {
          border-color: var(--border-strong);
          box-shadow: var(--shadow-lg);
        }

        .card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-6);
        }

        .card-number {
          font-family: var(--font-display);
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          color: var(--text-muted);
        }

        .difficulty {
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }

        .difficulty.level-1 {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .difficulty.level-2 {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .difficulty.level-3 {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }

        [data-theme="dark"] .difficulty.level-1 {
          background: rgba(96, 165, 250, 0.15);
          color: #60a5fa;
        }

        [data-theme="dark"] .difficulty.level-2 {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        [data-theme="dark"] .difficulty.level-3 {
          background: rgba(167, 139, 250, 0.15);
          color: #a78bfa;
        }

        .card-content {
          flex: 1;
          margin-bottom: var(--space-6);
        }

        .card-title {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: var(--font-medium);
          color: var(--text-primary);
          margin-bottom: var(--space-2);
          transition: color var(--transition-fast);
        }

        .experiment-card:hover .card-title {
          color: var(--text-secondary);
        }

        .card-desc {
          font-size: var(--text-base);
          line-height: var(--leading-relaxed);
          color: var(--text-tertiary);
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-light);
        }

        .card-category {
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
        }

        .card-arrow {
          font-size: var(--text-lg);
          color: var(--text-muted);
          transition: transform var(--transition-fast), color var(--transition-fast);
        }

        .experiment-card:hover .card-arrow {
          transform: translateX(4px);
          color: var(--text-primary);
        }

        .card-border {
          position: absolute;
          inset: -1px;
          border: 2px solid transparent;
          border-radius: var(--radius-md);
          pointer-events: none;
          transition: border-color var(--transition-fast);
        }

        .experiment-card.hovered .card-border {
          border-color: var(--text-primary);
        }

        @media (max-width: 1024px) {
          .experiments-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .experiments-section {
            padding: var(--space-20) 0;
          }
          
          .experiments-grid {
            grid-template-columns: 1fr;
          }
          
          .section-title {
            font-size: var(--text-3xl);
          }
        }
      `}</style>
    </section>
  );
};

export default ExperimentsSection;
