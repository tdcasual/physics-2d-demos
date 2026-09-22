/**
 * 实验展示区域
 */

import React, { useMemo, useState } from 'react';
import {
  sceneRegistry,
  categoryInfo,
  getDifficultyLabel
} from '../data/scenes';
import {
  CURRICULUM_DOMAINS,
  CURRICULUM_DOMAIN_INFO,
  type CurriculumDomain
} from '../../platform/curriculum';
import { useScrollReveal } from '../hooks';

type FilterCategory = 'all' | CurriculumDomain;

export const ExperimentsSection: React.FC = () => {
  // The directory height grows with the catalog; a 10% threshold can exceed
  // any viewport and leave all cards permanently hidden.
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const filteredScenes = useMemo(
    () =>
      sceneRegistry.filter(
        (scene) =>
          activeFilter === 'all' || scene.curriculumDomain === activeFilter
      ),
    [activeFilter]
  );

  const filters: { id: FilterCategory; label: string }[] = [
    { id: 'all', label: '全部' },
    ...CURRICULUM_DOMAINS.map((id) => ({
      id,
      label: CURRICULUM_DOMAIN_INFO[id].label
    }))
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
            // 注册表已经强制校验课程分类；这里保留实验域回退，避免未来
            // 新增分类文案未同步时首页直接崩溃。
            const category =
              categoryInfo[scene.curriculumDomain] ??
              CURRICULUM_DOMAIN_INFO.experimental;
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
