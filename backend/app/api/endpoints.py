import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    InvestigationRequest,
    InvestigationRecord,
    SynthesisAssessment,
    Finding
)
from app.data.loader import load_zones, get_zone_by_id, load_scenario, list_scenarios
from app.agents.satellite_agent import SatelliteAgent
from app.agents.buoy_agent import BuoyAgent
from app.agents.arbitrator import EvidenceArbitrator

router = APIRouter()
sat_agent = SatelliteAgent()
buoy_agent = BuoyAgent()

@router.get("/zones", response_model=List[Dict[str, Any]])
def get_coastal_zones():
    return load_zones()

@router.get("/zones/{zone_id}")
def get_zone(zone_id: str):
    zone = get_zone_by_id(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Coastal zone not found")
    return zone

@router.get("/scenarios", response_model=List[Dict[str, str]])
def get_scenarios():
    return list_scenarios()

@router.get("/scenarios/{scenario_id}")
def get_scenario_telemetry(scenario_id: str):
    scenario = load_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario dataset not found")
    return scenario

@router.post("/investigate", response_model=InvestigationRecord)
def run_investigation(request: InvestigationRequest):
    zone = get_zone_by_id(request.zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Invalid target zone")

    scenario_id = request.scenario_override or "conflicting_evidence"
    scenario = load_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")

    sat_telemetry = scenario.get("satellite_telemetry")
    buoy_telemetry = scenario.get("buoy_telemetry")

    sat_finding = sat_agent.analyze(sat_telemetry)
    buoy_finding = buoy_agent.analyze(buoy_telemetry)

    conflicts, assessment = EvidenceArbitrator.arbitrate(sat_finding, buoy_finding)

    record = InvestigationRecord(
        id=f"inv-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.now(timezone.utc).isoformat(),
        zone_id=request.zone_id,
        question=request.question,
        findings=[sat_finding, buoy_finding],
        conflicts=conflicts,
        assessment=assessment
    )

    return record