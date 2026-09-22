/**
 * 实验展示区域：课程筛选、章节筛选和全文检索。
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  sceneRegistry,
  categoryInfo,
  getDifficultyLabel
} from '../data/scenes';
import {
  CURRICULUM_CHAPTER_INFO,
  CURRICULUM_DOMAINS,
  CURRICULUM_DOMAIN_INFO,
  type CurriculumChapter,
  type CurriculumDomain
} from '../../platform/curriculum';
import { useScrollReveal } from '../hooks';

type FilterCategory = 'all' | CurriculumDomain;
type ChapterFilter = 'all' | CurriculumChapter;

type DirectoryState = {
  domain: FilterCategory;
  chapter: ChapterFilter;
  query: string;
};

const isDomain = (value: string): value is CurriculumDomain =>
  CURRICULUM_DOMAINS.includes(value as CurriculumDomain);

const isChapter = (value: string): value is CurriculumChapter =>
  Object.prototype.hasOwnProperty.call(CURRICULUM_CHAPTER_INFO, value);

function readDirectoryState(): DirectoryState {
  if (typeof window === 'undefined') {
    return { domain: 'all', chapter: 'all', query: '' };
  }

  const params = new URLSearchParams(window.location.search);
  const domainParam = params.get('domain') ?? '';
  const chapterParam = params.get('chapter') ?? '';
  const domain = isDomain(domainParam) ? domainParam : 'all';
  const chapter = isChapter(chapterParam) ? chapterParam : 'all';

  return {
    domain,
    chapter:
      chapter !== 'all' &&
      (domain === 'all' || CURRICULUM_CHAPTER_INFO[chapter].domain !== domain)
        ? 'all'
        : chapter,
    query: params.get('q')?.trim() ?? ''
  };
}

function writeDirectoryState(state: DirectoryState) {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (state.domain === 'all') url.searchParams.delete('domain');
  else url.searchParams.set('domain', state.domain);
  if (state.chapter === 'all') url.searchParams.delete('chapter');
  else url.searchParams.set('chapter', state.chapter);
  if (state.query) url.searchParams.set('q', state.query);
  else url.searchParams.delete('q');
  window.history.replaceState(window.history.state, '', url);
}

const normalize = (value: string) => value.toLocaleLowerCase('zh-CN');

export const ExperimentsSection: React.FC = () => {
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0 });
  const [directoryState, setDirectoryState] =
    useState<DirectoryState>(readDirectoryState);
  const {
    domain: activeFilter,
    chapter: activeChapter,
    query
  } = directoryState;

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.location.hash !== '#experiments'
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const section = sectionRef.current;
      if (section && typeof section.scrollIntoView === 'function') {
        section.scrollIntoView({ block: 'start' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sectionRef]);

  const filters: { id: FilterCategory; label: string }[] = [
    { id: 'all', label: '全部' },
    ...CURRICULUM_DOMAINS.map((id) => ({
      id,
      label: CURRICULUM_DOMAIN_INFO[id].label
    }))
  ];

  const chapterOptions = useMemo(
    () =>
      Object.entries(CURRICULUM_CHAPTER_INFO).filter(
        ([, info]) => activeFilter === 'all' || info.domain === activeFilter
      ) as [
        CurriculumChapter,
        (typeof CURRICULUM_CHAPTER_INFO)[CurriculumChapter]
      ][],
    [activeFilter]
  );

  const filteredScenes = useMemo(() => {
    const search = normalize(query);
    return sceneRegistry.filter((scene) => {
      if (activeFilter !== 'all' && scene.curriculumDomain !== activeFilter) {
        return false;
      }
      if (
        activeChapter !== 'all' &&
        scene.curriculumChapter !== activeChapter
      ) {
        return false;
      }
      if (!search) return true;

      const searchableText = normalize(
        [
          scene.title,
          scene.description,
          scene.subject,
          scene.concept,
          ...scene.subConcepts,
          ...scene.keywords
        ].join(' ')
      );
      return searchableText.includes(search);
    });
  }, [activeChapter, activeFilter, query]);

  const updateDirectory = (next: Partial<DirectoryState>) => {
    const nextState = { ...directoryState, ...next };
    writeDirectoryState(nextState);
    setDirectoryState(nextState);
  };

  const handleDomainChange = (domain: FilterCategory) => {
    const chapterBelongsToDomain =
      activeChapter !== 'all' &&
      domain !== 'all' &&
      CURRICULUM_CHAPTER_INFO[activeChapter].domain !== domain;
    updateDirectory({
      domain,
      chapter: chapterBelongsToDomain ? 'all' : activeChapter
    });
  };

  const resultLabel = query
    ? `搜索“${query}”后显示 ${filteredScenes.length} 个实验`
    : `当前显示 ${filteredScenes.length} 个实验`;

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
          <p className="section-desc">
            按课程章节浏览，或直接搜索一个概念、实验或关键词。
          </p>
        </div>

        <div className={`directory-tools ${isVisible ? 'visible' : ''}`}>
          <label className="search-field">
            <span className="search-label">搜索实验</span>
            <span className="search-input-wrap">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                id="experiment-search"
                type="search"
                value={query}
                placeholder="搜索标题、知识点或关键词"
                onChange={(event) =>
                  updateDirectory({ query: event.target.value })
                }
              />
              {query && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="清除搜索"
                  onClick={() => updateDirectory({ query: '' })}
                >
                  ×
                </button>
              )}
            </span>
          </label>

          <label className="chapter-field">
            <span className="search-label">章节</span>
            <select
              value={activeChapter}
              onChange={(event) =>
                updateDirectory({
                  chapter: event.target.value as ChapterFilter
                })
              }
              aria-label="按课程章节筛选"
            >
              <option value="all">全部章节</option>
              {chapterOptions.map(([id, info]) => (
                <option key={id} value={id}>
                  {info.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className={`filter-bar ${isVisible ? 'visible' : ''}`}
          role="group"
          aria-label="按课程领域筛选"
        >
          {filters.map((filter) => (
            <button
              type="button"
              key={filter.id}
              className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
              aria-pressed={activeFilter === filter.id}
              onClick={() => handleDomainChange(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <p className="directory-status" aria-live="polite">
          {resultLabel}
        </p>

        {filteredScenes.length > 0 ? (
          <div id="experiment-grid" className="experiments-grid">
            {filteredScenes.map((scene, index) => {
              const category =
                categoryInfo[scene.curriculumDomain] ??
                CURRICULUM_DOMAIN_INFO.experimental;
              return (
                <a
                  key={scene.id}
                  href={isVisible ? `/src/pages/${scene.id}.html` : undefined}
                  className={`experiment-card ${isVisible ? 'visible' : ''}`}
                  tabIndex={isVisible ? 0 : undefined}
                  aria-hidden={!isVisible}
                  style={{ transitionDelay: `${Math.min(index * 0.05, 0.5)}s` }}
                  onMouseEnter={() => {
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
                    <span className="card-chapter">
                      {CURRICULUM_CHAPTER_INFO[scene.curriculumChapter].label}
                    </span>
                    <span className="card-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>

                  <div className="card-border" />
                </a>
              );
            })}
          </div>
        ) : (
          <div className="directory-empty" role="status">
            <strong>没有找到匹配的实验</strong>
            <span>试试更短的关键词，或清除当前筛选条件。</span>
            <button
              type="button"
              className="empty-reset"
              onClick={() =>
                updateDirectory({ domain: 'all', chapter: 'all', query: '' })
              }
            >
              清除筛选
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ExperimentsSection;
