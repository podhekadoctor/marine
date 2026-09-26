from typing import List, Tuple
from app.api.schemas import Finding, EvidenceConflict, SeverityLevel, SynthesisAssessment

class EvidenceArbitrator:
    """
    Arbitrates conflicting telemetry streams across agents.
    Resolves discrepancies using hydrodynamic and biological domain rules.
    """

    @staticmethod
    def arbitrate(sat_finding: Finding, buoy_finding: Finding) -> Tuple[List[EvidenceConflict], SynthesisAssessment]:
        conflicts: List[EvidenceConflict] = []
        severity_order = {
            SeverityLevel.NORMAL: 0,
            SeverityLevel.MODERATE: 1,
            SeverityLevel.HIGH: 2,
            SeverityLevel.CRITICAL: 3
        }

        diff = abs(severity_order[sat_finding.severity] - severity_order[buoy_finding.severity])

        # Check for missing data / low confidence trigger
        if sat_finding.confidence < 0.5 or buoy_finding.confidence < 0.5:
            conflicts.append(EvidenceConflict(
                parameter="Sensor Reliability",
                agent_a=sat_finding.agent,
                agent_a_claim=f"Confidence: {sat_finding.confidence:.2f}",
                agent_b=buoy_finding.agent,
                agent_b_claim=f"Confidence: {buoy_finding.confidence:.2f}",
                resolution_status="escalated",
                arbitration_note="Data fidelity dropped below operational threshold. Automated synthesis deferred."
            ))
            assessment = SynthesisAssessment(
                risk_level=SeverityLevel.MODERATE,
                confidence_score=min(sat_finding.confidence, buoy_finding.confidence),
                assessment_summary="Sensor telemetry incomplete or clouded out. Human verification required before taking mitigation action.",
                supporting_evidence=sat_finding.evidence + buoy_finding.evidence,
                contradicting_evidence=["Insufficient telemetry density across one or more reporting streams."],
                scientific_limitations=["Atmospheric or sensor telemetry dropout prevents deterministic classification."],
                recommended_actions=[
                    "Dispatch autonomous surface vessel or schedule emergency sensor recalibration sweep.",
                    "Verify raw optical logs manually."
                ],
                human_review_required=True,
                escalation_reason="Low-confidence telemetry below 0.50 floor.",
                agent_breakdown={sat_finding.agent: sat_finding.confidence, buoy_finding.agent: buoy_finding.confidence}
            )
            return conflicts, assessment

        # Discrepancy Case: Surface bloom present, but subsurface dissolved oxygen remains normal
        if sat_finding.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL] and buoy_finding.severity == SeverityLevel.NORMAL:
            conflicts.append(EvidenceConflict(
                parameter="Bloom Stratification / Hypoxia Lag",
                agent_a=sat_finding.agent,
                agent_a_claim=f"Surface chlorophyll surge detected ({sat_finding.metrics.get('chl_ratio', 1.0):.1f}x baseline)",
                agent_b=buoy_finding.agent,
                agent_b_claim=f"In-situ dissolved oxygen normal ({buoy_finding.metrics.get('dissolved_oxygen_mg_l', 0.0)} mg/L)",
                resolution_status="resolved",
                arbitration_note="Temporal lag between surface algal bloom proliferation and benthic microbial decay. Oxygen depletion has not yet reached sensor depth."
            ))
            assessment = SynthesisAssessment(
                risk_level=SeverityLevel.HIGH,
                confidence_score=0.86,
                assessment_summary="Emerging Harmful Algal Bloom with temporal stratification. Surface bloom is active; subsurface hypoxia has not yet manifested at sensor depth.",
                supporting_evidence=sat_finding.evidence,
                contradicting_evidence=buoy_finding.evidence,
                scientific_limitations=[
                    "Point sensor depth is stationary; mid-water column biomass decay cannot be fully tracked without CTD profile."
                ],
                recommended_actions=[
                    "Alert aquaculture operators of impending surface scum transport within 24-48 hours.",
                    "Increase buoy sampling interval from 60 to 15 minutes."
                ],
                human_review_required=False,
                agent_breakdown={sat_finding.agent: sat_finding.confidence, buoy_finding.agent: buoy_finding.confidence}
            )
            return conflicts, assessment

        # Convergent Case: Both indicate high/critical threat
        if sat_finding.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL] and buoy_finding.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]:
            assessment = SynthesisAssessment(
                risk_level=SeverityLevel.CRITICAL,
                confidence_score=0.95,
                assessment_summary="Severe verified coastal crisis. Surface optical bloom and benthic deoxygenation confirm active bloom collapse and hypoxia.",
                supporting_evidence=sat_finding.evidence + buoy_finding.evidence,
                contradicting_evidence=[],
                scientific_limitations=["Plume boundary dynamics subject to tidal advection."],
                recommended_actions=[
                    "Issue immediate fishery and recreational water closure notice.",
                    "Deploy aeration barriers at nearby aquaculture leases."
                ],
                human_review_required=False,
                agent_breakdown={sat_finding.agent: sat_finding.confidence, buoy_finding.agent: buoy_finding.confidence}
            )
            return conflicts, assessment

        # Nominal Baseline Case
        assessment = SynthesisAssessment(
            risk_level=SeverityLevel.NORMAL,
            confidence_score=0.92,
            assessment_summary="Ecosystem parameters are operating within baseline bounds. No significant anomaly detected.",
            supporting_evidence=sat_finding.evidence + buoy_finding.evidence,
            contradicting_evidence=[],
            scientific_limitations=["Standard optical resolution constraints."],
            recommended_actions=["Maintain standard operational monitoring schedule."],
            human_review_required=False,
            agent_breakdown={sat_finding.agent: sat_finding.confidence, buoy_finding.agent: buoy_finding.confidence}
        )
        return conflicts, assessment