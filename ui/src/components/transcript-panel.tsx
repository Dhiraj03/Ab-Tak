import { useState } from 'react'

interface TranscriptPanelProps {
  transcript: string
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <section className="panel result-panel transcript-panel">
      <div 
        className="section-heading transcript-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="transcript-title">
          {isExpanded ? '▼' : '▶'} Transcript
        </h3>
        <span className="muted">
          {isExpanded ? 'Click to hide' : 'Click to show full transcript'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="transcript-content">
          <p className="transcript-text">{transcript}</p>
        </div>
      )}
      
      {!isExpanded && (
        <div className="transcript-preview">
          <p className="transcript-text-preview">{transcript.slice(0, 120)}...</p>
        </div>
      )}
    </section>
  )
}