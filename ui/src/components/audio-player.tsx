import { useEffect, useRef } from 'react'

interface AudioPlayerProps {
  audioUrl: string
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Auto-play prevented by browser:', err)
      })
    }
  }, [audioUrl])

  if (!audioUrl) {
    return (
      <div className="audio-player-empty">
        <p className="muted">No audio available</p>
      </div>
    )
  }

  return (
    <div className="audio-player-wrapper">
      <audio 
        ref={audioRef}
        className="audio-player-full" 
        controls 
        preload="auto" 
        src={audioUrl}
        autoPlay
      >
        Your browser does not support audio playback.
      </audio>
    </div>
  )
}