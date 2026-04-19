import { useEffect, useState, useRef } from 'react'
import { fetchHeadlines } from '../lib/api'
import { NewsAnchorAvatar } from '../components/news-anchor-avatar'
import type { Headline } from '../lib/types'

export function LivePage() {
  const [headlines, setHeadlines] = useState<Headline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

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
        <div className="broadcast-time">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </header>

      {/* Main Broadcast Area */}
      <main className="broadcast-stage">
        {/* News Desk & Anchor Area */}
        <div className="anchor-booth">
          {/* Studio Monitors Behind Anchor */}
          <div className="studio-monitors">
            <div className="monitor monitor-left">
              <div className="monitor-content">
                <span className="monitor-label">WORLD</span>
                <div className="monitor-globe">🌍</div>
              </div>
            </div>
            <div className="monitor monitor-center">
              <div className="monitor-content">
                <span className="monitor-label">BREAKING</span>
                <div className="monitor-alert">⚡</div>
              </div>
            </div>
            <div className="monitor monitor-right">
              <div className="monitor-content">
                <span className="monitor-label">LIVE</span>
                <div className="monitor-feed">📡</div>
              </div>
            </div>
          </div>

          {/* News Desk */}
          <div className="news-desk">
            <div className="desk-surface">
              <div className="desk-logo">AB TAK</div>
              <div className="desk-items">
                <div className="desk-papers">📰</div>
                <div className="desk-mic">🎙️</div>
                <div className="desk-tablet">📱</div>
              </div>
            </div>
            <div className="desk-front">
              <div className="desk-branding">
                <span className="desk-tagline">24/7 News Network</span>
              </div>
            </div>
          </div>

          {/* Anchor - Large Close-up */}
          <div className="anchor-position">
            <NewsAnchorAvatar 
              audioElement={audioRef.current || null}
              isPlaying={isPlayingAudio}
              title="Breaking News"
            />
            
            {/* Anchor Name Lower Third */}
            <div className="anchor-lower-third">
              <div className="lower-third-bar" />
              <div className="lower-third-content">
                <span className="anchor-role">News Anchor</span>
                <span className="anchor-status">Live Broadcast</span>
              </div>
            </div>
          </div>

          {/* Side Panel - Headlines Stack */}
          <div className="headlines-panel">
            <div className="panel-header">
              <span className="panel-title">TOP STORIES</span>
              <span className="panel-count">{headlines.length}</span>
            </div>
            <div className="headlines-stack">
              {headlines.slice(0, 5).map((headline, index) => (
                <div 
                  key={headline.id}
                  className={`stack-item ${index === 0 ? 'highlight' : ''}`}
                  style={{ 
                    opacity: 1 - (index * 0.15),
                    transform: `translateX(${index * 4}px)`
                  }}
                >
                  <div className="stack-number">{index + 1}</div>
                  <div className="stack-text">{headline.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Ticker - Full Width */}
      <footer className="broadcast-ticker">
        <div className="ticker-branding">
          <span className="ticker-logo">AB TAK</span>
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
