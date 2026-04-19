interface AudioPlayerProps {
  audioUrl: string
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  return (
    <section className="panel result-panel">
      <div className="section-heading">
        <h3>Bulletin Audio</h3>
        <span className="badge">Ready to play</span>
      </div>
      <audio className="audio-player" controls preload="none" src={audioUrl}>
        Your browser does not support audio playback.
      </audio>
    </section>
  )
}
