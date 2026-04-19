// Memory system for persistent cross-run learning
// Implements episodic memory (past runs) and semantic memory (learned patterns)

import type { RunRecord, JudgeScores } from './types';

export type EpisodicMemory = {
  memory_id: string;
  timestamp: string;
  run_id: string;
  task: string;
  task_category: string;
  outcome: {
    success: boolean;
    judge_scores: JudgeScores;
    overall_score: number;
    passed: boolean;
  };
  lessons: string[]; // Extracted lessons from this run
  sources_used: string[]; // Which sources were effective
  strategies_effective: string[]; // What worked well
  strategies_failed: string[]; // What didn't work
};

export type SemanticMemory = {
  // Learned patterns about source quality
  source_credibility: Map<string, {
    avg_score: number;
    uses: number;
    last_used: string;
  }>;
  
  // Learned patterns about task types
  task_patterns: Map<string, {
    avg_overall_score: number;
    run_count: number;
    best_strategies: string[];
    common_failures: string[];
  }>;
  
  // Writing patterns that score well
  effective_patterns: string[];
  
  // Last updated
  last_updated: string;
};

export type MemoryQuery = {
  task?: string;
  task_category?: string;
  limit?: number;
  min_score?: number;
  recency_days?: number;
};

export type MemoryContext = {
  similar_past_runs: EpisodicMemory[];
  relevant_lessons: string[];
  suggested_sources: string[];
  suggested_strategies: string[];
  source_credibility: { [source: string]: number };
  estimated_success_rate: number;
};

// In-memory storage (replace with D1 in production)
const episodicMemories: EpisodicMemory[] = [];
let semanticMemory: SemanticMemory = {
  source_credibility: new Map(),
  task_patterns: new Map(),
  effective_patterns: [],
  last_updated: new Date().toISOString(),
};

export function recordEpisodicMemory(
  runRecord: RunRecord,
  taskCategory: string = 'general'
): EpisodicMemory {
  const scores = runRecord.judge.scores;
  const overallScore = (scores.depth + scores.accuracy + scores.clarity + scores.newsworthiness + scores.audio_readiness) / 5;
  const passed = overallScore >= 6.5 && Math.min(...Object.values(scores)) >= 5;
  
  // Extract lessons based on scores
  const lessons: string[] = [];
  if (scores.depth < 7) lessons.push('Need more specific facts and figures');
  if (scores.accuracy < 7) lessons.push('Improve source verification');
  if (scores.clarity < 7) lessons.push('Simplify language, reduce jargon');
  if (scores.newsworthiness < 7) lessons.push('Focus on more significant stories');
  if (scores.audio_readiness < 7) lessons.push('Improve sentence flow for spoken delivery');
  if (passed) lessons.push('This approach worked well');
  
  // Extract effective sources
  const sourcesUsed = runRecord.sources.map(s => s.source).filter(Boolean) as string[];
  
  // Identify effective strategies based on high scores
  const effectiveStrategies: string[] = [];
  const failedStrategies: string[] = [];
  
  if (scores.clarity >= 8) effectiveStrategies.push('conversational_tone');
  if (scores.depth >= 8) effectiveStrategies.push('detailed_fact_inclusion');
  if (scores.audio_readiness >= 8) effectiveStrategies.push('short_sentences_with_pauses');
  
  if (scores.clarity < 6) failedStrategies.push('complex_sentence_structures');
  if (scores.depth < 6) failedStrategies.push('vague_generalizations');
  
  const memory: EpisodicMemory = {
    memory_id: `mem-${Date.now()}`,
    timestamp: new Date().toISOString(),
    run_id: runRecord.run_id,
    task: runRecord.task,
    task_category: taskCategory,
    outcome: {
      success: passed,
      judge_scores: scores,
      overall_score: overallScore,
      passed,
    },
    lessons,
    sources_used: sourcesUsed,
    strategies_effective: effectiveStrategies,
    strategies_failed: failedStrategies,
  };
  
  episodicMemories.unshift(memory); // Add to front (newest first)
  
  // Keep only last 100 memories
  if (episodicMemories.length > 100) {
    episodicMemories.pop();
  }
  
  // Update semantic memory
  updateSemanticMemory(memory);
  
  return memory;
}

function updateSemanticMemory(memory: EpisodicMemory): void {
  // Update source credibility
  for (const source of memory.sources_used) {
    const existing = semanticMemory.source_credibility.get(source);
    if (existing) {
      const newAvg = (existing.avg_score * existing.uses + memory.outcome.overall_score) / (existing.uses + 1);
      semanticMemory.source_credibility.set(source, {
        avg_score: newAvg,
        uses: existing.uses + 1,
        last_used: memory.timestamp,
      });
    } else {
      semanticMemory.source_credibility.set(source, {
        avg_score: memory.outcome.overall_score,
        uses: 1,
        last_used: memory.timestamp,
      });
    }
  }
  
  // Update task patterns
  const pattern = semanticMemory.task_patterns.get(memory.task_category);
  if (pattern) {
    const newAvg = (pattern.avg_overall_score * pattern.run_count + memory.outcome.overall_score) / (pattern.run_count + 1);
    semanticMemory.task_patterns.set(memory.task_category, {
      avg_overall_score: newAvg,
      run_count: pattern.run_count + 1,
      best_strategies: [...new Set([...pattern.best_strategies, ...memory.strategies_effective])].slice(0, 5),
      common_failures: [...new Set([...pattern.common_failures, ...memory.strategies_failed])].slice(0, 5),
    });
  } else {
    semanticMemory.task_patterns.set(memory.task_category, {
      avg_overall_score: memory.outcome.overall_score,
      run_count: 1,
      best_strategies: memory.strategies_effective,
      common_failures: memory.strategies_failed,
    });
  }
  
  // Update effective patterns
  semanticMemory.effective_patterns = [
    ...new Set([...semanticMemory.effective_patterns, ...memory.strategies_effective])
  ].slice(0, 10);
  
  semanticMemory.last_updated = new Date().toISOString();
}

export function queryMemory(context: MemoryQuery): MemoryContext {
  let relevant = episodicMemories;
  
  // Filter by task category if provided
  if (context.task_category) {
    relevant = relevant.filter(m => m.task_category === context.task_category);
  }
  
  // Filter by minimum score if provided
  if (context.min_score !== undefined) {
    relevant = relevant.filter(m => m.outcome.overall_score >= context.min_score);
  }
  
  // Filter by recency if provided
  if (context.recency_days !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - context.recency_days);
    relevant = relevant.filter(m => new Date(m.timestamp) >= cutoff);
  }
  
  // Sort by score (best first)
  relevant = relevant.sort((a, b) => b.outcome.overall_score - a.outcome.overall_score);
  
  // Limit results
  const limit = context.limit || 5;
  const selected = relevant.slice(0, limit);
  
  // Aggregate lessons
  const allLessons = selected.flatMap(m => m.lessons);
  const uniqueLessons = [...new Set(allLessons)];
  
  // Aggregate sources
  const allSources = selected.flatMap(m => m.sources_used);
  const sourceCounts = allSources.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s]) => s);
  
  // Aggregate strategies
  const allStrategies = selected.flatMap(m => m.strategies_effective);
  const uniqueStrategies = [...new Set(allStrategies)];
  
  // Get source credibility from semantic memory
  const sourceCredibility: { [key: string]: number } = {};
  for (const [source, data] of semanticMemory.source_credibility) {
    sourceCredibility[source] = data.avg_score;
  }
  
  // Calculate estimated success rate
  const successRate = selected.length > 0
    ? selected.filter(m => m.outcome.success).length / selected.length
    : 0.5; // Default 50% if no relevant memories
  
  return {
    similar_past_runs: selected,
    relevant_lessons: uniqueLessons,
    suggested_sources: topSources,
    suggested_strategies: uniqueStrategies,
    source_credibility: sourceCredibility,
    estimated_success_rate: successRate,
  };
}

export function getSemanticMemory(): SemanticMemory {
  return semanticMemory;
}

export function getEpisodicMemoryCount(): number {
  return episodicMemories.length;
}

export function getAllMemories(): EpisodicMemory[] {
  return [...episodicMemories];
}

// Generate memory-enhanced prompt context
export function generateMemoryContextForTask(task: string, taskCategory: string): string {
  const memory = queryMemory({
    task_category: taskCategory,
    limit: 3,
    min_score: 7,
    recency_days: 7,
  });
  
  let context = '';
  
  if (memory.similar_past_runs.length > 0) {
    context += `\n[Memory: ${memory.similar_past_runs.length} similar successful runs found]\n`;
    
    if (memory.suggested_sources.length > 0) {
      context += `High-performing sources for this task type: ${memory.suggested_sources.join(', ')}\n`;
    }
    
    if (memory.suggested_strategies.length > 0) {
      context += `Effective strategies: ${memory.suggested_strategies.join(', ')}\n`;
    }
    
    if (memory.relevant_lessons.length > 0) {
      context += `Lessons from past runs:\n${memory.relevant_lessons.slice(0, 3).map(l => `- ${l}`).join('\n')}\n`;
    }
    
    context += `Estimated success rate for this task type: ${(memory.estimated_success_rate * 100).toFixed(0)}%\n`;
  }
  
  return context;
}

// Clear all memories (useful for testing)
export function clearMemories(): void {
  episodicMemories.length = 0;
  semanticMemory = {
    source_credibility: new Map(),
    task_patterns: new Map(),
    effective_patterns: [],
    last_updated: new Date().toISOString(),
  };
}
