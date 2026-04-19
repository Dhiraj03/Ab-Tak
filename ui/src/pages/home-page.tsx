import { useState, useRef, useCallback } from 'react'
import { AudioPlayer } from '../components/audio-player'
import { JudgeScoreCard } from '../components/judge-score-card'
import { QaBox } from '../components/qa-box'
import { SourceList } from '../components/source-list'
import { TranscriptPanel } from '../components/transcript-panel'
import { generateBulletin } from '../lib/api'
import { fixtureGenerateResponse } from '../lib/fixtures'
import type { GenerateResponse } from '../lib/types'

export function HomePage() {
  const [bulletin, setBulletin] = useState<GenerateResponse>(fixtureGenerateResponse)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showTranscript] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLDivElement>(null)

  const handleRefresh = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await generateBulletin({ 
        task: 'Cover the top global stories from the last 2 hours' 
      })
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
              New Bulletin
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

      {/* Main Player */}
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

      {/* Content Grid */}
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
                <strong>~45s</strong>
                <span>Gen Time</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Q&A Section */}
      <QaBox runId={bulletin.runId} />
    </div>
  )
}
