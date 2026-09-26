"""
RakshaCast-Forge Multimodal AI Fusion Engine
Fuses Satellite Optical/SAR Imagery + Real-Time Weather + Ground IoT Sensors + NLP Field Reports
with Uncertainty Quantification and Out-of-Distribution (OOD) Detection.
"""

import math
import random
from typing import Dict, List, Tuple, Optional, Any
from models import (
    DisasterZone,
    ThreatLevel,
    SensorReading,
    SatelliteScan,
    WeatherData,
    MultimodalFusionResult,
)


class MultimodalFusionEngine:
    """
    Computes a composite Disaster Threat Score S(z) for any geographic zone z
    using a late-fusion ensemble with dynamic modality reliability weighting.
    """

    # Base modality weights (sum to 1.0)
    DEFAULT_WEIGHTS = {
        "satellite": 0.35,      # High spatial accuracy for inundation
        "weather": 0.25,        # Leading predictive indicator (rainfall forecast)
        "iot_sensors": 0.25,    # Ground truth river gauge and flow rates
        "field_reports": 0.15,  # Real-world citizen/first responder ground observations
    }

    @classmethod
    def fuse_zone_telemetry(
        cls,
        satellite: SatelliteScan,
        weather: WeatherData,
        sensor: SensorReading,
        field_reports_count: int = 5,
        reported_damage_level: float = 0.75,
        cloud_cover_pct: float = 15.0,
    ) -> MultimodalFusionResult:
        """
        Executes multimodal fusion with uncertainty quantification.
        """
        weights = dict(cls.DEFAULT_WEIGHTS)
        evidence: List[str] = []

        # 1. Dynamic Weight Adjustment (e.g. cloud cover reduces optical satellite confidence)
        if cloud_cover_pct > 60.0:
            # Shift weight from satellite to ground IoT and radar weather
            weights["satellite"] = max(0.15, weights["satellite"] - 0.15)
            weights["iot_sensors"] += 0.10
            weights["weather"] += 0.05
            evidence.append(f"High cloud cover ({cloud_cover_pct:.0f}%): Shifted weight to ground IoT telemetry & radar.")

        # Normalize weights
        total_w = sum(weights.values())
        weights = {k: v / total_w for k, v in weights.items()}

        # 2. Modality Score Computations (Normalized 0.0 to 100.0)
        
        # A. Satellite Score: Water Index (NDWI) & Submerged Area Ratio
        # NDWI > 0.3 indicates water presence, NDWI > 0.6 indicates deep flooding
        sat_score = min(100.0, (satellite.water_index_ndwi * 70.0) + (satellite.submerged_infrastructure_count * 2.5))
        if sat_score > 60.0:
            evidence.append(f"Satellite SAR: {satellite.inundation_area_sqkm:.1f} sq.km inundated with {satellite.submerged_infrastructure_count} critical structures submerged.")

        # B. Weather Score: Immediate Precipitation + 24h Forecast + Soil Saturation
        # Saturated soil (>85%) means zero water absorption -> immediate runoff
        soil_multiplier = 1.0 + max(0.0, (weather.soil_saturation_pct - 50.0) / 50.0)
        weather_score = min(100.0, ((weather.precipitation_mm_hr * 1.5) + (weather.forecast_24h_rainfall_mm * 0.35)) * soil_multiplier)
        if weather.precipitation_mm_hr > 40.0 or weather.soil_saturation_pct > 80.0:
            evidence.append(f"Weather Telemetry: Intense rainfall ({weather.precipitation_mm_hr:.1f} mm/hr) over saturated soil ({weather.soil_saturation_pct:.0f}%).")

        # C. Ground IoT Sensor Score: River Level vs Danger Mark
        # Ratio of current level to danger threshold
        if sensor.threshold_critical > 0:
            river_ratio = sensor.current_value / sensor.threshold_critical
            if river_ratio >= 1.0:
                # Breached danger mark
                iot_score = min(100.0, 75.0 + (river_ratio - 1.0) * 80.0)
                evidence.append(f"Ground Gauge '{sensor.sensor_id}': Danger mark BREACHED at {sensor.current_value:.2f}m (Threshold: {sensor.threshold_critical:.2f}m).")
            elif river_ratio >= 0.85:
                iot_score = 50.0 + (river_ratio - 0.85) * 150.0
                evidence.append(f"Ground Gauge '{sensor.sensor_id}': Warning level at {sensor.current_value:.2f}m (85% of danger mark).")
            else:
                iot_score = max(0.0, river_ratio * 40.0)
        else:
            iot_score = 20.0

        # D. Field Reports Score: Ground SOS density
        field_score = min(100.0, (field_reports_count * 8.0) * reported_damage_level)
        if field_reports_count >= 5:
            evidence.append(f"Field Triage: {field_reports_count} verified SOS incident reports received from sector.")

        # 3. Fused Composite Threat Score
        composite_score = (
            (sat_score * weights["satellite"]) +
            (weather_score * weights["weather"]) +
            (iot_score * weights["iot_sensors"]) +
            (field_score * weights["field_reports"])
        )
        composite_score = round(min(100.0, max(0.0, composite_score)), 1)

        # 4. Uncertainty & Out-of-Distribution (OOD) Quantification
        # Variance among different modalities represents epistemic uncertainty
        modalities = [sat_score, weather_score, iot_score, field_score]
        mean_mod = sum(modalities) / len(modalities)
        variance = sum((m - mean_mod) ** 2 for m in modalities) / len(modalities)
        std_dev = math.sqrt(variance)

        # Uncertainty margin (e.g. +/- 4.2%)
        uncertainty_margin = round(min(12.5, max(1.8, (std_dev * 0.25) + (1.0 - satellite.confidence_score) * 10.0)), 1)
        confidence_score = round(max(0.60, min(0.99, 1.0 - (uncertainty_margin / 20.0))), 2)

        # Out-of-distribution check: Conflicting signals (e.g. Satellite shows clear, but IoT sensor shows extreme flood)
        ood_detected = False
        human_review = False
        if abs(sat_score - iot_score) > 55.0:
            ood_detected = True
            human_review = True
            evidence.append("⚠️ HIGH DISPARITY DETECTED: Ground sensors conflict with satellite imagery (Sensor anomaly or cloud shadow). Mandatory human verification flagged.")
        elif uncertainty_margin > 8.0:
            human_review = True
            evidence.append("⚠️ High uncertainty boundary (> 8.0%): Human-in-the-loop review recommended before mass evacuation dispatch.")

        # 5. Determine Threat Level Classification
        if composite_score >= 75.0:
            threat_level = ThreatLevel.CRITICAL
        elif composite_score >= 50.0:
            threat_level = ThreatLevel.WARNING
        elif composite_score >= 25.0:
            threat_level = ThreatLevel.WATCH
        else:
            threat_level = ThreatLevel.NORMAL

        # Identify Primary Threat Driver
        score_map = {
            "Satellite Inundation Extent": sat_score * weights["satellite"],
            "Extreme Rainfall & Inflow": weather_score * weights["weather"],
            "River Gauge Breach": iot_score * weights["iot_sensors"],
            "Ground Citizen SOS Volume": field_score * weights["field_reports"],
        }
        primary_driver = max(score_map, key=score_map.get)

        return MultimodalFusionResult(
            composite_threat_score=composite_score,
            threat_level=threat_level,
            uncertainty_margin=uncertainty_margin,
            confidence_score=confidence_score,
            modality_weights=weights,
            primary_driver=primary_driver,
            out_of_distribution=ood_detected,
            human_review_required=human_review,
            evidence_breakdown=evidence,
        )


class DisasterTimelineSimulator:
    """
    Simulates disaster spatial progression across time steps:
    T-0h (Current), T+6h (Peak Inflow), T+12h (Downstream Surge), T+24h (Receding).
    """

    @staticmethod
    def forecast_zone_progression(base_zone: DisasterZone, hours_ahead: int) -> Dict[str, Any]:
        """Calculates forecasted metrics for disaster progression scrubber."""
        if hours_ahead == 0:
            multiplier = 1.0
        elif hours_ahead <= 6:
            # Rapid rise
            multiplier = 1.0 + (hours_ahead / 6.0) * 0.35
        elif hours_ahead <= 12:
            # Peak crest
            multiplier = 1.35 + ((hours_ahead - 6) / 6.0) * 0.15
        else:
            # Receding
            multiplier = max(0.6, 1.50 - ((hours_ahead - 12) / 12.0) * 0.7)

        forecast_score = min(100.0, round(base_zone.threat_score * multiplier, 1))
        forecast_depth = round(base_zone.flood_depth_meters * multiplier, 2)
        forecast_inundation = min(98.0, round(base_zone.satellite_inundation_pct * multiplier, 1))
        forecast_hotspots = int(base_zone.thermal_hotspots_count * multiplier) if base_zone.thermal_hotspots_count else 0
        forecast_pm25 = round(base_zone.pm25_aqi * multiplier, 1) if base_zone.pm25_aqi else 0.0
        forecast_spread = round(base_zone.fire_spread_kmh * multiplier, 1) if base_zone.fire_spread_kmh else 0.0
        
        return {
            "hours_ahead": hours_ahead,
            "disaster_type": base_zone.disaster_type.value if hasattr(base_zone.disaster_type, 'value') else str(base_zone.disaster_type),
            "forecast_threat_score": forecast_score,
            "forecast_flood_depth_meters": forecast_depth,
            "forecast_inundation_pct": forecast_inundation,
            "forecast_hotspots_count": forecast_hotspots,
            "forecast_pm25_aqi": forecast_pm25,
            "forecast_fire_spread_kmh": forecast_spread,
            "risk_tier": "CRITICAL" if forecast_score >= 75 else ("WARNING" if forecast_score >= 50 else "WATCH")
        }
