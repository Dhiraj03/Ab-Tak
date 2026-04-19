import { runEditorAgent, runMonitorAgent, runWriterAgent, runJudgeAgent, type JudgeResult } from "./agents";
import { fetchFeeds } from "./feeds";
import { generateAudio } from "./tts";
import type { AgentTrace, SourceLink, JudgeSummary } from "./types";

export type PipelineResult = {
  task: string;
  runId: string;
  fetchedCount: number;
  ranked: any[];
  brief: any;
  transcript: string;
  audioBase64: string;
  audioUrl: string;
  sources: SourceLink[];
  judge: JudgeSummary;
  agents: AgentTrace[];
  totalDurationMs: number;
  totalCostUsd: number;
};

// Cost estimation constants (per 1M tokens)
const COST_PER_1M_INPUT_TOKENS = 3.0;  // Claude 3.5 Sonnet input
const COST_PER_1M_OUTPUT_TOKENS = 15.0; // Claude 3.5 Sonnet output
const AVG_INPUT_TOKENS = 2000;
const AVG_OUTPUT_TOKENS = 800;

function estimateCost(): number {
  const inputCost = (AVG_INPUT_TOKENS / 1_000_000) * COST_PER_1M_INPUT_TOKENS;
  const outputCost = (AVG_OUTPUT_TOKENS / 1_000_000) * COST_PER_1M_OUTPUT_TOKENS;
  return inputCost + outputCost;
}

export async function runHourOnePipeline(task: string, apiKey: string, elevenLabsKey?: string): Promise<PipelineResult> {
  const runId = `run-${Date.now()}`;
  const agents: AgentTrace[] = [];
  let totalDurationMs = 0;
  let totalCostUsd = 0;
  
  const pipelineStart = performance.now();

  // Monitor Agent - fetch and rank stories
  const monitorStart = performance.now();
  const fetched = await fetchFeeds();
  const ranked = await runMonitorAgent(fetched, apiKey);
  const monitorDuration = Math.round(performance.now() - monitorStart);
  const monitorCost = estimateCost();
  
  agents.push({
    name: "Monitor Agent",
    input: `Fetched ${fetched.length} stories from RSS feeds`,
    output_summary: `Ranked ${ranked.length} stories by recency, significance, and credibility`,
    duration_ms: monitorDuration,
    cost_usd: monitorCost,
    tokens: AVG_INPUT_TOKENS + AVG_OUTPUT_TOKENS,
  });
  totalDurationMs += monitorDuration;
  totalCostUsd += monitorCost;

  // Editor Agent - create brief
  const editorStart = performance.now();
  const brief = await runEditorAgent(task, ranked, apiKey);
  const editorDuration = Math.round(performance.now() - editorStart);
  const editorCost = estimateCost();
  
  agents.push({
    name: "Editor Agent",
    input: `Task: ${task}, Top ${Math.min(3, ranked.length)} stories`,
    output_summary: `Created brief with ${brief.stories.length} stories, cold open, and sign-off`,
    duration_ms: editorDuration,
    cost_usd: editorCost,
    tokens: AVG_INPUT_TOKENS + AVG_OUTPUT_TOKENS,
  });
  totalDurationMs += editorDuration;
  totalCostUsd += editorCost;

  // Writer Agent - generate script
  const writerStart = performance.now();
  const transcript = await runWriterAgent(brief, apiKey);
  const writerDuration = Math.round(performance.now() - writerStart);
  const writerCost = estimateCost();
  
  agents.push({
    name: "Writer Agent",
    input: `Brief with ${brief.stories.length} stories`,
    output_summary: `Generated ${transcript.split(" ").length} word broadcast script`,
    duration_ms: writerDuration,
    cost_usd: writerCost,
    tokens: AVG_INPUT_TOKENS + AVG_OUTPUT_TOKENS,
  });
  totalDurationMs += writerDuration;
  totalCostUsd += writerCost;

  // Judge Agent - score and approve
  const judgeStart = performance.now();
  const judge: JudgeResult = await runJudgeAgent(transcript, brief, apiKey);
  const judgeDuration = Math.round(performance.now() - judgeStart);
  const judgeCost = estimateCost();
  
  const approvedDraft = judge.drafts[judge.approvedDraft - 1];
  agents.push({
    name: "Judge Agent",
    input: `Script: ${transcript.slice(0, 100)}...`,
    output_summary: `Approved draft ${judge.approvedDraft} with score ${approvedDraft?.overall || 7}/10`,
    duration_ms: judgeDuration,
    cost_usd: judgeCost,
    tokens: AVG_INPUT_TOKENS + AVG_OUTPUT_TOKENS,
    drafts: judge.drafts.map(d => ({
      draft: d.draft,
      scores: d.scores,
      overall: d.overall,
      rewrite_triggered: d.rewrite_triggered,
      rewrite_instruction: d.rewrite_instruction,
    })),
  });
  totalDurationMs += judgeDuration;
  totalCostUsd += judgeCost;

  // Voice Agent - generate audio
  const voiceStart = performance.now();
  console.log("Pipeline: elevenLabsKey type:", typeof elevenLabsKey, "value:", elevenLabsKey ? "[REDACTED:" + elevenLabsKey.slice(0, 3) + "...]" : "undefined/null");
  
  let audioResult = null;
  let audioError = null;
  
  try {
    audioResult = await generateAudio(judge.finalScript, elevenLabsKey);
    console.log("Pipeline: audioResult:", audioResult ? "SUCCESS (length:" + audioResult.length + ")" : "NULL");
  } catch (err) {
    audioError = err instanceof Error ? err.message : String(err);
    console.error("Pipeline: generateAudio ERROR:", audioError);
  }
  
  const voiceDuration = Math.round(performance.now() - voiceStart);
  const voiceCost = audioResult ? 0.02 : 0; // ElevenLabs cost estimate per request
  
  let audioBase64 = "";
  let audioUrl = "";
  
  if (audioResult) {
    try {
      const parsed = JSON.parse(audioResult);
      audioBase64 = parsed.base64 || "";
      audioUrl = parsed.url || "";
    } catch {
      audioBase64 = audioResult;
    }
  }
  
  let voiceOutputSummary = "Audio generation skipped (no API key)";
  if (audioResult) {
    voiceOutputSummary = "Generated audio using ElevenLabs TTS";
  } else if (audioError) {
    voiceOutputSummary = `Audio generation failed: ${audioError}`;
  }
  
  agents.push({
    name: "Voice Agent",
    input: `Script: ${judge.finalScript.slice(0, 100)}...`,
    output_summary: voiceOutputSummary,
    duration_ms: voiceDuration,
    cost_usd: voiceCost,
    tokens: 0,
  });
  totalDurationMs += voiceDuration;
  totalCostUsd += voiceCost;

  // Calculate total pipeline time
  totalDurationMs = Math.round(performance.now() - pipelineStart);

  const sources: SourceLink[] = brief.stories.map((s: any) => ({
    title: s.title,
    url: s.link,
    source: s.source,
  }));

  return {
    task,
    runId,
    fetchedCount: fetched.length,
    ranked,
    brief,
    transcript: judge.finalScript,
    audioBase64,
    audioUrl,
    sources,
    judge: {
      approvedDraft: judge.approvedDraft,
      scores: judge.drafts[judge.approvedDraft - 1]?.scores || {
        depth: 7,
        accuracy: 7,
        clarity: 7,
        newsworthiness: 7,
        audio_readiness: 7,
      },
    },
    agents,
    totalDurationMs,
    totalCostUsd,
  };
}

// Keep the old export name for compatibility
export { runHourOnePipeline as runFullPipeline };