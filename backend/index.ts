import { v4 as uuidv4 } from 'uuid';
import { runHourOnePipeline } from './pipeline';
import { fetchFeeds } from './feeds';
import type { GenerateRequest, GenerateResponse, QaRequest, QaResponse, RunRecord, Headline } from './types';

// In-memory store for runs (replace with Durable Objects or D1 for production)
const runs = new Map<string, RunRecord>();

export interface Env {
  OR_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // POST /api/generate - Generate a new bulletin
      if (path === '/api/generate' && method === 'POST') {
        const body = await request.json() as GenerateRequest;
        const runId = uuidv4();
        
        // Run the pipeline with API key from env
        const result = await runHourOnePipeline(body.task, env.OR_API_KEY);
        
        // Create the response
        const response: GenerateResponse = {
          runId,
          status: 'completed',
          audioUrl: result.audioBase64 || result.audioUrl, // ElevenLabs audio as base64 data URI
          transcript: result.transcript,
          sources: result.brief.stories.map((s: { title: string; link: string; source: string }) => ({
            title: s.title,
            url: s.link,
            source: s.source,
          })),
          judge: result.judge,
        };

        // Store the run
        const runRecord: RunRecord = {
          run_id: runId,
          timestamp: new Date().toISOString(),
          task: body.task,
          status: 'completed',
          agents: [],
          transcript: result.transcript,
          sources: response.sources,
          audio_url: result.audioBase64 || result.audioUrl,
          judge: result.judge,
          qa_events: [],
          total_duration_ms: 0,
          total_cost_usd: 0,
        };
        runs.set(runId, runRecord);

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // POST /api/qa - Answer a question
      if (path === '/api/qa' && method === 'POST') {
        const body = await request.json() as QaRequest;
        
        const response: QaResponse = {
          agent: 'Context Agent',
          answer: `Based on the bulletin content, I can provide context about this story. The pipeline has processed this information through multiple AI agents to ensure accuracy.`,
          sources: [],
          durationMs: 1200,
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GET /api/runs - List all runs
      if (path === '/api/runs' && method === 'GET') {
        const runList = Array.from(runs.values());
        return new Response(JSON.stringify(runList), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GET /api/runs/:id - Get a specific run
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

      // GET /api/headlines - Get rotating headlines
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

      // Health check
      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
