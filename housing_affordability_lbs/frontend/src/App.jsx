import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

function FitToFilteredData() {
  const map = useMap();

  useEffect(() => {
    map.setView([53.36, -6.20], 9.9);
  }, [map]);

  return null;
}

/* 
-----------------------------------------------------------------------------
App() 
-----------------------------------------------------------------------------
*/

export default function App() {

  const [geoData, setGeoData] = useState(null);
  const [stats, setStats] = useState({});

  // add state
  const [selectedKey, setSelectedKey] = useState(null);
  const selectedArea = selectedKey ? stats[selectedKey] : null;

  // Budget State for Filters
  const [minBudget, setMinBudget] = useState(500000);
  const [maxBudget, setMaxBudget] = useState(750000);
  const [activeFilters, setActiveFilters] = useState({
    budget: true,
    schools: false,
    parks: false,
    universities: false,
    transport: false,
  });

  // State for sidebar panels
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState("selected");

  // trend (chart) state
  const [trendData, setTrendData] = useState([]);

  // Load routing key polygons
  useEffect(() => {
    fetch("/RoutingKeys_EIRE.geojson")
      .then(res => res.json())
      .then(data => setGeoData(data));

  }, []);

  const filteredGeoData =
    geoData && Object.keys(stats).length > 0
      ? {
        type: "FeatureCollection",
        features: geoData.features.filter((feature) => {
          const key = String(feature.properties.RoutingKey).trim().toUpperCase();
          return Object.prototype.hasOwnProperty.call(stats, key);
        }),
      }
      : null;

  // Load housing stats from Django
  useEffect(() => {
    fetch("/api/routing-keys/?year=2025")
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.error("API error response:", text);
        throw new Error("API failed");
      }
      return res.json();
    })
    .then((data) => {
      const lookup = {};
      data.forEach(row => {
        const key = String(row.routing_key).trim().toUpperCase();
        lookup[key] = row;
      });
      setStats(lookup);
    })
    .catch((err) => {
      console.error("Stats fetch failed:", err);
    });
  }, []);

  // fetch trend data when selected area changes
  useEffect(() => {
    if (!selectedKey) {
      setTrendData([]);
      return;
    }

    fetch(`/api/routing-keys/${selectedKey}/trend/`)
      .then(async (res) => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Failed to load trend");
          }
          return res.json();
        })
        .then((data) => setTrendData(data))
        .catch((err) => {
          console.error("Trend fetch error:", err);
          setTrendData([]);
        });
    }, [selectedKey]);

  

  // -------------------------------------------------------------------------
  // Relative threshold helpers for amenity scoring
  function getThresholds(values) {
    const cleaned = values
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v))
      .sort((a, b) => a - b);

    if (cleaned.length === 0) {
      return { close: 0, strong: 0 };
    }

    const closeIndex = Math.floor(cleaned.length * 0.5); // mediumish
    const strongIndex = Math.floor(cleaned.length * 0.75); // upper quartile(ish)

    return {
      close: cleaned[Math.min(closeIndex, cleaned.length -1)],
      strong: cleaned[Math.min(strongIndex, cleaned.length -1)],
    };
  }

  // Thresholds 
  const parkThresholds = getThresholds(
    Object.values(stats).map((area) => area.park_count ?? 0)
  );

  const schoolThresholds = getThresholds(
    Object.values(stats).map((area) => area.school_count ?? 0)
  );

  const universityThresholds = getThresholds(
    Object.values(stats).map((area) => area.university_count ?? 0)
  );

  const railTramThresholds = getThresholds(
    Object.values(stats).map((area) => area.rail_tram_count ?? 0)
  );

  // scoring helper
  function scoreAmenity(value, thresholds) {
    const numericValue = Number(value ?? 0);

    if (numericValue >= thresholds.strong) return 1;
    if (numericValue >= thresholds.close) return 0.5;
    return 0;
  }

  // Classification Function
  function classifyArea(area, filters) {

    if (!area) return { status: "no-data", score: 0 };

    let score = 0;
    let checks = 0;

    // Budget scoring
    if (filters.budget) {
      checks += 1;

      const price = Number(area.median_price ?? 0);
      const min = minBudget;
      const max = maxBudget;
      const tolerance = 50000;

      if (price >= min && price <= max) {
        score += 1;
      } else if (
        (price >= min - tolerance && price < min) ||
        (price > max && price <= max + tolerance)
      ) {
        score += 0.5;
      }
    }

    // filters go here
    // parks
    if (filters.parks) {
      checks += 1;
      score += scoreAmenity(area.park_count, parkThresholds);
    }
    
    // schools
    if (filters.schools) {
      checks += 1;
      score += scoreAmenity(area.school_count, schoolThresholds);
    }

    // universities
    if (filters.universities) {
      checks += 1;
      score += scoreAmenity(area.university_count, universityThresholds);
    }

    // DART/LUAs access
    if (filters.transport) {
      checks += 1;
      score += scoreAmenity(area.rail_tram_count, railTramThresholds);
    }

    if (checks === 0) {
      return { status: "neutral", score: 0 };
    }

    const ratio = score / checks;

    if (ratio >= 0.8) return { status: "best-match", score: ratio };
    if (ratio >= 0.4) return { status: "close-match", score: ratio };
    return { status: "outside-range", score: ratio };

  }

  // Ranked area scoring system
  const rankedAreas = Object.entries(stats)
    .map(([key, area]) => {
      const result = classifyArea(area, activeFilters);
      return {
        key,
        area,
        status: result.status,
        score: result.score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // -------------------------------------------------------------------------

  // Map status to colour

  function getSuitabilityColour(status) {

    if (status === "best-match") return "#22c55e"; // green
    if (status === "close-match") return "#f97316";   // orange
    if (status === "outside-range") return "#7f1d1d";   // dark red
    return "#e5e7eb";

  };

  // style function

  const style = (feature) => {
    const key = String(feature.properties.RoutingKey).trim().toUpperCase();
    const area = stats[key];
    const result = classifyArea(area, activeFilters);

    const isSelected = key === selectedKey;

    return {
      color: isSelected ? "#000" : "#333",
      weight: isSelected ? 5 : 1,
      fillColor: getSuitabilityColour(result.status),
      fillOpacity: isSelected ? 1 : 0.65,
      dashArray: isSelected ? "0" : null,
      opacity: isSelected ? 1 : 0.8,
    };
  };

    // center map on selection
  function FlyToSelected({ geoData, selectedKey }) {
    const map = useMap();

    useEffect(() => {
      if (!geoData || !selectedKey) return;

      const feature = geoData.features.find(
        (f) => 
          String(f.properties.RoutingKey).trim().toUpperCase() === selectedKey
      );

      if (!feature || !feature.geometry) return;

      try {
        const layer = L.geoJSON(feature);
        const bounds = layer.getBounds();

        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [180, 180],
            maxZoom: 10,
          });
        } else {
          map.setView([53.35, -6.26], 10);
        }
      } catch (error) {
        console.error("FlyToSelected failed: ", error);
      }
    }, [geoData, selectedKey, map]);

    return null;
  }

  // onEachFeature function

  const onEachFeature = (feature, layer) => {

    const key = String(feature.properties.RoutingKey).trim().toUpperCase();
    const area = stats[key];

    layer.on({

      mouseover: (e) => {
        e.target.setStyle({
          weight: 3,
          color: "#000",
          fillOpacity: 0.9,
        });
      },

      mouseout: (e) => {
        const resetStyle = style(feature);
        e.target.setStyle(resetStyle);
      },

      click: () => {
        setSelectedKey(key);
        setActivePanelTab("selected");
        setPanelOpen(true);
      }

    });

    const summary = getAreaSummary(area, activeFilters);
    const result = classifyArea(area, activeFilters);

    layer.bindPopup(`
      <b>${key} - ${getAreaDescriptor(key)}</b><br/>
      ${summary.join("<br/>")}
      <br/><br/>
      <b>Score: ${(result.score * 100).toFixed(0)}%</b>
    `);
  };

  // -------------------------------------------------------------------------
  // Chart data object
  const chartData = {
    labels: trendData.map((row) => row.year),
    datasets: [
      {
        label: "Median Price (€)",
        data: trendData.map((row) => row.median_price),
        borderColor: "#1d4ed8",
        backgroundColor: "#1d4ed8",
        tension: 0.25,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `€${context.raw.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: function (value) {
            return `€${Number(value).toLocaleString()}`;
          },
        },
      },
    },
  };

  // Summary Explanation Function
  function getAreaSummary(area, filters) {
    if (!area) return [];

    const summary = [];

    // Budget
    if (filters.budget) {
      const price = Number(area.median_price ?? 0);
      if (price >= minBudget && price <= maxBudget) {
        summary.push("✔ Within budget");
      } else {
        summary.push("✖ Outside budget");
      }
    }

    // Schools
    if (filters.schools) {
      if ((area.school_count ?? 0) >= schoolThresholds.strong) {
        summary.push("✔ Strong school access");
      } else {
        summary.push("✖ Limited school access");
      }
    }

    // Parks 
    if (filters.parks) {
      if ((area.park_count ?? 0) >= parkThresholds.strong) {
        summary.push("✔ Good park access");
      } else {
        summary.push("✖ Limited parks");
      }
    }

    // Higher education
    if (filters.universities) {
      if ((area.university_count ?? 0) >= universityThresholds.strong) {
        summary.push("✔ Strong higher education access");
      } else {
        summary.push("✖ Limited higher education access");
      }
    }

    // Transport
    if (filters.transport) {
      if ((area.rail_tram_count ?? 0) >= railTramThresholds.strong) {
        summary.push("✔ Strong transport links");
      } else {
        summary.push("✖ Limited transport");
      }
    }

    return summary;
  };

  //NAmes for routing keys
  function toTitleCase(text) {
    if (!text) return "";
    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function getFeatureByKey(key) {
    if (!geoData || !key) return null;

    return geoData.feature.find(
      (feature) =>
        String(feature.properties.RoutingKey).trim().toUpperCase() === 
        String(key).trim().toUpperCase()
    );
  }

  function getAreaDescription(key) {
    const feature = getFeatureByKey(key);
    const descriptor = feature?.properties?.Descriptor;
    return descriptor ? toTitleCase(descriptor) : key;
  }


  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, Arial, sans-serif",
        background: "#f5f7fa",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "72px",
          background: "#0b2a4a",
          color: "white",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          boxSizing: "border-box",
        }}
      >
        <div>
          <div style={{ fontSize: "24px", fontWeight: 800 }}>
            myhousingmap.uk
          </div>
          <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "2px" }}>
            Interactive Housing Price Map
          </div>
        </div>

        <div
          style={{
            background: "#17a35b",
            padding: "8px 16px",
            borderRadius: "999px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Prototype Interface
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[53.3498, -6.2603]}
        zoom={7}
        style={{
          height: "calc(100% - 72px)",
          width: "100%",
          marginTop: "72px",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {filteredGeoData && <FitToFilteredData />}

        {geoData && selectedKey && (
          <FlyToSelected geoData={geoData} selectedKey={selectedKey} />
        )}

        {filteredGeoData && (
          <GeoJSON
            key={`${selectedKey || "none"}-${minBudget}-${maxBudget}-${JSON.stringify(activeFilters)}`}
            data={filteredGeoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* Left insights panel */}
      <div
        style={{
          position: "absolute",
          top: "72px",
          left: 0,
          width: "380px",
          height: "calc(100% - 72px)",
          background: "white",
          zIndex: 1200,
          boxShadow: "4px 0 20px rgba(0,0,0,0.18)",
          transform: panelOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          overflowY: "auto",
          pointerEvents: panelOpen ? "auto" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: "1px solid #e6e6e6",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#1f2d3d" }}>
            Selected Area
          </div>

          <button
            onClick={() => setPanelOpen(false)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "22px",
              cursor: "pointer",
              color: "#667085",
            }}
          >
            x
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "16px 20px 0 20px",
          }}
        >
          <button
            onClick={() => setActivePanelTab("selected")}
            style={{
              border: "none",
              borderRadius: "10px",
              padding: "8px 12px",
              fontWeight: 700,
              cursor: "pointer",
              background: activePanelTab === "selected" ? "#0b2a4a" : "#e5e7eb",
              color: activePanelTab === "selected" ? "white" : "#1f2d3d",
            }}
          >
            Selected Area
          </button>

          <button
            onClick={() => setActivePanelTab("rankings")}
            style={{
              border: "none",
              borderRadius: "10px",
              padding: "8px 12px",
              fontWeight: 700,
              cursor: "pointer",
              background: activePanelTab === "rankings" ? "#0b2a4a" : "#e5e7eb",
              color: activePanelTab === "rankings" ? "white" : "#1f2d3d",
            }}
          >
            Rankings
          </button>
        </div>



        <div style={{ padding: "24px" }}>
          {activePanelTab === "selected" && (
            <>
              <div
                style={{
                  display: "inline-block",
                  background: "#f4dd45",
                  borderRadius: "10px",
                  padding: "6px 10px",
                  fontWeight: 700,
                  fontSize: "15px",
                  marginBottom: "16px",
                }}
              >
                {selectedKey || "—"}
              </div>

              <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "6px" }}>
                {selectedKey ? getAreaDescriptor(selectedKey) : "—"}
              </div>

              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "18px" }}>
                Routing key area
              </div>

              <div style={{ marginTop: "10px", marginBottom: "18px", fontSize: "14px", color: "#475569" }}>
                {selectedArea &&
                  (selectedArea.median_price >= minBudget &&
                    selectedArea.median_price <= maxBudget
                    ? "✔ Within your budget"
                    : "✖ Outside your budget")}
              </div>

              <div style={{ marginTop: "12px", fontSize: "14px" }}>
                Score: {(classifyArea(selectedArea, activeFilters).score * 100).toFixed(0)}%
              </div>

              <div style={{ fontSize: "13px", color: "#475569" }}>
                Based on:
                {activeFilters.schools && " Schools"}
                {activeFilters.parks && " Parks"}
                {activeFilters.universities && " Higher education"}
                {activeFilters.transport && " DART / Luas access"}
              </div>

              <div style={{ display: "grid", gap: "18px", marginBottom: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
                  <span>Median Price</span>
                  <strong>
                    {selectedArea?.median_price
                      ? `€${selectedArea.median_price.toLocaleString()}`
                      : "—"}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
                  <span>Transactions</span>
                  <strong>{selectedArea?.transactions || "—"}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
                  <span>YoY Change</span>
                  <strong
                    style={{
                      color:
                        selectedArea?.yoy_percent > 0
                          ? "#17a35b"
                          : selectedArea?.yoy_percent < 0
                            ? "#dc2626"
                            : "#374151",
                    }}
                  >
                    {selectedArea?.yoy_percent != null
                      ? `${selectedArea.yoy_percent}%`
                      : "—"}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
                  <span>Parks</span>
                  <strong>{selectedArea?.park_count ?? 0}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
                  <span>Schools</span>
                  <strong>{selectedArea?.school_count ?? 0}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
                  <span>Higher Education</span>
                  <strong>{selectedArea?.university_count ?? 0}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
                  <span>DART / Luas Access</span>
                  <strong>{selectedArea?.rail_tram_count ?? 0}</strong>
                </div>

              </div>

              <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "14px" }}>
                Price Trend
              </div>

              <div
                style={{
                  height: "260px",
                  borderTop: "1px solid #e6e6e6",
                  paddingTop: "14px",
                }}
              >
                {trendData.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                    No trend data available
                  </div>
                )}
              </div>
            </>
          )}

          {activePanelTab === "rankings" && (
            <>
              <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "18px" }}>
                Top Matching Areas
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                {rankedAreas.map((item, index) => (
                  <div
                    key={item.key}
                    onClick={() => {
                      setSelectedKey(item.key);
                      setActivePanelTab("selected");
                      setPanelOpen(true);
                    }}
                    style={{
                      border: "1px solid #e6e6e6",
                      borderRadius: "12px",
                      padding: "14px",
                      cursor: "pointer",
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <strong>
                        {index + 1}. {item.key} - {getAreaDescriptor(item.key)}
                      </strong>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color:
                            item.status === "best-match"
                              ? "#17a35b"
                              : item.status === "close-match"
                                ? "#f97316"
                                : "#7f1d1d",
                        }}
                      >
                        {item.status === "best-match"
                          ? "Best match"
                          : item.status === "close-match"
                            ? "Close match"
                            : "Not suitable"}
                      </span>
                    </div>

                    <div style={{ fontSize: "14px", color: "#475569" }}>
                      Median price: €{item.area.median_price.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "14px", color: "#475569" }}>
                      Score: {(item.score * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right filters sidebar */}
      <div
        style={{
          position: "absolute",
          top: "72px",
          right: 0,
          width: filtersOpen ? "300px" : "64px",
          height: "calc(100% - 72px)",
          background: "white",
          zIndex: 1100,
          boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
          transition: "width 0.3s ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: "1px solid #e6e6e6",
          }}
        >
          {filtersOpen && (
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1f2d3d" }}>
              Filters
            </div>
          )}

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "20px",
              cursor: "pointer",
              color: "#667085",
              marginLeft: "auto",
            }}
          >
            ☰
          </button>
        </div>

        {filtersOpen && (
          <div
            style={{
              padding: "16px 20px",
              overflowY: "auto",
              height: "calc(100% - 65px)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px" }}>
              Budget Range
            </div>

            <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
              <input
                type="range"
                min="200000"
                max="1000000"
                step="10000"
                value={minBudget}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value < maxBudget) setMinBudget(value);
                }}
              />

              <input
                type="range"
                min="200000"
                max="1000000"
                step="10000"
                value={maxBudget}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value > minBudget) setMaxBudget(value);
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "14px",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "20px",
              }}
            >
              <span>€{(minBudget / 1000).toFixed(0)}k</span>
              <span>€{(maxBudget / 1000).toFixed(0)}k</span>
            </div>

            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px" }}>
              Amenity Filters
            </div>

            <div style={{ display: "grid", gap: "10px", marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={activeFilters.schools}
                  onChange={(e) =>
                    setActiveFilters((prev) => ({ ...prev, schools: e.target.checked }))
                  }
                />
                Schools
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={activeFilters.parks}
                  onChange={(e) =>
                    setActiveFilters((prev) => ({ ...prev, parks: e.target.checked }))
                  }
                />
                Parks
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={activeFilters.universities}
                  onChange={(e) =>
                    setActiveFilters((prev) => ({ ...prev, universities: e.target.checked }))
                  }
                />
                Higher education
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={activeFilters.transport}
                  onChange={(e) =>
                    setActiveFilters((prev) => ({ ...prev, transport: e.target.checked }))
                  }
                />
                DART / Luas access
              </label>
            </div>

            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px" }}>
              Area Suitability
            </div>

            <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Best match
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
                Close match
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#7f1d1d", display: "inline-block" }} />
                Not suitable
              </div>
            </div>

            <button
              style={{
                width: "100%",
                background: "#cbd5e1",
                color: "#475569",
                border: "none",
                borderRadius: "10px",
                padding: "9px 12px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "not-allowed",
              }}
              disabled
            >
              Filters update automatically
            </button>
          </div>
        )}
      </div>
    </div>
  );
}