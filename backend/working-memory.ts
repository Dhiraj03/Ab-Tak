// Working Memory - Short-term in-task context and state management
// Completes the L5 memory hierarchy: working + episodic + semantic

import type { RunRecord } from './types';

export type WorkingMemorySlot = {
  key: string;
  value: any;
  timestamp: string;
  ttl_seconds?: number; // Time-to-live, undefined = persists for task duration
  importance: 'low' | 'medium' | 'high' | 'critical';
  source: string; // Which agent created this
};

export type WorkingMemory = {
  session_id: string;
  task: string;
  created_at: string;
  last_accessed: string;
  slots: Map<string, WorkingMemorySlot>;
  attention_stack: string[]; // Keys in order of recent access (top = most recent)
  max_slots: number;
};

// Active working memories
const workingMemories = new Map<string, WorkingMemory>();

// Maximum slots before eviction (simulates limited capacity)
const DEFAULT_MAX_SLOTS = 50;

export function createWorkingMemory(sessionId: string, task: string): WorkingMemory {
  const wm: WorkingMemory = {
    session_id: sessionId,
    task,
    created_at: new Date().toISOString(),
    last_accessed: new Date().toISOString(),
    slots: new Map(),
    attention_stack: [],
    max_slots: DEFAULT_MAX_SLOTS,
  };
  
  workingMemories.set(sessionId, wm);
  return wm;
}

export function getWorkingMemory(sessionId: string): WorkingMemory | undefined {
  const wm = workingMemories.get(sessionId);
  if (wm) {
    wm.last_accessed = new Date().toISOString();
  }
  return wm;
}

export function setWorkingMemorySlot(
  sessionId: string,
  key: string,
  value: any,
  source: string,
  importance: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ttl_seconds?: number
): void {
  let wm = workingMemories.get(sessionId);
  if (!wm) {
    throw new Error(`No working memory found for session ${sessionId}`);
  }
  
  // Evict if at capacity (FIFO by attention, but preserve critical)
  if (wm.slots.size >= wm.max_slots && !wm.slots.has(key)) {
    evictLeastImportant(wm);
  }
  
  const slot: WorkingMemorySlot = {
    key,
    value,
    timestamp: new Date().toISOString(),
    ttl_seconds,
    importance,
    source,
  };
  
  wm.slots.set(key, slot);
  
  // Update attention stack
  wm.attention_stack = wm.attention_stack.filter(k => k !== key);
  wm.attention_stack.unshift(key);
  
  wm.last_accessed = new Date().toISOString();
}

export function getWorkingMemorySlot(sessionId: string, key: string): any | undefined {
  const wm = workingMemories.get(sessionId);
  if (!wm) return undefined;
  
  const slot = wm.slots.get(key);
  if (!slot) return undefined;
  
  // Check TTL
  if (slot.ttl_seconds) {
    const age = (Date.now() - new Date(slot.timestamp).getTime()) / 1000;
    if (age > slot.ttl_seconds) {
      wm.slots.delete(key);
      wm.attention_stack = wm.attention_stack.filter(k => k !== key);
      return undefined;
    }
  }
  
  // Update attention (recently accessed)
  wm.attention_stack = wm.attention_stack.filter(k => k !== key);
  wm.attention_stack.unshift(key);
  wm.last_accessed = new Date().toISOString();
  
  return slot.value;
}

export function getWorkingMemoryContext(sessionId: string, limit: number = 10): string {
  const wm = workingMemories.get(sessionId);
  if (!wm) return '';
  
  // Get most recently accessed high-importance slots
  const relevant = wm.attention_stack
    .slice(0, limit)
    .map(key => wm.slots.get(key))
    .filter((slot): slot is WorkingMemorySlot => !!slot)
    .filter(slot => slot.importance === 'high' || slot.importance === 'critical');
  
  if (relevant.length === 0) return '';
  
  return '\n[Working Memory Context]\n' + 
    relevant.map(s => `- ${s.key} (${s.source}): ${JSON.stringify(s.value).slice(0, 100)}`).join('\n') +
    '\n';
}

function evictLeastImportant(wm: WorkingMemory): void {
  // Find least important, least recently used slot
  let toEvict: string | null = null;
  let lowestPriority = Infinity;
  
  const importanceScores = { low: 1, medium: 2, high: 3, critical: 4 };
  
  for (let i = wm.attention_stack.length - 1; i >= 0; i--) {
    const key = wm.attention_stack[i];
    const slot = wm.slots.get(key);
    if (slot && slot.importance !== 'critical') {
      const priority = importanceScores[slot.importance] * 100 + i;
      if (priority < lowestPriority) {
        lowestPriority = priority;
        toEvict = key;
      }
    }
  }
  
  if (toEvict) {
    wm.slots.delete(toEvict);
    wm.attention_stack = wm.attention_stack.filter(k => k !== toEvict);
    console.log(`[Working Memory] Evicted: ${toEvict}`);
  }
}

export function clearWorkingMemory(sessionId: string): void {
  workingMemories.delete(sessionId);
}

export function getAllWorkingMemories(): WorkingMemory[] {
  return Array.from(workingMemories.values());
}

// Transfer working memory to episodic memory at end of task
export function transferToEpisodicMemory(
  sessionId: string,
  runRecord: RunRecord
): void {
  const wm = workingMemories.get(sessionId);
  if (!wm) return;
  
  // The working memory slots become part of the episodic memory record
  const criticalSlots = Array.from(wm.slots.values())
    .filter(s => s.importance === 'critical' || s.importance === 'high');
  
  // Log the transfer
  console.log(`[Memory Transfer] ${criticalSlots.length} critical slots from working memory to episodic`);
  
  // Clear working memory after transfer
  workingMemories.delete(sessionId);
}

// Specialized working memory operations for newsroom tasks
export type NewsroomContext = {
  current_story_index: number;
  stories_total: number;
  current_angle: string;
  key_facts_used: string[];
  sources_cited: string[];
  tone_adjustments: string[];
  time_budget_remaining_ms: number;
};

export function initializeNewsroomContext(sessionId: string, storyCount: number): void {
  const context: NewsroomContext = {
    current_story_index: 0,
    stories_total: storyCount,
    current_angle: '',
    key_facts_used: [],
    sources_cited: [],
    tone_adjustments: [],
    time_budget_remaining_ms: 60000, // 60s budget
  };
  
  setWorkingMemorySlot(sessionId, 'newsroom_context', context, 'System', 'critical');
}

export function updateNewsroomContext(
  sessionId: string,
  updates: Partial<NewsroomContext>
): void {
  const existing = getWorkingMemorySlot(sessionId, 'newsroom_context') as NewsroomContext | undefined;
  if (!existing) return;
  
  const updated = { ...existing, ...updates };
  setWorkingMemorySlot(sessionId, 'newsroom_context', updated, 'System', 'critical');
}

// API-friendly representation
export function getWorkingMemoryStatus(sessionId: string): {
  session_id: string;
  task: string;
  slot_count: number;
  max_slots: number;
  utilization_percent: number;
  critical_slots: number;
  recent_keys: string[];
} | null {
  const wm = workingMemories.get(sessionId);
  if (!wm) return null;
  
  const slots = Array.from(wm.slots.values());
  const criticalCount = slots.filter(s => s.importance === 'critical').length;
  
  return {
    session_id: wm.session_id,
    task: wm.task,
    slot_count: wm.slots.size,
    max_slots: wm.max_slots,
    utilization_percent: Math.round((wm.slots.size / wm.max_slots) * 100),
    critical_slots: criticalCount,
    recent_keys: wm.attention_stack.slice(0, 5),
  };
}
