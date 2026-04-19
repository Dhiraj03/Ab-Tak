import { useState } from 'react'
import type { RunRecord, AgentTrace, JudgeDraft, QaEvent } from '../lib/types'

interface TracePanelProps {
  run: RunRecord | null
}

type AgentDetailView = {
  agent: AgentTrace
  index: number
}

export function TracePanel({ run }: TracePanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentDetailView | null>(null)
  const [expandedAgents, setExpandedAgents] = useState<Set<number>>(new Set())

  if (!run) {
    return (
      <section className="panel trace-panel-empty">
        <div className="section-heading">
          <h3>Trace</h3>
        </div>
        <div className="empty-trace">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="muted">Select a run to inspect its agent trace.</p>
          <p className="hint">Traces show step-by-step what each agent did, their inputs, outputs, costs, and timing.</p>
        </div>
      </section>
    )
  }

  const toggleAgent = (index: number) => {
    const newExpanded = new Set(expandedAgents)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedAgents(newExpanded)
  }

  // Calculate the flow - which agent feeds into which
  const agentFlow = [
    { agent: 'Monitor Agent', receives: 'Live RSS Feeds', produces: 'Ranked Stories' },
    { agent: 'Editor Agent', receives: 'Ranked Stories', produces: 'Editor Brief' },
    { agent: 'Writer Agent', receives: 'Editor Brief', produces: 'Script Draft' },
    { agent: 'Judge Agent', receives: 'Script Draft', produces: 'Approved Script + Scores' },
    { agent: 'Voice Agent', receives: 'Approved Script', produces: 'Audio File' },
  ]

  const closeDetail = () => setSelectedAgent(null)

  return (
    <section className="panel trace-panel">
      {/* Header with Run Summary */}
      <div className="trace-header">
        <div className="section-heading">
          <h3>Trace: {run.run_id.slice(0, 8)}...</h3>
          <span className={`badge status-${run.status}`}>{run.status}</span>
        </div>
        
        <div className="run-summary-bar">
          <div className="summary-item">
            <span className="summary-label">Task</span>
            <span className="summary-value" title={run.task}>{run.task.slice(0, 60)}...</span>
          </div>
          <div className="summary-metrics">
            <div className="metric">
              <span className="metric-value">{run.total_duration_ms}ms</span>
              <span className="metric-label">Duration</span>
            </div>
            <div className="metric">
              <span className="metric-value">${run.total_cost_usd.toFixed(3)}</span>
              <span className="metric-label">Cost</span>
            </div>
            <div className="metric">
              <span className="metric-value">{run.agents.length}</span>
              <span className="metric-label">Agents</span>
            </div>
            <div className="metric">
              <span className="metric-value">{run.qa_events.length}</span>
              <span className="metric-label">Q&A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Flow Pipeline */}
      <div className="agent-pipeline">
        <h4 className="pipeline-title">Agent Pipeline Flow</h4>
        <div className="pipeline-steps">
          {agentFlow.map((step, idx) => (
            <div key={step.agent} className="pipeline-step">
              <div className="step-connector">
                {idx > 0 && <div className="connector-line" />}
                <div className="step-dot">{idx + 1}</div>
              </div>
              <div className="step-content">
                <span className="step-agent">{step.agent}</span>
                <span className="step-io">{step.receives} → {step.produces}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Agent Traces */}
      <div className="trace-section">
        <h4 className="trace-section-title">Agent Execution Details</h4>
        <div className="trace-list">
          {run.agents.map((agent, index) => (
            <article 
              key={`${agent.name}-${index}`} 
              className={`trace-item ${expandedAgents.has(index) ? 'expanded' : ''}`}
            >
              <div 
                className="trace-item-header" 
                onClick={() => toggleAgent(index)}
              >
                <div className="agent-info">
                  <div className="agent-number">{index + 1}</div>
                  <div className="agent-name-block">
                    <h4>{agent.name}</h4>
                    <span className="agent-timing">{agent.duration_ms}ms • {agent.tokens ?? 'N/A'} tokens</span>
                  </div>
                </div>
                <div className="agent-meta">
                  <span className="agent-cost">${agent.cost_usd.toFixed(4)}</span>
                  <button 
                    className="expand-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedAgent({ agent, index })
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Full
                  </button>
                  <svg 
                    className={`chevron ${expandedAgents.has(index) ? 'rotated' : ''}`}
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
              
              {expandedAgents.has(index) && (
                <div className="trace-item-body">
                  <div className="io-section">
                    <div className="io-block input">
                      <h5>Input</h5>
                      <pre>{agent.input}</pre>
                    </div>
                    <div className="io-block output">
                      <h5>Output</h5>
                      <pre>{agent.output_summary}</pre>
                    </div>
                  </div>
                  
                  {agent.drafts && agent.drafts.length > 0 && (
                    <div className="drafts-section">
                      <h5>Judge Drafts</h5>
                      {agent.drafts.map((draft: JudgeDraft) => (
                        <div key={draft.draft} className={`draft-card ${draft.rewrite_triggered ? 'rewrite' : 'approved'}`}>
                          <div className="draft-header">
                            <strong>Draft {draft.draft}</strong>
                            <span className={`draft-badge ${draft.rewrite_triggered ? 'rewrite' : 'approved'}`}>
                              {draft.rewrite_triggered ? 'Rewrite Required' : 'Approved'}
                            </span>
                          </div>
                          <div className="draft-scores">
                            {Object.entries(draft.scores).map(([key, score]) => (
                              <div key={key} className="score-mini">
                                <span className="score-name">{key}</span>
                                <div className="score-bar-mini">
                                  <div className="score-fill" style={{ width: `${score * 10}%`, background: score >= 7 ? '#22c55e' : score >= 5 ? '#eab308' : '#ef4444' }} />
                                </div>
                                <span className="score-value">{score}</span>
                              </div>
                            ))}
                          </div>
                          {draft.rewrite_instruction && (
                            <p className="rewrite-instruction">
                              <strong>Rewrite:</strong> {draft.rewrite_instruction}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* Q&A Events */}
      {run.qa_events.length > 0 && (
        <div className="qa-section">
          <h4 className="trace-section-title">
            Q&A Events 
            <span className="count">({run.qa_events.length})</span>
          </h4>
          <div className="qa-list">
            {run.qa_events.map((event: QaEvent, idx: number) => (
              <article key={idx} className="qa-item">
                <div className="qa-question">
                  <span className="qa-label">Q:</span>
                  <span>{event.question}</span>
                </div>
                <div className="qa-meta">
                  <span className="qa-agent">{event.agent_spawned}</span>
                  <span className="qa-timing">{event.duration_ms}ms • ${event.cost_usd?.toFixed(4) ?? 'N/A'}</span>
                </div>
                <div className="qa-answer">
                  <span className="qa-label">A:</span>
                  <p>{event.answer}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="agent-modal-overlay" onClick={closeDetail}>
          <div className="agent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedAgent.agent.name} Details</h3>
              <button className="close-btn" onClick={closeDetail}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-metrics">
                <div className="modal-metric">
                  <span className="label">Duration</span>
                  <span className="value">{selectedAgent.agent.duration_ms}ms</span>
                </div>
                <div className="modal-metric">
                  <span className="label">Cost</span>
                  <span className="value">${selectedAgent.agent.cost_usd.toFixed(4)}</span>
                </div>
                <div className="modal-metric">
                  <span className="label">Tokens</span>
                  <span className="value">{selectedAgent.agent.tokens ?? 'N/A'}</span>
                </div>
              </div>
              
              <div className="modal-io">
                <div className="modal-io-section">
                  <h4>Input</h4>
                  <pre className="code-block">{selectedAgent.agent.input}</pre>
                </div>
                <div className="modal-io-section">
                  <h4>Output</h4>
                  <pre className="code-block">{selectedAgent.agent.output_summary}</pre>
                </div>
              </div>
              
              {selectedAgent.agent.drafts && selectedAgent.agent.drafts.length > 0 && (
                <div className="modal-drafts">
                  <h4>Judge Drafts</h4>
                  {selectedAgent.agent.drafts.map((draft: JudgeDraft) => (
                    <div key={draft.draft} className="modal-draft-card">
                      <div className="draft-title">
                        Draft {draft.draft} - Overall: {draft.overall}/10
                      </div>
                      <div className="draft-scores-grid">
                        {Object.entries(draft.scores).map(([key, score]) => (
                          <div key={key} className="score-pill">
                            <span className="score-key">{key}</span>
                            <span className={`score-val ${score >= 7 ? 'good' : score >= 5 ? 'ok' : 'bad'}`}>
                              {score}
                            </span>
                          </div>
                        ))}
                      </div>
                      {draft.rewrite_instruction && (
                        <div className="rewrite-box">
                          <strong>Rewrite Instruction:</strong>
                          <p>{draft.rewrite_instruction}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}