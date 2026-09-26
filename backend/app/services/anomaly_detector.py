from typing import Dict, Any, Optional
from app.api.schemas import SeverityLevel

class AnomalyDetector:
    """
    Deterministic mathematical and statistical baseline evaluator.
    Provides verifiable, non-hallucinated telemetry scoring.
    """

    @staticmethod
    def evaluate_satellite_telemetry(sat: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if not sat or sat.get("surface_chlorophyll_a") is None:
            return {
                "status": "INSUFFICIENT_DATA",
                "severity": SeverityLevel.NORMAL,
                "confidence": 0.20,
                "metrics": {"cloud_cover": sat.get("cloud_cover_percent", 100.0) if sat else 100.0},
                "summary": "Satellite optical sweep occluded by high cloud cover or missing telemetry."
            }

        chl = float(sat["surface_chlorophyll_a"])
        base_chl = float(sat.get("baseline_chlorophyll_a", 1.5))
        sst = float(sat.get("sea_surface_temp_celsius", 25.0))
        base_sst = float(sat.get("baseline_temp_celsius", 25.0))

        # Relative chlorophyll elevation ratio
        chl_ratio = chl / base_chl if base_chl > 0 else 1.0
        temp_delta = sst - base_sst

        severity = SeverityLevel.NORMAL
        confidence = 0.90

        if chl_ratio >= 4.0 or (chl >= 8.0 and temp_delta >= 2.0):
            severity = SeverityLevel.CRITICAL
        elif chl_ratio >= 2.0 or temp_delta >= 1.5:
            severity = SeverityLevel.HIGH
        elif chl_ratio >= 1.3:
            severity = SeverityLevel.MODERATE

        # Penalize confidence if high cloud cover degrades optical fidelity
        cloud_cover = sat.get("cloud_cover_percent", 0.0)
        if cloud_cover > 40.0:
            confidence = max(0.40, confidence - (cloud_cover / 100.0) * 0.5)

        return {
            "status": "EVALUATED",
            "severity": severity,
            "confidence": round(confidence, 2),
            "metrics": {
                "chl_ratio": round(chl_ratio, 2),
                "temp_delta": round(temp_delta, 2),
                "surface_chl_observed": chl,
                "spatial_cluster_detected": sat.get("spatial_cluster_detected", False)
            },
            "summary": f"Surface chlorophyll is {chl_ratio:.1f}x baseline with SST anomaly of {temp_delta:+.1f}°C."
        }

    @staticmethod
    def evaluate_buoy_telemetry(buoy: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if not buoy or buoy.get("dissolved_oxygen_mg_l") is None:
            return {
                "status": "INSUFFICIENT_DATA",
                "severity": SeverityLevel.NORMAL,
                "confidence": 0.25,
                "metrics": {},
                "summary": "In-situ benthic telemetry unavailable or probe offline."
            }

        do_level = float(buoy["dissolved_oxygen_mg_l"])
        temp = float(buoy.get("temperature", 25.0))
        ph = float(buoy.get("ph", 8.1))

        # Biological deoxygenation thresholds
        # Hypoxia: DO <= 2.5 mg/L; Stress: DO <= 4.0 mg/L; Moderate: DO <= 5.5 mg/L
        severity = SeverityLevel.NORMAL
        confidence = 0.92

        if do_level <= 2.5 or ph < 7.5:
            severity = SeverityLevel.CRITICAL
        elif do_level <= 4.0:
            severity = SeverityLevel.HIGH
        elif do_level <= 5.5:
            severity = SeverityLevel.MODERATE

        return {
            "status": "EVALUATED",
            "severity": severity,
            "confidence": confidence,
            "metrics": {
                "dissolved_oxygen_mg_l": do_level,
                "temperature_celsius": temp,
                "ph": ph,
                "turbidity_ntu": buoy.get("turbidity_ntu", 0.0)
            },
            "summary": f"Subsurface dissolved oxygen at {do_level:.1f} mg/L (pH {ph:.2f})."
        }