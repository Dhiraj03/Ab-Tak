import type { SourceLink } from '../lib/types'

interface SourceListProps {
  sources: SourceLink[]
}

export function SourceList({ sources }: SourceListProps) {
  return (
    <section className="panel result-panel">
      <div className="section-heading">
        <h3>Sources</h3>
      </div>
      <div className="source-list">
        {sources.map((source) => (
          <a
            key={`${source.title}-${source.url}`}
            className="source-card"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            <strong>{source.title}</strong>
            <span>{source.source ?? 'Source'}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
