import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader, Info, RefreshCw } from "lucide-react";
import { getRiskScores, getZones, timeAgo, getMLPrediction, isoWeek, type RiskScoreResponse, type ZoneResponse, type MLPrediction } from "../lib/api";

interface RegionPin {
  name: string;
  lat: number;
  lng: number;
  riskValue: number;
  niveau: string;
  mosquitoes: number;
  temp: number | null;
  humidity: number | null;
  lastCalc: string | null;
  fromApi: boolean;
}

const STATIC_PINS: RegionPin[] = [
  { name: "Kédougou",    lat: 12.556, lng: -12.183, riskValue: 91, niveau: "eleve",  mosquitoes: 134, temp: 33.2, humidity: 86, lastCalc: null, fromApi: false },
  { name: "Tambacounda", lat: 13.771, lng: -13.667, riskValue: 85, niveau: "eleve",  mosquitoes: 112, temp: 34.1, humidity: 77, lastCalc: null, fromApi: false },
  { name: "Kolda",       lat: 12.896, lng: -14.941, riskValue: 79, niveau: "eleve",  mosquitoes: 96,  temp: 31.4, humidity: 82, lastCalc: null, fromApi: false },
  { name: "Kaffrine",    lat: 14.106, lng: -15.551, riskValue: 72, niveau: "eleve",  mosquitoes: 71,  temp: 33.5, humidity: 70, lastCalc: null, fromApi: false },
  { name: "Sédhiou",     lat: 12.708, lng: -15.557, riskValue: 68, niveau: "eleve",  mosquitoes: 57,  temp: 31.1, humidity: 75, lastCalc: null, fromApi: false },
  { name: "Kaolack",     lat: 14.152, lng: -16.073, riskValue: 67, niveau: "eleve",  mosquitoes: 63,  temp: 32.3, humidity: 71, lastCalc: null, fromApi: false },
  { name: "Fatick",      lat: 14.340, lng: -16.407, riskValue: 61, niveau: "modere", mosquitoes: 22,  temp: 30.4, humidity: 69, lastCalc: null, fromApi: false },
  { name: "Ziguinchor",  lat: 12.566, lng: -16.273, riskValue: 58, niveau: "modere", mosquitoes: 44,  temp: 29.8, humidity: 80, lastCalc: null, fromApi: false },
  { name: "Diourbel",    lat: 14.655, lng: -16.232, riskValue: 54, niveau: "modere", mosquitoes: 31,  temp: 32.1, humidity: 60, lastCalc: null, fromApi: false },
  { name: "Matam",       lat: 15.656, lng: -13.255, riskValue: 47, niveau: "modere", mosquitoes: 39,  temp: 34.8, humidity: 52, lastCalc: null, fromApi: false },
  { name: "Thiès",       lat: 14.788, lng: -16.926, riskValue: 31, niveau: "faible", mosquitoes: 22,  temp: 28.1, humidity: 61, lastCalc: null, fromApi: false },
  { name: "Louga",       lat: 15.618, lng: -16.224, riskValue: 28, niveau: "faible", mosquitoes: 14,  temp: 30.2, humidity: 48, lastCalc: null, fromApi: false },
  { name: "Dakar",       lat: 14.693, lng: -17.447, riskValue: 22, niveau: "faible", mosquitoes: 8,   temp: 27.4, humidity: 58, lastCalc: null, fromApi: false },
  { name: "Saint-Louis", lat: 16.018, lng: -16.490, riskValue: 19, niveau: "faible", mosquitoes: 6,   temp: 28.3, humidity: 44, lastCalc: null, fromApi: false },
];

function niveauColor(niveau: string, riskValue: number): string {
  if (riskValue >= 75 || niveau === "critique") return "#EF4444";
  if (riskValue >= 50 || niveau === "eleve")    return "#F97316";
  if (riskValue >= 25 || niveau === "modere")   return "#EAB308";
  return "#22C55E";
}

function niveauLabel(niveau: string, riskValue: number): string {
  if (riskValue >= 75 || niveau === "critique") return "Critique";
  if (riskValue >= 50 || niveau === "eleve")    return "Élevé";
  if (riskValue >= 25 || niveau === "modere")   return "Moyen";
  return "Faible";
}

function mergeWithApi(zones: ZoneResponse[], scores: RiskScoreResponse[]): RegionPin[] {
  const zoneByName = new Map<string, string>();
  zones.filter(z => z.niveau === "region").forEach(z => zoneByName.set(z.nom, z.id));

  const latestByZone = new Map<string, RiskScoreResponse>();
  scores.forEach(s => {
    const ex = latestByZone.get(s.zone_id);
    if (!ex || s.calcule_a > ex.calcule_a) latestByZone.set(s.zone_id, s);
  });

  return STATIC_PINS.map(pin => {
    const zoneId = zoneByName.get(pin.name);
    if (!zoneId) return pin;
    const score = latestByZone.get(zoneId);
    if (!score) return pin;

    const meteo = (score.facteurs as Record<string, unknown> | null)?.meteo as Record<string, unknown> | undefined;
    const donnees = meteo?.donnees as Record<string, number> | undefined;
    const moustiques = (score.facteurs as Record<string, unknown> | null)?.moustiques as Record<string, unknown> | undefined;

    return {
      ...pin,
      riskValue:  Math.round(score.score * 100),
      niveau:     score.niveau_risque ?? pin.niveau,
      mosquitoes: (moustiques?.nb_vecteurs_24h as number | undefined) ?? pin.mosquitoes,
      temp:       donnees?.temperature ?? pin.temp,
      humidity:   donnees?.humidity    ?? pin.humidity,
      lastCalc:   score.calcule_a,
      fromApi:    true,
    };
  });
}

export function RiskMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map          = useRef<maplibregl.Map | null>(null);
  const markers      = useRef<maplibregl.Marker[]>([]);
  const [loaded,    setLoaded]    = useState(false);
  const [regions,   setRegions]   = useState<RegionPin[]>(STATIC_PINS);
  const [selected,  setSelected]  = useState<RegionPin | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [mlPred, setMlPred] = useState<MLPrediction | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const hasApi = regions.some(r => r.fromApi);

  const loadScores = async (silent = false) => {
    if (!silent) return;
    setRefreshing(true);
    try {
      const [scores, zones] = await Promise.all([getRiskScores(), getZones()]);
      setRegions(mergeWithApi(zones, scores));
      setLastRefresh(new Date());
    } catch { /* keep static */ }
    finally { setRefreshing(false); }
  };

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const [scores, zones] = await Promise.all([getRiskScores(), getZones()]);
        setRegions(mergeWithApi(zones, scores));
        setLastRefresh(new Date());
      } catch { /* keep static */ }
    })();
    const interval = setInterval(() => loadScores(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Map init (once)
  useEffect(() => {
    if (!mapContainer.current) return;
    const lngs = STATIC_PINS.map(p => p.lng);
    const lats = STATIC_PINS.map(p => p.lat);
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: { osm: { type: "raster" as const, tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap" } },
        layers:  [{ id: "osm", type: "raster" as const, source: "osm" }],
      },
      center: [-14.8, 14.3],
      zoom: 6,
      bearing: 0,
      pitch: 0,
    });
    (window as unknown as Record<string, unknown>)._mapInstance = map.current;
    map.current.on("load", () => {
      map.current!.resize();
      map.current!.fitBounds(
        [
          [Math.min(...lngs) - 0.4, Math.min(...lats) - 0.5],
          [Math.max(...lngs) + 0.4, Math.max(...lats) + 0.5],
        ],
        { padding: { top: 60, bottom: 80, left: 40, right: 40 }, duration: 0, maxZoom: 8 }
      );
      setLoaded(true);
    });
    return () => { map.current?.remove(); };
  }, []);

  // Update markers whenever map is ready OR data changes
  useEffect(() => {
    if (!loaded || !map.current) return;

    // Remove old markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    regions.forEach(region => {
      const color = niveauColor(region.niveau, region.riskValue);

      // el = ancre MapLibre (transparente, positionnée par MapLibre via transform)
      const el = document.createElement("div");
      el.style.cssText = "width:42px;height:42px;cursor:pointer;";

      // inner = visuel du marqueur (scale ici, pas sur el pour ne pas écraser le transform MapLibre)
      const inner = document.createElement("div");
      inner.style.cssText = `
        width:42px;height:42px;border-radius:50%;
        background:${color};border:2.5px solid white;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:800;color:white;font-family:monospace;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        transition:transform 0.15s ease,box-shadow 0.15s ease;
        position:relative;
      `;
      inner.innerHTML = `${region.riskValue}%`;
      if (region.fromApi) {
        const dot = document.createElement("div");
        dot.style.cssText = "position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:#60A5FA;border:1px solid white;";
        inner.appendChild(dot);
      }
      el.appendChild(inner);

      el.addEventListener("mouseenter", () => { inner.style.transform = "scale(1.15)"; inner.style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)"; });
      el.addEventListener("mouseleave", () => { inner.style.transform = "scale(1)";    inner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)"; });
      el.addEventListener("click", e => {
        e.stopPropagation();
        setSelected(region);
        setMlPred(null);
        setMlLoading(true);
        getMLPrediction(region.name, isoWeek(), new Date().getFullYear())
          .then(setMlPred)
          .catch(() => {})
          .finally(() => setMlLoading(false));
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([region.lng, region.lat])
        .addTo(map.current!);
      markers.current.push(marker);
    });
  }, [loaded, regions]);

  // Update selected panel when regions refresh
  useEffect(() => {
    if (!selected) return;
    const updated = regions.find(r => r.name === selected.name);
    if (updated) setSelected(updated);
  }, [regions]);

  const selColor = selected ? niveauColor(selected.niveau, selected.riskValue) : "#000";
  const selLabel = selected ? niveauLabel(selected.niveau, selected.riskValue) : "";

  return (
    <div className="w-full h-full flex flex-col relative bg-white">
      <div ref={mapContainer} className="flex-1 w-full h-full relative" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/55 to-transparent p-4 sm:p-6">
        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
          <div className="text-white">
            <h2 className="text-xl font-bold mb-0.5">Carte des risques paludisme</h2>
            <p className="text-xs text-white/80">
              {hasApi ? `Données temps réel · Mis à jour ${timeAgo(lastRefresh.toISOString())}` : "Données statiques de démonstration"} · Sénégal
            </p>
          </div>
          <button
            onClick={() => loadScores(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(4px)" }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
        <p className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Info size={12} /> Niveaux de risque
        </p>
        <div className="space-y-2">
          {[
            { color: "#EF4444", label: "Critique  ≥ 75%" },
            { color: "#F97316", label: "Élevé     50–74%" },
            { color: "#EAB308", label: "Moyen     25–49%" },
            { color: "#22C55E", label: "Faible     < 25%" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-700 font-mono">{label}</span>
            </div>
          ))}
        </div>
        {hasApi && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-[10px] text-gray-500">Score temps réel</span>
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-2">Clic sur marqueur · Molette zoom</p>
      </div>

      {/* Info panel */}
      {selected && (
        <div className="absolute bottom-4 right-4 z-20 bg-white/98 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-4 w-64">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{selected.name}</h3>
              {selected.lastCalc && (
                <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(selected.lastCalc)}</p>
              )}
            </div>
            <button onClick={() => { setSelected(null); setMlPred(null); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Niveau</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: selColor }}>{selLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Score</span>
              <span className="text-sm font-bold font-mono" style={{ color: selColor }}>{selected.riskValue}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Anopheles/24h</span>
              <span className="text-xs font-bold text-teal-600 font-mono">{selected.mosquitoes}</span>
            </div>
            {selected.temp !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Température</span>
                <span className="text-xs font-mono text-gray-700">{selected.temp}°C</span>
              </div>
            )}
            {selected.humidity !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Humidité</span>
                <span className="text-xs font-mono text-gray-700">{selected.humidity}%</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Coordonnées</span>
              <span className="text-[10px] font-mono text-gray-500">{selected.lat.toFixed(2)}°N {Math.abs(selected.lng).toFixed(2)}°O</span>
            </div>
          </div>

          {/* Risk bar */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">Indice de risque</span>
              <span className="text-[10px] font-mono text-gray-500">{selected.riskValue}/100</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", backgroundColor: "#F1F5F9" }}>
              <div style={{ width: `${selected.riskValue}%`, height: "100%", backgroundColor: selColor, borderRadius: "999px", transition: "width 0.5s ease" }} />
            </div>
          </div>

          {selected.fromApi && (
            <p className="text-[10px] text-blue-500 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              Score calculé en temps réel
            </p>
          )}

          {/* ML Predictions */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <span>Prédictions ML</span>
              {mlLoading && <span className="inline-block w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin" />}
            </p>
            {mlPred ? (
              <>
                {(["S+1","S+4","S+12"] as const).map(h => {
                  const hz = mlPred.horizons[h];
                  const isPic = mlPred.pic_attendu === h;
                  const niv = hz.niveau_risque;
                  const nivColor = niv === "CRITIQUE" ? "#EF4444" : niv === "ELEVE" ? "#F97316" : niv === "MODERE" ? "#EAB308" : "#22C55E";
                  return (
                    <div key={h} className="flex items-center justify-between py-0.5">
                      <span className="text-[10px] text-gray-500 font-mono w-8">{h}</span>
                      <span className="text-[10px] font-bold font-mono text-gray-700">{hz.cas_predits.toLocaleString()} cas</span>
                      <span className="text-[10px] font-semibold px-1 py-0.5 rounded" style={{ color: nivColor, background: `${nivColor}18` }}>
                        {niv}{isPic ? " ★" : ""}
                      </span>
                    </div>
                  );
                })}
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Tendance : {mlPred.tendance_4sem === "hausse" ? "↗ hausse" : mlPred.tendance_4sem === "baisse" ? "↘ baisse" : "→ stable"}
                </p>
              </>
            ) : !mlLoading && (
              <p className="text-[10px] text-gray-400">Cliquer sur une région</p>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!loaded && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader size={32} className="animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-gray-700">Chargement de la carte...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RiskMapPage;
