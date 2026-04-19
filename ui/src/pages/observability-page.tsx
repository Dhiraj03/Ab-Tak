import { useEffect, useState } from 'react'
import { RunList } from '../components/run-list'
import { TracePanel } from '../components/trace-panel'
import { getRunById, listRuns } from '../lib/api'
import type { RunRecord } from '../lib/types'

export function ObservabilityPage() {
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null)

  useEffect(() => {
    async function loadRuns() {
      const nextRuns = await listRuns()
      setRuns(nextRuns)
      if (nextRuns[0]) {
        setSelectedRunId(nextRuns[0].run_id)
      }
    }

    void loadRuns()
  }, [])

  useEffect(() => {
    if (!selectedRunId) {
      return
    }

    const runId = selectedRunId

    async function loadRun() {
      const nextRun = await getRunById(runId)
      setSelectedRun(nextRun)
    }

    void loadRun()
  }, [selectedRunId])

  return (
    <div className="page-stack">
      <section className="panel hero-panel hero-panel-compact">
        <div className="hero-copy">
          <p className="eyebrow">Run inspection</p>
          <h2>Observe how each bulletin moves through the editorial pipeline.</h2>
          <p className="muted">
            This route is fixture-backed now, but the layout already matches the final
            trace experience.
          </p>
        </div>
      </section>
      <div className="observability-grid">
        <RunList runs={runs} selectedRunId={selectedRunId} onSelect={setSelectedRunId} />
        <TracePanel run={selectedRun} />
      </div>
    </div>
  )
}
