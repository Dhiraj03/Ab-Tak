import type { JudgeSummary } from '../lib/types'

interface JudgeScoreCardProps {
  judge: JudgeSummary
}

const scoreLabels: Record<string, string> = {
  depth: 'Depth',
  accuracy: 'Accuracy',
  clarity: 'Clarity',
  newsworthiness: 'News Value',
  audio_readiness: 'Audio Ready'
}

export function JudgeScoreCard({ judge }: JudgeScoreCardProps) {
  const entries = Object.entries(judge.scores)
  const average = Math.round(entries.reduce((sum, [, score]) => sum + score, 0) / entries.length)

  return (
    <section className="panel judge-panel">
      <div className="panel-header">
        <h3>Quality Review</h3>
        <div className="judge-badge">
          <span className="judge-score">{average}</span>
          <span className="judge-label">/10</span>
        </div>
      </div>
      
      <div className="judge-meta">
        <span className="draft-label">Draft {judge.approvedDraft} approved</span>
      </div>

      <div className="scores-list">
        {entries.map(([key, score]) => (
          <div key={key} className="score-row">
            <span className="score-name">{scoreLabels[key] || key}</span>
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${score * 10}%` }}
              />
            </div>
            <span className="score-value">{score}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
