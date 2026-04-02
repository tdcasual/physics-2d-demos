/**
 * 时间线区域
 */

import React, { useState } from 'react';
import { timelineData, getEraColor, getEraName, type TimelineNode } from '../data/timeline';
import { useScrollReveal } from '../hooks';

export const TimelineSection: React.FC = () => {
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.1 });
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const handleNodeClick = (node: TimelineNode) => {
    setActiveNode(activeNode === node.id ? null : node.id);
  };

  return (
    <section id="timeline" className="timeline-section" ref={sectionRef as React.RefObject<HTMLDivElement>}>
      <div className="container">
        <header className={`section-header ${isVisible ? 'reveal' : ''}`}>
          <span className="section-label">探索</span>
          <h2 className="section-title">发现之旅</h2>
          <p className="section-desc">从古希腊到现代，那些改变人类认知的伟大时刻</p>
        </header>

        <div className={`timeline-grid ${isVisible ? 'reveal' : ''}`}>
          {timelineData.map((node, index) => (
            <div
              key={node.id}
              className={`timeline-card ${activeNode === node.id ? 'active' : ''}`}
              style={{ transitionDelay: `${index * 0.05}s` }}
              onClick={() => handleNodeClick(node)}
            >
              <div className="card-header">
                <span className="year">{node.yearDisplay}</span>
                <span className="era-tag" style={{ background: getEraColor(node.era) }}>
                  {getEraName(node.era)}
                </span>
              </div>
              
              <div className="card-body">
                <span className="icon">{node.discovery.icon}</span>
                <h3 className="scientist">{node.scientist.name}</h3>
                <p className="discovery">{node.discovery.title}</p>
              </div>

              {activeNode === node.id && (
                <div className="card-detail">
                  <p className="description">{node.discovery.description}</p>
                  <blockquote>"{node.scientist.quote}"</blockquote>
                  {node.experiments.length > 0 && (
                    <div className="experiments">
                      {node.experiments.map(exp => (
                        <a key={exp.id} href={`/src/pages/${exp.id}.html`} className="exp-link">
                          {exp.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .timeline-section {
          padding: var(--space-20) 0;
          background: var(--bg-primary);
        }

        .section-header {
          max-width: 600px;
          margin-bottom: var(--space-12);
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s, transform 0.6s;
        }

        .section-header.reveal {
          opacity: 1;
          transform: translateY(0);
        }

        .section-label {
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          display: block;
          margin-bottom: var(--space-2);
        }

        .section-title {
          font-family: var(--font-display);
          font-size: var(--text-3xl);
          font-weight: var(--font-medium);
          color: var(--text-primary);
          margin-bottom: var(--space-3);
        }

        .section-desc {
          font-size: var(--text-lg);
          color: var(--text-secondary);
        }

        .timeline-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s, transform 0.6s;
        }

        .timeline-grid.reveal {
          opacity: 1;
          transform: translateY(0);
        }

        .timeline-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: var(--space-5);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .timeline-card:hover {
          border-color: var(--border-strong);
        }

        .timeline-card.active {
          border-color: var(--border-strong);
          box-shadow: var(--shadow-md);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
        }

        .year {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          color: var(--text-muted);
        }

        .era-tag {
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          color: white;
          padding: 2px var(--space-2);
          border-radius: var(--radius-sm);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-body {
          text-align: center;
        }

        .icon {
          font-size: 2rem;
          display: block;
          margin-bottom: var(--space-3);
        }

        .scientist {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: var(--font-medium);
          color: var(--text-primary);
          margin-bottom: var(--space-1);
        }

        .discovery {
          font-size: var(--text-base);
          color: var(--text-secondary);
          font-style: italic;
        }

        .card-detail {
          margin-top: var(--space-5);
          padding-top: var(--space-5);
          border-top: 1px solid var(--border-light);
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .description {
          font-size: var(--text-base);
          color: var(--text-secondary);
          margin-bottom: var(--space-4);
          line-height: var(--leading-relaxed);
        }

        blockquote {
          font-family: var(--font-display);
          font-style: italic;
          color: var(--text-primary);
          padding: var(--space-4);
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-4);
          font-size: var(--text-base);
        }

        .experiments {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        .exp-link {
          padding: var(--space-2) var(--space-3);
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-pill);
          text-decoration: none;
          color: var(--text-primary);
          font-size: var(--text-sm);
          transition: all var(--transition-fast);
        }

        .exp-link:hover {
          background: var(--text-primary);
          color: var(--bg-primary);
          border-color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .timeline-section { padding: var(--space-16) 0; }
          .timeline-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
};

export default TimelineSection;
