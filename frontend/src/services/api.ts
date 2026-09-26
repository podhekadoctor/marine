import type { Zone, ScenarioMeta, InvestigationRecord } from '../types/api';

const API_BASE = 'http://localhost:8000/api';

export async function fetchZones(): Promise<Zone[]> {
  const res = await fetch(`${API_BASE}/zones`);
  if (!res.ok) throw new Error('Failed to load coastal telemetry zones');
  return res.json();
}

export async function fetchScenarios(): Promise<ScenarioMeta[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to load scenarios');
  return res.json();
}

export async function runInvestigation(
  zoneId: string,
  scenarioId: string,
  question: string
): Promise<InvestigationRecord> {
  const res = await fetch(`${API_BASE}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      zone_id: zoneId,
      scenario_override: scenarioId,
      question: question,
    }),
  });
  if (!res.ok) throw new Error('Investigation pipeline failed to execute');
  return res.json();
}