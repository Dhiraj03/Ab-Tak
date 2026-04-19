import { runFullPipeline } from './pipeline';
import { STANDARD_EVAL_SET, calculateOverallScore, checkPass, type EvalResult, type EvalRun, type EvalTask } from './eval-types';
import { v4 as uuidv4 } from 'uuid';

export async function runEvalTask(
  task: EvalTask,
  apiKey: string,
  elevenLabsKey?: string
): Promise<EvalResult> {
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    // Run the full pipeline for this eval task
    const result = await runFullPipeline(task.task, apiKey, elevenLabsKey);
    const durationMs = Math.round(performance.now() - startTime);

    // Extract judge scores
    const judgeScores = result.judge.scores;
    const overallScore = calculateOverallScore(judgeScores);
    const passed = checkPass(judgeScores, STANDARD_EVAL_SET.pass_threshold);

    return {
      task_id: task.id,
      task_description: task.task,
      run_id: result.runId,
      timestamp: new Date().toISOString(),
      judge_scores: judgeScores,
      overall_score: overallScore,
      passed,
      duration_ms: durationMs,
      cost_usd: result.totalCostUsd,
      transcript_length: result.transcript.length,
      sources_count: result.sources.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    errors.push(String(error));

    return {
      task_id: task.id,
      task_description: task.task,
      run_id: 'error-' + uuidv4(),
      timestamp: new Date().toISOString(),
      judge_scores: { depth: 0, accuracy: 0, clarity: 0, newsworthiness: 0, audio_readiness: 0 },
      overall_score: 0,
      passed: false,
      duration_ms: durationMs,
      cost_usd: 0,
      transcript_length: 0,
      sources_count: 0,
      errors,
    };
  }
}

export async function runFullEvalSet(
  apiKey: string,
  elevenLabsKey?: string,
  onProgress?: (completed: number, total: number, currentTask: string) => void
): Promise<EvalRun> {
  const evalRunId = 'eval-' + uuidv4();
  const startTime = performance.now();
  const results: EvalResult[] = [];

  const tasks = STANDARD_EVAL_SET.tasks;
  const totalTasks = tasks.length;

  // Run each eval task sequentially
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    onProgress?.(i, totalTasks, task.task);
    
    const result = await runEvalTask(task, apiKey, elevenLabsKey);
    results.push(result);
    
    onProgress?.(i + 1, totalTasks, task.task);
    
    // Small delay between evals to avoid rate limiting
    if (i < tasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const totalDurationMs = Math.round(performance.now() - startTime);
  const totalCost = results.reduce((acc, r) => acc + r.cost_usd, 0);
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;
  const averageScore = results.reduce((acc, r) => acc + r.overall_score, 0) / results.length;

  return {
    eval_run_id: evalRunId,
    timestamp: new Date().toISOString(),
    status: failedCount === 0 ? 'completed' : 'completed',
    results,
    summary: {
      total_tasks: totalTasks,
      passed_count: passedCount,
      failed_count: failedCount,
      average_score: parseFloat(averageScore.toFixed(2)),
      total_duration_ms: totalDurationMs,
      total_cost_usd: totalCost,
    },
    version: '1.0.0', // Track code version for iteration
  };
}

// Generate a markdown report from eval results
export function generateEvalReport(evalRun: EvalRun): string {
  const { summary, results, timestamp, eval_run_id } = evalRun;
  
  let report = `# Ab Tak Eval Run Report\n\n`;
  report += `**Run ID:** ${eval_run_id}\n`;
  report += `**Timestamp:** ${timestamp}\n`;
  report += `**Version:** ${evalRun.version}\n\n`;
  
  report += `## Summary\n\n`;
  report += `- **Total Tasks:** ${summary.total_tasks}\n`;
  report += `- **Passed:** ${summary.passed_count} ✅\n`;
  report += `- **Failed:** ${summary.failed_count} ${summary.failed_count > 0 ? '❌' : ''}\n`;
  report += `- **Average Score:** ${summary.average_score}/10\n`;
  report += `- **Total Duration:** ${(summary.total_duration_ms / 1000).toFixed(1)}s\n`;
  report += `- **Total Cost:** $${summary.total_cost_usd.toFixed(4)}\n\n`;
  
  report += `## Pass Threshold\n\n`;
  report += `- Minimum Average: ${STANDARD_EVAL_SET.pass_threshold.minimum_average}\n`;
  report += `- No Single Score Below: ${STANDARD_EVAL_SET.pass_threshold.no_single_score_below}\n\n`;
  
  report += `## Detailed Results\n\n`;
  
  results.forEach((result, idx) => {
    report += `### Task ${idx + 1}: ${result.task_id}\n\n`;
    report += `**Description:** ${result.task_description}\n\n`;
    report += `- **Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `- **Overall Score:** ${result.overall_score.toFixed(1)}/10\n`;
    report += `- **Duration:** ${(result.duration_ms / 1000).toFixed(1)}s\n`;
    report += `- **Cost:** $${result.cost_usd.toFixed(4)}\n\n`;
    
    report += `**Dimension Scores:**\n`;
    report += `- Depth: ${result.judge_scores.depth}/10\n`;
    report += `- Accuracy: ${result.judge_scores.accuracy}/10\n`;
    report += `- Clarity: ${result.judge_scores.clarity}/10\n`;
    report += `- Newsworthiness: ${result.judge_scores.newsworthiness}/10\n`;
    report += `- Audio Readiness: ${result.judge_scores.audio_readiness}/10\n\n`;
    
    if (result.errors && result.errors.length > 0) {
      report += `**Errors:**\n`;
      result.errors.forEach(err => {
        report += `- ${err}\n`;
      });
      report += `\n`;
    }
    
    report += `---\n\n`;
  });
  
  report += `## Scoring Guide\n\n`;
  Object.entries(STANDARD_EVAL_SET.scoring_guide).forEach(([dimension, guide]) => {
    report += `- **${dimension}:** ${guide}\n`;
  });
  
  return report;
}
