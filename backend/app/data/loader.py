import json
from pathlib import Path
from typing import Dict, Any, List, Optional

DATA_DIR = Path(__file__).resolve().parent

def load_zones() -> List[Dict[str, Any]]:
    zones_path = DATA_DIR / "zones.json"
    if not zones_path.exists():
        return []
    with open(zones_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_zone_by_id(zone_id: str) -> Optional[Dict[str, Any]]:
    zones = load_zones()
    for z in zones:
        if z.get("id") == zone_id:
            return z
    return None

def load_scenario(scenario_id: str) -> Optional[Dict[str, Any]]:
    scenario_path = DATA_DIR / "scenarios" / f"{scenario_id}.json"
    if not scenario_path.exists():
        return None
    with open(scenario_path, "r", encoding="utf-8") as f:
        return json.load(f)

def list_scenarios() -> List[Dict[str, str]]:
    scenarios_dir = DATA_DIR / "scenarios"
    result = []
    if not scenarios_dir.exists():
        return result
    for f in scenarios_dir.glob("*.json"):
        with open(f, "r", encoding="utf-8") as file:
            data = json.load(file)
            result.append({
                "scenario_id": data.get("scenario_id", f.stem),
                "name": data.get("name", f.stem),
                "zone_id": data.get("zone_id", "")
            })
    return result