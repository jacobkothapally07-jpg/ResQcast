"""
RakshaCast-Forge Real-World Disaster Scenarios & Pre-loaded Indian Basins.
Includes Godavari Basin (Bhadrachalam), Yamuna Basin (Delhi), and Brahmaputra (Kaziranga).
"""

import time
from typing import List, Dict
from models import DisasterZone, ThreatLevel, SensorReading, SatelliteScan, WeatherData
from multimodal_engine import MultimodalFusionEngine


def get_default_disaster_zones() -> List[DisasterZone]:
    """Generates real-world Indian river basin disaster monitoring zones."""
    
    # Zone 1: Godavari River Basin (Bhadrachalam Sector - Telangana)
    sat_1 = SatelliteScan(
        scan_id="SAT-GODAVARI-09",
        water_index_ndwi=0.88,
        inundation_area_sqkm=42.5,
        submerged_infrastructure_count=18,
        confidence_score=0.94
    )
    weather_1 = WeatherData(
        location_name="Bhadrachalam",
        precipitation_mm_hr=68.5,
        forecast_24h_rainfall_mm=210.0,
        wind_speed_kmh=45.0,
        soil_saturation_pct=92.0,
        river_basin_inflow_cusecs=1850000.0
    )
    sensor_1 = SensorReading(
        sensor_id="CWC-GODAVARI-BHADRA-01",
        sensor_type="river_gauge",
        location_name="Bhadrachalam Bridge Gauge",
        latitude=17.6689,
        longitude=80.8936,
        current_value=53.8,  # Danger mark is 48.0 ft
        unit="feet",
        threshold_critical=48.0,
        status="CRITICAL"
    )
    fusion_1 = MultimodalFusionEngine.fuse_zone_telemetry(sat_1, weather_1, sensor_1, field_reports_count=14, cloud_cover_pct=25.0)

    zone_1 = DisasterZone(
        zone_id="ZONE-AP-GODAVARI-01",
        zone_name="Bhadrachalam - Godavari Basin",
        district="Bhadradri Kothagudem",
        state="Telangana / AP Border",
        latitude=17.6689,
        longitude=80.8936,
        population_at_risk=48500,
        threat_score=fusion_1.composite_threat_score,
        threat_level=fusion_1.threat_level,
        uncertainty_margin=fusion_1.uncertainty_margin,
        flood_depth_meters=3.4,
        satellite_inundation_pct=76.5,
        rainfall_rate_mm=68.5,
        river_level_meters=16.4,
        river_danger_mark_meters=14.6,
        fusion_details=fusion_1,
        evacuation_status="IN_PROGRESS"
    )

    # Zone 2: Yamuna River Basin (Old Railway Bridge & Low-lying Plains - Delhi)
    sat_2 = SatelliteScan(
        scan_id="SAT-YAMUNA-04",
        water_index_ndwi=0.79,
        inundation_area_sqkm=28.2,
        submerged_infrastructure_count=12,
        confidence_score=0.91
    )
    weather_2 = WeatherData(
        location_name="Yamuna Bazar Delhi",
        precipitation_mm_hr=42.0,
        forecast_24h_rainfall_mm=135.0,
        wind_speed_kmh=28.0,
        soil_saturation_pct=88.0,
        river_basin_inflow_cusecs=350000.0
    )
    sensor_2 = SensorReading(
        sensor_id="CWC-YAMUNA-ORB-02",
        sensor_type="river_gauge",
        location_name="Old Railway Bridge Gauge",
        latitude=28.6606,
        longitude=77.2405,
        current_value=208.62,  # Danger mark 205.33m
        unit="meters",
        threshold_critical=205.33,
        status="CRITICAL"
    )
    fusion_2 = MultimodalFusionEngine.fuse_zone_telemetry(sat_2, weather_2, sensor_2, field_reports_count=9, cloud_cover_pct=35.0)

    zone_2 = DisasterZone(
        zone_id="ZONE-DL-YAMUNA-02",
        zone_name="Yamuna Floodplain - Old Railway Bridge",
        district="East Delhi",
        state="Delhi NCR",
        latitude=28.6606,
        longitude=77.2405,
        population_at_risk=62000,
        threat_score=fusion_2.composite_threat_score,
        threat_level=fusion_2.threat_level,
        uncertainty_margin=fusion_2.uncertainty_margin,
        flood_depth_meters=2.6,
        satellite_inundation_pct=64.0,
        rainfall_rate_mm=42.0,
        river_level_meters=208.62,
        river_danger_mark_meters=205.33,
        fusion_details=fusion_2,
        evacuation_status="PENDING"
    )

    # Zone 3: Brahmaputra River Basin (Kaziranga Floodway - Assam)
    sat_3 = SatelliteScan(
        scan_id="SAT-BRAHMAPUTRA-02",
        water_index_ndwi=0.92,
        inundation_area_sqkm=84.0,
        submerged_infrastructure_count=7,
        confidence_score=0.89
    )
    weather_3 = WeatherData(
        location_name="Kaziranga National Park",
        precipitation_mm_hr=54.0,
        forecast_24h_rainfall_mm=190.0,
        wind_speed_kmh=35.0,
        soil_saturation_pct=95.0,
        river_basin_inflow_cusecs=2400000.0
    )
    sensor_3 = SensorReading(
        sensor_id="CWC-BRAHMA-KAZI-03",
        sensor_type="river_gauge",
        location_name="Dhubri / Tezpur Gauge",
        latitude=26.5775,
        longitude=93.1711,
        current_value=106.8,
        unit="meters",
        threshold_critical=105.7,
        status="CRITICAL"
    )
    fusion_3 = MultimodalFusionEngine.fuse_zone_telemetry(sat_3, weather_3, sensor_3, field_reports_count=6, cloud_cover_pct=70.0)

    zone_3 = DisasterZone(
        zone_id="ZONE-AS-BRAHMAPUTRA-03",
        zone_name="Kaziranga Floodway & Riverine Corridor",
        district="Golaghat / Nagaon",
        state="Assam",
        latitude=26.5775,
        longitude=93.1711,
        population_at_risk=24000,
        threat_score=fusion_3.composite_threat_score,
        threat_level=fusion_3.threat_level,
        uncertainty_margin=fusion_3.uncertainty_margin,
        flood_depth_meters=4.1,
        satellite_inundation_pct=88.2,
        rainfall_rate_mm=54.0,
        river_level_meters=106.8,
        river_danger_mark_meters=105.7,
        fusion_details=fusion_3,
        evacuation_status="IN_PROGRESS"
    )

    # Zone 4: Mahanadi Delta (Cuttack & Kendrapada - Odisha)
    sat_4 = SatelliteScan(
        scan_id="SAT-MAHANADI-01",
        water_index_ndwi=0.48,
        inundation_area_sqkm=14.5,
        submerged_infrastructure_count=3,
        confidence_score=0.95
    )
    weather_4 = WeatherData(
        location_name="Cuttack Delta",
        precipitation_mm_hr=18.0,
        forecast_24h_rainfall_mm=65.0,
        wind_speed_kmh=22.0,
        soil_saturation_pct=65.0,
        river_basin_inflow_cusecs=650000.0
    )
    sensor_4 = SensorReading(
        sensor_id="CWC-MAH-CUTTACK-04",
        sensor_type="river_gauge",
        location_name="Naraj Barrage Gauge",
        latitude=20.4625,
        longitude=85.8830,
        current_value=26.4,
        unit="meters",
        threshold_critical=28.5,
        status="WATCH"
    )
    fusion_4 = MultimodalFusionEngine.fuse_zone_telemetry(sat_4, weather_4, sensor_4, field_reports_count=2, cloud_cover_pct=15.0)

    zone_4 = DisasterZone(
        zone_id="ZONE-OD-MAHANADI-04",
        zone_name="Mahanadi Delta - Naraj Barrage",
        district="Cuttack",
        state="Odisha",
        latitude=20.4625,
        longitude=85.8830,
        population_at_risk=15000,
        threat_score=fusion_4.composite_threat_score,
        threat_level=fusion_4.threat_level,
        uncertainty_margin=fusion_4.uncertainty_margin,
        flood_depth_meters=0.8,
        satellite_inundation_pct=22.4,
        rainfall_rate_mm=18.0,
        river_level_meters=26.4,
        river_danger_mark_meters=28.5,
        fusion_details=fusion_4,
        evacuation_status="PENDING"
    )

    return [zone_1, zone_2, zone_3, zone_4]
