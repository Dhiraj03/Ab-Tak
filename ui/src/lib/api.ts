import { config } from './config'
import type { GenerateRequest, GenerateResponse, QaRequest, QaResponse, RunRecord, HeadlinesResponse } from './types'

// Use fixtures only if explicitly configured with empty API URL
const USE_FIXTURES = config.apiBaseUrl === ''

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