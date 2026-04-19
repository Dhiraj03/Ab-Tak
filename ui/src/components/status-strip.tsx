import { pipelinePhases } from '../lib/status'
import type { PipelinePhase } from '../lib/types'

interface StatusStripProps {
  activePhase: PipelinePhase | null
  isGenerating: boolean
}

export function StatusStrip({ activePhase, isGenerating }: StatusStripProps) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h3>Pipeline</h3>
        <span className="muted">
          {isGenerating ? 'Running the editorial chain' : 'Ready for a new run'}
        </span>
      </div>
      <div className="status-strip" aria-live="polite">
        {pipelinePhases.map((phase) => {
          const isActive = phase.key === activePhase
          const isPast =
            activePhase !== null &&
            pipelinePhases.findIndex((item) => item.key === phase.key) <
              pipelinePhases.findIndex((item) => item.key === activePhase)

          return (
            <div
              key={phase.key}
              className={[
                'status-pill',
                isActive ? 'is-active' : '',
                isPast ? 'is-complete' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {phase.label}
            </div>
          )
        })}
      </div>
    </section>
  )
}
