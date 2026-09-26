export type SeverityLevel = 'normal' | 'moderate' | 'high' | 'critical';

export interface Zone {
  id: string;
  name: string;
  region: string;
  coordinates: [number, number];
  bounding_box: [[number, number], [number, number]];
  primary_risk: string;
  depth_meters: number;
  baseline_chl_a: number;
  baseline_sst_celsius: number;
  baseline_do_mg_l: number;
  description: string;
}

export interface ScenarioMeta {
  scenario_id: string;
  name: string;
  zone_id: string;
}

export interface Finding {
  agent: string;
  headline: string;
  severity: SeverityLevel;
  confidence: number;
  evidence: string[];
  metrics: Record<string, any>;
  needs_corroboration: boolean;
}

export interface EvidenceConflict {
  parameter: string;
  agent_a: string;
  agent_a_claim: string;
  agent_b: string;
  agent_b_claim: string;
  resolution_status: string;
  arbitration_note: string;
}

export interface SynthesisAssessment {
  risk_level: SeverityLevel;
  confidence_score: number;
  assessment_summary: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  scientific_limitations: string[];
  recommended_actions: string[];
  human_review_required: boolean;
  escalation_reason?: string;
  agent_breakdown: Record<string, number>;
}

export interface InvestigationRecord {
  id: string;
  timestamp: string;
  zone_id: string;
  question: string;
  findings: Finding[];
  conflicts: EvidenceConflict[];
  assessment: SynthesisAssessment | null;
}