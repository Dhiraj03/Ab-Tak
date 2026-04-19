import { useState, useMemo } from 'react'
import type { RunRecord } from '../lib/types'

interface RunListProps {
  runs: RunRecord[]
  selectedRunId: string | null
  onSelect: (runId: string) => void
}

export function RunList({ runs, selectedRunId, onSelect }: RunListProps) {
  const [filter, setFilter] = useState('')
  const [sortBy, setSortBy] = useState<'time' | 'cost' | 'duration'>('time')

  const filteredRuns = useMemo(() => {
    let result = [...runs]
    
    // Filter by search
    if (filter) {
      const filterLower = filter.toLowerCase()
      result = result.filter(run => 
        run.task.toLowerCase().includes(filterLower) ||
        run.run_id.toLowerCase().includes(filterLower) ||
        run.agents.some(a => a.name.toLowerCase().includes(filterLower))
      )
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        case 'cost':
          return b.total_cost_usd - a.total_cost_usd
        case 'duration':
          return b.total_duration_ms - a.total_duration_ms
        default:
          return 0
      }
    })
    
    return result
  }, [runs, filter, sortBy])

  const calculateAvgScore = (run: RunRecord) => {
    if (!run.judge?.scores) return 0
    const scores = Object.values(run.judge.scores)
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <section className="panel run-list-panel">
      <div className="section-heading">
        <h3>Runs ({filteredRuns.length}/{runs.length})</h3>
        <div className="run-list-controls">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'time' | 'cost' | 'duration')}
            className="sort-select"
          >
            <option value="time">Sort by Time</option>
            <option value="cost">Sort by Cost</option>
            <option value="duration">Sort by Duration</option>
          </select>
        </div>
      </div>
      
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Filter runs by task, ID, or agent..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
        />
        {filter && (
          <button className="clear-filter" onClick={() => setFilter('')}>
            Clear
          </button>
        )}
      </div>

      <div className="run-list">
        {filteredRuns.length === 0 ? (
          <div className="no-runs">
            <p className="muted">{filter ? 'No runs match your filter.' : 'No runs yet. Generate a bulletin first.'}</p>
          </div>
        ) : (
          filteredRuns.map((run) => {
            const avgScore = calculateAvgScore(run)
            return (
              <button
                key={run.run_id}
                type="button"
                className={[
                  'run-list-item',
                  selectedRunId === run.run_id ? 'is-selected' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onSelect(run.run_id)}
              >
                <div className="run-header">
                  <strong className="run-task" title={run.task}>
                    {run.task.slice(0, 50)}{run.task.length > 50 ? '...' : ''}
                  </strong>
                  <span className={`score-badge score-${avgScore >= 7 ? 'good' : avgScore >= 5 ? 'ok' : 'bad'}`}>
                    {avgScore}/10
                  </span>
                </div>
                
                <div className="run-meta">
                  <span className="run-time">
                    {new Date(run.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <div className="run-stats">
                  <span className="stat-item" title="Duration">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {formatDuration(run.total_duration_ms)}
                  </span>
                  <span className="stat-item" title="Cost">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                    ${run.total_cost_usd.toFixed(3)}
                  </span>
                  <span className="stat-item" title="Agents">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    {run.agents.length}
                  </span>
                  {run.qa_events.length > 0 && (
                    <span className="stat-item" title="Q&A">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      {run.qa_events.length}
                    </span>
                  )}
                </div>
                
                <div className="agent-chips">
                  {run.agents.slice(0, 4).map((agent, idx) => (
                    <span key={idx} className="agent-chip">{agent.name}</span>
                  ))}
                  {run.agents.length > 4 && (
                    <span className="agent-chip more">+{run.agents.length - 4}</span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}