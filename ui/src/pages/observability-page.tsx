import { useEffect, useState, useCallback } from 'react'
import { RunList } from '../components/run-list'
import { TracePanel } from '../components/trace-panel'
import { getRunById, listRuns } from '../lib/api'
import type { RunRecord } from '../lib/types'

export function ObservabilityPage() {
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null)
  const [compareRunId, setCompareRunId] = useState<string | null>(null)
  const [compareRun, setCompareRun] = useState<RunRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single')

  const loadRuns = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      const nextRuns = await listRuns()
      setRuns(nextRuns)
      setLastUpdated(new Date())
      
      // If we have runs and none selected, select the first one
      if (nextRuns.length > 0 && !selectedRunId) {
        setSelectedRunId(nextRuns[0].run_id)
      }
    } catch (err) {
      setError('Failed to load runs. Make sure the backend is connected.')
      console.error('Load runs error:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedRunId])

  useEffect(() => {
    loadRuns()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadRuns(true)
    }, 30000)
    
    return () => clearInterval(interval)
  }, [loadRuns])

  useEffect(() => {
    if (!selectedRunId) {
      return
    }

    const runId = selectedRunId

    async function loadRun() {
      try {
        const nextRun = await getRunById(runId)
        setSelectedRun(nextRun)
      } catch (err) {
        console.error('Load run error:', err)
      }
    }

    void loadRun()
  }, [selectedRunId])

  useEffect(() => {
    if (!compareRunId || viewMode !== 'compare') {
      setCompareRun(null)
      return
    }

    async function loadCompareRun() {
      try {
        if (!compareRunId) return
        const run = await getRunById(compareRunId)
        setCompareRun(run)
      } catch (err) {
        console.error('Load compare run error:', err)
      }
    }

    void loadCompareRun()
  }, [compareRunId, viewMode])

  const handleCompareSelect = (runId: string) => {
    if (runId === selectedRunId) {
      return // Can't compare with itself
    }
    setCompareRunId(runId)
    setViewMode('compare')
  }

  const closeCompare = () => {
    setViewMode('single')
    setCompareRunId(null)
    setCompareRun(null)
  }

  return (
    <div className="page-stack observability-page">
      {/* Header */}
      <section className="panel hero-panel hero-panel-compact">
        <div className="hero-copy">
          <p className="eyebrow">Run inspection</p>
          <h2>Observe how each bulletin moves through the editorial pipeline.</h2>
          <p className="muted">
            View complete traces including agent execution, duration, cost, and quality scores.
            {lastUpdated && (
              <span className="last-updated">
                {' '}Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="hero-actions">
          <button 
            className="refresh-btn"
            onClick={() => loadRuns(true)}
            disabled={isRefreshing}
          >
            <svg className={isRefreshing ? 'spinning' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>
      
      {/* Stats Bar */}
      {!isLoading && !error && runs.length > 0 && (
        <div className="observability-stats">
          <div className="stat-card">
            <span className="stat-value">{runs.length}</span>
            <span className="stat-label">Total Runs</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              ${runs.reduce((acc, r) => acc + r.total_cost_usd, 0).toFixed(2)}
            </span>
            <span className="stat-label">Total Cost</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {Math.round(runs.reduce((acc, r) => acc + r.total_duration_ms, 0) / runs.length)}ms
            </span>
            <span className="stat-label">Avg Duration</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {runs.reduce((acc, r) => acc + r.qa_events.length, 0)}
            </span>
            <span className="stat-label">Total Q&A</span>
          </div>
        </div>
      )}
      
      {/* View Mode Toggle */}
      {viewMode === 'compare' && (
        <div className="compare-banner">
          <span>Comparing runs: {selectedRunId?.slice(0, 8)}... vs {compareRunId?.slice(0, 8)}...</span>
          <button className="close-compare" onClick={closeCompare}>
            Exit Compare
          </button>
        </div>
      )}
      
      {isLoading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading runs...</span>
        </div>
      )}
      
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => loadRuns()} className="retry-btn">Retry</button>
        </div>
      )}
      
      {!isLoading && !error && (
        <div className="observability-grid">
          <RunList 
            runs={runs} 
            selectedRunId={selectedRunId} 
            onSelect={setSelectedRunId}
          />
          
          <div className="trace-container">
            {viewMode === 'single' ? (
              <TracePanel run={selectedRun} />
            ) : (
              <div className="compare-view">
                <div className="compare-panel">
                  <h4>Run A: {selectedRunId?.slice(0, 8)}...</h4>
                  <TracePanel run={selectedRun} />
                </div>
                <div className="compare-panel">
                  <h4>Run B: {compareRunId?.slice(0, 8)}...</h4>
                  <TracePanel run={compareRun} />
                </div>
              </div>
            )}
            
            {/* Compare Button */}
            {viewMode === 'single' && selectedRun && runs.length > 1 && (
              <div className="compare-actions">
                <span className="compare-label">Compare with:</span>
                <div className="compare-buttons">
                  {runs
                    .filter(r => r.run_id !== selectedRunId)
                    .slice(0, 3)
                    .map(run => (
                      <button
                        key={run.run_id}
                        className="compare-btn"
                        onClick={() => handleCompareSelect(run.run_id)}
                      >
                        {run.run_id.slice(0, 8)}... ({new Date(run.timestamp).toLocaleDateString()})
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}