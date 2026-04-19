interface TranscriptPanelProps {
  transcript: string
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  return (
    <section className="panel result-panel">
      <div className="section-heading">
        <h3 className="transcript-title">Transcript</h3>
      </div>
      <p className="transcript-text">{transcript}</p>
    </section>
  )
}
