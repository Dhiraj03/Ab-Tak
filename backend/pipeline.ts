import { runEditorAgent, runMonitorAgent, createStubTranscript } from "./agents";
import { fetchFeeds } from "./feeds";

export async function runHourOnePipeline(task: string) {
  const fetched = await fetchFeeds();
  const ranked = await runMonitorAgent(fetched);
  const brief = await runEditorAgent(task, ranked);
  const transcript = createStubTranscript(brief);

  return {
    task,
    fetchedCount: fetched.length,
    ranked,
    brief,
    transcript,
  };
}
