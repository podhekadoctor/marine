from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SeverityLevel(str, Enum):
    NORMAL = "normal"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class Finding(BaseModel):
    agent: str
    headline: str
    severity: SeverityLevel
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: List[str]
    metrics: Dict[str, Any] = Field(default_factory=dict)
    needs_corroboration: bool = False

class EvidenceConflict(BaseModel):
    parameter: str
    agent_a: str
    agent_a_claim: str
    agent_b: str
    agent_b_claim: str
    resolution_status: str  # "unresolved", "resolved", "escalated"
    arbitration_note: str

class SynthesisAssessment(BaseModel):
    risk_level: SeverityLevel
    confidence_score: float = Field(ge=0.0, le=1.0)
    assessment_summary: str
    supporting_evidence: List[str]
    contradicting_evidence: List[str]
    scientific_limitations: List[str]
    recommended_actions: List[str]
    human_review_required: bool = False
    escalation_reason: Optional[str] = None
    agent_breakdown: Dict[str, float] = Field(default_factory=dict)

class InvestigationRequest(BaseModel):
    zone_id: str
    question: str
    scenario_override: Optional[str] = None

class InvestigationRecord(BaseModel):
    id: str
    timestamp: str
    zone_id: str
    question: str
    findings: List[Finding] = Field(default_factory=list)
    conflicts: List[EvidenceConflict] = Field(default_factory=list)
    assessment: Optional[SynthesisAssessment] = None