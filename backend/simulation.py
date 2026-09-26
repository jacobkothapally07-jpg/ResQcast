"""
RakshaCast-Forge Real-World Disaster Scenarios & Pre-loaded Indian Basins.
Includes Godavari Basin (Bhadrachalam), Yamuna Basin (Delhi), and Brahmaputra (Kaziranga).
"""

import time
from typing import List, Dict
from models import DisasterZone, ThreatLevel, SensorReading, SatelliteScan, WeatherData, DisasterType, MultimodalFusionResult
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
        evacuation_status="IN_PROGRESS",
        evidence_streams={
            "visual": {
                "sensor": "Sentinel-2 MultiSpectral / SAR Mask",
                "ndwi_index": 0.88,
                "inundation_area_sqkm": 42.5,
                "submerged_structures": 18,
                "resolution": "10m Sentinel-2 / Microsoft Planetary Computer",
                "detection_mask": "Flood Inundation Contour (92.5% Confidence)"
            },
            "iot_weather": {
                "metric_name": "River Surge & Rainfall Intensity",
                "current_level": "16.40 m (Danger: 14.60 m)",
                "precipitation": "68.5 mm/hr",
                "wind_vector": "45 km/h ENE (65°)",
                "sparkline": [12.2, 13.5, 14.6, 15.8, 16.4, 17.2, 16.9],
                "timestamps": ["T-6h", "T-4h", "T-2h", "T-1h", "T-0", "T+2h", "T+4h"]
            },
            "nlp_text": {
                "source": "NDRF Ground Radio & Citizen SOS Feed",
                "raw_text": "EMERGENCY: Bridge approach submerged at Bhadrachalam temple road. 14 elders and children stranded in 2-story shelter. Water rising 15cm/hour.",
                "engine": "Microsoft Phi-3 Mini NLP Model",
                "extracted_entities": {
                    "trapped_persons": 14,
                    "structural_damage": "Bridge Approach Submerged",
                    "rate_of_rise": "+15 cm/hr",
                    "urgency_score": "CRITICAL (0.94)"
                }
            },
            "xai_attribution": {
                "satellite_mask": 35,
                "sensor_surge": 30,
                "nlp_reports": 20,
                "weather_inflow": 15
            },
            "uncertainty_assessment": {
                "score_pct": 12,
                "status": "Low Epistemic Uncertainty (±4.2%)",
                "ood_flag": False,
                "note": "Multi-modal consensus verified across SAR, river gauge, and field reports."
            }
        }
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
        evacuation_status="PENDING",
        evidence_streams={
            "visual": {
                "sensor": "Sentinel-1 SAR C-Band Synthetic Aperture Radar",
                "ndwi_index": 0.79,
                "inundation_area_sqkm": 28.2,
                "submerged_structures": 12,
                "resolution": "10m SAR via Microsoft Planetary Computer",
                "detection_mask": "Floodplain Water Extent (88.4% Confidence)"
            },
            "iot_weather": {
                "metric_name": "Yamuna Water Stage & Hathnikund Discharge",
                "current_level": "208.62 m (Danger: 205.33 m)",
                "precipitation": "42.0 mm/hr",
                "wind_vector": "28 km/h NW (310°)",
                "sparkline": [204.2, 205.1, 206.3, 207.5, 208.62, 209.1, 208.8],
                "timestamps": ["T-6h", "T-4h", "T-2h", "T-1h", "T-0", "T+2h", "T+4h"]
            },
            "nlp_text": {
                "source": "Delhi Disaster Management Field Cell",
                "raw_text": "Water ingress breached ring road flood walls near Kashmere Gate ISBT. Monastery market completely submerged.",
                "engine": "Microsoft Phi-3 Mini NLP Model",
                "extracted_entities": {
                    "trapped_persons": 6,
                    "structural_damage": "Ring Road Embankment Seepage",
                    "rate_of_rise": "+8 cm/hr",
                    "urgency_score": "CRITICAL (0.89)"
                }
            },
            "xai_attribution": {
                "satellite_mask": 38,
                "sensor_surge": 32,
                "nlp_reports": 18,
                "weather_inflow": 12
            },
            "uncertainty_assessment": {
                "score_pct": 18,
                "status": "Calibrated Bound (±5.1%)",
                "ood_flag": False,
                "note": "SAR Radar penetrations confirm inundation through haze."
            }
        }
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
        evacuation_status="IN_PROGRESS",
        evidence_streams={
            "visual": {
                "sensor": "Sentinel-1 SAR (Heavy Cloud Bypass)",
                "ndwi_index": 0.92,
                "inundation_area_sqkm": 84.0,
                "submerged_structures": 7,
                "resolution": "10m SAR via Microsoft Planetary Computer",
                "detection_mask": "Deep Valley Submersion (78.3% Confidence)"
            },
            "iot_weather": {
                "metric_name": "Brahmaputra Inflow Velocity",
                "current_level": "106.80 m (Danger: 105.70 m)",
                "precipitation": "54.0 mm/hr",
                "wind_vector": "35 km/h E (90°)",
                "sparkline": [103.5, 104.8, 105.7, 106.2, 106.8, 107.1, 106.5],
                "timestamps": ["T-6h", "T-4h", "T-2h", "T-1h", "T-0", "T+2h", "T+4h"]
            },
            "nlp_text": {
                "source": "Forest Ranger High-Frequency Wireless",
                "raw_text": "NH-37 animal animal corridor overtopped by 1.2m water wave. Speed regulations active.",
                "engine": "Microsoft Phi-3 Mini NLP Model",
                "extracted_entities": {
                    "trapped_persons": 0,
                    "structural_damage": "Highway 37 Corridor Overtopped",
                    "rate_of_rise": "+18 cm/hr",
                    "urgency_score": "HIGH (0.78)"
                }
            },
            "xai_attribution": {
                "satellite_mask": 40,
                "sensor_surge": 35,
                "nlp_reports": 15,
                "weather_inflow": 10
            },
            "uncertainty_assessment": {
                "score_pct": 34,
                "status": "Moderate Uncertainty (±6.9% - Monsoon Cloud Cover)",
                "ood_flag": False,
                "note": "High cloud cover (70%) down-weighted optical stream; SAR weight elevated."
            }
        }
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
        evacuation_status="PENDING",
        evidence_streams={
            "visual": {
                "sensor": "Sentinel-2 MultiSpectral Optical",
                "ndwi_index": 0.48,
                "inundation_area_sqkm": 14.5,
                "submerged_structures": 3,
                "resolution": "10m via Microsoft Planetary Computer",
                "detection_mask": "Agricultural Runoff (Low Threat)"
            },
            "iot_weather": {
                "metric_name": "Mahanadi Naraj Sluice Telemetry",
                "current_level": "26.40 m (Danger: 28.50 m)",
                "precipitation": "18.0 mm/hr",
                "wind_vector": "22 km/h S (180°)",
                "sparkline": [25.1, 25.4, 25.8, 26.1, 26.4, 26.6, 26.2],
                "timestamps": ["T-6h", "T-4h", "T-2h", "T-1h", "T-0", "T+2h", "T+4h"]
            },
            "nlp_text": {
                "source": "Odisha Disaster Rapid Action Force (ODRAF)",
                "raw_text": "Normal drainage discharge maintained. Sluice gates 12-24 fully functional.",
                "engine": "Microsoft Phi-3 Mini NLP Model",
                "extracted_entities": {
                    "trapped_persons": 0,
                    "structural_damage": "None Reported",
                    "rate_of_rise": "+3 cm/hr",
                    "urgency_score": "LOW (0.24)"
                }
            },
            "xai_attribution": {
                "satellite_mask": 30,
                "sensor_surge": 30,
                "nlp_reports": 20,
                "weather_inflow": 20
            },
            "uncertainty_assessment": {
                "score_pct": 14,
                "status": "Low Uncertainty (±5.7%)",
                "ood_flag": False,
                "note": "Telemetry within nominal non-flood parameters."
            }
        }
    )

    return [zone_1, zone_2, zone_3, zone_4]


def get_wildfire_disaster_zones() -> List[DisasterZone]:
    """Generates real-world Indian forest wildfire & smoke plume monitoring zones."""
    
    # Wildfire Zone 1: Bandipur Tiger Reserve & Wayanad Border (Karnataka / Kerala)
    zone_w1 = DisasterZone(
        zone_id="ZONE-KA-BANDIPUR-01",
        zone_name="Bandipur Tiger Reserve - Moyar Gorge",
        district="Chamarajanagar",
        state="Karnataka / Kerala Border",
        latitude=11.6664,
        longitude=76.6291,
        population_at_risk=18500,
        threat_score=92.4,
        threat_level=ThreatLevel.CRITICAL,
        uncertainty_margin=3.8,
        disaster_type=DisasterType.WILDFIRE,
        thermal_hotspots_count=48,
        pm25_aqi=385.0,
        wind_direction_deg=315.0,
        wind_speed_kmh=38.0,
        fire_spread_kmh=8.4,
        smoke_plume_coverage_sqkm=76.0,
        evacuation_status="IN_PROGRESS",
        fusion_details=MultimodalFusionResult(
            composite_threat_score=92.4,
            threat_level=ThreatLevel.CRITICAL,
            uncertainty_margin=3.8,
            confidence_score=0.96,
            modality_weights={"Thermal Satellite (VIIRS/MODIS)": 0.40, "PM2.5 & IoT Weather": 0.30, "Forest Ranger NLP": 0.20, "CartoDEM Fuel Slope": 0.10},
            primary_driver="High Fire Radiative Power (FRP 480MW) & Extreme PM2.5 (385 µg/m³)",
            out_of_distribution=False,
            human_review_required=True,
            evidence_breakdown=[
                "VIIRS 375m I-band detected 48 active thermal hotspots with Brightness Temp > 365K.",
                "Ambient air quality monitors recorded severe PM2.5 spike (385 µg/m³) with zero visibility.",
                "Dry wind gusts (38 km/h NW) driving flame front at 8.4 km/h toward human settlement perimeter."
            ]
        ),
        evidence_streams={
            "visual": {
                "sensor": "VIIRS 375m Thermal Infrared & Sentinel-2 NBR (Normalized Burn Ratio)",
                "ndwi_index": 0.12,
                "inundation_area_sqkm": 76.0,
                "submerged_structures": 14,
                "resolution": "375m Thermal via Microsoft Planetary Computer",
                "detection_mask": "Active Flame Front & Smoke Plume Perimeter (96% Confidence)"
            },
            "iot_weather": {
                "metric_name": "PM2.5 Particulate Density & Wind Vector",
                "current_level": "385 µg/m³ (Hazardous)",
                "precipitation": "0.0 mm/hr (Humidity: 14%)",
                "wind_vector": "38 km/h NW (315°)",
                "sparkline": [45, 95, 180, 260, 340, 385, 410],
                "timestamps": ["T-6h", "T-4h", "T-2h", "T-1h", "T-0", "T+2h", "T+4h"]
            },
            "nlp_text": {
                "source": "Karnataka Forest Dept High-Frequency Radio Dispatch",
                "raw_text": "CRITICAL: Crown fire breached fireline #3 at Gundre range. 12 tribal hamlet residents and 4 forest staff isolated near Moyar gorge.",
                "engine": "Microsoft Phi-3 Mini NLP Model",
                "extracted_entities": {
                    "trapped_persons": 16,
                    "structural_damage": "Firebreak Line #3 Breached",
                    "rate_of_spread": "8.4 km/hr Flame Front",
                    "urgency_score": "CRITICAL (0.97)"
                }
            },
            "xai_attribution": {
                "thermal_hotspot": 40,
                "pm25_weather": 30,
                "nlp_ranger_reports": 20,
                "cartodem_fuel_slope": 10
            },
            "uncertainty_assessment": {
                "score_pct": 11,
                "status": "Low Uncertainty (±3.8%)",
                "ood_flag": False,
                "note": "Thermal IR and Ground PM2.5 cross-confirmed flame propagation direction."
            }
        }
    )

    # Wildfire Zone 2: Simlipal Biosphere Reserve (Mayurbhanj - Odisha)
    zone_w2 = DisasterZone(
        zone_id="ZONE-OD-SIMLIPAL-02",
        zone_name="Simlipal Biosphere - Core Sal Forest",
        district="Mayurbhanj",
        state="Odisha",
        latitude=21.8670,
        longitude=86.3330,
        population_at_risk=12400,
        threat_score=84.6,
        threat_level=ThreatLevel.CRITICAL,
        uncertainty_margin=5.2,
        disaster_type=DisasterType.WILDFIRE,
        thermal_hotspots_count=32,
        pm25_aqi=290.0,
        wind_direction_deg=225.0,
        wind_speed_kmh=31.0,
        fire_spread_kmh=6.2,
        smoke_plume_coverage_sqkm=52.0,
        evacuation_status="PENDING",
        fusion_details=MultimodalFusionResult(
            composite_threat_score=84.6,
            threat_level=ThreatLevel.CRITICAL,
            uncertainty_margin=5.2,
            confidence_score=0.91,
            modality_weights={"Thermal Satellite (VIIRS/MODIS)": 0.38, "PM2.5 & IoT Weather": 0.32, "Forest Ranger NLP": 0.20, "CartoDEM Fuel Slope": 0.10},
            primary_driver="Dry Sal Leaf Litter Ignition & 31 km/h Convective Drafts",
            out_of_distribution=False,
            human_review_required=True,
            evidence_breakdown=[
                "VIIRS hotspot scan identified 32 ignition points along the southern core ridges.",
                "Forest IoT micro-stations report ambient temperatures of 43.5°C and 16% relative humidity.",
                "Dry leaf litter accumulation accelerating spread rate to 6.2 km/h."
            ]
        ),
        evidence_streams={
            "visual": {
                "sensor": "MODIS/VIIRS Active Fire Products",
                "ndwi_index": 0.15,
                "inundation_area_sqkm": 52.0,
                "submerged_structures": 8,
                "resolution": "375m VIIRS via Microsoft Planetary Computer",
                "detection_mask": "Core Ridge Ignition Mask (91% Confidence)"
            },
            "iot_weather": {
                "metric_name": "Ambient Temp & PM2.5 Inversion",
                "current_level": "290 µg/m³ (Severe)",
                "precipitation": "0.0 mm/hr",
                "wind_vector": "31 km/h SW (225°)",
                "sparkline": [35, 75, 140, 210, 290, 310, 280],
                "timestamps": ["T-6h", "T-4h", "T-2h", "T-1h", "T-0", "T+2h", "T+4h"]
            },
            "nlp_text": {
                "source": "Odisha Forest Rapid Response Unit",
                "raw_text": "Ground crews deployed with leaf blowers and water bowsers near Barehipani falls. Heavy smoke blanketing valley floor.",
                "engine": "Microsoft Phi-3 Mini NLP Model",
                "extracted_entities": {
                    "trapped_persons": 0,
                    "structural_damage": "Barehipani Ranger Outpost Threatened",
                    "rate_of_spread": "6.2 km/hr",
                    "urgency_score": "CRITICAL (0.86)"
                }
            },
            "xai_attribution": {
                "thermal_hotspot": 38,
                "pm25_weather": 32,
                "nlp_ranger_reports": 20,
                "cartodem_fuel_slope": 10
            },
            "uncertainty_assessment": {
                "score_pct": 22,
                "status": "Moderate Uncertainty (±5.2%)",
                "ood_flag": False,
                "note": "Smoke plume haze partially scattering optical bands; thermal IR calibrated."
            }
        }
    )

    # Wildfire Zone 3: Nilgiris Cloud Forest (Tamil Nadu)
    zone_w3 = DisasterZone(
        zone_id="ZONE-TN-NILGIRIS-03",
        zone_name="Nilgiri Biosphere - Mudumalai Flank",
        district="Nilgiris",
        state="Tamil Nadu",
        latitude=11.5623,
        longitude=76.5342,
        population_at_risk=8200,
        threat_score=68.2,
        threat_level=ThreatLevel.WARNING,
        uncertainty_margin=6.4,
        disaster_type=DisasterType.WILDFIRE,
        thermal_hotspots_count=14,
        pm25_aqi=180.0,
        wind_direction_deg=270.0,
        wind_speed_kmh=24.0,
        fire_spread_kmh=3.8,
        smoke_plume_coverage_sqkm=28.0,
        evacuation_status="PENDING",
        fusion_details=MultimodalFusionResult(
            composite_threat_score=68.2,
            threat_level=ThreatLevel.WARNING,
            uncertainty_margin=6.4,
            confidence_score=0.88,
            modality_weights={"Thermal Satellite": 0.35, "PM2.5 & Weather": 0.35, "NLP": 0.20, "Slope": 0.10},
            primary_driver="Grassland Understory Creeping Fire",
            out_of_distribution=False,
            human_review_required=False,
            evidence_breakdown=[
                "14 hotspots detected along Shola grassland fringe.",
                "Moderate PM2.5 levels (180 µg/m³) drifting eastward."
            ]
        ),
        evidence_streams={
            "visual": {
                "sensor": "Sentinel-2 MultiSpectral Burn Scar Index",
                "ndwi_index": 0.22,
                "inundation_area_sqkm": 28.0,
                "submerged_structures": 2,
                "resolution": "10m via Microsoft Planetary Computer",
                "detection_mask": "Grassland Flank Mask (88% Confidence)"
            },
            "iot_weather": {
                "metric_name": "Particulate PM2.5 & Humidity",
                "current_level": "180 µg/m³ (Moderate)",
                "precipitation": "0.0 mm/hr",
                "wind_vector": "24 km/h W (270°)",
                "sparkline": [30, 50, 90, 130, 180, 195, 170],
                "timestamps": ["T-6h", "T-4h", "T-2h", "T-1h", "T-0", "T+2h", "T+4h"]
            },
            "nlp_text": {
                "source": "Mudumalai Forest Checkpost",
                "raw_text": "Counter-burning initiated along perimeter road. No civilian casualties.",
                "engine": "Microsoft Phi-3 Mini NLP Model",
                "extracted_entities": {
                    "trapped_persons": 0,
                    "structural_damage": "None",
                    "rate_of_spread": "3.8 km/hr",
                    "urgency_score": "WARNING (0.68)"
                }
            },
            "xai_attribution": {
                "thermal_hotspot": 35,
                "pm25_weather": 35,
                "nlp_ranger_reports": 20,
                "cartodem_fuel_slope": 10
            },
            "uncertainty_assessment": {
                "score_pct": 28,
                "status": "High Uncertainty (±6.4% - Terrain Scattering)",
                "ood_flag": False,
                "note": "Steep valley topography creates optical occlusion."
            }
        }
    )

    return [zone_w1, zone_w2, zone_w3]

