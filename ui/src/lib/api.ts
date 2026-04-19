import { fixtureGenerateResponse, fixtureQaResponse, fixtureRunRecord } from './fixtures'
import type { GenerateRequest, GenerateResponse, QaRequest, QaResponse, RunRecord } from './types'

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function generateBulletin(_request: GenerateRequest): Promise<GenerateResponse> {
  await delay(2600)
  return fixtureGenerateResponse
}

export async function askQuestion(_request: QaRequest): Promise<QaResponse> {
  await delay(1200)
  return fixtureQaResponse
}

export async function listRuns(): Promise<RunRecord[]> {
  await delay(250)
  return [fixtureRunRecord]
}

export async function getRunById(runId: string): Promise<RunRecord | null> {
  await delay(250)
  return fixtureRunRecord.run_id === runId ? fixtureRunRecord : null
}
