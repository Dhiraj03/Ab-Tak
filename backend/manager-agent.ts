// Manager Agent for dynamic task decomposition and planning
// Analyzes task requirements and plans which agents to run and how to compose them

import { callLLM } from './agents';
import type { AgentTrace, EditorBrief } from './types';

export type SubtaskPlan = {
  subtask_id: string;
  agent_type: 'monitor' | 'editor' | 'writer' | 'judge' | 'voice' | 'qa' | 'custom';
  description: string;
  inputs_required: string[];
  outputs_expected: string[];
  dependencies: string[]; // subtask_ids that must complete before this one
  priority: number; // 1-10, higher = run earlier
  condition?: string; // conditional execution (e.g., "if tech_news")
};

export type PipelinePlan = {
  plan_id: string;
  original_task: string;
  task_analysis: {
    category: string;
    complexity: 'simple' | 'moderate' | 'complex';
    requires_research: boolean;
    requires_analysis: boolean;
    requires_multi_source: boolean;
    suggested_tone?: string;
  };
  subtasks: SubtaskPlan[];
  estimated_duration_ms: number;
  estimated_cost_usd: number;
  reasoning: string;
};

const PLANNER_SYSTEM_PROMPT = `You are a Pipeline Planning Agent for an AI newsroom. Your job is to analyze a news task and plan the optimal agent pipeline.

Available agents:
- monitor: Fetches and ranks stories from RSS feeds
- editor: Creates editorial brief from ranked stories
- writer: Generates broadcast script from brief
- judge: Scores and approves script quality
- voice: Converts script to audio
- qa: Answers follow-up questions (not for main pipeline)
- custom: Specialized processing (rarely needed)

Analyze the user's task and determine:
1. Which agents are necessary
2. What order they should run
3. Any conditional logic needed
4. The complexity level of the task

Return ONLY a JSON object with this exact shape:
{
  "task_analysis": {
    "category": "news_category",
    "complexity": "simple|moderate|complex",
    "requires_research": true/false,
    "requires_analysis": true/false,
    "requires_multi_source": true/false,
    "suggested_tone": "neutral|urgent|analytical"
  },
  "subtasks": [
    {
      "subtask_id": "unique_id",
      "agent_type": "monitor|editor|writer|judge|voice",
      "description": "what this agent will do",
      "inputs_required": ["list of required inputs"],
      "outputs_expected": ["list of expected outputs"],
      "dependencies": ["subtask_ids that must complete first"],
      "priority": 1-10
    }
  ],
  "estimated_duration_ms": number,
  "estimated_cost_usd": number,
  "reasoning": "one sentence explaining your plan choices"
}`;

export async function createPipelinePlan(
  task: string,
  apiKey: string
): Promise<PipelinePlan> {
  const planId = `plan-${Date.now()}`;
  
  // Try to use LLM for dynamic planning
  if (apiKey) {
    const llmResponse = await callLLM(
      PLANNER_SYSTEM_PROMPT,
      `Plan the optimal pipeline for this news task:\n\n"${task}"\n\nConsider what type of news coverage is needed and which agents are essential. Return the JSON plan.`,
      apiKey,
      "anthropic/claude-3.5-sonnet"
    );

    if (llmResponse) {
      try {
        const parsed = extractJson<{
          task_analysis: {
            category: string;
            complexity: 'simple' | 'moderate' | 'complex';
            requires_research: boolean;
            requires_analysis: boolean;
            requires_multi_source: boolean;
            suggested_tone?: string;
          };
          subtasks: SubtaskPlan[];
          estimated_duration_ms: number;
          estimated_cost_usd: number;
          reasoning: string;
        }>(llmResponse);

        // Validate and normalize the plan
        const normalizedSubtasks = parsed.subtasks.map((st, idx) => ({
          ...st,
          subtask_id: st.subtask_id || `step-${idx}`,
          priority: st.priority || (idx + 1) * 10,
        }));

        return {
          plan_id: planId,
          original_task: task,
          task_analysis: parsed.task_analysis,
          subtasks: normalizedSubtasks,
          estimated_duration_ms: parsed.estimated_duration_ms || 30000,
          estimated_cost_usd: parsed.estimated_cost_usd || 0.02,
          reasoning: parsed.reasoning || 'Dynamic pipeline planned based on task analysis',
        };
      } catch (error) {
        console.log('LLM plan parse failed, using deterministic fallback:', error);
      }
    }
  }

  // Deterministic fallback: Analyze task keywords to determine complexity
  return createDeterministicPlan(task, planId);
}

function createDeterministicPlan(task: string, planId: string): PipelinePlan {
  const taskLower = task.toLowerCase();
  
  // Analyze task characteristics
  const isBreakingNews = /breaking|urgent|just|developing/.test(taskLower);
  const isTech = /tech|technology|ai|software|app|digital/.test(taskLower);
  const isBusiness = /economy|market|stock|finance|business|trade/.test(taskLower);
  const isScience = /science|health|medical|research|study/.test(taskLower);
  const isLongForm = /deep dive|analysis|explain|background/.test(taskLower);
  const isQuick = /brief|summary|quick|headlines/.test(taskLower);
  const isAudioOnly = /podcast|audio only|no transcript/.test(taskLower);
  
  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
  if (isQuick || taskLower.split(' ').length < 5) {
    complexity = 'simple';
  } else if (isLongForm || isBreakingNews) {
    complexity = 'complex';
  }
  
  // Determine category
  let category = 'general';
  if (isTech) category = 'technology';
  else if (isBusiness) category = 'business';
  else if (isScience) category = 'science';
  else if (isBreakingNews) category = 'breaking';
  
  // Build subtasks based on requirements
  const subtasks: SubtaskPlan[] = [];
  let stepNum = 1;
  
  // Always need monitor
  subtasks.push({
    subtask_id: `step-${stepNum++}`,
    agent_type: 'monitor',
    description: 'Fetch and rank latest stories from RSS feeds',
    inputs_required: ['task_category', 'complexity'],
    outputs_expected: ['ranked_stories'],
    dependencies: [],
    priority: 10,
  });
  
  // Always need editor
  subtasks.push({
    subtask_id: `step-${stepNum++}`,
    agent_type: 'editor',
    description: `Create ${complexity} editorial brief from ranked stories`,
    inputs_required: ['ranked_stories', 'task_requirements'],
    outputs_expected: ['editor_brief'],
    dependencies: [`step-${stepNum - 2}`],
    priority: 20,
  });
  
  // Always need writer
  subtasks.push({
    subtask_id: `step-${stepNum++}`,
    agent_type: 'writer',
    description: `Generate ${complexity} broadcast script`,
    inputs_required: ['editor_brief'],
    outputs_expected: ['script_draft'],
    dependencies: [`step-${stepNum - 2}`],
    priority: 30,
  });
  
  // Always need judge for quality
  subtasks.push({
    subtask_id: `step-${stepNum++}`,
    agent_type: 'judge',
    description: 'Score and approve script quality',
    inputs_required: ['script_draft'],
    outputs_expected: ['approved_script', 'quality_scores'],
    dependencies: [`step-${stepNum - 2}`],
    priority: 40,
  });
  
  // Voice unless audio-only is not needed
  if (!isAudioOnly) {
    subtasks.push({
      subtask_id: `step-${stepNum++}`,
      agent_type: 'voice',
      description: 'Generate audio from approved script',
      inputs_required: ['approved_script'],
      outputs_expected: ['audio_file'],
      dependencies: [`step-${stepNum - 2}`],
      priority: 50,
    });
  }
  
  // Calculate estimates based on complexity
  const baseDuration = complexity === 'simple' ? 20000 : complexity === 'moderate' ? 30000 : 45000;
  const baseCost = complexity === 'simple' ? 0.015 : complexity === 'moderate' ? 0.02 : 0.03;
  
  const reasoning = `Deterministic plan: ${complexity} complexity ${category} coverage${isBreakingNews ? ', breaking news urgency' : ''}${isLongForm ? ', requires deep analysis' : ''}`;
  
  return {
    plan_id: planId,
    original_task: task,
    task_analysis: {
      category,
      complexity,
      requires_research: isLongForm || complexity === 'complex',
      requires_analysis: isBusiness || isScience,
      requires_multi_source: complexity === 'complex',
      suggested_tone: isBreakingNews ? 'urgent' : isBusiness ? 'analytical' : 'neutral',
    },
    subtasks,
    estimated_duration_ms: baseDuration,
    estimated_cost_usd: baseCost,
    reasoning,
  };
}

function extractJson<T>(input: string): T {
  const fencedMatch = input.match(/```json\s*([\s\S]*?)```/i);
  const jsonString = fencedMatch ? fencedMatch[1] : input;
  return JSON.parse(jsonString) as T;
}

// Utility to check if a plan is executable (no missing dependencies)
export function validatePlan(plan: PipelinePlan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const subtaskIds = new Set(plan.subtasks.map(st => st.subtask_id));
  
  for (const subtask of plan.subtasks) {
    // Check dependencies exist
    for (const dep of subtask.dependencies) {
      if (!subtaskIds.has(dep)) {
        errors.push(`Subtask ${subtask.subtask_id} has unknown dependency: ${dep}`);
      }
    }
    
    // Check for circular dependencies (basic check)
    if (subtask.dependencies.includes(subtask.subtask_id)) {
      errors.push(`Subtask ${subtask.subtask_id} depends on itself`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Sort subtasks by priority and dependencies (topological sort)
export function sortSubtasks(subtasks: SubtaskPlan[]): SubtaskPlan[] {
  const visited = new Set<string>();
  const temp = new Set<string>();
  const result: SubtaskPlan[] = [];
  
  const byId = new Map(subtasks.map(st => [st.subtask_id, st]));
  
  function visit(st: SubtaskPlan) {
    if (temp.has(st.subtask_id)) {
      throw new Error(`Circular dependency detected at ${st.subtask_id}`);
    }
    if (visited.has(st.subtask_id)) return;
    
    temp.add(st.subtask_id);
    
    // Visit dependencies first
    for (const depId of st.dependencies) {
      const dep = byId.get(depId);
      if (dep) visit(dep);
    }
    
    temp.delete(st.subtask_id);
    visited.add(st.subtask_id);
    result.push(st);
  }
  
  // Sort by priority initially for better ordering
  const sorted = [...subtasks].sort((a, b) => b.priority - a.priority);
  
  for (const st of sorted) {
    if (!visited.has(st.subtask_id)) {
      visit(st);
    }
  }
  
  return result;
}

export { callLLM };
