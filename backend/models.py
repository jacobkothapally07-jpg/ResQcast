"""
RakshaCast-Forge Data Models for Microsoft Problem 2 (Multimodal AI Disaster Intelligence)
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import time


class DisasterType(str, Enum):
    FLOOD = "FLOOD"
    WILDFIRE = "WILDFIRE"
    CYCLONE = "CYCLONE"
    LANDSLIDE = "LANDSLIDE"


class ThreatLevel(str, Enum):
    CRITICAL = "CRITICAL"  # Red: Immediate Evacuation
    WARNING = "WARNING"    # Amber: Prepare Relief / Standby
    WATCH = "WATCH"        # Yellow: Monitor Sensors
    NORMAL = "NORMAL"      # Green: Safe


class ModalitySource(str, Enum):
    SATELLITE = "SATELLITE"
    WEATHER = "WEATHER"
    IOT_SENSOR = "IOT_SENSOR"
    FIELD_REPORT = "FIELD_REPORT"


class SensorReading(BaseModel):
    sensor_id: str
    sensor_type: str  # river_gauge, rain_gauge, soil_moisture, flow_velocity
    location_name: str
    latitude: float
    longitude: float
    current_value: float
    unit: str
    threshold_critical: float
    status: str = "NORMAL"
    timestamp: float = Field(default_factory=time.time)


class SatelliteScan(BaseModel):
    scan_id: str
    timestamp: float = Field(default_factory=time.time)
    satellite_name: str = "Sentinel-2 / SAR"
    resolution_meters: float = 10.0
    water_index_ndwi: float  # Normalized Difference Water Index (0.0 to 1.0)
    inundation_area_sqkm: float
    submerged_infrastructure_count: int
    confidence_score: float = 0.92


class WeatherData(BaseModel):
    location_name: str
    precipitation_mm_hr: float
    forecast_24h_rainfall_mm: float
    wind_speed_kmh: float
    soil_saturation_pct: float
    river_basin_inflow_cusecs: float


class MultimodalFusionResult(BaseModel):
    composite_threat_score: float  # 0.0 to 100.0
    threat_level: ThreatLevel
    uncertainty_margin: float  # e.g., +/- 4.5%
    confidence_score: float    # 0.0 to 1.0
    modality_weights: Dict[str, float]
    primary_driver: str
    out_of_distribution: bool = False
    human_review_required: bool = False
    evidence_breakdown: List[str]


class DisasterZone(BaseModel):
    zone_id: str
    zone_name: str
    district: str
    state: str
    latitude: float
    longitude: float
    population_at_risk: int
    threat_score: float  # 0.0 to 100.0
    threat_level: ThreatLevel
    uncertainty_margin: float
    flood_depth_meters: float = 0.0
    satellite_inundation_pct: float = 0.0
    rainfall_rate_mm: float = 0.0
    river_level_meters: float = 0.0
    river_danger_mark_meters: float = 0.0
    disaster_type: DisasterType = DisasterType.FLOOD
    
    # Wildfire specific telemetry
    thermal_hotspots_count: int = 0
    pm25_aqi: float = 0.0
    wind_direction_deg: float = 0.0
    wind_speed_kmh: float = 0.0
    fire_spread_kmh: float = 0.0
    smoke_plume_coverage_sqkm: float = 0.0
    
    # Deep Evidence Streams (Visual, IoT/Weather, NLP, XAI)
    evidence_streams: Optional[Dict[str, Any]] = None
    last_updated: float = Field(default_factory=time.time)
    fusion_details: Optional[MultimodalFusionResult] = None
    evacuation_status: str = "PENDING"  # PENDING, IN_PROGRESS, COMPLETED


class OperatorActionRequest(BaseModel):
    zone_id: str
    operator_name: str
    action_type: str  # EVACUATE, DISPATCH_NDRF, ISSUE_SMS_BROADCAST, OVERRIDE_THREAT
    notes: Optional[str] = None


class SituationReport(BaseModel):
    report_id: str
    generated_at: float = Field(default_factory=time.time)
    disaster_type: DisasterType
    total_zones_monitored: int
    critical_zones_count: int
    population_affected: int
    top_critical_zones: List[DisasterZone]
    executive_summary: str
    recommended_actions: List[str]
