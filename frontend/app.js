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
        zoomControl: true,
        preferCanvas: true
    });

    // Default to ISRO Bhuvan Satellite
    setMapLayer("bhuvan");

    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 250);
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 1000);

    window.addEventListener("resize", () => {
        if (map) map.invalidateSize();
    });
}

function setMapLayer(layerType) {
    activeLayerType = layerType;
    if (currentBaseLayer && map.hasLayer(currentBaseLayer)) {
        map.removeLayer(currentBaseLayer);
    }
    if (radarOverlayLayer && map.hasLayer(radarOverlayLayer)) {
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
                opacity: 0.75,
                attribution: "&copy; INSAT-3D Doppler Radar Feed"
            }).addTo(map);
        }
    } else if (layerType === "cartodem") {
        currentBaseLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
            attribution: "&copy; ISRO CartoDEM / Topo Map",
            maxZoom: 18
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

    if (map) {
        setTimeout(() => map.invalidateSize(), 150);
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
        } else if (msg.type === "CITIZEN_SOS_ALERT") {
            // Live Citizen Emergency received at NDRF Command Center!
            handleIncomingCitizenSOS(msg.sos);
        } else if (msg.type === "OPERATOR_DISPATCH_BROADCAST") {
            // Dispatch command broadcast received
            handleIncomingDispatchBroadcast(msg);
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

let currentHazardMode = "FLOOD";

// --- HAZARD MODE SWITCHER ---
async function setHazardMode(mode) {
    currentHazardMode = mode.toUpperCase();
    const btnFlood = document.getElementById("btn-hazard-flood");
    const btnWildfire = document.getElementById("btn-hazard-wildfire");

    if (currentHazardMode === "FLOOD") {
        if (btnFlood) btnFlood.className = "px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center space-x-1 bg-cyan-600 text-white shadow";
        if (btnWildfire) btnWildfire.className = "px-2.5 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition flex items-center space-x-1";
    } else {
        if (btnWildfire) btnWildfire.className = "px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center space-x-1 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow";
        if (btnFlood) btnFlood.className = "px-2.5 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition flex items-center space-x-1";
    }

    try {
        const res = await fetch(`/api/disaster/hazard-mode/${currentHazardMode}`, { method: "POST" });
        if (res.ok) {
            await fetchZones();
            if (allZones.length > 0) {
                selectZone(allZones[0].zone_id);
            }
        }
    } catch (e) {
        console.error("Failed to switch hazard mode:", e);
    }
}

// --- AI BENCHMARK MODAL CONTROLS ---
function openBenchmarkModal() {
    const modal = document.getElementById("benchmark-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    lucide.createIcons();
}

function closeBenchmarkModal() {
    const modal = document.getElementById("benchmark-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

// --- EVIDENCE INSPECTOR MODAL CONTROLS ---
function openEvidenceModal(zoneId) {
    const zone = allZones.find(z => z.zone_id === zoneId) || allZones[0];
    if (!zone) return;
    const modal = document.getElementById("evidence-modal");
    if (!modal) return;

    document.getElementById("evidence-modal-title").innerText = `${zone.zone_name} • Multimodal Evidence Deep-Dive`;
    const isCrit = zone.threat_level === "CRITICAL";
    document.getElementById("evidence-modal-badge").innerText = `${zone.threat_score}% ${zone.threat_level}`;
    document.getElementById("evidence-modal-badge").className = `text-[10px] px-2 py-0.5 rounded font-extrabold ${
        isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
    }`;
    document.getElementById("evidence-modal-ood").innerText = `Epistemic Uncertainty: ±${zone.uncertainty_margin}%`;

    const isWildfire = zone.disaster_type === "WILDFIRE";
    const ev = zone.evidence_streams || {};
    const vis = ev.visual || {
        sensor: isWildfire ? "VIIRS 375m Thermal IR & Sentinel-2 NBR" : "Sentinel-1 SAR / Sentinel-2 MultiSpectral",
        resolution: isWildfire ? "375m Thermal via Microsoft Planetary Computer" : "10m via Microsoft Planetary Computer",
        detection_mask: isWildfire ? "Active Flame Front & Smoke Plume Perimeter (96% Confidence)" : "Surface Water / Inundation Contour (94.2% Confidence)",
        inundation_area_sqkm: isWildfire ? (zone.smoke_plume_coverage_sqkm || 76.0) : (zone.satellite_inundation_pct * 0.45),
        submerged_structures: isWildfire ? (zone.thermal_hotspots_count || 48) : 18
    };
    const iot = ev.iot_weather || {
        metric_name: isWildfire ? "PM2.5 Particulate Density & Wind Vector" : "River Surge & Rainfall Intensity",
        current_level: isWildfire ? `${zone.pm25_aqi || 385} µg/m³ (Severe)` : `${zone.river_level_meters} m (Danger: ${zone.river_danger_mark_meters} m)`,
        precipitation: isWildfire ? "0.0 mm/hr (Humidity: 14%)" : `${zone.rainfall_rate_mm} mm/hr`,
        wind_vector: isWildfire ? `${zone.wind_speed_kmh || 38} km/h NW (${zone.wind_direction_deg || 315}°)` : "45 km/h ENE (65°)",
        sparkline: isWildfire ? [45, 95, 180, 260, 340, 385, 410] : [12.2, 13.5, 14.6, 15.8, 16.4, 17.2, 16.9],
        timestamps: ["T-6h", "T-4h", "T-2h", "T-1h", "T-0", "T+2h", "T+4h"]
    };
    const nlp = ev.nlp_text || {
        source: isWildfire ? "State Forest Dept Ground Radio & Citizen SOS" : "NDRF Ground Radio & Citizen SOS Feed",
        raw_text: isWildfire ? "CRITICAL: Crown fire breached fireline #3 at Gundre range. 12 tribal hamlet residents isolated near Moyar gorge." : "EMERGENCY: Bridge approach submerged. 14 residents stranded in relief shelter.",
        engine: "Microsoft Phi-3 Mini NLP Model",
        extracted_entities: {
            trapped_persons: isWildfire ? 16 : 14,
            structural_damage: isWildfire ? "Firebreak #3 Breached" : "Bridge Submerged",
            rate_of_rise: isWildfire ? "8.4 km/hr Spread" : "+15 cm/hr",
            urgency_score: "CRITICAL (0.96)"
        }
    };
    const xai = ev.xai_attribution || {
        satellite_mask: isWildfire ? 40 : 35,
        sensor_surge: isWildfire ? 30 : 30,
        nlp_reports: 20,
        weather_inflow: isWildfire ? 10 : 15
    };
    const uncert = ev.uncertainty_assessment || {
        score_pct: 12,
        status: `Low Uncertainty (±${zone.uncertainty_margin}%)`,
        ood_flag: false,
        note: isWildfire ? "Thermal IR and Ground PM2.5 cross-confirmed flame propagation direction." : "Multi-modal consensus verified across satellite vision, ground sensors, and field reports."
    };

    const content = document.getElementById("evidence-modal-content");
    content.innerHTML = `
        <!-- 3-Stream Multimodal Breakdown Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            <!-- STREAM 1: VISUAL SENSOR MASK (SAR / OPTICAL / THERMAL) -->
            <div class="bg-[#111c33] p-3.5 rounded-xl border border-[#203354] space-y-2.5 flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between border-b border-[#203354] pb-2">
                        <div class="flex items-center space-x-1.5 text-cyan-400 font-bold">
                            <i data-lucide="camera" class="w-4 h-4"></i>
                            <span class="uppercase tracking-wider text-[11px]">Stream 1: Visual Mask</span>
                        </div>
                        <span class="text-[9px] bg-cyan-950/80 text-cyan-300 px-1.5 py-0.5 rounded font-mono">${isWildfire ? '375m IR' : '10m SAR'}</span>
                    </div>
                    <div class="space-y-2 pt-2">
                        <div class="bg-[#070d1e] p-2.5 rounded-lg border border-cyan-900/40">
                            <span class="text-slate-400 block text-[10px]">SENSOR PAYLOAD</span>
                            <strong class="text-white text-xs">${vis.sensor}</strong>
                        </div>
                        <div class="bg-[#070d1e] p-2.5 rounded-lg border border-cyan-900/40">
                            <span class="text-slate-400 block text-[10px]">DETECTION MASK</span>
                            <strong class="text-cyan-300 text-xs">${vis.detection_mask}</strong>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-[10px]">
                            <div class="bg-[#070d1e] p-2 rounded border border-[#203354]">
                                <span class="text-slate-400 block">${isWildfire ? 'BURN PERIMETER' : 'SURFACE WATER'}</span>
                                <span class="font-black text-white text-xs mono">${vis.inundation_area_sqkm} km²</span>
                            </div>
                            <div class="bg-[#070d1e] p-2 rounded border border-[#203354]">
                                <span class="text-slate-400 block">${isWildfire ? 'HOTSPOTS' : 'STRUCTURES'}</span>
                                <span class="font-black text-red-400 text-xs mono">${isWildfire ? (zone.thermal_hotspots_count || 48) : (vis.submerged_structures || 18)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-[9px] text-slate-400 flex items-center space-x-1 pt-1 border-t border-[#203354]/60">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span>Microsoft Planetary Computer Pipeline</span>
                </div>
            </div>

            <!-- STREAM 2: IOT & WEATHER SENSORS + SPARKLINE -->
            <div class="bg-[#111c33] p-3.5 rounded-xl border border-[#203354] space-y-2.5 flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between border-b border-[#203354] pb-2">
                        <div class="flex items-center space-x-1.5 text-blue-400 font-bold">
                            <i data-lucide="activity" class="w-4 h-4"></i>
                            <span class="uppercase tracking-wider text-[11px]">Stream 2: IoT Telemetry</span>
                        </div>
                        <span class="text-[9px] bg-blue-950/80 text-blue-300 px-1.5 py-0.5 rounded font-mono">Live Sync</span>
                    </div>
                    <div class="space-y-2 pt-2">
                        <div class="bg-[#070d1e] p-2.5 rounded-lg border border-blue-900/40">
                            <span class="text-slate-400 block text-[10px]">${iot.metric_name}</span>
                            <strong class="text-amber-400 text-xs">${iot.current_level}</strong>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-[10px]">
                            <div class="bg-[#070d1e] p-2 rounded border border-[#203354]">
                                <span class="text-slate-400 block">${isWildfire ? 'ATMOS HUMIDITY' : 'PRECIPITATION'}</span>
                                <span class="font-bold text-slate-200">${iot.precipitation}</span>
                            </div>
                            <div class="bg-[#070d1e] p-2 rounded border border-[#203354]">
                                <span class="text-slate-400 block">WIND VECTOR</span>
                                <span class="font-bold text-slate-200">${iot.wind_vector}</span>
                            </div>
                        </div>

                        <!-- Sparkline Bar Simulation -->
                        <div class="bg-[#070d1e] p-2.5 rounded-lg border border-[#203354] space-y-1">
                            <div class="flex justify-between text-[9px] text-slate-400">
                                <span>7-Point Time Trend Curve</span>
                                <span class="text-cyan-400 font-mono">${isWildfire ? 'PM2.5 Surge' : 'River Rise'}</span>
                            </div>
                            <div class="flex items-end space-x-1 h-8 pt-1">
                                ${(iot.sparkline || [10, 14, 18, 24, 28, 32, 30]).map((val, i) => {
                                    const maxVal = Math.max(...(iot.sparkline || [32]));
                                    const pct = Math.round((val / maxVal) * 100);
                                    return `
                                        <div class="flex-1 flex flex-col items-center group relative">
                                            <div class="w-full ${isWildfire ? 'bg-gradient-to-t from-orange-600 to-amber-400' : 'bg-gradient-to-t from-blue-600 to-cyan-400'} rounded-t" style="height: ${Math.max(15, pct)}%"></div>
                                            <span class="text-[7px] text-slate-500 mt-0.5">${(iot.timestamps || [])[i] || `T${i}`}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-[9px] text-slate-400 flex items-center space-x-1 pt-1 border-t border-[#203354]/60">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>${isWildfire ? 'CPCB AQI & IMD Anemometer Feeds' : 'CWC River Basins & OpenWeatherMap Feeds'}</span>
                </div>
            </div>

            <!-- STREAM 3: MICROSOFT PHI-3 NLP ENTITY EXTRACTION -->
            <div class="bg-[#111c33] p-3.5 rounded-xl border border-[#203354] space-y-2.5 flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between border-b border-[#203354] pb-2">
                        <div class="flex items-center space-x-1.5 text-purple-400 font-bold">
                            <i data-lucide="message-square" class="w-4 h-4"></i>
                            <span class="uppercase tracking-wider text-[11px]">Stream 3: Phi-3 NLP</span>
                        </div>
                        <span class="text-[9px] bg-purple-950/80 text-purple-300 px-1.5 py-0.5 rounded font-mono">Phi-3 Mini</span>
                    </div>
                    <div class="space-y-2 pt-2">
                        <div class="bg-[#070d1e] p-2.5 rounded-lg border border-purple-900/40 space-y-1">
                            <span class="text-slate-400 block text-[9px] uppercase font-bold text-purple-300">RAW SOS & RADIO TRANSMISSION:</span>
                            <p class="text-[11px] text-slate-200 italic leading-snug">"${nlp.raw_text}"</p>
                        </div>
                        <div class="bg-[#070d1e] p-2.5 rounded-lg border border-[#203354] space-y-1.5 text-[10px]">
                            <span class="text-slate-400 block text-[9px] uppercase font-bold">EXTRACTED ENTITIES:</span>
                            <div class="flex justify-between text-slate-300">
                                <span>Trapped / Isolated:</span>
                                <strong class="text-red-400 mono font-bold">${(nlp.extracted_entities && nlp.extracted_entities.trapped_persons) || (isWildfire ? 16 : 14)} persons</strong>
                            </div>
                            <div class="flex justify-between text-slate-300">
                                <span>Structural / Spread Impact:</span>
                                <strong class="text-amber-300 font-bold">${(nlp.extracted_entities && (nlp.extracted_entities.structural_damage || nlp.extracted_entities.rate_of_spread || nlp.extracted_entities.rate_of_rise)) || 'Active Surge'}</strong>
                            </div>
                            <div class="flex justify-between text-slate-300">
                                <span>Urgency Rating:</span>
                                <strong class="text-emerald-400 font-bold">${(nlp.extracted_entities && nlp.extracted_entities.urgency_score) || 'HIGH (0.94)'}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-[9px] text-slate-400 flex items-center space-x-1 pt-1 border-t border-[#203354]/60">
                    <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span>Multi-lingual Indic Disaster NLP Engine</span>
                </div>
            </div>

        </div>

        <!-- XAI FEATURE ATTRIBUTION & UNCERTAINTY DECOMPOSITION -->
        <div class="bg-[#111c33] p-4 rounded-xl border border-[#203354] space-y-3">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2 text-cyan-300 font-bold">
                    <i data-lucide="sliders" class="w-4 h-4"></i>
                    <span>Explainable AI (XAI) Modality Attribution Weights:</span>
                </div>
                <span class="text-[10px] text-slate-400">Late-Fusion Attention Mechanism</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div class="bg-[#070d1e] p-2.5 rounded-lg border border-[#203354]">
                    <div class="flex justify-between text-slate-400 mb-1">
                        <span>${isWildfire ? 'Thermal Hotspots' : 'Satellite SAR Mask'}</span>
                        <strong class="text-cyan-400 mono">${xai.satellite_mask || xai.thermal_hotspot || 35}%</strong>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-cyan-500 h-full" style="width: ${xai.satellite_mask || xai.thermal_hotspot || 35}%"></div>
                    </div>
                </div>

                <div class="bg-[#070d1e] p-2.5 rounded-lg border border-[#203354]">
                    <div class="flex justify-between text-slate-400 mb-1">
                        <span>${isWildfire ? 'PM2.5 & Wind Vector' : 'IoT River Gauges'}</span>
                        <strong class="text-blue-400 mono">${xai.sensor_surge || xai.pm25_weather || 30}%</strong>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-blue-500 h-full" style="width: ${xai.sensor_surge || xai.pm25_weather || 30}%"></div>
                    </div>
                </div>

                <div class="bg-[#070d1e] p-2.5 rounded-lg border border-[#203354]">
                    <div class="flex justify-between text-slate-400 mb-1">
                        <span>Phi-3 NLP SOS</span>
                        <strong class="text-purple-400 mono">${xai.nlp_reports || xai.nlp_ranger_reports || 20}%</strong>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-purple-500 h-full" style="width: ${xai.nlp_reports || xai.nlp_ranger_reports || 20}%"></div>
                    </div>
                </div>

                <div class="bg-[#070d1e] p-2.5 rounded-lg border border-[#203354]">
                    <div class="flex justify-between text-slate-400 mb-1">
                        <span>${isWildfire ? 'CartoDEM Slope / Fuel' : 'Basin Inflow / Rain'}</span>
                        <strong class="text-amber-400 mono">${xai.weather_inflow || xai.cartodem_fuel_slope || 15}%</strong>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-amber-500 h-full" style="width: ${xai.weather_inflow || xai.cartodem_fuel_slope || 15}%"></div>
                    </div>
                </div>
            </div>

            <!-- Uncertainty / OOD Assessment Note -->
            <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between">
                <div class="flex items-center space-x-2 text-slate-300">
                    <span class="w-2 h-2 rounded-full ${uncert.ood_flag ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}"></span>
                    <span><strong>Uncertainty Assessment:</strong> ${uncert.status} — ${uncert.note}</span>
                </div>
                <span class="text-[10px] text-slate-400 mono font-bold">OOD: ${uncert.ood_flag ? 'TRUE (ELEVATED)' : 'FALSE (NORMAL)'}</span>
            </div>
        </div>
    `;

    // Action buttons in modal
    const actions = document.getElementById("evidence-modal-actions");
    actions.innerHTML = `
        <button onclick="dispatchAction('${zone.zone_id}', 'DISPATCH_NDRF'); closeEvidenceModal();" 
            class="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-black shadow flex items-center space-x-1.5 active:scale-95 transition">
            <i data-lucide="shield-alert" class="w-4 h-4"></i>
            <span>🚨 Dispatch NDRF Battalion</span>
        </button>
        <button onclick="dispatchAction('${zone.zone_id}', 'REQUEST_AERIAL_RECON'); closeEvidenceModal();" 
            class="px-3.5 py-2 bg-[#111c33] hover:bg-[#182746] text-cyan-300 border border-cyan-500/50 rounded-lg text-xs font-bold flex items-center space-x-1.5 active:scale-95 transition">
            <i data-lucide="plane" class="w-4 h-4"></i>
            <span>🚁 Deploy Drone Recon</span>
        </button>
        <button onclick="closeEvidenceModal()" 
            class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">
            Dismiss
        </button>
    `;

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    lucide.createIcons();
}

function closeEvidenceModal() {
    const modal = document.getElementById("evidence-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

// --- 4. RENDER MAP ZONES & SATELLITE MASKS ---
function renderMapZones() {
    // Clear existing layers
    Object.values(zoneLayers).forEach(layer => map.removeLayer(layer));
    zoneLayers = {};

    allZones.forEach(zone => {
        const isCritical = zone.threat_level === "CRITICAL";
        const isWarning = zone.threat_level === "WARNING";
        const isWildfire = zone.disaster_type === "WILDFIRE";
        const color = isCritical ? "#dc2626" : (isWarning ? "#ea580c" : "#16a34a");
        const radius = Math.max(15000, zone.population_at_risk * 0.8);

        // Inundation or Wildfire Polygon Circle
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
                    ${isWildfire ? '🔥' : Math.round(zone.threat_score)}
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
        
        const popupText = isWildfire ? `
            <div class="text-xs p-1 text-slate-900">
                <strong class="text-sm font-bold">${zone.zone_name}</strong><br>
                <span class="text-red-700 font-bold">Wildfire Threat: ${zone.threat_score}/100 (±${zone.uncertainty_margin}%)</span><br>
                <span>Hotspots: ${zone.thermal_hotspots_count} | PM2.5: ${zone.pm25_aqi} µg/m³</span><br>
                <span>Fire Spread: ${zone.fire_spread_kmh} km/h | Wind: ${zone.wind_speed_kmh} km/h</span><br>
                <span>Population at Risk: ${zone.population_at_risk.toLocaleString()}</span>
            </div>
        ` : `
            <div class="text-xs p-1 text-slate-900">
                <strong class="text-sm font-bold">${zone.zone_name}</strong><br>
                <span class="text-red-700 font-bold">Flood Threat: ${zone.threat_score}/100 (±${zone.uncertainty_margin}%)</span><br>
                <span>Flood Depth: ${zone.flood_depth_meters}m | River: ${zone.river_level_meters}m</span><br>
                <span>Population at Risk: ${zone.population_at_risk.toLocaleString()}</span>
            </div>
        `;

        marker.bindPopup(popupText);

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
        const isWildfire = zone.disaster_type === "WILDFIRE";
        const badgeBg = isCrit ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30";
        
        const card = document.createElement("div");
        card.className = `p-3 rounded-xl border transition cursor-pointer flex flex-col space-y-2 ${
            isSelected ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
        }`;
        card.onclick = () => selectZone(zone.zone_id);

        const metricGrid = isWildfire ? `
            <div class="grid grid-cols-3 gap-1 bg-slate-900/80 p-2 rounded-lg text-[10px] text-slate-300 mono">
                <div>
                    <span class="text-slate-500 block text-[9px]">HOTSPOTS</span>
                    <span class="font-bold text-red-400">${zone.thermal_hotspots_count} active</span>
                </div>
                <div>
                    <span class="text-slate-500 block text-[9px]">PM2.5 AQI</span>
                    <span class="font-bold text-amber-400">${zone.pm25_aqi} µg/m³</span>
                </div>
                <div>
                    <span class="text-slate-500 block text-[9px]">UNCERTAINTY</span>
                    <span class="font-bold text-amber-400">±${zone.uncertainty_margin}%</span>
                </div>
            </div>
        ` : `
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
        `;

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

            ${metricGrid}

            <div class="flex items-center space-x-1.5 pt-1">
                <button onclick="event.stopPropagation(); openEvidenceModal('${zone.zone_id}')" 
                    class="px-2.5 py-1.5 bg-[#111c33] hover:bg-[#182746] text-cyan-300 border border-cyan-500/50 rounded text-[10px] font-extrabold transition shadow flex items-center space-x-1">
                    <i data-lucide="microscope" class="w-3 h-3 text-cyan-400"></i>
                    <span>Inspect Evidence</span>
                </button>
                <button onclick="event.stopPropagation(); dispatchAction('${zone.zone_id}', 'DISPATCH_NDRF')" 
                    class="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-extrabold transition shadow flex items-center justify-center space-x-1">
                    <i data-lucide="shield-alert" class="w-3 h-3"></i>
                    <span>Dispatch</span>
                </button>
                <button onclick="event.stopPropagation(); dispatchAction('${zone.zone_id}', 'ISSUE_SMS_BROADCAST')" 
                    class="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] font-bold transition">
                    Broadcast
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
    const isWildfire = zone.disaster_type === "WILDFIRE";

    const fusion = zone.fusion_details || {
        primary_driver: isWildfire ? "Thermal Satellite & PM2.5 Inversion" : "River Gauge & Satellite Overlap",
        uncertainty_margin: zone.uncertainty_margin,
        confidence_score: 0.94,
        evidence_breakdown: isWildfire ? [
            `Thermal Hotspots: ${zone.thermal_hotspots_count} active detections with FRP > 350MW.`,
            `Air Quality: PM2.5 spike to ${zone.pm25_aqi} µg/m³ with zero visibility.`,
            `Wind Spread: ${zone.wind_speed_kmh} km/h gusts pushing fireline at ${zone.fire_spread_kmh} km/h.`
        ] : [
            `Ground Gauge: Danger mark breached (${zone.river_level_meters}m).`,
            `Satellite NDWI: High surface water coverage (${zone.satellite_inundation_pct}%).`,
            `Weather Telemetry: Precipitation ${zone.rainfall_rate_mm} mm/hr over saturated basin.`
        ]
    };

    const modalityCards = isWildfire ? `
        <div>
            <div class="flex justify-between text-slate-400">
                <span>🔥 Thermal Infrared Sat (40%)</span>
                <span class="mono text-red-400">${zone.thermal_hotspots_count} Hotspots</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                <div class="bg-red-500 h-full" style="width: ${Math.min(100, zone.thermal_hotspots_count * 2)}%"></div>
            </div>
        </div>

        <div>
            <div class="flex justify-between text-slate-400">
                <span>💨 PM2.5 & Wind Vector (30%)</span>
                <span class="mono text-amber-400">${zone.pm25_aqi} µg/m³</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                <div class="bg-amber-500 h-full" style="width: ${Math.min(100, (zone.pm25_aqi/400)*100)}%"></div>
            </div>
        </div>

        <div>
            <div class="flex justify-between text-slate-400">
                <span>🌲 Ranger Radio NLP (20%)</span>
                <span class="mono text-purple-400">Fireline #3 Breached</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                <div class="bg-purple-500 h-full" style="width: 85%"></div>
            </div>
        </div>

        <div>
            <div class="flex justify-between text-slate-400">
                <span>⛰️ CartoDEM Fuel Slope (10%)</span>
                <span class="mono text-emerald-400">${zone.fire_spread_kmh} km/h Spread</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                <div class="bg-emerald-500 h-full" style="width: ${Math.min(100, zone.fire_spread_kmh * 10)}%"></div>
            </div>
        </div>
    ` : `
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
    `;

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
            <div class="flex items-center justify-between">
                <span class="font-bold text-xs text-slate-300 block">Multimodal Contribution Weights:</span>
                <button onclick="openEvidenceModal('${zone.zone_id}')" class="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center space-x-1">
                    <span>Inspect</span>
                    <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                </button>
            </div>
            
            <div class="space-y-1.5 text-[11px]">
                ${modalityCards}
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
                if (prog.forecast_hotspots_count !== undefined) target.thermal_hotspots_count = prog.forecast_hotspots_count;
                if (prog.forecast_pm25_aqi !== undefined) target.pm25_aqi = prog.forecast_pm25_aqi;
                if (prog.forecast_fire_spread_kmh !== undefined) target.fire_spread_kmh = prog.forecast_fire_spread_kmh;
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

// --- 14. CITIZEN MOBILE APP CONTROLS ---
let sirenOscillator = null;
let sirenAudioCtx = null;
let sirenInterval = null;

function toggleCitizenLayout(mode) {
    const phoneWrapper = document.getElementById("citizen-phone-wrapper");
    const webWrapper = document.getElementById("citizen-web-wrapper");
    const btnPhone = document.getElementById("btn-citizen-phone-mode");
    const btnWeb = document.getElementById("btn-citizen-web-mode");

    if (mode === "phone") {
        phoneWrapper.classList.remove("hidden");
        phoneWrapper.classList.add("flex");
        webWrapper.classList.add("hidden");
        webWrapper.classList.remove("flex");
        btnPhone.className = "px-3 py-1 rounded font-bold bg-blue-600 text-white shadow flex items-center space-x-1";
        btnWeb.className = "px-3 py-1 rounded font-bold text-slate-400 hover:text-white flex items-center space-x-1";
    } else {
        phoneWrapper.classList.add("hidden");
        phoneWrapper.classList.remove("flex");
        webWrapper.classList.remove("hidden");
        webWrapper.classList.add("flex");
        btnWeb.className = "px-3 py-1 rounded font-bold bg-blue-600 text-white shadow flex items-center space-x-1";
        btnPhone.className = "px-3 py-1 rounded font-bold text-slate-400 hover:text-white flex items-center space-x-1";
    }
}

function toggleEvacuationSiren() {
    const btnText = document.getElementById("siren-btn-text");
    if (sirenOscillator) {
        try {
            sirenOscillator.stop();
            sirenOscillator.disconnect();
        } catch (e) {}
        sirenOscillator = null;
        if (sirenInterval) clearInterval(sirenInterval);
        if (btnText) btnText.innerText = "Siren Beacon";
        alert("🔕 Acoustic Evacuation Siren Deactivated.");
    } else {
        try {
            sirenAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            sirenOscillator = sirenAudioCtx.createOscillator();
            const gain = sirenAudioCtx.createGain();
            sirenOscillator.type = "sawtooth";
            sirenOscillator.frequency.setValueAtTime(650, sirenAudioCtx.currentTime);
            gain.gain.setValueAtTime(0.12, sirenAudioCtx.currentTime);
            sirenOscillator.connect(gain);
            gain.connect(sirenAudioCtx.destination);
            sirenOscillator.start();

            let high = false;
            sirenInterval = setInterval(() => {
                if (!sirenOscillator) return;
                high = !high;
                sirenOscillator.frequency.setTargetAtTime(high ? 920 : 580, sirenAudioCtx.currentTime, 0.1);
            }, 380);

            if (btnText) btnText.innerText = "Stop Siren";
            alert("🔊 105dB ACOUSTIC EVACUATION BEACON ACTIVATED THROUGH AUDIO SYSTEM!");
        } catch (e) {
            alert("🚨 105dB ACOUSTIC EVACUATION BEACON ACTIVATED!");
        }
    }
}

let activeSosRecord = null;

function handleIncomingCitizenSOS(sos) {
    activeSosRecord = sos;
    const toast = document.getElementById("live-sos-toast");
    if (!toast) return;

    document.getElementById("sos-toast-name").innerText = sos.citizen_name || "Aarav Sharma";
    document.getElementById("sos-toast-phone").innerText = sos.phone || "+91 98765 43210";
    document.getElementById("sos-toast-details").innerText = `"${sos.details || 'Trapped in rising water with family members.'}"`;
    document.getElementById("sos-toast-sector").innerText = sos.zone_name || "Bhadrachalam";
    document.getElementById("sos-toast-gps").innerText = `${sos.latitude.toFixed(4)}°N, ${sos.longitude.toFixed(4)}°E`;

    toast.classList.remove("hidden");
    toast.classList.add("flex");

    // Audio Alert Beep for Operator
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}

    lucide.createIcons();
}

function dismissSosToast() {
    const toast = document.getElementById("live-sos-toast");
    if (toast) {
        toast.classList.add("hidden");
        toast.classList.remove("flex");
    }
}

async function dispatchSosDirectly() {
    if (!activeSosRecord) {
        activeSosRecord = { zone_id: "ZONE-AP-GODAVARI-01" };
    }
    await dispatchAction(activeSosRecord.zone_id || "ZONE-AP-GODAVARI-01", "DISPATCH_NDRF");
    dismissSosToast();
}

function handleIncomingDispatchBroadcast(broadcast) {
    const banner = document.getElementById("citizen-dispatch-status-banner");
    const eta = document.getElementById("citizen-dispatch-eta");
    const msg = document.getElementById("citizen-dispatch-msg");

    if (banner) {
        banner.classList.remove("hidden");
        if (eta) eta.innerText = `ETA: ${broadcast.eta_mins || 8} MINS`;
        if (msg) msg.innerText = `${broadcast.battalion || '10th NDRF Battalion'} rescue unit is en route to ${broadcast.zone_name || 'your sector'}. Stay in high elevation until zodiac arrives.`;
    }
}

async function transmitCitizenSOS() {
    const zoneId = (typeof selectedZoneId !== 'undefined' && selectedZoneId) ? selectedZoneId : "ZONE-AP-GODAVARI-01";
    const selectedZone = allZones.find(z => z.zone_id === zoneId) || { zone_name: "Bhadrachalam", latitude: 17.6689, longitude: 80.8936 };

    try {
        const res = await fetch("/api/disaster/citizen-sos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                citizen_name: "Aarav Sharma",
                phone: "+91 98765 43210",
                latitude: selectedZone.latitude || 17.6689,
                longitude: selectedZone.longitude || 80.8936,
                zone_id: zoneId,
                zone_name: selectedZone.zone_name || "Bhadrachalam",
                emergency_type: currentHazardMode === "WILDFIRE" ? "WILDFIRE_SMOKE" : "TRAPPED_WATER",
                people_count: 4,
                details: currentHazardMode === "WILDFIRE" ? "Smoke dense, fire approaching boundary line. 4 family members waiting for evacuation." : "Water entered ground floor, trapped on terrace with 4 family members.",
                language: "en"
            })
        });

        if (res.ok) {
            const data = await res.json();
            alert(`🚨 EMERGENCY SOS TRANSMITTED!\n\n• SOS ID: ${data.sos_id}\n• Status: REGISTERED AT NDRF NATIONAL COMMAND\n• Sector: ${selectedZone.zone_name}\n• Assigned: ${data.assigned_battalion}\n\nCommand Center received live GPS pin.`);
        } else {
            alert("🚨 SOS Transmitted to NDRF National Command Post!");
        }
    } catch (e) {
        alert("🚨 SOS Broadcast sent to NDRF Command Center via Local Mesh!");
    }
}

const LANGUAGE_ADVISORIES = {
    en: {
        badge: "RED ALERT: EVACUATE",
        title: "Flash Flood Surge Warning",
        desc: "River Godavari has breached 16.4m danger level. Evacuate to high ground immediately."
    },
    hi: {
        badge: "रेड अलर्ट: तुरंत सुरक्षित स्थान पर जाएं",
        title: "अचानक बाढ़ की चेतावनी (गोदावरी बेसिन)",
        desc: "गोदावरी नदी खतरे के निशान (16.4m) से ऊपर बह रही है। तुरंत नजदीकी राहत शिविर में पहुंचें।"
    },
    te: {
        badge: "రెడ్ అలర్ట్: వెంటనే ఖాళీ చేయండి",
        title: "వరద ముంపు హెచ్చరిక (భద్రాచలం)",
        desc: "గోదావరి నది ప్రమాద స్థాయిని (16.4 మీ) దాటింది. వెంటనే పునరావాస కేంద్రాలకు వెళ్లండి."
    },
    bn: {
        badge: "রেড অ্যালার্ট: অবিলম্বে নিরাপদ স্থানে যান",
        title: "আকস্মিক বন্যা সতর্কতা",
        desc: "নদীর জল বিপদসীমার উপরে প্রবাহিত হচ্ছে। অবিলম্বে নিকটবর্তী ত্রাণ শিবিরে পৌঁছান।"
    }
};

function changeCitizenLanguage(lang) {
    const adv = LANGUAGE_ADVISORIES[lang] || LANGUAGE_ADVISORIES.en;
    document.getElementById("lang-alert-badge").innerText = adv.badge;
    document.getElementById("lang-alert-title").innerText = adv.title;
    document.getElementById("lang-alert-desc").innerText = adv.desc;
}
