import { useEffect, useState, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { fetchHeadlines } from '../lib/api'
import { NewsAnchorAvatar } from '../components/news-anchor-avatar'
import type { Headline } from '../lib/types'

export function LivePage() {
  const [headlines, setHeadlines] = useState<Headline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const audioRef = useRef<HTMLAudioElement>(null)

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch headlines
  useEffect(() => {
    async function loadHeadlines() {
      try {
        const response = await fetchHeadlines()
        setHeadlines(response.headlines)
      } catch (error) {
        console.error('Failed to fetch headlines:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadHeadlines()
    const interval = setInterval(loadHeadlines, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Ticker rotation
  useEffect(() => {
    if (headlines.length === 0) return
    const interval = setInterval(() => {
      setCurrentTickerIndex((prev) => (prev + 1) % headlines.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [headlines.length])

  if (isLoading) {
    return (
      <div className="broadcast-studio">
        {/* Navigation Header */}
        <header className="site-header live-header">
          <div className="site-header-content">
            <div className="brand">
              <h1>Ab Tak</h1>
              <span>AI Media Desk</span>
            </div>
            <nav className="site-nav" aria-label="Primary">
              <NavLink to="/" end>Bulletin</NavLink>
              <NavLink to="/live">Live</NavLink>
              <NavLink to="/observability">Observability</NavLink>
            </nav>
          </div>
        </header>
        <div className="studio-loading">
          <div className="loading-pulse" />
          <p>Broadcast Starting...</p>
        </div>
      </div>
    )
  }

  const currentHeadline = headlines[currentTickerIndex]

  return (
    <div className="broadcast-studio">
      {/* Navigation Header */}
      <header className="site-header live-header">
        <div className="site-header-content">
          <div className="brand">
            <h1>Ab Tak</h1>
            <span>AI Media Desk</span>
          </div>
          <nav className="site-nav" aria-label="Primary">
            <NavLink to="/" end>Bulletin</NavLink>
            <NavLink to="/live">Live</NavLink>
            <NavLink to="/observability">Observability</NavLink>
          </nav>
        </div>
      </header>

      {/* Studio Background */}
      <div className="studio-backdrop">
        <div className="studio-lighting" />
        <div className="studio-grid" />
      </div>

      {/* Top Bar - Channel Branding */}
      <header className="broadcast-header">
        <div className="channel-brand">
          <span className="live-indicator">LIVE</span>
          <h1 className="channel-name">AB TAK</h1>
        </div>
      </header>

      {/* Main Broadcast Area */}
      <main className="broadcast-stage">
        {/* News Desk & Anchor Area - Left Aligned */}
        <div className="anchor-booth">
          {/* Anchor - Large, Left Positioned (60%) */}
          <div className="anchor-position">
            <NewsAnchorAvatar 
              audioElement={audioRef.current || null}
              isPlaying={isPlayingAudio}
              title="Anchorman"
            />
          </div>

          {/* Right side - Reserved for images (40%) */}
          <div className="content-slot">
            {/* Empty slot for future images/story content */}
          </div>
        </div>
      </main>

      {/* Bottom Ticker - Full Width */}
      <footer className="broadcast-ticker">
        <div className="ticker-branding">
          <span className="ticker-logo">24/7 NEWS</span>
          <span className="ticker-badge">LIVE</span>
        </div>
        
        <div className="ticker-display">
          {currentHeadline && (
            <div className="ticker-content">
              <span className="ticker-source">{currentHeadline.source}</span>
              <span className="ticker-headline">{currentHeadline.title}</span>
              <span className="ticker-time">
                {new Date(currentHeadline.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <div className="ticker-time-display">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>

        <div className="ticker-indicators">
          {headlines.slice(0, 8).map((_, index) => (
            <div 
              key={index}
              className={`ticker-dot ${index === currentTickerIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      </footer>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
        onPlay={() => setIsPlayingAudio(true)}
        onPause={() => setIsPlayingAudio(false)}
        onEnded={() => setIsPlayingAudio(false)}
      />
    </div>
  )
}