import { runEditorAgent, runMonitorAgent, runWriterAgent, runJudgeAgent, type JudgeResult } from "./agents";
import { fetchStoriesWithImages } from "./feeds";
import { generateAudio } from "./tts";
import type { AgentTrace, LiveStory, JudgeSummary } from "./types";

export type LivePipelineResult = {
  task: string;
  runId: string;
  transcript: string;
  audioBase64: string;
  audioUrl: string;
  stories: LiveStory[];
  brief: any;
  judge: JudgeSummary;
  agents: AgentTrace[];
  totalDurationMs: number;
  totalCostUsd: number;
};

// Cost estimation constants
const COST_PER_1M_INPUT_TOKENS = 3.0;
const COST_PER_1M_OUTPUT_TOKENS = 15.0;
const AVG_INPUT_TOKENS = 2000;
const AVG_OUTPUT_TOKENS = 800;

function estimateCost(): number {
  const inputCost = (AVG_INPUT_TOKENS / 1_000_000) * COST_PER_1M_INPUT_TOKENS;
  const outputCost = (AVG_OUTPUT_TOKENS / 1_000_000) * COST_PER_1M_OUTPUT_TOKENS;
  return inputCost + outputCost;
}

export async function runLivePipeline(
  task: string,
  apiKey: string,
  elevenLabsKey?: string
): Promise<LivePipelineResult> {
  const runId = `live-${Date.now()}`;
  const agents: AgentTrace[] = [];
  let totalDurationMs = 0;
  let totalCostUsd = 0;
  
  const pipelineStart = performance.now();

  // Step 1: Fetch stories with images
  const fetchStart = performance.now();
  const stories = await fetchStoriesWithImages();
  const fetchDuration = Math.round(performance.now() - fetchStart);
  
  agents.push({
    name: "Feed Monitor",
    input: `Fetching live news with images`,
    output_summary: `Retrieved ${stories.length} stories with ${stories.filter(s => s.imageUrl).length} images`,
    duration_ms: fetchDuration,
    cost_usd: 0,
    tokens: 0,
  });

  // Step 2: Rank stories
  const monitorStart = performance.now();
  const ranked = await runMonitorAgent(
    stories.map(s => ({
      id: s.id,
      title: s.title,
      link: s.link,
      source: s.source,
      publishedAt: s.publishedAt,
      summary: s.summary,
      articleText: "",
      excerpt: s.summary,
    })),
    apiKey
  );
  const monitorDuration = Math.round(performance.now() - monitorStart);
  const monitorCost = estimateCost();
  
  agents.push({
    name: "Monitor Agent",
    input: `Ranking ${stories.length} stories`,
    output_summary: `Selected top ${Math.min(3, ranked.length)} stories for broadcast`,
    duration_ms: monitorDuration,
    cost_usd: monitorCost,
    tokens: AVG_INPUT_TOKENS + AVG_OUTPUT_TOKENS,
  });
  totalDurationMs += monitorDuration;
  totalCostUsd += monitorCost;

  // Step 3: Create brief
  const editorStart = performance.now();
  const brief = await runEditorAgent(task, ranked, apiKey);
  const editorDuration = Math.round(performance.now() - editorStart);
  const editorCost = estimateCost();
  
  agents.push({
    name: "Editor Agent",
    input: `Task: ${task}, Top ${Math.min(3, ranked.length)} stories`,
    output_summary: `Created brief with ${brief.stories.length} stories and cold open`,
    duration_ms: editorDuration,
    cost_usd: editorCost,
    tokens: AVG_INPUT_TOKENS + AVG_OUTPUT_TOKENS,
  });
  totalDurationMs += editorDuration;
  totalCostUsd += editorCost;

  // Step 4: Generate script
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

  // Step 5: Judge the script
  const judgeStart = performance.now();
  const judge: JudgeResult = await runJudgeAgent(transcript, brief, apiKey);
  const judgeDuration = Math.round(performance.now() - judgeStart);
  const judgeCost = estimateCost();
  
  agents.push({
    name: "Judge Agent",
    input: `Script: ${transcript.slice(0, 100)}...`,
    output_summary: `Approved draft ${judge.approvedDraft}`,
    duration_ms: judgeDuration,
    cost_usd: judgeCost,
    tokens: AVG_INPUT_TOKENS + AVG_OUTPUT_TOKENS,
    drafts: judge.drafts,
  });
  totalDurationMs += judgeDuration;
  totalCostUsd += judgeCost;

  // Step 6: Generate audio
  console.log("Generating audio with key:", elevenLabsKey ? "Present" : "Missing");
  const voiceStart = performance.now();
  const audioResult = await generateAudio(judge.finalScript, elevenLabsKey);
  const voiceDuration = Math.round(performance.now() - voiceStart);
  
  console.log("Audio result:", audioResult ? "Success" : "Failed/null");
  
  let audioBase64 = "";
  let audioUrl = "";
  
  if (audioResult) {
    try {
      const parsed = JSON.parse(audioResult);
      audioBase64 = parsed.base64 || "";
      audioUrl = parsed.url || "";
      console.log("Audio parsed successfully, length:", audioUrl?.length || 0);
    } catch (e) {
      console.error("Failed to parse audio result:", e);
      audioBase64 = audioResult;
      audioUrl = audioResult;
    }
  } else {
    console.error("Audio generation returned null");
  }
  
  agents.push({
    name: "Voice Agent",
    input: `Script: ${judge.finalScript.slice(0, 100)}...`,
    output_summary: audioResult ? `Generated audio (${audioUrl?.length || 0} chars)` : "Audio failed",
    duration_ms: voiceDuration,
    cost_usd: audioResult ? 0.02 : 0,
    tokens: 0,
  });
  totalDurationMs += voiceDuration;

  // Calculate total
  totalDurationMs = Math.round(performance.now() - pipelineStart);

  // Map to LiveStory format with images
  const liveStories: LiveStory[] = brief.stories.map((story: any) => {
    const fullStory = stories.find(s => s.title === story.title);
    return {
      title: story.title,
      url: story.link,
      source: story.source,
      imageUrl: fullStory?.imageUrl || null,
      summary: story.keyFacts?.[0] || story.angle || "",
      publishedAt: new Date().toISOString(),
    };
  });

  return {
    task,
    runId,
    transcript: judge.finalScript,
    audioBase64,
    audioUrl,
    stories: liveStories,
    brief,
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