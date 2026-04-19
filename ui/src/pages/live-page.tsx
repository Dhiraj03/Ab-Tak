import { useEffect, useState, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { generateLiveBulletin } from '../lib/api'
import { NewsAnchorAvatar } from '../components/news-anchor-avatar'
import type { GenerateLiveResponse, LiveStory } from '../lib/types'

export function LivePage() {
  const [broadcast, setBroadcast] = useState<GenerateLiveResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [error, setError] = useState<string | null>(null)
  const [audioContextReady, setAudioContextReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Generate live broadcast on mount
  useEffect(() => {
    generateBroadcast()
  }, [])

  // Rotate stories based on audio time
  useEffect(() => {
    if (!broadcast || !isPlayingAudio || broadcast.stories.length <= 1) return
    
    const storyDuration = 10000 // 10 seconds per story
    const interval = setInterval(() => {
      setCurrentStoryIndex(prev => (prev + 1) % broadcast.stories.length)
    }, storyDuration)
    
    return () => clearInterval(interval)
  }, [broadcast, isPlayingAudio])

  const generateBroadcast = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    setAudioContextReady(false)
    
    try {
      const response = await generateLiveBulletin({ task: 'Live news bulletin with images' })
      console.log('Broadcast generated:', response.runId)
      console.log('Audio URL length:', response.audioUrl?.length || 0)
      setBroadcast(response)
      setCurrentStoryIndex(0)
    } catch (err) {
      setError('Failed to generate live broadcast')
      console.error(err)
    } finally {
      setIsGenerating(false)
      setIsLoading(false)
    }
  }, [])

  const startPlayback = useCallback(async () => {
    if (!audioRef.current) return
    
    // Resume AudioContext after user gesture
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const ctx = new AudioContext()
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }
      }
    } catch (e) {
      console.log('AudioContext not supported or already running')
    }
    
    setAudioContextReady(true)
    
    // Play audio
    try {
      await audioRef.current.play()
    } catch (e) {
      console.error('Play failed:', e)
    }
  }, [])

  const currentStory: LiveStory | null = broadcast?.stories[currentStoryIndex] || null

  if (isLoading || isGenerating) {
    return (
      <div className="broadcast-studio clean">
        <header className="site-header live-header">
          <div className="site-header-content">
            <div className="brand"><h1>Ab Tak</h1><span>AI Media Desk</span></div>
            <nav className="site-nav">
              <NavLink to="/" end>Bulletin</NavLink>
              <NavLink to="/live">Live</NavLink>
              <NavLink to="/observability">Observability</NavLink>
            </nav>
          </div>
        </header>
        <div className="studio-loading">
          <div className="loading-pulse" />
          <p>{isGenerating ? 'Generating Live Broadcast...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="broadcast-studio clean">
      {/* Navigation Header */}
      <header className="site-header live-header">
        <div className="site-header-content">
          <div className="brand"><h1>Ab Tak</h1><span>AI Media Desk</span></div>
          <nav className="site-nav">
            <NavLink to="/" end>Bulletin</NavLink>
            <NavLink to="/live">Live</NavLink>
            <NavLink to="/observability">Observability</NavLink>
          </nav>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="error-banner compact">
          {error}
          <button onClick={() => { setError(null); generateBroadcast(); }} className="retry-btn">Retry</button>
        </div>
      )}

      {/* Main Content - Split Layout */}
      <main className="live-content">
        {/* Left: Anchor */}
        <div className="anchor-section">
          <NewsAnchorAvatar 
            audioElement={audioContextReady ? audioRef.current : null}
            isPlaying={isPlayingAudio}
            title="Live Anchor"
            key={broadcast?.runId || 'no-broadcast'}
          />
        </div>

        {/* Right: Story Image + Headline */}
        <div className="story-section">
          {currentStory ? (
            <>
              <div className="story-image-container">
                {currentStory.imageUrl ? (
                  <img 
                    src={currentStory.imageUrl} 
                    alt={currentStory.title}
                    className="story-image"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="story-image-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>No image available</span>
                  </div>
                )}
              </div>
              <div className="story-headline">
                <span className="story-source">{currentStory.source}</span>
                <h2 className="story-title">{currentStory.title}</h2>
                <p className="story-summary">{currentStory.summary}</p>
              </div>
            </>
          ) : (
            <div className="story-empty">
              <p>No stories available</p>
            </div>
          )}
        </div>
      </main>

      {/* Audio Player - Full Width */}
      {broadcast && (
        <div className="live-audio-section">
          {!audioContextReady ? (
            <button onClick={startPlayback} className="start-broadcast-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Click to Start Broadcast
            </button>
          ) : (
            <>
              <audio 
                ref={audioRef}
                controls
                playsInline
                className="live-audio-player"
                src={broadcast.audioUrl}
                onPlay={() => {
                  console.log('Audio playing')
                  setIsPlayingAudio(true)
                }}
                onPause={() => {
                  console.log('Audio paused')
                  setIsPlayingAudio(false)
                }}
                onEnded={() => {
                  console.log('Audio ended')
                  setIsPlayingAudio(false)
                }}
                onError={(e) => {
                  console.error('Audio error:', e)
                  console.log('Audio src:', broadcast.audioUrl?.slice(0, 100))
                }}
              >
                Your browser does not support audio.
              </audio>
              <button onClick={generateBroadcast} className="regenerate-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Broadcast
              </button>
            </>
          )}
        </div>
      )}

      {/* Bottom Ticker */}
      <footer className="broadcast-ticker clean">
        <div className="ticker-branding">
          <span className="ticker-logo">24/7 NEWS</span>
          <span className="ticker-badge">LIVE</span>
        </div>
        
        <div className="ticker-display">
          {broadcast && (
            <div className="ticker-content">
              <span className="ticker-info">
                {broadcast.stories.length} stories • Story {currentStoryIndex + 1} of {broadcast.stories.length}
              </span>
            </div>
          )}
        </div>

        <div className="ticker-time-display">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </footer>
    </div>
  )
}