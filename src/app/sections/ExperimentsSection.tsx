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
              onMouseEnter={() => {
                setHoveredId(scene.id);
                // 预加载场景页面（hover 时提前拉取，点击后秒开）
                const pageUrl = `/src/pages/${scene.id}.html`;
                if (
                  !document.querySelector(
                    `link[rel="prefetch"][href="${pageUrl}"]`
                  )
                ) {
                  const link = document.createElement('link');
                  link.rel = 'prefetch';
                  link.href = pageUrl;
                  document.head.appendChild(link);
                }
              }}
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
    </section>
  );
};

export default ExperimentsSection;
