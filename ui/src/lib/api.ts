import { config } from './config'
import type { GenerateRequest, GenerateResponse, GenerateLiveResponse, QaRequest, QaResponse, RunRecord, HeadlinesResponse, EvalRun, EvalSet } from './types'

// Only use fixtures in development mode when explicitly enabled
const USE_FIXTURES = import.meta.env.DEV && !config.apiBaseUrl

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${config.apiBaseUrl}${path}`
  
  if (!config.apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured. Please set the backend API URL.')
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`)
  }
  
  return response.json()
}

export async function generateBulletin(request: GenerateRequest): Promise<GenerateResponse> {
  if (USE_FIXTURES) {
    // In dev mode without backend, provide a mock response for UI development
    await delay(2600)
    return {
      runId: 'dev-run-' + Date.now(),
      status: 'completed',
      audioUrl: '',
      transcript: `Good morning. Here's your Ab Tak news bulletin.\n\n${request.task}\n\nThis is a development mode response. Connect to a real backend for live news generation.`,
      sources: [
        { title: 'Development Mode - Source A', url: '#', source: 'Dev' },
        { title: 'Development Mode - Source B', url: '#', source: 'Dev' },
      ],
      judge: {
        approvedDraft: 1,
        scores: {
          depth: 7,
          accuracy: 7,
          clarity: 7,
          newsworthiness: 7,
          audio_readiness: 7,
        },
      },
    }
  }

  return apiFetch<GenerateResponse>('/api/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function askQuestion(request: QaRequest): Promise<QaResponse> {
  if (USE_FIXTURES) {
    await delay(1200)
    return {
      agent: 'Dev Agent',
      answer: 'This is a development mode response. The Q&A feature requires a real backend connection.',
      sources: [],
      durationMs: 1200,
    }
  }

  return apiFetch<QaResponse>('/api/qa', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function listRuns(): Promise<RunRecord[]> {
  if (USE_FIXTURES) {
    await delay(250)
    return []
  }

  return apiFetch<RunRecord[]>('/api/runs')
}

export async function getRunById(runId: string): Promise<RunRecord | null> {
  if (USE_FIXTURES) {
    await delay(250)
    return null
  }

  return apiFetch<RunRecord>(`/api/runs/${runId}`)
}

export async function fetchHeadlines(): Promise<HeadlinesResponse> {
  if (USE_FIXTURES) {
    await delay(500)
    return {
      headlines: [
        { id: '1', title: 'Connect to backend for live headlines', source: 'Ab Tak', url: '#', publishedAt: new Date().toISOString(), priority: 'high' },
        { id: '2', title: 'Development mode active', source: 'Ab Tak', url: '#', publishedAt: new Date().toISOString(), priority: 'medium' },
      ],
      count: 2
    }
  }

  return apiFetch<HeadlinesResponse>('/api/headlines')
}

export async function generateLiveBulletin(request: GenerateRequest): Promise<GenerateLiveResponse> {
  if (USE_FIXTURES) {
    await delay(3000)
    return {
      runId: 'live-run-' + Date.now(),
      status: 'completed',
      audioUrl: '',
      transcript: 'Good morning. Here is your live Ab Tak news bulletin with images.',
      stories: [
        { title: 'Live Story 1', url: '#', source: 'Test', imageUrl: null, summary: 'Test summary', publishedAt: new Date().toISOString() },
      ],
      judge: {
        approvedDraft: 1,
        scores: { depth: 7, accuracy: 7, clarity: 7, newsworthiness: 7, audio_readiness: 7 },
      },
      currentStoryIndex: 0,
    }
  }

  return apiFetch<GenerateLiveResponse>('/api/generate_live', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// Eval API endpoints
export async function startEvalRun(): Promise<{ eval_run_id: string; status: string; message: string }> {
  if (USE_FIXTURES) {
    await delay(1000)
    return {
      eval_run_id: 'dev-eval-' + Date.now(),
      status: 'running',
      message: 'Development mode: Mock eval started',
    }
  }

  return apiFetch<{ eval_run_id: string; status: string; message: string }>('/api/eval/run', {
    method: 'POST',
  })
}

export async function listEvalRuns(): Promise<EvalRun[]> {
  if (USE_FIXTURES) {
    await delay(250)
    return []
  }

  return apiFetch<EvalRun[]>('/api/eval/runs')
}

export async function getEvalRun(evalRunId: string): Promise<EvalRun | null> {
  if (USE_FIXTURES) {
    await delay(250)
    return null
  }

  return apiFetch<EvalRun>(`/api/eval/runs/${evalRunId}`)
}

export async function getEvalReport(evalRunId: string): Promise<string> {
  if (USE_FIXTURES) {
    await delay(250)
    return '# Development Mode\n\nMock eval report'
  }

  const response = await fetch(`${config.apiBaseUrl}/api/eval/runs/${evalRunId}/report`)
  if (!response.ok) {
    throw new Error(`Failed to fetch eval report: ${response.status}`)
  }
  return response.text()
}

export async function compareEvalRuns(): Promise<{
  current: { eval_run_id: string; timestamp: string; score: number; passed: number }
  previous: { eval_run_id: string; timestamp: string; score: number; passed: number }
  improvement: { score_delta: number; passed_delta: number; percentage: number }
}> {
  if (USE_FIXTURES) {
    await delay(250)
    return {
      current: { eval_run_id: 'current', timestamp: new Date().toISOString(), score: 7.5, passed: 4 },
      previous: { eval_run_id: 'previous', timestamp: new Date().toISOString(), score: 7.0, passed: 3 },
      improvement: { score_delta: 0.5, passed_delta: 1, percentage: 7.1 },
    }
  }

  return apiFetch('/api/eval/compare')
}

export async function getEvalSet(): Promise<EvalSet> {
  if (USE_FIXTURES) {
    await delay(250)
    return {
      name: 'Development Eval Set',
      description: 'Mock eval set for development',
      tasks: [],
      scoring_guide: {},
      pass_threshold: { minimum_average: 6.5, no_single_score_below: 5 },
    }
  }

  return apiFetch<EvalSet>('/api/eval/set')
}