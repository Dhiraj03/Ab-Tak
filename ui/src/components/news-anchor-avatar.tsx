import { useEffect, useState } from 'react'
import { useAudioLevel } from '../lib/use-audio-level'

interface NewsAnchorAvatarProps {
  audioElement?: HTMLAudioElement | null
  isPlaying?: boolean
  title?: string
}

export function NewsAnchorAvatar({ audioElement, isPlaying = false, title = 'AB TAK LIVE' }: NewsAnchorAvatarProps) {
  const audioLevel = useAudioLevel(audioElement)
  const [blinkState, setBlinkState] = useState<'open' | 'closed'>('open')
  const [isHovered, setIsHovered] = useState(false)

  // Blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState('closed')
      setTimeout(() => setBlinkState('open'), 150)
    }, 4000 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [])

  // Determine mouth state based on audio level
  const getMouthState = (): 'closed' | 'mid' | 'open' => {
    if (!isPlaying) return 'closed'
    if (audioLevel < 0.08) return 'closed'
    if (audioLevel < 0.25) return 'mid'
    return 'open'
  }

  const mouthState = getMouthState()

  // Equalizer bar heights based on audio
  const getBarHeight = (index: number) => {
    if (!isPlaying) return 20 + index * 5
    const base = 20 + index * 8
    const variation = Math.sin(Date.now() / 200 + index) * 10
    const audioBoost = audioLevel * 40
    return Math.min(60, base + variation + audioBoost)
  }

  return (
    <div 
      className="anchor-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Studio backdrop */}
      <div className="anchor-backdrop" />
      
      {/* Avatar container */}
      <div className={`anchor-frame ${isHovered ? 'hovered' : ''}`}>
        <svg 
          viewBox="0 0 200 240" 
          className="anchor-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Clean news anchor illustration - shoulders up */}
          
          {/* Defs for gradients */}
          <defs>
            <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8c4a0" />
              <stop offset="100%" stopColor="#d4a574" />
            </linearGradient>
            <linearGradient id="hairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2c3e50" />
              <stop offset="100%" stopColor="#1a252f" />
            </linearGradient>
            <linearGradient id="blazerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0f1f35" />
            </linearGradient>
          </defs>

          {/* Neck */}
          <rect x="75" y="140" width="50" height="40" fill="url(#skinGradient)" />

          {/* Blazer shoulders */}
          <path 
            d="M30 180 Q30 160 50 165 L75 170 L125 170 L150 165 Q170 160 170 180 L170 240 L30 240 Z" 
            fill="url(#blazerGradient)"
          />

          {/* Shirt */}
          <path 
            d="M85 175 L115 175 L110 240 L90 240 Z" 
            fill="#ffffff"
          />

          {/* Tie */}
          <path 
            d="M95 175 L105 175 L108 200 L100 240 L92 200 Z" 
            fill="#c0392b"
          />

          {/* Blazer collar */}
          <path 
            d="M75 170 L85 175 L85 190 L50 185 Z" 
            fill="#152a45"
          />
          <path 
            d="M125 170 L115 175 L115 190 L150 185 Z" 
            fill="#152a45"
          />

          {/* Head shape */}
          <ellipse cx="100" cy="110" rx="55" ry="65" fill="url(#skinGradient)" />

          {/* Hair */}
          <path 
            d="M45 100 Q45 40 100 35 Q155 40 155 100 Q155 80 140 75 Q100 70 60 75 Q45 80 45 100" 
            fill="url(#hairGradient)"
          />
          <path 
            d="M45 100 Q40 120 50 135 L55 125 Q50 110 55 95 Z" 
            fill="url(#hairGradient)"
          />
          <path 
            d="M155 100 Q160 120 150 135 L145 125 Q150 110 145 95 Z" 
            fill="url(#hairGradient)"
          />

          {/* Ears */}
          <ellipse cx="48" cy="115" rx="8" ry="12" fill="url(#skinGradient)" />
          <ellipse cx="152" cy="115" rx="8" ry="12" fill="url(#skinGradient)" />

          {/* Eyes */}
          <g className={`eyes ${blinkState}`}>
            {/* Left eye */}
            <ellipse cx="80" cy="105" rx="10" ry="6" fill="#ffffff" />
            <circle cx="80" cy="105" r="4" fill="#2c3e50" />
            <circle cx="82" cy="103" r="1.5" fill="#ffffff" />
            
            {/* Right eye */}
            <ellipse cx="120" cy="105" rx="10" ry="6" fill="#ffffff" />
            <circle cx="120" cy="105" r="4" fill="#2c3e50" />
            <circle cx="122" cy="103" r="1.5" fill="#ffffff" />
            
            {/* Eyelids for blink */}
            {blinkState === 'closed' && (
              <>
                <path d="M70 105 Q80 108 90 105" stroke="#d4a574" strokeWidth="3" fill="none" />
                <path d="M110 105 Q120 108 130 105" stroke="#d4a574" strokeWidth="3" fill="none" />
              </>
            )}
          </g>

          {/* Eyebrows */}
          <path d="M70 95 Q80 92 90 95" stroke="#2c3e50" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M110 95 Q120 92 130 95" stroke="#2c3e50" strokeWidth="3" fill="none" strokeLinecap="round" />

          {/* Nose */}
          <path d="M100 105 L95 125 L105 125 Z" fill="#d4a574" opacity="0.6" />
          <path d="M95 125 Q100 128 105 125" stroke="#c4a574" strokeWidth="2" fill="none" />

          {/* Mouth - changes based on audio */}
          <g className={`mouth-${mouthState}`}>
            {mouthState === 'closed' && (
              <path d="M85 135 Q100 138 115 135" stroke="#a67c72" strokeWidth="3" fill="none" strokeLinecap="round" />
            )}
            {mouthState === 'mid' && (
              <ellipse cx="100" cy="137" rx="12" ry="6" fill="#c0392b" />
            )}
            {mouthState === 'open' && (
              <ellipse cx="100" cy="140" rx="14" ry="10" fill="#c0392b" />
            )}
          </g>
        </svg>

        {/* Live badge */}
        <div className="anchor-live-badge">
          <span className="live-badge-dot" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Equalizer */}
      <div className="anchor-equalizer">
        {[0, 1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="equalizer-bar"
            style={{ 
              height: `${getBarHeight(i)}%`,
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>

      {/* Lower third */}
      <div className="anchor-lower-third">
        <div className="lower-third-line" />
        <span className="lower-third-text">{title}</span>
      </div>
    </div>
  )
}
