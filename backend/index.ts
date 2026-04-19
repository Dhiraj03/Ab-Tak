import { v4 as uuidv4 } from 'uuid';
import { runFullPipeline, createPipelinePlan, type PipelinePlan, recordEpisodicMemory, queryMemory, getSemanticMemory, getAllMemories, type MemoryContext } from './pipeline';
import { fetchFeeds } from './feeds';
import { runQaAgent } from './agents';
import { runFullEvalSet, generateEvalReport } from './eval-runner';
import { runLivePipeline } from './live-pipeline';
import { createAgentSwarm, getSwarm, getAllSwarms, getSwarmStatus, type AgentSwarm } from './emergent-agents';
import { getWorkingMemoryStatus, createWorkingMemory, type WorkingMemory } from './working-memory';
import { evaluateRunForAlerts, getActiveAlerts, getAllAlerts, getAlertStats, getSystemHealth, acknowledgeAlert } from './alerts';
import type { GenerateRequest, GenerateResponse, QaRequest, QaResponse, RunRecord, Headline, EditorBrief, GenerateLiveRequest, GenerateLiveResponse } from './types';
import type { EvalRun } from './eval-types';

const runs = new Map<string, RunRecord>();
const evalRuns = new Map<string, EvalRun>();
const pipelinePlans = new Map<string, PipelinePlan>();
const activeSwarms = new Map<string, AgentSwarm>();
const workingMemories = new Map<string, WorkingMemory>();
let lastRunBrief: EditorBrief | null = null;
let lastRunTranscript = '';

export interface Env {
  OR_API_KEY: string;
  ELEVENLABS_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/api/generate' && method === 'POST') {
        const body = await request.json() as GenerateRequest & { use_dynamic_planning?: boolean };
        const runId = uuidv4();
        
        // Generate plan if dynamic planning is requested
        let plan: PipelinePlan | undefined;
        if (body.use_dynamic_planning) {
          plan = await createPipelinePlan(body.task, env.OR_API_KEY);
          pipelinePlans.set(plan.plan_id, plan);
        }
        
        const result = await runFullPipeline(body.task, env.ELEVENLABS_API_KEY);
        
        lastRunBrief = result.brief;
        lastRunTranscript = result.transcript;

        const audioUrl = result.audioBase64 ? result.audioBase64 : result.audioUrl;

        const response: GenerateResponse & { plan_id?: string; task_analysis?: any } = {
          runId,
          status: 'completed',
          audioUrl,
          transcript: result.transcript,
          sources: result.sources,
          judge: result.judge,
        };
        
        // Include plan info if dynamic planning was used
        if (plan) {
          response.plan_id = plan.plan_id;
          response.task_analysis = plan.task_analysis;
        }

        const runRecord: RunRecord = {
          run_id: runId,
          timestamp: new Date().toISOString(),
          task: body.task,
          status: 'completed',
          agents: result.agents,
          transcript: result.transcript,
          sources: result.sources,
          audio_url: audioUrl,
          judge: result.judge,
          qa_events: [],
          total_duration_ms: result.totalDurationMs,
          total_cost_usd: result.totalCostUsd,
        };
        runs.set(runId, runRecord);

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Live broadcast endpoint with images
      if (path === '/api/generate_live' && method === 'POST') {
        const body = await request.json() as GenerateLiveRequest;
        const runId = uuidv4();
        
        const result = await runLivePipeline(body.task, env.OR_API_KEY, env.ELEVENLABS_API_KEY);
        
        lastRunBrief = result.brief;
        lastRunTranscript = result.transcript;

        const response: GenerateLiveResponse = {
          runId,
          status: 'completed',
          audioUrl: result.audioUrl || result.audioBase64,
          transcript: result.transcript,
          stories: result.stories,
          judge: result.judge,
          currentStoryIndex: 0,
        };

        const runRecord: RunRecord = {
          run_id: runId,
          timestamp: new Date().toISOString(),
          task: body.task,
          status: 'completed',
          agents: result.agents,
          transcript: result.transcript,
          sources: result.stories.map(s => ({ title: s.title, url: s.url, source: s.source })),
          audio_url: result.audioUrl || result.audioBase64,
          judge: result.judge,
          qa_events: [],
          total_duration_ms: result.totalDurationMs,
          total_cost_usd: result.totalCostUsd,
        };
        runs.set(runId, runRecord);

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/qa' && method === 'POST') {
        const body = await request.json() as QaRequest;
        
        let qaResult;
        if (lastRunBrief && lastRunTranscript) {
          qaResult = runQaAgent(body.question, lastRunBrief, lastRunTranscript);
        } else {
          qaResult = {
            agent: 'Fact Agent',
            answer: 'No bulletin has been generated yet. Please generate a bulletin first.',
            relatedStory: null,
            sources: [],
          };
        }

        const response: QaResponse = {
          agent: qaResult.agent,
          answer: qaResult.answer,
          sources: qaResult.sources,
          durationMs: 500,
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/runs' && method === 'GET') {
        const runList = Array.from(runs.values());
        return new Response(JSON.stringify(runList), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path.startsWith('/api/runs/') && method === 'GET') {
        const runId = path.replace('/api/runs/', '');
        const run = runs.get(runId);
        
        if (!run) {
          return new Response(JSON.stringify({ error: 'Run not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(run), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/headlines' && method === 'GET') {
        const stories = await fetchFeeds();
        const headlines: Headline[] = stories.slice(0, 15).map((story, index) => ({
          id: story.id,
          title: story.title,
          source: story.source,
          url: story.link,
          publishedAt: story.publishedAt,
          priority: index < 5 ? 'high' : index < 10 ? 'medium' : 'low',
        }));
        
        return new Response(JSON.stringify({ headlines, count: headlines.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/eval/run' && method === 'POST') {
        // Start automated eval run
        const evalPromise = runFullEvalSet(
          env.OR_API_KEY,
          env.ELEVENLABS_API_KEY,
          (completed, total, currentTask) => {
            console.log(`[Eval Progress] ${completed}/${total}: ${currentTask}`);
          }
        );

        // Store the promise and return immediately with eval_run_id
        const pendingEvalRun: EvalRun = {
          eval_run_id: 'eval-' + uuidv4(),
          timestamp: new Date().toISOString(),
          status: 'running',
          results: [],
          summary: {
            total_tasks: 5,
            passed_count: 0,
            failed_count: 0,
            average_score: 0,
            total_duration_ms: 0,
            total_cost_usd: 0,
          },
          version: '1.0.0',
        };
        
        evalRuns.set(pendingEvalRun.eval_run_id, pendingEvalRun);

        // Run eval asynchronously and update when done
        evalPromise.then((completedEvalRun) => {
          evalRuns.set(completedEvalRun.eval_run_id, completedEvalRun);
          console.log(`[Eval Complete] ${completedEvalRun.eval_run_id} - Score: ${completedEvalRun.summary.average_score}`);
        }).catch((error) => {
          console.error('[Eval Error]', error);
        });

        return new Response(JSON.stringify({
          eval_run_id: pendingEvalRun.eval_run_id,
          status: 'running',
          message: 'Evaluation started. Poll /api/eval/runs/:id for results.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/eval/runs' && method === 'GET') {
        // List all eval runs
        const evalList = Array.from(evalRuns.values()).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return new Response(JSON.stringify(evalList), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path.startsWith('/api/eval/runs/') && method === 'GET') {
        const evalRunId = path.replace('/api/eval/runs/', '');
        const evalRun = evalRuns.get(evalRunId);
        
        if (!evalRun) {
          return new Response(JSON.stringify({ error: 'Eval run not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(evalRun), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path.startsWith('/api/eval/runs/') && path.endsWith('/report') && method === 'GET') {
        const evalRunId = path.replace('/api/eval/runs/', '').replace('/report', '');
        const evalRun = evalRuns.get(evalRunId);
        
        if (!evalRun) {
          return new Response(JSON.stringify({ error: 'Eval run not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const report = generateEvalReport(evalRun);
        return new Response(report, {
          headers: { ...corsHeaders, 'Content-Type': 'text/markdown' },
        });
      }

      if (path === '/api/eval/compare' && method === 'GET') {
        // Compare latest two eval runs
        const evalList = Array.from(evalRuns.values())
          .filter(e => e.status === 'completed')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 2);

        if (evalList.length < 2) {
          return new Response(JSON.stringify({ 
            error: 'Need at least 2 completed eval runs to compare',
            available: evalList.length 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const [current, previous] = evalList;
        const scoreDiff = current.summary.average_score - previous.summary.average_score;
        const passedDiff = current.summary.passed_count - previous.summary.passed_count;

        return new Response(JSON.stringify({
          current: {
            eval_run_id: current.eval_run_id,
            timestamp: current.timestamp,
            score: current.summary.average_score,
            passed: current.summary.passed_count,
          },
          previous: {
            eval_run_id: previous.eval_run_id,
            timestamp: previous.timestamp,
            score: previous.summary.average_score,
            passed: previous.summary.passed_count,
          },
          improvement: {
            score_delta: parseFloat(scoreDiff.toFixed(2)),
            passed_delta: passedDiff,
            percentage: previous.summary.average_score > 0 
              ? parseFloat(((scoreDiff / previous.summary.average_score) * 100).toFixed(1))
              : 0,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/eval/set' && method === 'GET') {
        // Return the eval set definition
        const { STANDARD_EVAL_SET } = await import('./eval-types');
        return new Response(JSON.stringify(STANDARD_EVAL_SET), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/plan' && method === 'POST') {
        // Generate pipeline plan for a task
        const body = await request.json() as { task: string };
        const plan = await createPipelinePlan(body.task, env.OR_API_KEY);
        
        // Store the plan
        pipelinePlans.set(plan.plan_id, plan);
        
        return new Response(JSON.stringify(plan), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/plans' && method === 'GET') {
        // List all stored plans
        const plans = Array.from(pipelinePlans.values()).sort((a, b) => 
          new Date(b.plan_id.split('-')[1] || 0).getTime() - new Date(a.plan_id.split('-')[1] || 0).getTime()
        );
        return new Response(JSON.stringify(plans), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path.startsWith('/api/plans/') && method === 'GET') {
        const planId = path.replace('/api/plans/', '');
        const plan = pipelinePlans.get(planId);
        
        if (!plan) {
          return new Response(JSON.stringify({ error: 'Plan not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(plan), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/memory/query' && method === 'POST') {
        // Query episodic memory
        const body = await request.json() as { task_category?: string; limit?: number; min_score?: number };
        const memoryContext = queryMemory({
          task_category: body.task_category,
          limit: body.limit || 5,
          min_score: body.min_score,
          recency_days: 7,
        });
        
        return new Response(JSON.stringify(memoryContext), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/memory/episodic' && method === 'GET') {
        // Get all episodic memories
        const memories = getAllMemories();
        return new Response(JSON.stringify(memories.slice(0, 20)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/memory/semantic' && method === 'GET') {
        // Get semantic memory (learned patterns)
        const semantic = getSemanticMemory();
        // Convert Maps to objects for JSON serialization
        const response = {
          source_credibility: Object.fromEntries(semantic.source_credibility),
          task_patterns: Object.fromEntries(semantic.task_patterns),
          effective_patterns: semantic.effective_patterns,
          last_updated: semantic.last_updated,
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/swarm/create' && method === 'POST') {
        // Create emergent agent swarm
        const body = await request.json() as { task: string; capability: string };
        const swarm = await createAgentSwarm(body.task, body.capability as any, env.OR_API_KEY);
        activeSwarms.set(swarm.swarm_id, swarm);
        
        return new Response(JSON.stringify({
          swarm_id: swarm.swarm_id,
          status: 'created',
          agent_count: swarm.agents.size,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/swarm' && method === 'GET') {
        // List all swarms
        const swarms = getAllSwarms().map(s => getSwarmStatus(s.swarm_id));
        return new Response(JSON.stringify(swarms), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path.startsWith('/api/swarm/') && method === 'GET') {
        const swarmId = path.replace('/api/swarm/', '');
        const status = getSwarmStatus(swarmId);
        
        if (!status) {
          return new Response(JSON.stringify({ error: 'Swarm not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(status), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/alerts' && method === 'GET') {
        // Get all alerts
        const activeOnly = url.searchParams.get('active') === 'true';
        const alerts = activeOnly ? getActiveAlerts() : getAllAlerts(100);
        return new Response(JSON.stringify(alerts), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/alerts/stats' && method === 'GET') {
        // Get alert statistics
        const stats = getAlertStats();
        return new Response(JSON.stringify(stats), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/alerts/ack' && method === 'POST') {
        // Acknowledge an alert
        const body = await request.json() as { alert_id: string };
        const success = acknowledgeAlert(body.alert_id);
        return new Response(JSON.stringify({ success }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/api/health' && method === 'GET') {
        // System health with alerting
        const health = getSystemHealth();
        return new Response(JSON.stringify({
          ...health,
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          features: ['generate', 'qa', 'runs', 'eval', 'planning', 'memory', 'alerts', 'emergent'],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          features: ['generate', 'qa', 'runs', 'eval']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};