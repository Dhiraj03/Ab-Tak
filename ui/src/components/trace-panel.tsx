import type { RunRecord } from '../lib/types'

interface TracePanelProps {
  run: RunRecord | null
}

export function TracePanel({ run }: TracePanelProps) {
  if (!run) {
    return (
      <section className="panel">
        <div className="section-heading">
          <h3>Trace</h3>
        </div>
        <p className="muted">Select a run to inspect its agent trace.</p>
      </section>
    )
  }

  return (
    <section className="panel trace-panel">
      <div className="section-heading">
        <h3>Trace</h3>
        <span className="badge">{run.status}</span>
      </div>
      <div className="trace-list">
        {run.agents.map((agent) => (
          <article key={agent.name} className="trace-item">
            <div className="section-heading">
              <h4>{agent.name}</h4>
              <span className="muted">{agent.duration_ms} ms</span>
            </div>
            <p>
              <strong>Input:</strong> {agent.input}
            </p>
            <p>
              <strong>Output:</strong> {agent.output_summary}
            </p>
            <p className="inline-meta">
              <span>Cost: ${agent.cost_usd.toFixed(3)}</span>
              <span>Tokens: {agent.tokens ?? 'n/a'}</span>
            </p>
            {agent.drafts?.length ? (
              <div className="draft-list">
                {agent.drafts.map((draft) => (
                  <div key={draft.draft} className="draft-card">
                    <strong>Draft {draft.draft}</strong>
                    <span>Overall {draft.overall}</span>
                    {draft.rewrite_instruction ? <p>{draft.rewrite_instruction}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {run.qa_events.length ? (
        <div className="trace-subsection">
          <h4>Q&amp;A Events</h4>
          {run.qa_events.map((event) => (
            <article key={event.question} className="trace-item">
              <p>
                <strong>Question:</strong> {event.question}
              </p>
              <p>
                <strong>Agent:</strong> {event.agent_spawned}
              </p>
              <p>{event.answer}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
