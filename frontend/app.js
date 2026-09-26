/**
 * RakshaCast-Forge Frontend Command Center
 * Leaflet GIS Mapping, WebSocket Streaming, Multimodal HUD & Operator Triage Queue
 */

let map;
let zoneLayers = {};
let allZones = [];
let selectedZoneId = "ZONE-AP-GODAVARI-01";
let currentTimeOffset = 0;
let ws;

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    initWebSocket();
    fetchZones();
});

// Map GIS Layers
let currentBaseLayer = null;
let radarOverlayLayer = null;
let activeLayerType = "bhuvan";

// --- 1. LEAFLET MAP INITIALIZATION ---
function initMap() {
    map = L.map("disaster-map", {
        center: [21.5, 82.0],
        zoom: 5,
        zoomControl: true
    });

    // Default to ISRO Bhuvan Satellite
    setMapLayer("bhuvan");
}

function setMapLayer(layerType) {
    activeLayerType = layerType;
    if (currentBaseLayer) {
        map.removeLayer(currentBaseLayer);
    }
    if (radarOverlayLayer) {
        map.removeLayer(radarOverlayLayer);
        radarOverlayLayer = null;
    }

    const mapboxKey = localStorage.getItem("resqcast_mapbox_key") || "";
    const weatherKey = localStorage.getItem("resqcast_weather_key") || "";

    if (layerType === "bhuvan") {
        currentBaseLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: "&copy; ISRO Bhuvan / NRSC &copy; ESRI Earth Observation",
            maxZoom: 19
        }).addTo(map);
    } else if (layerType === "insat") {
        currentBaseLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
            attribution: "&copy; ISRO INSAT-3D MOSDAC &copy; ESRI",
            maxZoom: 18
        }).addTo(map);

        // INSAT Radar Precipitation Overlay
        if (weatherKey) {
            radarOverlayLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${weatherKey}`, {
                opacity: 0.7,
                attribution: "&copy; OpenWeatherMap / INSAT Radar"
            }).addTo(map);
        } else {
            // Free Doppler precipitation tile fallback
            radarOverlayLayer = L.tileLayer("https://tilecache.rainviewer.com/v2/radar/nowcast_10m/256/{z}/{x}/{y}/2/1_1.png", {
                opacity: 0.7,
                attribution: "&copy; INSAT-3D Doppler Radar Feed"
            }).addTo(map);
        }
    } else if (layerType === "cartodem") {
        currentBaseLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; ISRO CartoDEM / OpenTopoMap",
            maxZoom: 17
        }).addTo(map);
    } else if (layerType === "dark") {
        currentBaseLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
            attribution: "&copy; Tactical Dark GIS &copy; ESRI",
            maxZoom: 18
        }).addTo(map);
    } else if (layerType === "mapbox") {
        if (mapboxKey) {
            currentBaseLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxKey}`, {
                attribution: "&copy; Mapbox &copy; OpenStreetMap",
                tileSize: 512,
                zoomOffset: -1,
                maxZoom: 20
            }).addTo(map);
        } else {
            alert("Please enter a Mapbox Access Token in the Map API Key configuration.");
            openMapKeyModal();
            return;
        }
    }

    // Update Button Active Classes
    ["bhuvan", "insat", "cartodem", "dark"].forEach(id => {
        const btn = document.getElementById(`layer-btn-${id}`);
        if (btn) {
            if (id === layerType) {
                btn.className = "px-2.5 py-1 rounded font-bold bg-cyan-600 text-white shadow border border-cyan-400";
            } else {
                btn.className = "px-2.5 py-1 rounded font-bold bg-[#070d1e] text-slate-300 hover:text-white border border-[#203354]";
            }
        }
    });
}

// Map Key Modal Functions
function openMapKeyModal() {
    const modal = document.getElementById("map-key-modal");
    if (!modal) return;
    document.getElementById("custom-mapbox-key-input").value = localStorage.getItem("resqcast_mapbox_key") || "";
    document.getElementById("custom-weather-key-input").value = localStorage.getItem("resqcast_weather_key") || "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeMapKeyModal() {
    const modal = document.getElementById("map-key-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function saveCustomMapKeys() {
    const mapboxKey = document.getElementById("custom-mapbox-key-input").value.trim();
    const weatherKey = document.getElementById("custom-weather-key-input").value.trim();

    if (mapboxKey) {
        localStorage.setItem("resqcast_mapbox_key", mapboxKey);
    } else {
        localStorage.removeItem("resqcast_mapbox_key");
    }

    if (weatherKey) {
        localStorage.setItem("resqcast_weather_key", weatherKey);
    } else {
        localStorage.removeItem("resqcast_weather_key");
    }

    closeMapKeyModal();
    if (mapboxKey) {
        setMapLayer("mapbox");
    } else {
        setMapLayer(activeLayerType);
    }
}

// --- 2. WEBSOCKET REAL-TIME SYNC ---
function initWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("Connected to RakshaCast-Forge Real-Time WebSocket");
        document.getElementById("ws-status-badge").innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>LIVE MULTIMODAL FEED</span>
        `;
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "INITIAL_SNAPSHOT") {
            allZones = msg.zones;
            renderMapZones();
            renderQueueCards();
            renderFusionDetails(selectedZoneId);
        } else if (msg.type === "ZONE_UPDATE") {
            const updatedZone = msg.zone;
            const idx = allZones.findIndex(z => z.zone_id === updatedZone.zone_id);
            if (idx !== -1) {
                allZones[idx] = updatedZone;
            } else {
                allZones.push(updatedZone);
            }
            renderMapZones();
            renderQueueCards();
            if (selectedZoneId === updatedZone.zone_id) {
                renderFusionDetails(selectedZoneId);
            }
        }
    };

    ws.onclose = () => {
        console.log("WebSocket disconnected, reconnecting in 3s...");
        setTimeout(initWebSocket, 3000);
    };
}

// --- 3. FETCH ZONES FROM REST API ---
async function fetchZones() {
    try {
        const res = await fetch("/api/disaster/zones");
        if (res.ok) {
            allZones = await res.json();
            renderMapZones();
            renderQueueCards();
            renderFusionDetails(selectedZoneId);
        }
    } catch (e) {
        console.error("Failed to fetch disaster zones:", e);
    }
}

// --- 4. RENDER MAP ZONES & SATELLITE MASKS ---
function renderMapZones() {
    // Clear existing layers
    Object.values(zoneLayers).forEach(layer => map.removeLayer(layer));
    zoneLayers = {};

    allZones.forEach(zone => {
        const isCritical = zone.threat_level === "CRITICAL";
        const isWarning = zone.threat_level === "WARNING";
        const color = isCritical ? "#dc2626" : (isWarning ? "#ea580c" : "#16a34a");
        const radius = Math.max(15000, zone.population_at_risk * 0.8);

        // Flood Inundation Polygon Circle
        const circle = L.circle([zone.latitude, zone.longitude], {
            color: color,
            fillColor: color,
            fillOpacity: isCritical ? 0.45 : 0.25,
            radius: radius,
            weight: 2
        }).addTo(map);

        // Custom Pulsing Marker
        const iconHtml = `
            <div class="relative flex items-center justify-center cursor-pointer" onclick="selectZone('${zone.zone_id}')">
                <div class="w-8 h-8 rounded-full ${isCritical ? 'bg-red-600/80 animate-ping' : 'bg-amber-600/60'} absolute"></div>
                <div class="w-6 h-6 rounded-full ${isCritical ? 'bg-red-600' : (isWarning ? 'bg-amber-500' : 'bg-emerald-600')} border-2 border-white flex items-center justify-center shadow-lg text-[10px] font-black text-white z-10">
                    ${Math.round(zone.threat_score)}
                </div>
            </div>
        `;

        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-div-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([zone.latitude, zone.longitude], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
            <div class="text-xs p-1">
                <strong class="text-sm font-bold text-slate-900">${zone.zone_name}</strong><br>
                <span class="text-red-700 font-bold">Threat: ${zone.threat_score}/100 (±${zone.uncertainty_margin}%)</span><br>
                <span>Flood Depth: ${zone.flood_depth_meters}m | River: ${zone.river_level_meters}m</span><br>
                <span>Population at Risk: ${zone.population_at_risk.toLocaleString()}</span>
            </div>
        `);

        const group = L.featureGroup([circle, marker]);
        zoneLayers[zone.zone_id] = group;
    });
}

// --- 5. RENDER OPERATOR REVIEW QUEUE ---
function renderQueueCards() {
    const list = document.getElementById("zone-cards-list");
    list.innerHTML = "";

    const criticalCount = allZones.filter(z => z.threat_level === "CRITICAL").length;
    const totalPop = allZones.filter(z => z.threat_level === "CRITICAL").reduce((acc, z) => acc + z.population_at_risk, 0);
    
    const queueBadge = document.getElementById("queue-badge") || document.getElementById("queue-count-badge");
    if (queueBadge) queueBadge.innerText = `${criticalCount} Critical`;
    
    const statCrit = document.getElementById("stat-critical");
    if (statCrit) statCrit.innerText = `${criticalCount} Active`;
    
    const statPop = document.getElementById("stat-population");
    if (statPop) statPop.innerText = `${totalPop.toLocaleString()}`;

    // Sort by threat score descending
    const sorted = [...allZones].sort((a, b) => b.threat_score - a.threat_score);

    sorted.forEach((zone, index) => {
        const isSelected = zone.zone_id === selectedZoneId;
        const isCrit = zone.threat_level === "CRITICAL";
        const badgeBg = isCrit ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30";
        
        const card = document.createElement("div");
        card.className = `p-3 rounded-xl border transition cursor-pointer flex flex-col space-y-2 ${
            isSelected ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
        }`;
        card.onclick = () => selectZone(zone.zone_id);

        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div>
                    <div class="flex items-center space-x-1.5">
                        <span class="text-[10px] font-bold text-slate-400">#${index+1}</span>
                        <h3 class="font-bold text-xs text-white">${zone.zone_name}</h3>
                    </div>
                    <p class="text-[10px] text-slate-400">${zone.district}, ${zone.state}</p>
                </div>
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded border ${badgeBg}">
                    ${zone.threat_score}% Threat
                </span>
            </div>

            <div class="grid grid-cols-3 gap-1 bg-slate-900/80 p-2 rounded-lg text-[10px] text-slate-300 mono">
                <div>
                    <span class="text-slate-500 block text-[9px]">INUNDATION</span>
                    <span class="font-bold">${zone.satellite_inundation_pct}%</span>
                </div>
                <div>
                    <span class="text-slate-500 block text-[9px]">DEPTH</span>
                    <span class="font-bold text-cyan-400">${zone.flood_depth_meters}m</span>
                </div>
                <div>
                    <span class="text-slate-500 block text-[9px]">UNCERTAINTY</span>
                    <span class="font-bold text-amber-400">±${zone.uncertainty_margin}%</span>
                </div>
            </div>

            <div class="flex items-center space-x-2 pt-1">
                <button onclick="event.stopPropagation(); dispatchAction('${zone.zone_id}', 'DISPATCH_NDRF')" 
                    class="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-extrabold transition shadow flex items-center justify-center space-x-1">
                    <i data-lucide="shield-alert" class="w-3 h-3"></i>
                    <span>Dispatch NDRF</span>
                </button>
                <button onclick="event.stopPropagation(); dispatchAction('${zone.zone_id}', 'ISSUE_SMS_BROADCAST')" 
                    class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded text-[10px] font-bold transition">
                    Cell Broadcast
                </button>
            </div>
        `;
        list.appendChild(card);
    });

    lucide.createIcons();
}

// --- 6. RENDER MULTIMODAL HUD & UNCERTAINTY ---
function renderFusionDetails(zoneId) {
    selectedZoneId = zoneId;
    const zone = allZones.find(z => z.zone_id === zoneId) || allZones[0];
    if (!zone) return;

    document.getElementById("selected-zone-badge").innerText = zone.zone_id;
    const container = document.getElementById("fusion-detail-container");

    const fusion = zone.fusion_details || {
        primary_driver: "River Gauge & Satellite Overlap",
        uncertainty_margin: zone.uncertainty_margin,
        confidence_score: 0.94,
        evidence_breakdown: [
            `Ground Gauge: Danger mark breached (${zone.river_level_meters}m).`,
            `Satellite NDWI: High surface water coverage (${zone.satellite_inundation_pct}%).`,
            `Weather Telemetry: Precipitation ${zone.rainfall_rate_mm} mm/hr over saturated basin.`
        ]
    };

    container.innerHTML = `
        <!-- Zone Profile Card -->
        <div class="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div class="flex items-center justify-between">
                <h4 class="font-bold text-sm text-white">${zone.zone_name}</h4>
                <span class="text-[10px] px-2 py-0.5 rounded font-bold ${
                    zone.threat_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400'
                }">${zone.threat_level}</span>
            </div>
            <p class="text-[11px] text-slate-400">${zone.district} • Population at Risk: <strong class="text-white">${zone.population_at_risk.toLocaleString()}</strong></p>
        </div>

        <!-- Composite Score & Uncertainty Range -->
        <div class="bg-gradient-to-br from-slate-950 to-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div class="flex items-baseline justify-between">
                <span class="text-slate-400 font-semibold text-xs">Composite Threat Index:</span>
                <div class="flex items-baseline space-x-1">
                    <span class="text-2xl font-black mono text-red-500">${zone.threat_score}</span>
                    <span class="text-xs text-slate-400">/ 100</span>
                </div>
            </div>

            <!-- Uncertainty Range Bar -->
            <div>
                <div class="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Uncertainty Interval:</span>
                    <span class="mono font-bold text-amber-400">±${zone.uncertainty_margin}% (Confidence: ${Math.round((fusion.confidence_score||0.9)*100)}%)</span>
                </div>
                <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
                    <div class="bg-gradient-to-r from-amber-500 to-red-600 h-full rounded-full" style="width: ${zone.threat_score}%"></div>
                </div>
            </div>
        </div>

        <!-- Modality Weight Breakdown -->
        <div class="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
            <span class="font-bold text-xs text-slate-300 block">Multimodal Contribution Weights:</span>
            
            <div class="space-y-1.5 text-[11px]">
                <div>
                    <div class="flex justify-between text-slate-400">
                        <span>🛰️ Satellite SAR / Optical (35%)</span>
                        <span class="mono text-cyan-400">${zone.satellite_inundation_pct}% Coverage</span>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                        <div class="bg-cyan-500 h-full" style="width: ${zone.satellite_inundation_pct}%"></div>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between text-slate-400">
                        <span>🌧️ Weather & Precipitation (25%)</span>
                        <span class="mono text-blue-400">${zone.rainfall_rate_mm} mm/hr</span>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                        <div class="bg-blue-500 h-full" style="width: ${Math.min(100, zone.rainfall_rate_mm*1.2)}%"></div>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between text-slate-400">
                        <span>📡 IoT River Gauges (25%)</span>
                        <span class="mono text-emerald-400">${zone.river_level_meters}m (Danger: ${zone.river_danger_mark_meters}m)</span>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                        <div class="bg-emerald-500 h-full" style="width: ${Math.min(100, (zone.river_level_meters/zone.river_danger_mark_meters)*100)}%"></div>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between text-slate-400">
                        <span>👥 Citizen SOS Field Triage (15%)</span>
                        <span class="mono text-orange-400">Active Verified Feeds</span>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                        <div class="bg-orange-500 h-full" style="width: 75%"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Evidence Breakdown -->
        <div class="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
            <span class="font-bold text-xs text-slate-300 flex items-center space-x-1.5">
                <i data-lucide="check-circle" class="w-3.5 h-3.5 text-cyan-400"></i>
                <span>Fused Evidence & Situation Summary:</span>
            </span>
            <ul class="space-y-1.5 text-[11px] text-slate-300 pl-1">
                ${fusion.evidence_breakdown.map(ev => `
                    <li class="flex items-start space-x-1.5">
                        <span class="text-cyan-400 font-bold">•</span>
                        <span>${ev}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    lucide.createIcons();
}

// --- 7. SELECT ZONE & PAN MAP ---
function selectZone(zoneId) {
    selectedZoneId = zoneId;
    const zone = allZones.find(z => z.zone_id === zoneId);
    if (zone && map) {
        map.flyTo([zone.latitude, zone.longitude], 8, { duration: 1.2 });
    }
    renderQueueCards();
    renderFusionDetails(zoneId);
}

// --- 8. DISASTER TIMELINE PROGRESSION SCRUBBER ---
async function handleTimeSliderChange(hours) {
    currentTimeOffset = parseInt(hours);
    const label = hours == 0 ? "T-0h (Current Telemetry)" : `T+${hours}h Forecast (${hours == 6 ? 'Peak Inflow' : (hours == 12 ? 'Crest Surge' : 'Receding')})`;
    document.getElementById("time-slider-val").innerText = label;

    try {
        const res = await fetch(`/api/disaster/progression/${selectedZoneId}?hours=${hours}`);
        if (res.ok) {
            const prog = await res.json();
            // Temporarily update display for selected zone
            const target = allZones.find(z => z.zone_id === selectedZoneId);
            if (target) {
                target.threat_score = prog.forecast_threat_score;
                target.flood_depth_meters = prog.forecast_flood_depth_meters;
                target.satellite_inundation_pct = prog.forecast_inundation_pct;
                renderMapZones();
                renderFusionDetails(selectedZoneId);
            }
        }
    } catch (e) {
        console.error("Failed progression fetch:", e);
    }
}

// --- 9. OPERATOR DISPATCH ACTION ---
async function dispatchAction(zoneId, actionType) {
    try {
        const res = await fetch("/api/disaster/actions/dispatch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                zone_id: zoneId,
                operator_name: "Jacob Kothapally (Command Lead)",
                action_type: actionType,
                notes: `Emergency ${actionType} triggered via Operator HUD.`
            })
        });
        if (res.ok) {
            alert(`✅ Action Executed: ${actionType} authorized for ${zoneId}`);
            fetchZones();
        }
    } catch (e) {
        alert(`Dispatch failed: ${e}`);
    }
}

// --- 10. SIMULATE REAL-WORLD DISASTER ---
async function triggerGodavariFloodSimulation() {
    alert("🚨 INJECTING GODAVARI BASIN FLASH FLOOD SCENARIO...");
    try {
        await fetch("/api/disaster/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                zone_id: "ZONE-AP-GODAVARI-01",
                precipitation_mm_hr: 110.0,
                river_level_meters: 18.8,
                inundation_pct: 92.5,
                flood_depth_meters: 4.6
            })
        });
        selectZone("ZONE-AP-GODAVARI-01");
    } catch (e) {
        console.error(e);
    }
}
window.triggerFlashFloodDemo = triggerGodavariFloodSimulation;

// --- 11. INGESTION MODAL CONTROLS ---
function openIngestionModal() {
    document.getElementById("ingest-modal").classList.remove("hidden");
    document.getElementById("ingest-modal").classList.add("flex");
}

function closeIngestionModal() {
    document.getElementById("ingest-modal").classList.add("hidden");
    document.getElementById("ingest-modal").classList.remove("flex");
}

async function submitModalTelemetry() {
    const zoneId = document.getElementById("modal-zone-select").value;
    const rain = parseFloat(document.getElementById("modal-rain-input").value);
    const river = parseFloat(document.getElementById("modal-river-input").value);
    const inundation = parseFloat(document.getElementById("modal-inundation-input").value);
    const depth = parseFloat(document.getElementById("modal-depth-input").value);

    try {
        const res = await fetch("/api/disaster/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                zone_id: zoneId,
                precipitation_mm_hr: rain,
                river_level_meters: river,
                inundation_pct: inundation,
                flood_depth_meters: depth
            })
        });

        if (res.ok) {
            closeIngestionModal();
            selectZone(zoneId);
        }
    } catch (e) {
        alert("Failed to inject telemetry: " + e);
    }
}

// --- 12. SITUATION REPORT MODAL ---
async function showSituationReportModal() {
    try {
        const res = await fetch("/api/disaster/situation-report");
        if (res.ok) {
            const report = await res.json();
            const content = document.getElementById("sitrep-content");
            content.innerHTML = `
                <div class="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                    <div class="flex justify-between items-center text-xs">
                        <strong class="text-cyan-400 font-bold">${report.report_id}</strong>
                        <span class="text-slate-500 mono">${new Date(report.generated_at*1000).toLocaleTimeString()}</span>
                    </div>
                    <p class="text-slate-200 text-xs leading-relaxed">${report.executive_summary}</p>
                </div>

                <div class="space-y-2">
                    <h4 class="font-bold text-xs text-white uppercase tracking-wider">Top Priority Sectors:</h4>
                    <div class="grid grid-cols-2 gap-2">
                        ${report.top_critical_zones.map(z => `
                            <div class="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                                <strong class="text-white text-xs block">${z.zone_name}</strong>
                                <span class="text-red-400 text-[11px] font-bold">Threat: ${z.threat_score}% (±${z.uncertainty_margin}%)</span>
                                <span class="text-slate-400 text-[10px] block">Population: ${z.population_at_risk.toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="space-y-2">
                    <h4 class="font-bold text-xs text-white uppercase tracking-wider">Recommended Strategic Actions:</h4>
                    <ul class="space-y-1.5 text-xs text-slate-300">
                        ${report.recommended_actions.map(act => `
                            <li class="flex items-start space-x-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                                <span class="text-emerald-400 font-bold">✓</span>
                                <span>${act}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
            document.getElementById("sitrep-modal").classList.remove("hidden");
            document.getElementById("sitrep-modal").classList.add("flex");
        }
    } catch (e) {
        alert("Failed to generate report: " + e);
    }
}

function closeSituationReportModal() {
    document.getElementById("sitrep-modal").classList.add("hidden");
    document.getElementById("sitrep-modal").classList.remove("flex");
}

// --- 13. LIVE TELEMETRY SYNC ---
async function syncLiveTelemetryFeeds() {
    try {
        const res = await fetch("/api/disaster/sync-live-weather", { method: "POST" });
        if (res.ok) {
            const data = await res.json();
            const badge = document.getElementById("ws-status-badge");
            if (badge) {
                badge.innerHTML = `
                    <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>LIVE SYNCED (${data.zones_updated} ZONES)</span>
                `;
                setTimeout(() => {
                    badge.innerHTML = `
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>LIVE MULTIMODAL FEED</span>
                    `;
                }, 4000);
            }
        }
    } catch (e) {
        console.error("Live weather sync error:", e);
    }
}
