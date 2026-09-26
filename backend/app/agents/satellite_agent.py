from typing import Dict, Any, Optional
from app.api.schemas import Finding, SeverityLevel
from app.services.anomaly_detector import AnomalyDetector

class SatelliteAgent:
    name: str = "Sentinel/MODIS Spectral Analyst"

    def analyze(self, sat_data: Optional[Dict[str, Any]]) -> Finding:
        eval_result = AnomalyDetector.evaluate_satellite_telemetry(sat_data)
        metrics = eval_result["metrics"]
        severity = eval_result["severity"]
        confidence = eval_result["confidence"]

        if eval_result["status"] == "INSUFFICIENT_DATA":
            return Finding(
                agent=self.name,
                headline="Inconclusive Surface Observation (Heavy Cloud Cover/Dropout)",
                severity=SeverityLevel.NORMAL,
                confidence=confidence,
                evidence=[
                    f"Cloud cover reached {metrics.get('cloud_cover', 100)}%, exceeding optical penetration limit.",
                    "No valid top-of-atmosphere radiance spectra captured."
                ],
                metrics=metrics,
                needs_corroboration=True
            )

        evidence = [
            f"Surface Chlorophyll-a observed at {metrics['surface_chl_observed']:.2f} mg/m³ ({metrics['chl_ratio']:.1f}x baseline).",
            f"Sea Surface Temperature anomaly of {metrics['temp_delta']:+.2f}°C relative to seasonal average."
        ]

        if metrics.get("spatial_cluster_detected"):
            evidence.append("Multi-pixel contiguous spectral cluster detected along the coastal front.")

        needs_corroboration = (severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL])

        headline = (
            f"Severe Optical Bloom Anomaly Detected ({metrics['chl_ratio']:.1f}x Baseline)"
            if severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]
            else "Surface Radiance and Chlorophyll Within Expected Variance"
        )

        return Finding(
            agent=self.name,
            headline=headline,
            severity=severity,
            confidence=confidence,
            evidence=evidence,
            metrics=metrics,
            needs_corroboration=needs_corroboration
        )