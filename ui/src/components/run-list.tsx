import type { RunRecord } from '../lib/types'

interface RunListProps {
  runs: RunRecord[]
  selectedRunId: string | null
  onSelect: (runId: string) => void
}

export function RunList({ runs, selectedRunId, onSelect }: RunListProps) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h3>Runs</h3>
      </div>
      <div className="run-list">
        {runs.map((run) => (
          <button
            key={run.run_id}
            type="button"
            className={[
              'run-list-item',
              selectedRunId === run.run_id ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(run.run_id)}
          >
            <strong>{run.task}</strong>
            <span>{new Date(run.timestamp).toLocaleString()}</span>
            <span>
              {run.total_duration_ms} ms • ${run.total_cost_usd.toFixed(3)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
