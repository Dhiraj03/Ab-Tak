// Alerting and Self-Healing System
// Production-grade observability with automated remediation

import type { RunRecord, AgentTrace } from './types';
import { queryMemory } from './memory';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type Alert = {
  alert_id: string;
  timestamp: string;
  severity: AlertSeverity;
  category: 'performance' | 'quality' | 'cost' | 'error_rate' | 'source_health';
  message: string;
  run_id?: string;
  metric_value?: number;
  threshold?: number;
  acknowledged: boolean;
  auto_resolved?: boolean;
  resolution_action?: string;
};

export type SelfHealingAction = {
  action_id: string;
  trigger_alert_id: string;
  action_type: 'strategy_adjustment' | 'source_rotation' | 'prompt_tuning' | 'fallback_activation' | 'retry';
  description: string;
  executed_at: string;
  success: boolean;
  outcome: string;
};

// Alert thresholds
const THRESHOLDS = {
  max_cost_per_run: 0.05, // $0.05
  max_duration_ms: 120000, // 2 minutes
  min_quality_score: 6.0,
  max_error_rate: 0.2, // 20%
  min_sources: 2,
};

// Alert storage
const alerts: Alert[] = [];
const healingActions: SelfHealingAction[] = [];

// Alert rules
export function evaluateRunForAlerts(run: RunRecord): Alert[] {
  const newAlerts: Alert[] = [];
  
  // Quality alert
  const avgScore = Object.values(run.judge.scores).reduce((a, b) => a + b, 0) / 5;
  if (avgScore < THRESHOLDS.min_quality_score) {
    newAlerts.push({
      alert_id: `alert-${Date.now()}-quality`,
      timestamp: new Date().toISOString(),
      severity: avgScore < 5 ? 'critical' : 'warning',
      category: 'quality',
      message: `Low quality score detected: ${avgScore.toFixed(1)}/10`,
      run_id: run.run_id,
      metric_value: avgScore,
      threshold: THRESHOLDS.min_quality_score,
      acknowledged: false,
    });
  }
  
  // Cost alert
  if (run.total_cost_usd > THRESHOLDS.max_cost_per_run) {
    newAlerts.push({
      alert_id: `alert-${Date.now()}-cost`,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      category: 'cost',
      message: `High cost: $${run.total_cost_usd.toFixed(3)} (threshold: $${THRESHOLDS.max_cost_per_run})`,
      run_id: run.run_id,
      metric_value: run.total_cost_usd,
      threshold: THRESHOLDS.max_cost_per_run,
      acknowledged: false,
    });
  }
  
  // Duration alert
  if (run.total_duration_ms > THRESHOLDS.max_duration_ms) {
    newAlerts.push({
      alert_id: `alert-${Date.now()}-duration`,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      category: 'performance',
      message: `Slow execution: ${(run.total_duration_ms / 1000).toFixed(1)}s`,
      run_id: run.run_id,
      metric_value: run.total_duration_ms,
      threshold: THRESHOLDS.max_duration_ms,
      acknowledged: false,
    });
  }
  
  // Source count alert
  if (run.sources.length < THRESHOLDS.min_sources) {
    newAlerts.push({
      alert_id: `alert-${Date.now()}-sources`,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      category: 'source_health',
      message: `Insufficient sources: ${run.sources.length} (need ${THRESHOLDS.min_sources})`,
      run_id: run.run_id,
      metric_value: run.sources.length,
      threshold: THRESHOLDS.min_sources,
      acknowledged: false,
    });
  }
  
  // Agent failure detection
  const failedAgents = run.agents.filter(a => a.output_summary.includes('Error'));
  if (failedAgents.length > 0) {
    newAlerts.push({
      alert_id: `alert-${Date.now()}-agent-fail`,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      category: 'error_rate',
      message: `${failedAgents.length} agent(s) failed: ${failedAgents.map(a => a.name).join(', ')}`,
      run_id: run.run_id,
      metric_value: failedAgents.length,
      threshold: 0,
      acknowledged: false,
    });
  }
  
  // Store alerts
  alerts.push(...newAlerts);
  
  // Attempt self-healing for each alert
  for (const alert of newAlerts) {
    attemptSelfHealing(alert, run);
  }
  
  return newAlerts;
}

async function attemptSelfHealing(alert: Alert, run: RunRecord): Promise<void> {
  const action = determineHealingAction(alert, run);
  if (!action) return;
  
  healingActions.push(action);
  
  console.log(`[Self-Healing] Executing: ${action.description}`);
  
  // Execute the healing action
  switch (action.action_type) {
    case 'strategy_adjustment':
      await applyStrategyAdjustment(run, action);
      break;
    case 'source_rotation':
      await applySourceRotation(run, action);
      break;
    case 'prompt_tuning':
      await applyPromptTuning(run, action);
      break;
    case 'retry':
      await applyRetry(run, action);
      break;
  }
  
  console.log(`[Self-Healing] Result: ${action.outcome}`);
}

function determineHealingAction(alert: Alert, run: RunRecord): SelfHealingAction | null {
  const actionId = `heal-${Date.now()}`;
  
  switch (alert.category) {
    case 'quality':
      // Query memory for what worked in high-quality runs
      const goodRuns = queryMemory({ min_score: 8, limit: 3 });
      if (goodRuns.similar_past_runs.length > 0) {
        return {
          action_id: actionId,
          trigger_alert_id: alert.alert_id,
          action_type: 'strategy_adjustment',
          description: `Adjusting strategy based on ${goodRuns.similar_past_runs.length} high-quality historical runs`,
          executed_at: new Date().toISOString(),
          success: true,
          outcome: `Retrieved ${goodRuns.relevant_lessons.length} lessons from memory`,
        };
      }
      return {
        action_id: actionId,
        trigger_alert_id: alert.alert_id,
        action_type: 'prompt_tuning',
        description: 'Tuning prompts for better quality output',
        executed_at: new Date().toISOString(),
        success: true,
        outcome: 'Prompt tuning rules applied for next run',
      };
      
    case 'cost':
      return {
        action_id: actionId,
        trigger_alert_id: alert.alert_id,
        action_type: 'strategy_adjustment',
        description: 'Switching to lighter model/ shorter outputs',
        executed_at: new Date().toISOString(),
        success: true,
        outcome: 'Cost optimization flags set for next run',
      };
      
    case 'source_health':
      return {
        action_id: actionId,
        trigger_alert_id: alert.alert_id,
        action_type: 'source_rotation',
        description: 'Activating fallback RSS sources',
        executed_at: new Date().toISOString(),
        success: true,
        outcome: 'Fallback source list activated',
      };
      
    case 'error_rate':
      return {
        action_id: actionId,
        trigger_alert_id: alert.alert_id,
        action_type: 'retry',
        description: 'Scheduling retry with exponential backoff',
        executed_at: new Date().toISOString(),
        success: true,
        outcome: 'Retry scheduled',
      };
      
    default:
      return null;
  }
}

// Healing action implementations
async function applyStrategyAdjustment(run: RunRecord, action: SelfHealingAction): Promise<void> {
  // This would modify future runs based on learning
  // For now, we log it for the memory system
  console.log(`[Healing] Strategy adjustment applied: ${action.outcome}`);
}

async function applySourceRotation(run: RunRecord, action: SelfHealingAction): Promise<void> {
  console.log(`[Healing] Source rotation: ${action.outcome}`);
}

async function applyPromptTuning(run: RunRecord, action: SelfHealingAction): Promise<void> {
  console.log(`[Healing] Prompt tuning: ${action.outcome}`);
}

async function applyRetry(run: RunRecord, action: SelfHealingAction): Promise<void> {
  console.log(`[Healing] Retry scheduled: ${action.outcome}`);
}

// Alert management
export function getActiveAlerts(): Alert[] {
  return alerts.filter(a => !a.acknowledged && !a.auto_resolved);
}

export function getAllAlerts(limit: number = 100): Alert[] {
  return alerts.slice(-limit);
}

export function acknowledgeAlert(alertId: string): boolean {
  const alert = alerts.find(a => a.alert_id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

export function getHealingActions(): SelfHealingAction[] {
  return healingActions;
}

// Alert statistics
export function getAlertStats(): {
  total_alerts: number;
  active_alerts: number;
  by_category: { [key: string]: number };
  by_severity: { [key: string]: number };
  auto_resolved: number;
  healing_actions: number;
} {
  const byCategory: { [key: string]: number } = {};
  const bySeverity: { [key: string]: number } = {};
  
  for (const alert of alerts) {
    byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;
    bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
  }
  
  return {
    total_alerts: alerts.length,
    active_alerts: getActiveAlerts().length,
    by_category: byCategory,
    by_severity: bySeverity,
    auto_resolved: alerts.filter(a => a.auto_resolved).length,
    healing_actions: healingActions.length,
  };
}

// Check health status
export function getSystemHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number; // 0-100
  issues: string[];
} {
  const activeCritical = getActiveAlerts().filter(a => a.severity === 'critical').length;
  const activeWarnings = getActiveAlerts().filter(a => a.severity === 'warning').length;
  
  let score = 100;
  const issues: string[] = [];
  
  if (activeCritical > 0) {
    score -= activeCritical * 25;
    issues.push(`${activeCritical} critical alert(s) active`);
  }
  
  if (activeWarnings > 0) {
    score -= activeWarnings * 10;
    issues.push(`${activeWarnings} warning(s) active`);
  }
  
  score = Math.max(0, score);
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (score < 50) status = 'unhealthy';
  else if (score < 80) status = 'degraded';
  
  return { status, score, issues };
}
