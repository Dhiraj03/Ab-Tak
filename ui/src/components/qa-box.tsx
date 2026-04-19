import { useState } from 'react'
import { askQuestion } from '../lib/api'
import type { QaResponse } from '../lib/types'

interface QaBoxProps {
  runId: string | null
}

export function QaBox({ runId }: QaBoxProps) {
  const [question, setQuestion] = useState('What is the background on the lead story?')
  const [response, setResponse] = useState<QaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!runId || !question.trim()) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const nextResponse = await askQuestion({ runId, question })
      setResponse(nextResponse)
    } catch {
      setError('Unable to answer that question right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="panel qa-panel">
      <div className="section-heading">
        <h3>Q&amp;A</h3>
        <span className="muted">
          {runId ? 'Ask about the current bulletin' : 'Generate a bulletin to unlock Q&A'}
        </span>
      </div>
      <div className="qa-form">
        <textarea
          className="text-input"
          rows={3}
          disabled={!runId || isLoading}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button className="secondary-button" type="button" disabled={!runId || isLoading} onClick={handleSubmit}>
          {isLoading ? 'Answering...' : 'Ask Question'}
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {response ? (
        <div className="qa-answer">
          <div className="section-heading">
            <h4>Answer</h4>
            <span className="badge">{response.agent}</span>
          </div>
          <p>{response.answer}</p>
          <div className="inline-meta">
            <span>{response.durationMs} ms</span>
            {response.sources[0] ? (
              <a href={response.sources[0].url} target="_blank" rel="noreferrer">
                View source
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
