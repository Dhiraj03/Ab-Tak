import { runEditorAgent, runMonitorAgent, createStubTranscript } from "./agents";
import { fetchFeeds } from "./feeds";

export async function runHourOnePipeline(task: string, apiKey: string | undefined) {
  const fetched = await fetchFeeds();
  const ranked = await runMonitorAgent(fetched, apiKey);
  const brief = await runEditorAgent(task, ranked, apiKey);
  const transcript = createStubTranscript(brief);

  return {
    task,
    fetchedCount: fetched.length,
    ranked,
    brief,
    transcript,
  };
}
