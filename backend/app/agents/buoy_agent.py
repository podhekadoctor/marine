from typing import Dict, Any, Optional
from app.api.schemas import Finding, SeverityLevel
from app.services.anomaly_detector import AnomalyDetector

class BuoyAgent:
    name: str = "Benthic In-Situ Telemetry Monitor"

    def analyze(self, buoy_data: Optional[Dict[str, Any]]) -> Finding:
        eval_result = AnomalyDetector.evaluate_buoy_telemetry(buoy_data)
        metrics = eval_result["metrics"]
        severity = eval_result["severity"]
        confidence = eval_result["confidence"]

        if eval_result["status"] == "INSUFFICIENT_DATA":
            return Finding(
                agent=self.name,
                headline="Sensor Sweep Incomplete: Missing In-Situ Telemetry",
                severity=SeverityLevel.NORMAL,
                confidence=confidence,
                evidence=[
                    "Primary optical dissolved oxygen and pH probe failed telemetry handshake.",
                    "Local station recorded null or partial data stream."
                ],
                metrics={},
                needs_corroboration=True
            )

        evidence = [
            f"Dissolved oxygen measured at {metrics['dissolved_oxygen_mg_l']:.1f} mg/L.",
            f"Station water temperature at {metrics['temperature_celsius']:.1f}°C, pH at {metrics['ph']:.2f}."
        ]

        if metrics.get("turbidity_ntu", 0.0) > 10.0:
            evidence.append(f"Subsurface nephelometric turbidity elevated at {metrics['turbidity_ntu']} NTU.")

        headline = (
            f"Critical Hypoxic/Chemical Stress Detected (DO: {metrics['dissolved_oxygen_mg_l']:.1f} mg/L)"
            if severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]
            else f"Subsurface Parameters Nominal (DO: {metrics['dissolved_oxygen_mg_l']:.1f} mg/L)"
        )

        return Finding(
            agent=self.name,
            headline=headline,
            severity=severity,
            confidence=confidence,
            evidence=evidence,
            metrics=metrics,
            needs_corroboration=(severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL])
        )