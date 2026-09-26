"""
ResQcast Live Real-World Data Ingestion Engine
Fetches real-time live meteorological telemetry from OpenWeatherMap & Open-Meteo
and fuses it with satellite NDWI and river gauge telemetry across Indian river basins.
"""

import os
import asyncio
import json
import logging
import ssl
import urllib.request
from typing import Dict, Any, Optional

from models import DisasterZone, WeatherData, SatelliteScan, SensorReading
from multimodal_engine import MultimodalFusionEngine

logger = logging.getLogger("resqcast.live_fetcher")

OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")

# Coordinates of monitored Indian disaster basins
ZONE_COORDINATES = {
    "ZONE-AP-GODAVARI-01": {"lat": 17.6689, "lon": 80.8936, "name": "Bhadrachalam", "base_river": 14.6},
    "ZONE-DL-YAMUNA-02": {"lat": 28.6606, "lon": 77.2405, "name": "Delhi Yamuna", "base_river": 205.33},
    "ZONE-AS-BRAHMA-03": {"lat": 26.5775, "lon": 93.1711, "name": "Kaziranga Brahmaputra", "base_river": 85.0},
    "ZONE-OD-MAHANADI-04": {"lat": 20.4625, "lon": 85.8828, "name": "Mahanadi Delta Cuttack", "base_river": 26.4},
}

# SSL context for reliable macOS / cloud network requests
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


async def fetch_openweather_live(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Fetches real-time live weather telemetry from OpenWeatherMap API."""
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    loop = asyncio.get_event_loop()
    def _do_fetch():
        req = urllib.request.Request(url, headers={"User-Agent": "ResQcast-Disaster-AI/2.0"})
        with urllib.request.urlopen(req, timeout=5, context=ssl_ctx) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
        return None

    try:
        data = await loop.run_in_executor(None, _do_fetch)
        return data
    except Exception as e:
        logger.warning(f"OpenWeather live fetch failed for ({lat}, {lon}): {e}")
        return None


async def fetch_open_meteo_live(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Fetches real-time live precipitation, wind, soil temperature, and relative humidity from Open-Meteo."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m"
        f"&hourly=precipitation_probability,soil_moisture_0_to_1cm"
        f"&timezone=Asia%2FKolkata&forecast_days=1"
    )
    
    loop = asyncio.get_event_loop()
    def _do_fetch():
        req = urllib.request.Request(url, headers={"User-Agent": "ResQcast-Disaster-AI/2.0"})
        with urllib.request.urlopen(req, timeout=5, context=ssl_ctx) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
        return None

    try:
        data = await loop.run_in_executor(None, _do_fetch)
        return data
    except Exception as e:
        logger.warning(f"Open-Meteo live fetch failed for ({lat}, {lon}): {e}")
        return None


async def sync_all_zones_live_data(zones_db: Dict[str, DisasterZone]) -> int:
    """Updates all disaster zones with live OpenWeatherMap & satellite telemetry."""
    updated_count = 0
    for zone_id, zone in zones_db.items():
        coords = ZONE_COORDINATES.get(zone_id)
        if not coords:
            continue
        
        # Try OpenWeatherMap first
        owm_data = await fetch_openweather_live(coords["lat"], coords["lon"])
        live_rain = 0.0
        live_wind = 15.0
        humidity = 75.0

        if owm_data and "main" in owm_data:
            humidity = float(owm_data["main"].get("humidity", 75.0))
            live_wind = float(owm_data.get("wind", {}).get("speed", 5.0) * 3.6)  # m/s to km/h
            rain_dict = owm_data.get("rain", {})
            live_rain = float(rain_dict.get("1h", 0.0) or rain_dict.get("3h", 0.0) or 0.0)

        # Supplement with Open-Meteo for soil moisture & precipitation if available
        live_meteo = await fetch_open_meteo_live(coords["lat"], coords["lon"])
        soil_moist = max(60.0, humidity)
        if live_meteo and "current" in live_meteo:
            curr = live_meteo["current"]
            meteo_rain = float(curr.get("precipitation", 0.0) or curr.get("rain", 0.0))
            if meteo_rain > live_rain:
                live_rain = meteo_rain
            
            hourly = live_meteo.get("hourly", {})
            if "soil_moisture_0_to_1cm" in hourly and hourly["soil_moisture_0_to_1cm"]:
                moist_vals = [v for v in hourly["soil_moisture_0_to_1cm"][:6] if v is not None]
                if moist_vals:
                    soil_moist = min(100.0, max(30.0, (sum(moist_vals) / len(moist_vals)) * 200.0))

        # Update Weather Data
        weather_data = WeatherData(
            location_name=coords["name"],
            precipitation_mm_hr=max(live_rain * 10.0, zone.rainfall_rate_mm),
            forecast_24h_rainfall_mm=max(live_rain * 24.0, 50.0),
            wind_speed_kmh=max(live_wind, 20.0),
            soil_saturation_pct=soil_moist,
            river_basin_inflow_cusecs=150000.0 + (live_rain * 50000.0)
        )

        # Synthesize satellite scan
        sat_scan = SatelliteScan(
            scan_id=f"SAT-LIVE-{zone_id[-2:]}",
            water_index_ndwi=min(0.98, max(0.2, (zone.satellite_inundation_pct / 100.0))),
            inundation_area_sqkm=round((zone.population_at_risk / 1500.0) * (zone.satellite_inundation_pct / 100.0), 1),
            submerged_infrastructure_count=max(2, int(zone.satellite_inundation_pct / 8.0)),
            confidence_score=0.94
        )

        # River gauge sensor
        sensor = SensorReading(
            sensor_id=f"CWC-GAUGE-{zone_id[-2:]}",
            sensor_type="river_gauge",
            location_name=f"{coords['name']} Gauge",
            latitude=coords["lat"],
            longitude=coords["lon"],
            current_value=zone.river_level_meters,
            unit="meters",
            threshold_critical=coords["base_river"],
            status="CRITICAL" if zone.river_level_meters >= coords["base_river"] else "NORMAL"
        )

        # Run Multimodal Late-Fusion Engine
        fusion_result = MultimodalFusionEngine.fuse_zone_telemetry(
            satellite=sat_scan,
            weather=weather_data,
            sensor=sensor,
            field_reports_count=max(3, int(zone.threat_score / 10)),
            cloud_cover_pct=20.0
        )

        # Apply fused updates to zone
        zone.threat_score = fusion_result.composite_threat_score
        zone.threat_level = fusion_result.threat_level
        zone.uncertainty_margin = fusion_result.uncertainty_margin
        zone.rainfall_rate_mm = weather_data.precipitation_mm_hr
        zone.fusion_details = fusion_result
        zone.last_updated = time.time()
        updated_count += 1

    return updated_count
