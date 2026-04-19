import { runEditorAgent, runMonitorAgent, runWriterAgent, runJudgeAgent } from "./agents";
import { fetchFeeds } from "./feeds";
import { generateAudio } from "./tts";

export type PipelineResult = {
  task: string;
  runId: string;
  fetchedCount: number;
  ranked: any[];
  brief: any;
  transcript: string;
  audioBase64: string;
  audioUrl: string;
  sources: any[];
  judge: any;
};

// Export alias for API compatibility
export { runFullPipeline as runHourOnePipeline };

export async function runFullPipeline(task: string): Promise<PipelineResult> {
  const runId = `run-${Date.now()}`;
  const fetched = await fetchFeeds();
  const ranked = await runMonitorAgent(fetched);
  const brief = await runEditorAgent(task, ranked);
  
  // Writer Agent generates the script
  const transcript = await runWriterAgent(brief);
  
  // Judge Agent scores and may trigger rewrite
  const judge = await runJudgeAgent(transcript, brief);
  
  // Generate audio (may be null if API key not set)
  const audioResult = await generateAudio(judge.finalScript);
  
  let audioBase64 = "";
  let audioUrl = "";
  
  if (audioResult) {
    try {
      const parsed = JSON.parse(audioResult);
      audioBase64 = parsed.base64 || "";
      audioUrl = parsed.filepath || "";
    } catch {
      // Old format (just base64 string)
      audioBase64 = audioResult;
    }
  }

  return {
    task,
    runId,
    fetchedCount: fetched.length,
    ranked,
    brief,
    transcript: judge.finalScript,
    audioBase64,
    audioUrl,
    sources: brief.stories.map((s: any) => ({
      title: s.title,
      url: s.link,
      source: s.source,
    })),
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
  };
}
