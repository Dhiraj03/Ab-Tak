import type { JudgeSummary } from '../lib/types'

interface JudgeScoreCardProps {
  judge: JudgeSummary
}

export function JudgeScoreCard({ judge }: JudgeScoreCardProps) {
  const entries = Object.entries(judge.scores)

  return (
    <section className="panel result-panel">
      <div className="section-heading">
        <h3>Judge Review</h3>
        <span className="badge">Approved draft {judge.approvedDraft}</span>
      </div>
      <div className="score-grid">
        {entries.map(([label, score]) => (
          <div key={label} className="score-card">
            <span>{label.replace('_', ' ')}</span>
            <strong>{score}/10</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
