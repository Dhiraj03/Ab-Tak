import { config } from './config'
import { fixtureGenerateResponse, fixtureQaResponse, fixtureRunRecord } from './fixtures'
import type { GenerateRequest, GenerateResponse, QaRequest, QaResponse, RunRecord } from './types'

const USE_FIXTURES = !config.apiBaseUrl

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${config.apiBaseUrl}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

export async function generateBulletin(request: GenerateRequest): Promise<GenerateResponse> {
  if (USE_FIXTURES) {
    await delay(2600)
    return fixtureGenerateResponse
  }

  return apiFetch<GenerateResponse>('/api/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function askQuestion(request: QaRequest): Promise<QaResponse> {
  if (USE_FIXTURES) {
    await delay(1200)
    return fixtureQaResponse
  }

  return apiFetch<QaResponse>('/api/qa', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function listRuns(): Promise<RunRecord[]> {
  if (USE_FIXTURES) {
    await delay(250)
    return [fixtureRunRecord]
  }

  return apiFetch<RunRecord[]>('/api/runs')
}

export async function getRunById(runId: string): Promise<RunRecord | null> {
  if (USE_FIXTURES) {
    await delay(250)
    return fixtureRunRecord.run_id === runId ? fixtureRunRecord : null
  }

  return apiFetch<RunRecord>(`/api/runs/${runId}`)
}
