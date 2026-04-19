import type { PipelinePhase } from './types'

export const pipelinePhases: Array<{ key: PipelinePhase; label: string }> = [
  { key: 'monitor', label: 'Monitor' },
  { key: 'editor', label: 'Editor' },
  { key: 'writer', label: 'Writer' },
  { key: 'judge', label: 'Judge' },
  { key: 'voice', label: 'Voice' },
]
