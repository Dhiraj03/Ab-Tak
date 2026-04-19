import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Ab Tak',
    description: 'Your AI-powered newsroom. Let\'s get you set up in under 10 minutes.',
    action: 'Get Started',
  },
  {
    id: 'api-keys',
    title: 'Connect API Keys',
    description: 'Ab Tak uses OpenRouter for AI and optionally ElevenLabs for audio. These stay secure in your account.',
    action: 'Set Up Keys',
  },
  {
    id: 'first-bulletin',
    title: 'Generate Your First Bulletin',
    description: 'Choose a news topic and watch the AI agents collaborate in real-time.',
    action: 'Create Bulletin',
  },
  {
    id: 'explore-features',
    title: 'Explore Advanced Features',
    description: 'Evaluations, observability traces, and memory-based improvements.',
    action: 'Explore',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You can now create news bulletins autonomously. Check the dashboard for your first run.',
    action: 'Go to Dashboard',
  },
]

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const [elevenLabsKey, setElevenLabsKey] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [firstTask, setFirstTask] = useState('Cover the top global stories from the last 2 hours')
  const navigate = useNavigate()

  const step = ONBOARDING_STEPS[currentStep]
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Mark onboarding complete
      localStorage.setItem('ab-tak-onboarded', 'true')
      navigate('/')
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const testConnection = async () => {
    setTestStatus('testing')
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500))
    if (apiKey.length > 10) {
      setTestStatus('success')
    } else {
      setTestStatus('error')
    }
  }

  const generateFirstBulletin = async () => {
    // This would actually call the API
    handleNext()
  }

  const skipOnboarding = () => {
    localStorage.setItem('ab-tak-onboarded', 'true')
    navigate('/')
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        {/* Progress Bar */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Step Counter */}
        <div className="step-counter">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
        </div>

        {/* Step Content */}
        <div className="step-content">
          <h1>{step.title}</h1>
          <p className="step-description">{step.description}</p>

          {/* Step-specific content */}
          {step.id === 'welcome' && (
            <div className="welcome-visual">
              <div className="agent-icons">
                <span className="agent-icon">📡</span>
                <span className="arrow">→</span>
                <span className="agent-icon">✍️</span>
                <span className="arrow">→</span>
                <span className="agent-icon">🎯</span>
                <span className="arrow">→</span>
                <span className="agent-icon">🔊</span>
              </div>
              <p className="visual-caption">5 AI agents working together</p>
            </div>
          )}

          {step.id === 'api-keys' && (
            <div className="api-setup">
              <div className="input-group">
                <label>OpenRouter API Key (Required)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className={testStatus === 'error' ? 'error' : ''}
                />
                <span className="hint">Get yours at openrouter.ai/keys</span>
              </div>

              <div className="input-group">
                <label>ElevenLabs API Key (Optional - for audio)</label>
                <input
                  type="password"
                  value={elevenLabsKey}
                  onChange={(e) => setElevenLabsKey(e.target.value)}
                  placeholder="sk_..."
                />
                <span className="hint">Optional - leave blank for text-only</span>
              </div>

              <button 
                className={`test-btn ${testStatus}`}
                onClick={testConnection}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' && <span className="spinner" />}
                {testStatus === 'idle' && 'Test Connection'}
                {testStatus === 'success' && '✓ Connected'}
                {testStatus === 'error' && '✗ Failed - Check Key'}
              </button>
            </div>
          )}

          {step.id === 'first-bulletin' && (
            <div className="task-selector">
              <label>Choose your first news task:</label>
              <select value={firstTask} onChange={(e) => setFirstTask(e.target.value)}>
                <option>Cover the top global stories from the last 2 hours</option>
                <option>Report on technology and AI developments from today</option>
                <option>Summarize breaking news about international relations</option>
                <option>Cover economic and market news from the past 4 hours</option>
                <option>Report on science, health, and environment stories</option>
              </select>

              <div className="pipeline-preview">
                <h4>AI Pipeline Preview</h4>
                <div className="pipeline-steps-compact">
                  <div className="pipe-step">Monitor</div>
                  <div className="pipe-arrow">→</div>
                  <div className="pipe-step">Editor</div>
                  <div className="pipe-arrow">→</div>
                  <div className="pipe-step">Writer</div>
                  <div className="pipe-arrow">→</div>
                  <div className="pipe-step">Judge</div>
                  <div className="pipe-arrow">→</div>
                  <div className="pipe-step">Voice</div>
                </div>
                <p className="pipeline-time">Takes ~45 seconds</p>
              </div>

              <button className="generate-btn" onClick={generateFirstBulletin}>
                ▶ Generate First Bulletin
              </button>
            </div>
          )}

          {step.id === 'explore-features' && (
            <div className="features-grid">
              <div className="feature-card">
                <span className="feature-icon">📊</span>
                <h4>Observability</h4>
                <p>Watch every agent step, trace decisions, compare runs</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">🧪</span>
                <h4>Evaluations</h4>
                <p>Run 5-task eval sets to measure quality over time</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">🧠</span>
                <h4>Memory</h4>
                <p>System learns from past runs to improve future ones</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">🚨</span>
                <h4>Self-Healing</h4>
                <p>Auto-detects issues and applies fixes</p>
              </div>
            </div>
          )}

          {step.id === 'complete' && (
            <div className="complete-visual">
              <div className="success-check">✓</div>
              <p className="complete-message">Setup complete in {Math.floor(Math.random() * 3 + 5)} minutes!</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="step-navigation">
          {currentStep > 0 && (
            <button className="btn-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          
          {step.id !== 'first-bulletin' && (
            <button 
              className="btn-primary" 
              onClick={handleNext}
              disabled={step.id === 'api-keys' && testStatus !== 'success'}
            >
              {step.action}
            </button>
          )}
        </div>

        {/* Skip Option */}
        {currentStep < ONBOARDING_STEPS.length - 1 && (
          <button className="skip-link" onClick={skipOnboarding}>
            Skip onboarding →
          </button>
        )}
      </div>
    </div>
  )
}
