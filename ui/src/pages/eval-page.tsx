import { useEffect, useState, useCallback } from 'react'
import { startEvalRun, listEvalRuns, getEvalReport, compareEvalRuns, getEvalSet } from '../lib/api'
import type { EvalRun, EvalSet } from '../lib/types'

export function EvalPage() {
  const [evalRuns, setEvalRuns] = useState<EvalRun[]>([])
  const [evalSet, setEvalSet] = useState<EvalSet | null>(null)
  const [selectedEvalRun, setSelectedEvalRun] = useState<EvalRun | null>(null)
  const [report, setReport] = useState<string | null>(null)
  const [comparison, setComparison] = useState<{
    current: { score: number; passed: number }
    previous: { score: number; passed: number }
    improvement: { score_delta: number; percentage: number }
  } | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvalData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [runs, setDef] = await Promise.all([
        listEvalRuns(),
        getEvalSet(),
      ])
      setEvalRuns(runs)
      setEvalSet(setDef)

      // Load comparison if we have at least 2 completed runs
      if (runs.filter(r => r.status === 'completed').length >= 2) {
        try {
          const comp = await compareEvalRuns()
          setComparison(comp)
        } catch {
          // Ignore comparison errors
        }
      }
    } catch (err) {
      setError('Failed to load eval data. Ensure backend is connected.')
      console.error('Load eval error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvalData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadEvalData, 30000)
    return () => clearInterval(interval)
  }, [loadEvalData])

  const handleStartEval = async () => {
    try {
      setIsRunning(true)
      setError(null)
      await startEvalRun()
      // Wait a bit then refresh
      setTimeout(() => {
        loadEvalData()
        setIsRunning(false)
      }, 2000)
    } catch (err) {
      setError('Failed to start eval run.')
      setIsRunning(false)
      console.error('Start eval error:', err)
    }
  }

  const handleSelectEval = async (evalRun: EvalRun) => {
    setSelectedEvalRun(evalRun)
    setReport(null)
    
    if (evalRun.status === 'completed') {
      try {
        const reportText = await getEvalReport(evalRun.eval_run_id)
        setReport(reportText)
      } catch (err) {
        console.error('Load report error:', err)
      }
    }
  }

  const runningCount = evalRuns.filter(r => r.status === 'running').length

  return (
    <div className="page-stack eval-page">
      {/* Header */}
      <section className="panel hero-panel hero-panel-compact">
        <div className="hero-copy">
          <p className="eyebrow">Evaluation & Iteration</p>
          <h2>Automated Evaluation Pipeline</h2>
          <p className="muted">
            Run the 5-task eval set automatically, track scores over time, and measure iteration improvements.
          </p>
        </div>
        <div className="hero-actions">
          <button 
            className="btn btn-primary"
            onClick={handleStartEval}
            disabled={isRunning || runningCount > 0}
          >
            {isRunning || runningCount > 0 ? (
              <>
                <span className="spinner-inline" /> 
                {runningCount > 0 ? 'Eval Running...' : 'Starting...'}
              </>
            ) : (
              '▶ Run Full Eval Set'
            )}
          </button>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)} className="dismiss">×</button>
        </div>
      )}

      {/* Comparison Banner */}
      {comparison && (
        <div className="comparison-banner">
          <div className="comparison-stats">
            <div className="comp-stat">
              <span className="comp-label">Previous</span>
              <span className="comp-value">{comparison.previous.score.toFixed(1)}/10</span>
            </div>
            <div className="comp-arrow">→</div>
            <div className="comp-stat current">
              <span className="comp-label">Current</span>
              <span className="comp-value">{comparison.current.score.toFixed(1)}/10</span>
            </div>
            <div className={`comp-improvement ${comparison.improvement.score_delta >= 0 ? 'positive' : 'negative'}`}>
              <span className="comp-delta">
                {comparison.improvement.score_delta >= 0 ? '+' : ''}
                {comparison.improvement.score_delta.toFixed(1)} 
                ({comparison.improvement.percentage >= 0 ? '+' : ''}
                {comparison.improvement.percentage.toFixed(1)}%)
              </span>
              <span className="comp-delta-label">
                {comparison.improvement.score_delta >= 0 ? '↗ Improving' : '↘ Regressing'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Eval Set Info */}
      {evalSet && (
        <div className="eval-set-info panel">
          <h4>Eval Set: {evalSet.name}</h4>
          <p className="muted">{evalSet.description}</p>
          <div className="eval-meta">
            <span className="badge">{evalSet.tasks.length} Tasks</span>
            <span className="badge">
              Pass: avg ≥{evalSet.pass_threshold.minimum_average}, 
              min ≥{evalSet.pass_threshold.no_single_score_below}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading eval data...</span>
        </div>
      ) : (
        <div className="eval-grid">
          {/* Eval Runs List */}
          <div className="eval-runs-list">
            <h4>Eval Runs ({evalRuns.length})</h4>
            {evalRuns.length === 0 ? (
              <div className="empty-state">
                <p>No eval runs yet.</p>
                <button className="btn" onClick={handleStartEval}>Run First Eval</button>
              </div>
            ) : (
              <div className="runs-stack">
                {evalRuns.map((evalRun) => (
                  <article 
                    key={evalRun.eval_run_id}
                    className={`eval-run-card ${selectedEvalRun?.eval_run_id === evalRun.eval_run_id ? 'selected' : ''} ${evalRun.status}`}
                    onClick={() => handleSelectEval(evalRun)}
                  >
                    <div className="eval-run-header">
                      <span className={`status-badge ${evalRun.status}`}>{evalRun.status}</span>
                      <span className="eval-run-id">{evalRun.eval_run_id.slice(0, 8)}...</span>
                      <span className="eval-timestamp">
                        {new Date(evalRun.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    {evalRun.status === 'completed' && (
                      <div className="eval-run-stats">
                        <div className="eval-stat">
                          <span className="eval-stat-value">{evalRun.summary.average_score.toFixed(1)}</span>
                          <span className="eval-stat-label">Avg Score</span>
                        </div>
                        <div className="eval-stat">
                          <span className={`eval-stat-value ${evalRun.summary.passed_count === evalRun.summary.total_tasks ? 'pass' : 'partial'}`}>
                            {evalRun.summary.passed_count}/{evalRun.summary.total_tasks}
                          </span>
                          <span className="eval-stat-label">Passed</span>
                        </div>
                        <div className="eval-stat">
                          <span className="eval-stat-value">${evalRun.summary.total_cost_usd.toFixed(2)}</span>
                          <span className="eval-stat-label">Cost</span>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Selected Eval Details */}
          <div className="eval-details">
            {!selectedEvalRun ? (
              <div className="empty-state panel">
                <p>Select an eval run to view details and report.</p>
              </div>
            ) : selectedEvalRun.status === 'running' ? (
              <div className="eval-running panel">
                <div className="running-indicator">
                  <span className="spinner-large" />
                  <h3>Evaluation in Progress...</h3>
                  <p>Running 5 tasks sequentially. This takes ~3-5 minutes.</p>
                </div>
                <div className="progress-steps">
                  {evalSet?.tasks.map((task, idx) => (
                    <div key={task.id} className={`progress-step ${idx < selectedEvalRun.results.length ? 'complete' : ''}`}>
                      <span className="step-num">{idx + 1}</span>
                      <span className="step-name">{task.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : report ? (
              <div className="eval-report panel">
                <div className="report-header">
                  <h3>Eval Report</h3>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      const blob = new Blob([report], { type: 'text/markdown' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `eval-report-${selectedEvalRun.eval_run_id}.md`
                      a.click()
                    }}
                  >
                    Download Markdown
                  </button>
                </div>
                <pre className="report-content">{report}</pre>
              </div>
            ) : (
              <div className="eval-summary panel">
                <h3>Eval Summary</h3>
                <div className="summary-grid">
                  <div className="summary-card">
                    <span className="summary-value">{selectedEvalRun.summary.average_score.toFixed(1)}</span>
                    <span className="summary-label">Average Score</span>
                  </div>
                  <div className="summary-card">
                    <span className={`summary-value ${selectedEvalRun.summary.passed_count === selectedEvalRun.summary.total_tasks ? 'pass' : 'fail'}`}>
                      {selectedEvalRun.summary.passed_count}/{selectedEvalRun.summary.total_tasks}
                    </span>
                    <span className="summary-label">Tasks Passed</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-value">${selectedEvalRun.summary.total_cost_usd.toFixed(2)}</span>
                    <span className="summary-label">Total Cost</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-value">{(selectedEvalRun.summary.total_duration_ms / 1000).toFixed(0)}s</span>
                    <span className="summary-label">Duration</span>
                  </div>
                </div>

                <h4>Task Results</h4>
                <div className="task-results">
                  {selectedEvalRun.results.map((result, idx) => (
                    <div key={result.task_id} className={`task-result ${result.passed ? 'pass' : 'fail'}`}>
                      <div className="task-header">
                        <span className="task-num">{idx + 1}</span>
                        <span className="task-name">{result.task_id}</span>
                        <span className={`task-status ${result.passed ? 'pass' : 'fail'}`}>
                          {result.passed ? '✓ PASS' : '✗ FAIL'}
                        </span>
                      </div>
                      <div className="task-scores">
                        <span>Depth: {result.judge_scores.depth}</span>
                        <span>Accuracy: {result.judge_scores.accuracy}</span>
                        <span>Clarity: {result.judge_scores.clarity}</span>
                        <span>News: {result.judge_scores.newsworthiness}</span>
                        <span>Audio: {result.judge_scores.audio_readiness}</span>
                        <strong>Overall: {result.overall_score.toFixed(1)}</strong>
                      </div>
                    </div>
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