import { useState, useRef, useCallback } from 'react'
import { GenerateForm } from '../components/generate-form'
import { AudioPlayer } from '../components/audio-player'
import { JudgeScoreCard } from '../components/judge-score-card'
import { QaBox } from '../components/qa-box'
import { SourceList } from '../components/source-list'
import { TranscriptPanel } from '../components/transcript-panel'
import { generateBulletin } from '../lib/api'
import type { GenerateResponse } from '../lib/types'

// Preset task - can be changed by developers here
const DEFAULT_TASK = 'Cover the top global stories from the last 2 hours'

export function HomePage() {
  const [bulletin, setBulletin] = useState<GenerateResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [genTimeMs, setGenTimeMs] = useState<number>(0)
  const audioRef = useRef<HTMLDivElement>(null)

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    const startTime = performance.now()
    
    try {
      const response = await generateBulletin({ task: DEFAULT_TASK })
      const endTime = performance.now()
      setGenTimeMs(Math.round(endTime - startTime))
      setBulletin(response)
      // Auto-scroll to player after generation
      setTimeout(() => {
        audioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      setError('Unable to generate new bulletin. Please try again.')
      console.error('Generate error:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const hasBulletin = bulletin !== null

  return (
    <div className="broadcast-page clean">
      {/* Minimal Header */}
      <div className="minimal-header">
        <h1 className="brand-title">Ab Tak</h1>
        <span className="brand-divider" />
        <span className="brand-tagline">AI Newsroom</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner compact">
          {error}
          <button onClick={() => setError(null)} className="dismiss">×</button>
        </div>
      )}

      {/* Generate Button Only */}
      <GenerateForm
        disabled={isGenerating}
        onSubmit={handleGenerate}
      />

      {/* Loading State */}
      {isGenerating && (
        <section className="loading-section minimal">
          <div className="loading-content">
            <div className="loading-spinner-large" />
            <h2>Generating your bulletin...</h2>
            <p>This takes about 30-60 seconds</p>
          </div>
        </section>
      )}

      {/* Audio Player Result */}
      {hasBulletin && !isGenerating && (
        <section className="result-section" ref={audioRef}>
          <AudioPlayer audioUrl={bulletin.audioUrl} />
          
          <div className="result-meta">
            <span className="meta-pill">
              <strong>{bulletin.sources.length}</strong> sources
            </span>
            <span className="meta-pill">
              <strong>{Math.round((bulletin.judge.scores.depth + bulletin.judge.scores.accuracy + bulletin.judge.scores.clarity + bulletin.judge.scores.newsworthiness + bulletin.judge.scores.audio_readiness) / 5)}/10</strong> quality
            </span>
            <span className="meta-pill">
              <strong>{(genTimeMs / 1000).toFixed(1)}s</strong> generation time
            </span>
          </div>
        </section>
      )}

      {/* Collapsible Content */}
      {hasBulletin && !isGenerating && (
        <div className="details-section">
          <TranscriptPanel transcript={bulletin.transcript} />
          <SourceList sources={bulletin.sources} />
          <JudgeScoreCard judge={bulletin.judge} />
          <QaBox runId={bulletin.runId} />
        </div>
      )}
    </div>
  )
}