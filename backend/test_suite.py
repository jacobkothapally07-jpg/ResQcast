"""
RakshaCast-Forge Automated Evaluation & Verification Test Suite
Verifies Multimodal Fusion Weights, Epistemic Uncertainty Bounds, and REST APIs.
"""

import unittest
from models import SatelliteScan, WeatherData, SensorReading, ThreatLevel
from multimodal_engine import MultimodalFusionEngine, DisasterTimelineSimulator


class TestMultimodalFusion(unittest.TestCase):

    def setUp(self):
        self.sat_high = SatelliteScan(
            scan_id="TEST-SAT-01",
            water_index_ndwi=0.85,
            inundation_area_sqkm=35.0,
            submerged_infrastructure_count=10,
            confidence_score=0.95
        )
        self.weather_high = WeatherData(
            location_name="Test Basin",
            precipitation_mm_hr=75.0,
            forecast_24h_rainfall_mm=180.0,
            wind_speed_kmh=40.0,
            soil_saturation_pct=90.0,
            river_basin_inflow_cusecs=1500000.0
        )
        self.sensor_critical = SensorReading(
            sensor_id="TEST-GAUGE-01",
            sensor_type="river_gauge",
            location_name="Test Bridge",
            latitude=17.5,
            longitude=80.5,
            current_value=16.5,
            unit="m",
            threshold_critical=14.0,
            status="CRITICAL"
        )

    def test_01_critical_threat_fusion(self):
        """Test that high rainfall + breached gauge + high NDWI produces CRITICAL threat."""
        res = MultimodalFusionEngine.fuse_zone_telemetry(
            self.sat_high, self.weather_high, self.sensor_critical, field_reports_count=10
        )
        self.assertGreaterEqual(res.composite_threat_score, 75.0)
        self.assertEqual(res.threat_level, ThreatLevel.CRITICAL)
        self.assertGreater(len(res.evidence_breakdown), 0)

    def test_02_cloud_cover_weight_shift(self):
        """Test that high cloud cover shifts weight away from optical satellite to IoT/Weather."""
        res_cloudy = MultimodalFusionEngine.fuse_zone_telemetry(
            self.sat_high, self.weather_high, self.sensor_critical, cloud_cover_pct=85.0
        )
        self.assertLess(res_cloudy.modality_weights["satellite"], 0.25)
        self.assertGreater(res_cloudy.modality_weights["iot_sensors"], 0.30)

    def test_03_uncertainty_quantification_bounds(self):
        """Test that epistemic uncertainty margin stays within calibrated 1.8% - 12.5% bounds."""
        res = MultimodalFusionEngine.fuse_zone_telemetry(
            self.sat_high, self.weather_high, self.sensor_critical
        )
        self.assertGreaterEqual(res.uncertainty_margin, 1.8)
        self.assertLessEqual(res.uncertainty_margin, 12.5)
        self.assertGreaterEqual(res.confidence_score, 0.60)

    def test_04_timeline_progression(self):
        """Test that disaster progression correctly forecasts flood surge and receding steps."""
        from simulation import get_default_disaster_zones
        zone = get_default_disaster_zones()[0]
        
        peak_forecast = DisasterTimelineSimulator.forecast_zone_progression(zone, hours_ahead=6)
        self.assertGreaterEqual(peak_forecast["forecast_threat_score"], zone.threat_score)
        
        receding_forecast = DisasterTimelineSimulator.forecast_zone_progression(zone, hours_ahead=24)
        self.assertLess(receding_forecast["forecast_threat_score"], peak_forecast["forecast_threat_score"])


if __name__ == "__main__":
    unittest.main()
