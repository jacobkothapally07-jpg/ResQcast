# 🛡️ RakshaCast-Forge | Multimodal AI Disaster Intelligence Platform

> **Microsoft HackForge 2026 — Problem Statement 2 Submission**  
> *Real-Time Multimodal Fusion of Satellite Imagery, Weather Radars, IoT River Gauges, and Citizen SOS Streams with Uncertainty Quantification.*

---

## 🌟 1. System Overview & Core Capabilities

When disasters like flash floods or wildfires strike, emergency rescue coordinators are overwhelmed with fragmented, conflicting data:
* Satellite optical passes are obscured by cloud cover.
* River gauge sensors give point measurements without spatial extent.
* Weather radars provide leading indicators without ground truth.

**RakshaCast-Forge solves this by delivering an end-to-end Multimodal AI Decision-Support Platform:**
1. **Multimodal Late-Fusion AI:** Dynamically combines Satellite SAR/Optical features (35%), Weather precipitation forecasts (25%), Ground IoT river gauges (25%), and Citizen SOS triage (15%).
2. **Dynamic Modality Reliability Weighting:** Automatically detects cloud cover (>60%) and shifts weights to ground IoT telemetry and radar.
3. **Uncertainty Quantification ($\pm \delta$):** Displays calibrated uncertainty margins (e.g. *88% Threat ± 4.5%*) and flags Out-of-Distribution (OOD) cases for mandatory human verification before dispatch.
4. **Interactive GIS & Disaster Progression Scrubber (T-0 to T+24h):** Visualizes spatial flood crests, inundated infrastructure, and receding floodwaters over time on Leaflet GIS.
5. **Prioritized Human Operator Review Queue:** Actionable triage list with 1-click NDRF Water Rescue dispatch and automated Cell-Broadcast SMS triggers.

---

## 📐 2. The Multimodal Fusion Formula

For any geographic sector $z$, RakshaCast-Forge calculates the Composite Threat Score $S(z) \in [0, 100]$:

$$S(z) = w_{\text{sat}} \cdot S_{\text{satellite}} + w_{\text{weather}} \cdot S_{\text{weather}} + w_{\text{iot}} \cdot S_{\text{iot}} + w_{\text{field}} \cdot S_{\text{field}}$$

### **Dynamic Weighting & Uncertainty Calibration:**
* **Epistemic Uncertainty ($\pm \delta$):** Calculated from the variance among modality signals:
  $$\sigma = \sqrt{\frac{1}{N} \sum_{i=1}^N (S_i - \bar{S})^2}, \quad \text{Margin} = \min(12.5\%, \max(1.8\%, 0.25\sigma + 10(1 - C_{\text{sat}})))$$
* **Out-of-Distribution (OOD) Guardrail:** If $|S_{\text{satellite}} - S_{\text{iot}}| > 55.0$, the system flags a mandatory **Human Review Gate** to prevent false evacuations caused by sensor drift or cloud shadows.

---

## 🚀 3. Quick Launch & Local Execution

```bash
# Clone & Enter Directory
cd rakshacast-forge

# Run Automated Test Suite & Launch Server
./run.sh
```

* **Dashboard URL:** `http://localhost:8080`
* **Real-Time WebSocket Feed:** `ws://localhost:8080/ws`
* **REST API OpenAPI Docs:** `http://localhost:8080/docs`

---

## 📡 4. Live Data Ingestion for Judges' Evaluation

To feed live data during the hackathon judging round:

### Case A: Live API Stream URL
```bash
python3 live_disaster_ingest.py "https://api.judges.com/disaster-stream"
```

### Case B: Replay Dataset File
```bash
python3 live_disaster_ingest.py --file disaster_sample.json
```

### Case C: Direct HTTP Webhook
```bash
curl -X POST http://localhost:8080/api/disaster/events \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": "ZONE-AP-GODAVARI-01",
    "precipitation_mm_hr": 95.0,
    "river_level_meters": 18.2,
    "inundation_pct": 86.0
  }'
```
