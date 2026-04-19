// Emergent Agent System - Agents that self-organize and spawn sub-agents
// This enables L5 emergent decomposition

import { callLLM } from './agents';
import type { AgentTrace } from './types';

export type AgentCapability = 
  | 'research' 
  | 'summarize' 
  | 'verify' 
  | 'rewrite' 
  | 'score' 
  | 'transcribe'
  | 'translate'
  | 'analyze_sentiment'
  | 'extract_entities';

export type SubAgent = {
  agent_id: string;
  parent_agent_id: string | null;
  capability: AgentCapability;
  task: string;
  context: string;
  depth: number; // nesting level
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  duration_ms?: number;
  spawned_at: string;
  completed_at?: string;
};

export type AgentSwarm = {
  swarm_id: string;
  root_task: string;
  agents: Map<string, SubAgent>;
  max_depth: number;
  created_at: string;
  completed_at?: string;
};

// Active swarms
const activeSwarms = new Map<string, AgentSwarm>();

// Rules for when to spawn sub-agents
const SPAWN_RULES: {
  capability: AgentCapability;
  trigger: (context: string, parentResult: string) => boolean;
  taskGenerator: (context: string, parentResult: string) => string;
}[] = [
  {
    capability: 'verify',
    trigger: (ctx, result) => {
      // Spawn verification if claims are made without citations
      const hasClaims = /\d+\s+(people|killed|injured|died|arrested)/i.test(result);
      const hasSources = /according to|said|told|reported/i.test(result);
      return hasClaims && !hasSources;
    },
    taskGenerator: (ctx, result) => `Verify factual claims in: "${result.slice(0, 200)}..."`,
  },
  {
    capability: 'rewrite',
    trigger: (ctx, result) => {
      // Spawn rewrite if text is too complex for audio
      const avgSentenceLength = result.split(/[.!?]+/).filter(s => s.trim()).reduce((acc, s) => acc + s.length, 0) 
        / (result.split(/[.!?]+/).filter(s => s.trim()).length || 1);
      return avgSentenceLength > 120; // Too long for comfortable audio
    },
    taskGenerator: (ctx, result) => `Rewrite for audio delivery: shorter sentences, natural pauses. Text: "${result.slice(0, 200)}..."`,
  },
  {
    capability: 'research',
    trigger: (ctx, result) => {
      // Spawn research if context is insufficient
      return ctx.includes('breaking') || ctx.includes('developing') || result.includes('details still emerging');
    },
    taskGenerator: (ctx, result) => `Research additional context for breaking story: "${result.slice(0, 150)}..."`,
  },
  {
    capability: 'summarize',
    trigger: (ctx, result) => {
      // Spawn summarization if output is too long
      return result.length > 2000;
    },
    taskGenerator: (ctx, result) => `Create executive summary of ${result.length} chars into under 500 chars`,
  },
  {
    capability: 'analyze_sentiment',
    trigger: (ctx, result) => {
      // Analyze sentiment for controversial topics
      return /controversy|debate|clash|protest|outrage/i.test(ctx);
    },
    taskGenerator: (ctx, result) => `Analyze sentiment and stakeholder positions in: "${result.slice(0, 200)}..."`,
  },
];

export async function createAgentSwarm(
  rootTask: string,
  initialCapability: AgentCapability,
  apiKey: string
): Promise<AgentSwarm> {
  const swarmId = `swarm-${Date.now()}`;
  const agents = new Map<string, SubAgent>();
  
  // Create root agent
  const rootAgent: SubAgent = {
    agent_id: `agent-${Date.now()}-root`,
    parent_agent_id: null,
    capability: initialCapability,
    task: rootTask,
    context: `Root task: ${rootTask}`,
    depth: 0,
    status: 'pending',
    spawned_at: new Date().toISOString(),
  };
  
  agents.set(rootAgent.agent_id, rootAgent);
  
  const swarm: AgentSwarm = {
    swarm_id: swarmId,
    root_task: rootTask,
    agents,
    max_depth: 0,
    created_at: new Date().toISOString(),
  };
  
  activeSwarms.set(swarmId, swarm);
  
  // Execute swarm asynchronously
  executeSwarm(swarm, apiKey);
  
  return swarm;
}

async function executeSwarm(swarm: AgentSwarm, apiKey: string): Promise<void> {
  const pendingAgents = Array.from(swarm.agents.values()).filter(a => a.status === 'pending');
  
  for (const agent of pendingAgents) {
    await executeAgent(agent, swarm, apiKey);
  }
  
  swarm.completed_at = new Date().toISOString();
}

async function executeAgent(agent: SubAgent, swarm: AgentSwarm, apiKey: string): Promise<void> {
  const startTime = performance.now();
  agent.status = 'running';
  
  try {
    // Generate prompt based on capability
    const prompt = generateCapabilityPrompt(agent.capability, agent.task, agent.context);
    
    // Execute via LLM
    const result = await callLLM(
      `You are a specialized ${agent.capability} agent. Execute your assigned task precisely.`,
      prompt,
      apiKey
    );
    
    agent.result = result || 'No result generated';
    agent.duration_ms = Math.round(performance.now() - startTime);
    agent.status = 'completed';
    agent.completed_at = new Date().toISOString();
    
    // EMERGENT BEHAVIOR: Check if we need to spawn sub-agents
    if (agent.depth < 2) { // Limit nesting depth
      const spawnedAgents = await spawnSubAgents(agent, swarm, apiKey);
      
      // Execute spawned agents
      for (const spawned of spawnedAgents) {
        await executeAgent(spawned, swarm, apiKey);
      }
    }
    
  } catch (error) {
    agent.status = 'failed';
    agent.result = `Error: ${String(error)}`;
    agent.duration_ms = Math.round(performance.now() - startTime);
  }
}

async function spawnSubAgents(
  parentAgent: SubAgent,
  swarm: AgentSwarm,
  apiKey: string
): Promise<SubAgent[]> {
  const spawned: SubAgent[] = [];
  
  for (const rule of SPAWN_RULES) {
    if (rule.trigger(parentAgent.context, parentAgent.result || '')) {
      const subAgent: SubAgent = {
        agent_id: `agent-${Date.now()}-${rule.capability}`,
        parent_agent_id: parentAgent.agent_id,
        capability: rule.capability,
        task: rule.taskGenerator(parentAgent.context, parentAgent.result || ''),
        context: `Spawned by ${parentAgent.agent_id} (${parentAgent.capability}) at depth ${parentAgent.depth + 1}`,
        depth: parentAgent.depth + 1,
        status: 'pending',
        spawned_at: new Date().toISOString(),
      };
      
      swarm.agents.set(subAgent.agent_id, subAgent);
      spawned.push(subAgent);
      
      // Update max depth
      if (subAgent.depth > swarm.max_depth) {
        swarm.max_depth = subAgent.depth;
      }
      
      console.log(`[Emergent Spawn] ${parentAgent.capability} → ${rule.capability} (depth ${subAgent.depth})`);
    }
  }
  
  return spawned;
}

function generateCapabilityPrompt(capability: AgentCapability, task: string, context: string): string {
  const prompts: Record<AgentCapability, string> = {
    research: `Research task: ${task}\n\nContext: ${context}\n\nFind specific facts, names, dates, and figures. Return concise findings.`,
    summarize: `Summarize: ${task}\n\nContext: ${context}\n\nProvide key points in 3-5 bullet points.`,
    verify: `Verify claims: ${task}\n\nContext: ${context}\n\nCheck accuracy and cite sources. Return verification status and corrections.`,
    rewrite: `Rewrite for clarity: ${task}\n\nContext: ${context}\n\nUse shorter sentences, active voice, natural flow for spoken delivery.`,
    score: `Score quality: ${task}\n\nContext: ${context}\n\nRate 1-10 on accuracy, clarity, completeness, neutrality.`,
    transcribe: `Transcribe/prepare: ${task}\n\nContext: ${context}\n\nFormat for broadcast delivery with proper pacing markers.`,
    translate: `Translate/localize: ${task}\n\nContext: ${context}\n\nMaintain meaning and tone in target format.`,
    analyze_sentiment: `Analyze: ${task}\n\nContext: ${context}\n\nIdentify sentiment, bias, and stakeholder positions.`,
    extract_entities: `Extract: ${task}\n\nContext: ${context}\n\nList all named entities (people, places, orgs, dates).`,
  };
  
  return prompts[capability];
}

export function getSwarm(swarmId: string): AgentSwarm | undefined {
  return activeSwarms.get(swarmId);
}

export function getAllSwarms(): AgentSwarm[] {
  return Array.from(activeSwarms.values());
}

export function convertSwarmToAgentTraces(swarm: AgentSwarm): AgentTrace[] {
  const traces: AgentTrace[] = [];
  
  for (const agent of swarm.agents.values()) {
    traces.push({
      name: `${agent.capability} Agent ${agent.depth > 0 ? `(sub-${agent.depth})` : '(root)'}`,
      input: agent.task,
      output_summary: agent.result?.slice(0, 200) || 'Pending...',
      duration_ms: agent.duration_ms || 0,
      cost_usd: (agent.duration_ms || 0) * 0.000001, // Estimate
      tokens: 500, // Estimate
    });
  }
  
  return traces;
}

// API-friendly swarm status
export function getSwarmStatus(swarmId: string): {
  swarm_id: string;
  status: string;
  agent_count: number;
  max_depth: number;
  agents: Array<{
    agent_id: string;
    capability: string;
    depth: number;
    status: string;
    parent_id: string | null;
  }>;
} | null {
  const swarm = activeSwarms.get(swarmId);
  if (!swarm) return null;
  
  const allCompleted = Array.from(swarm.agents.values()).every(a => a.status === 'completed' || a.status === 'failed');
  const anyFailed = Array.from(swarm.agents.values()).some(a => a.status === 'failed');
  
  return {
    swarm_id: swarm.swarm_id,
    status: allCompleted ? (anyFailed ? 'completed_with_errors' : 'completed') : 'running',
    agent_count: swarm.agents.size,
    max_depth: swarm.max_depth,
    agents: Array.from(swarm.agents.values()).map(a => ({
      agent_id: a.agent_id,
      capability: a.capability,
      depth: a.depth,
      status: a.status,
      parent_id: a.parent_agent_id,
    })),
  };
}
