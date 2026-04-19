import { useState, useRef, useCallback } from 'react'
import { AudioPlayer } from '../components/audio-player'
import { JudgeScoreCard } from '../components/judge-score-card'
import { QaBox } from '../components/qa-box'
import { SourceList } from '../components/source-list'
import { TranscriptPanel } from '../components/transcript-panel'
import { generateBulletin } from '../lib/api'
import type { GenerateResponse } from '../lib/types'

export function HomePage() {
  const [bulletin, setBulletin] = useState<GenerateResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showTranscript] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [genTimeMs, setGenTimeMs] = useState<number>(0)
  const audioRef = useRef<HTMLDivElement>(null)

  const handleRefresh = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    const startTime = performance.now()
    
    try {
      const response = await generateBulletin({ 
        task: 'Cover the top global stories from the last 2 hours' 
      })
      const endTime = performance.now()
      setGenTimeMs(Math.round(endTime - startTime))
      setBulletin(response)
      // Auto-scroll to player after generation
      setTimeout(() => {
        audioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch {
      setError('Unable to generate new bulletin. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const hasBulletin = bulletin !== null

  return (
    <div className="broadcast-page">
      {/* Simple Header */}
      <div className="simple-header">
        <div className="brand">
          <h1>Ab Tak</h1>
          <span className="divider" />
          <span className="tagline">24/7 AI Newsroom</span>
        </div>
        <button 
          className="refresh-button"
          onClick={handleRefresh}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner" />
              Generating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              {hasBulletin ? 'New Bulletin' : 'Generate Bulletin'}
            </>
          )}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)} className="dismiss">×</button>
        </div>
      )}

      {/* Empty State - First Visit */}
      {!hasBulletin && !isGenerating && (
        <section className="empty-state-panel">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2>Welcome to Ab Tak</h2>
          <p>
            Your AI-powered newsroom. Click <strong>"Generate Bulletin"</strong> to create 
            a fresh news broadcast from live RSS feeds.
          </p>
          <div className="empty-features">
            <div className="feature">
              <span className="feature-dot" />
              <span>Live RSS aggregation</span>
            </div>
            <div className="feature">
              <span className="feature-dot" />
              <span>AI-powered script writing</span>
            </div>
            <div className="feature">
              <span className="feature-dot" />
              <span>Quality scoring & review</span>
            </div>
          </div>
        </section>
      )}

      {/* Main Player - Only show when bulletin exists */}
      {hasBulletin && (
        <section className="main-player" ref={audioRef}>
          <div className="player-header">
            <div className="now-playing">
              <span className="live-badge">ON AIR</span>
              <span className="bulletin-time">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h2 className="bulletin-title">{bulletin.transcript.slice(0, 80)}...</h2>
          </div>

          <div className="player-container">
            <AudioPlayer audioUrl={bulletin.audioUrl} />
            
            {isGenerating && (
              <div className="loading-overlay">
                <div className="loading-content">
                  <div className="loading-spinner" />
                  <p>Generating fresh bulletin...</p>
                  <span className="loading-sub">This takes about 30-60 seconds</span>
                </div>
              </div>
            )}
          </div>

          <div className="player-meta">
            <span className="meta-item">
              <strong>Duration:</strong> ~2:30
            </span>
            <span className="meta-item">
              <strong>Sources:</strong> {bulletin.sources.length} articles
            </span>
            <span className="meta-item">
              <strong>Quality Score:</strong> {Math.round((bulletin.judge.scores.depth + bulletin.judge.scores.accuracy + bulletin.judge.scores.clarity + bulletin.judge.scores.newsworthiness + bulletin.judge.scores.audio_readiness) / 5)}/10
            </span>
          </div>
        </section>
      )}

      {/* Content Grid - Only show when bulletin exists */}
      {hasBulletin && (
        <div className="content-section">
          <div className="content-main">
            {showTranscript && (
              <TranscriptPanel transcript={bulletin.transcript} />
            )}
            <SourceList sources={bulletin.sources} />
          </div>

          <div className="content-side">
            <JudgeScoreCard judge={bulletin.judge} />
            
            {/* About Panel */}
            <section className="panel info-panel">
              <h4>About This Bulletin</h4>
              <p>
                This AI-generated news bulletin was created by analyzing live RSS feeds 
                from major news sources. The script was written, reviewed by a judge agent, 
                and converted to audio.
              </p>
              <div className="stats-row">
                <div className="stat">
                  <strong>{bulletin.judge.approvedDraft}</strong>
                  <span>Drafts</span>
                </div>
                <div className="stat">
                  <strong>5</strong>
                  <span>Agents</span>
                </div>
                <div className="stat">
                  <strong>{(genTimeMs / 1000).toFixed(1)}s</strong>
                  <span>Gen Time</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Q&A Section - Only show when bulletin exists */}
      {hasBulletin && <QaBox runId={bulletin.runId} />}
    </div>
  )
}
