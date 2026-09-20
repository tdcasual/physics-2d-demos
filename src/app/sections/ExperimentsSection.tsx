/**
 * 实验展示区域
 */

import React, { useMemo, useState } from 'react';
import {
  sceneRegistry,
  categoryInfo,
  getDifficultyLabel
} from '../data/scenes';
import { useScrollReveal } from '../hooks';

type FilterCategory = 'all' | 'mechanics' | 'electromagnetism' | 'method';

export const ExperimentsSection: React.FC = () => {
  // The directory height grows with the catalog; a 10% threshold can exceed
  // any viewport and leave all cards permanently hidden.
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const filteredScenes = useMemo(
    () =>
      sceneRegistry.filter(
        (scene) => activeFilter === 'all' || scene.category === activeFilter
      ),
    [activeFilter]
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
          {filteredScenes.map((scene, index) => {
            // 未注册的 category（未来新增分类但未配置元信息）回退到 method，
            // 避免首页直接崩溃
            const category =
              categoryInfo[scene.category] ?? categoryInfo.method;
            return (
              <a
                key={scene.id}
                href={`/src/pages/${scene.id}.html`}
                className={`experiment-card ${isVisible ? 'visible' : ''}`}
                style={{ transitionDelay: `${Math.min(index * 0.05, 0.5)}s` }}
                onMouseEnter={() => {
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
              >
                <div className="card-meta">
                  <span className="card-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
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
                    style={{ color: category.color }}
                  >
                    {category.label}
                  </span>
                  <span className="card-arrow">→</span>
                </div>

                <div className="card-border" />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ExperimentsSection;
