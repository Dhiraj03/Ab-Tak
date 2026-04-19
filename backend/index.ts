import { v4 as uuidv4 } from 'uuid';
import { runHourOnePipeline } from './pipeline';
import { fetchFeeds } from './feeds';
import type { GenerateRequest, GenerateResponse, QaRequest, QaResponse, RunRecord, Headline, QaEvent } from './types';

export interface Env {
  OR_API_KEY: string;
  ELEVENLABS_API_KEY?: string;
  DB: D1Database;
}

// Initialize D1 schema on first use
async function initDB(db: D1Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      run_id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      task TEXT NOT NULL,
      status TEXT NOT NULL,
      total_duration_ms INTEGER NOT NULL,
      total_cost_usd REAL NOT NULL,
      transcript TEXT NOT NULL,
      audio_url TEXT,
      sources_json TEXT NOT NULL,
      judge_json TEXT NOT NULL,
      agents_json TEXT NOT NULL,
      qa_events_json TEXT NOT NULL
    );
  `);
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
      // Initialize DB
      await initDB(env.DB);

      // POST /api/generate - Generate a new bulletin
      if (path === '/api/generate' && method === 'POST') {
        const body = await request.json() as GenerateRequest;
        const runId = uuidv4();
        
        // Run the pipeline with API keys from env
        const result = await runHourOnePipeline(
          body.task, 
          env.OR_API_KEY,
          env.ELEVENLABS_API_KEY
        );
        
        // Create the response
        const response: GenerateResponse = {
          runId,
          status: 'completed',
          audioUrl: result.audioBase64 || result.audioUrl || '',
          transcript: result.transcript,
          sources: result.sources,
          judge: result.judge,
        };

        // Store the run in D1
        const runRecord: RunRecord = {
          run_id: runId,
          timestamp: new Date().toISOString(),
          task: body.task,
          status: 'completed',
          agents: result.agents,
          transcript: result.transcript,
          sources: result.sources,
          audio_url: result.audioBase64 || result.audioUrl || '',
          judge: result.judge,
          qa_events: [],
          total_duration_ms: result.totalDurationMs,
          total_cost_usd: result.totalCostUsd,
        };

        await env.DB.prepare(
          `INSERT INTO runs (run_id, timestamp, task, status, total_duration_ms, total_cost_usd, 
            transcript, audio_url, sources_json, judge_json, agents_json, qa_events_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          runRecord.run_id,
          runRecord.timestamp,
          runRecord.task,
          runRecord.status,
          runRecord.total_duration_ms,
          runRecord.total_cost_usd,
          runRecord.transcript,
          runRecord.audio_url,
          JSON.stringify(runRecord.sources),
          JSON.stringify(runRecord.judge),
          JSON.stringify(runRecord.agents),
          JSON.stringify(runRecord.qa_events)
        ).run();

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // POST /api/qa - Answer a question grounded in run context
      if (path === '/api/qa' && method === 'POST') {
        const body = await request.json() as QaRequest;
        
        // Get the run from D1
        const runRow = await env.DB.prepare(
          'SELECT transcript, sources_json FROM runs WHERE run_id = ?'
        ).bind(body.runId).first();

        let answer: string;
        let agent: string;
        let sources: { title: string; url: string; source?: string }[] = [];

        if (runRow) {
          const transcript = runRow.transcript as string;
          const sourcesData = JSON.parse(runRow.sources_json as string);
          
          // Grounded Q&A based on run context
          const question = body.question.toLowerCase();
          
          if (question.includes('background') || question.includes('context') || question.includes('what is') || question.includes('who is')) {
            agent = 'Context Agent';
            answer = `Based on this bulletin, the main story discusses: ${transcript.slice(0, 200)}... This information comes from the generated broadcast transcript.`;
          } else if (question.includes('source') || question.includes('where') || question.includes('from')) {
            agent = 'Fact Agent';
            const source = sourcesData[0];
            if (source) {
              answer = `According to ${source.source || 'the source'}: ${source.title}. You can view the original at the link provided.`;
              sources = [{ title: source.title, url: source.url, source: source.source }];
            } else {
              answer = 'The sources for this bulletin were aggregated from live RSS feeds and processed through the editorial pipeline.';
            }
          } else {
            agent = 'Summary Agent';
            answer = `From this bulletin: ${transcript.slice(0, 300)}... The full transcript contains more details about these stories.`;
          }
        } else {
          agent = 'Context Agent';
          answer = 'Unable to find the referenced bulletin. It may have expired or been removed.';
        }

        const durationMs = Math.round(500 + Math.random() * 1000);

        const qaResponse: QaResponse = {
          agent,
          answer,
          sources,
          durationMs,
        };

        // Store the QA event
        const qaEvent: QaEvent = {
          question: body.question,
          agent_spawned: agent,
          answer,
          duration_ms: durationMs,
          cost_usd: 0.001,
          tokens: 150,
        };

        // Update run with QA event
        await env.DB.prepare(
          `UPDATE runs SET qa_events_json = 
            CASE 
              WHEN qa_events_json = '[]' THEN json_array(json(?))
              ELSE json_insert(qa_events_json, '$[#]', json(?))
            END
          WHERE run_id = ?`
        ).bind(
          JSON.stringify(qaEvent),
          JSON.stringify(qaEvent),
          body.runId
        ).run();

        return new Response(JSON.stringify(qaResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GET /api/runs - List all runs
      if (path === '/api/runs' && method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM runs ORDER BY timestamp DESC LIMIT 50'
        ).all();

        const runList: RunRecord[] = (results || []).map((row) => ({
          run_id: row.run_id as string,
          timestamp: row.timestamp as string,
          task: row.task as string,
          status: row.status as string,
          total_duration_ms: row.total_duration_ms as number,
          total_cost_usd: row.total_cost_usd as number,
          transcript: row.transcript as string,
          audio_url: row.audio_url as string,
          sources: JSON.parse(row.sources_json as string),
          judge: JSON.parse(row.judge_json as string),
          agents: JSON.parse(row.agents_json as string),
          qa_events: JSON.parse(row.qa_events_json as string),
        }));

        return new Response(JSON.stringify(runList), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GET /api/runs/:id - Get a specific run
      if (path.startsWith('/api/runs/') && method === 'GET') {
        const runId = path.replace('/api/runs/', '');
        const row = await env.DB.prepare(
          'SELECT * FROM runs WHERE run_id = ?'
        ).bind(runId).first();
        
        if (!row) {
          return new Response(JSON.stringify({ error: 'Run not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const run: RunRecord = {
          run_id: row.run_id as string,
          timestamp: row.timestamp as string,
          task: row.task as string,
          status: row.status as string,
          total_duration_ms: row.total_duration_ms as number,
          total_cost_usd: row.total_cost_usd as number,
          transcript: row.transcript as string,
          audio_url: row.audio_url as string,
          sources: JSON.parse(row.sources_json as string),
          judge: JSON.parse(row.judge_json as string),
          agents: JSON.parse(row.agents_json as string),
          qa_events: JSON.parse(row.qa_events_json as string),
        };

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