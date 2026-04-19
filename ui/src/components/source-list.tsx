import type { SourceLink } from '../lib/types'

interface SourceListProps {
  sources: SourceLink[]
}

export function SourceList({ sources }: SourceListProps) {
  return (
    <section className="panel sources-panel">
      <div className="panel-header">
        <h3>Sources</h3>
        <span className="source-count">{sources.length}</span>
      </div>
      <div className="sources-grid">
        {sources.map((source, index) => (
          <a
            key={`${source.title}-${index}`}
            className="source-item"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            <div className="source-number">{index + 1}</div>
            <div className="source-content">
              <div className="source-title">{source.title}</div>
              <div className="source-meta">{source.source ?? 'News Source'}</div>
            </div>
            <svg className="source-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
        ))}
      </div>
    </section>
  )
}
