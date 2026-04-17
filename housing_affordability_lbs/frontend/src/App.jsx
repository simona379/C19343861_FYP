
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,

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

  // Amenity weight state
  const [amenityWeights, setAmenityWeights] = useState({
    schools: 2,
    parks: 2,
    universities: 2,
    transport: 2,
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

  // helper for budget scoring
  function getBudgetScore(area) {
    if (!area) return 0;

    const price = Number(area.median_price ?? 0);
    const min = minBudget;
    const max = maxBudget;
    const tolerance = 50000;

    if (price >= min && price <= max) return 1;

    if (
      (price >= min - tolerance && price < min) ||
      (price > max && price <= max + tolerance)
    ) {
      return 0.5;
    }

    return 0;

  }

  // Classification Function
  function classifyArea(area, filters) {

    if (!area) return { status: "no-data", score: 0 };

    const criteria = [];

    // budget is the primary constraint when enabled
    if (filters.budget) {
      const budgetScore = getBudgetScore(area);
      // gatekeeper criterion weighted as always more than most important amenity
      const budgetWeight = 4;
      criteria.push({ score: budgetScore, weight: budgetWeight });
    }

    // filters go here
    // schools
    if (filters.schools) {
      criteria.push({
        score: scoreAmenity(area.school_count, schoolThresholds),
        weight: amenityWeights.schools,
      });
    }

    // parks
    if (filters.parks) {
      criteria.push({
        score: scoreAmenity(area.park_count, parkThresholds),
        weight: amenityWeights.parks,
      });
    }

    // universities
    if (filters.universities) {
      criteria.push({
        score: scoreAmenity(area.university_count, universityThresholds),
        weight: amenityWeights.universities,
      });
    }


    // DART/LUAs access
    if (filters.transport) {
      criteria.push({
        score: scoreAmenity(area.rail_tram_count, railTramThresholds),
        weight: amenityWeights.transport,
      });
    }

    // no filters active => nothing to score against
    if (criteria.length === 0) {
      return { status: "neutral", score: 0 };
    }

    // for each active criterion: score x importance, then add together
    const weightedSum = criteria.reduce(
      (sum, item) => sum + item.score * item.weight,
      0
    );

    // adding up all values
    const totalWeight = criteria.reduce(
      (sum, item) => sum + item.weight,
      0
    );

    // weighted average (score 0->1)
    const finalScore = weightedSum / totalWeight;

    if (finalScore >= 0.8) return { status: "best-match", score: finalScore };
    if (finalScore >= 0.4) return { status: "close-match", score: finalScore };
    return { status: "outside-range", score: finalScore };

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

    if (status === "best-match") return "#16a34a"; // green
    if (status === "close-match") return "#f59e0b";   // orange
    if (status === "outside-range") return "#dc2626";   //  red
    return "#e5e7eb";

  };

  // style function

  const style = (feature) => {
    const key = String(feature.properties.RoutingKey).trim().toUpperCase();
    const area = stats[key];
    const result = classifyArea(area, activeFilters);

    const isSelected = key === selectedKey;

    return {
      color: isSelected ? "#111827" : "#475569",
      weight: isSelected ? 2.5 : 1,
      fillColor: getSuitabilityColour(result.status),
      fillOpacity: isSelected ? 0.78 : selectedKey ? 0.38 : 0.55,
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
        //const layer = L.geoJSON(feature);
        const bounds = L.geoJSON(feature).getBounds();

        if (bounds && bounds.isValid()) {
          map.flyToBounds(bounds, {
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

  // -------------------------------------------------------------------------
// Polygon interaction + tooltip
  const onEachFeature = (feature, layer) => {

    const key = String(feature.properties.RoutingKey).trim().toUpperCase();
    const area = stats[key];

    layer.on("add", () => {
      if (layer._path) {
        layer._path.setAttribute("tabindex", "-1");
      }
    });

    layer.on({

      mouseover: (e) => {
        e.target.setStyle({
          weight: 2,
          color: "#000",
          fillOpacity: 0.65,
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

    const result = classifyArea(area, activeFilters);

    layer.bindTooltip(
      `
      <div style="font-size:12px; line-height:1.35; padding:1px 2px;">
        <div style="font-weight:700; margin-bottom:2px;">
          ${key} - ${getAreaDescription(key)}
        </div>
        <div style="color:#64748b; margin-bottom:2px;">
          ${getStatusLabel(result.status)}
        </div>
        <div style="font-weight:600;">
          ${(result.score * 100).toFixed(0)}%
        </div>
      </div>
      `,
      {
        sticky: true,
        direction: "top",
        opacity: 0.92,
      }
    );
  };

  // -------------------------------------------------------------------------
  // Chart 1 data object (median price of area year by year)
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

  //  chart 2 (average amenities per routing key)
  // helper
  function averageOf(field) {
    const values = Object.values(stats)
      .map((area) => Number(area?.[field] ?? 0))
      .filter((value) => !Number.isNaN(value));

    if (values.length === 0) return 0;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  // helper above/below averages indicators 
  function getComparison(value, average) {
    if (!average || average === 0) return null;

    const diffPercent = ((value - average) / average) * 100;

    return {
      percent: Math.abs(diffPercent).toFixed(0),
      direction: diffPercent >= 0 ? "above" : "below",
    };
  };

  const averageSchools = averageOf("school_count");
  const averageParks = averageOf("park_count");
  const averageUniversities = averageOf("university_count");
  const averageTransport = averageOf("rail_tram_count");

  // compute averages
  const amenityComparisonData = {
    labels: ["Schools", "Parks", "Higher Education", "DART / Luas"],
    datasets: [
      {
        label: "Selected area",
        data: [
          selectedArea?.school_count ?? 0,
          selectedArea?.park_count ?? 0,
          selectedArea?.university_count ?? 0,
          selectedArea?.rail_tram_count ?? 0,
        ],
        backgroundColor: "rgba(29, 78, 216, 0.85)",
        borderRadius: 6,
      },
      {
        label: "Average",
        data: [
          Number((averageSchools ?? 0).toFixed(1)),
          Number((averageParks ?? 0).toFixed(1)),
          Number((averageUniversities ?? 0).toFixed(1)),
          Number((averageTransport ?? 0).toFixed(1)),
        ],
        backgroundColor: "rgba(148, 163, 184, 0.85)",
        borderRadius: 6,
      },
    ],
  };

  const amenityComparisonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${context.raw}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // compute comparisons
  const schoolComparison = getComparison(
    selectedArea?.school_count ?? 0,
    averageSchools
  );

  const parkComparison = getComparison(
    selectedArea?.park_count ?? 0,
    averageParks
  );

  const universityComparison = getComparison(
    selectedArea?.university_count ?? 0,
    averageUniversities
  );

  const transportComparison = getComparison(
    selectedArea?.rail_tram_count ?? 0,
    averageTransport
  );



  // -------------------------------------------------------------------------
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

  // ------------------------------------------------------------------------- 
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
    if (!geoData || !geoData.features || !key) return null;

    return geoData.features.find(
      (feature) =>
        String(feature.properties.RoutingKey).trim().toUpperCase() === 
        String(key).trim().toUpperCase()
    );
  }

  function getAreaDescription(key) {
    const feature = getFeatureByKey(key);

    if (!feature || !feature.properties) return key;

    const descriptor = feature.properties.Descriptor;
    return descriptor ? toTitleCase(descriptor) : key;
  }

  // Comparison row for selected area vs overall average
  function ComparisonRow({ label, comparison }) {
    if (!comparison) return null;

    const isAbove = comparison.direction === "above";

    return (
      <div
        style={{
          color: isAbove ? "#16a34a" : "#475569", // green or neutral
          fontWeight: 600,
        }}
      >
        {label}: {isAbove ? "above average" : "below average"}
      </div>
    );
  };

  // 
  function getStatusLabel(status) {
    if (status === "best-match") return "Best match";
    if (status === "close-match") return "Close match";
    if (status === "outside-range") return "Not suitable";
    return "No data";
  }

  const selectedResult = classifyArea(selectedArea, activeFilters);

  function renderWeightSelector(filterKey, label) {
    const selectedWeight = amenityWeights[filterKey];

    return (
      <div
        style={{
          marginTop: "8px",
          marginLeft: "26px",
          marginBottom: "4px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#64748b",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          How important is this?
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {[1, 2, 3].map((value) => {
            const isActive = selectedWeight === value;

            const labels = {
              1: "Low",
              2: "Medium",
              3: "High",
            };

            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setAmenityWeights((prev) => ({
                    ...prev,
                    [filterKey]: value,
                  }))
                }
                style={{
                  border: isActive ? "2px solid #0b2a4a" : "1px solid #cbd5e1",
                  background: isActive ? "#0b2a4a" : "transparent",
                  color: isActive? "white" : "#475569",
                  borderRadius: "999px",
                  padding: "6px 10px",
                  minWidth: "60px",
                  height: "30px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {labels[value]}
              </button>
            );
          })}
        </div>
      </div>
    );
  }


  return (

    <div className="app-shell">

      <div className="top-bar">
        <div>
          <div className="top-bar-title">myhousingmap.uk</div>
          <div className="top-bar-subtitle">Interactive Housing Price Map</div>
        </div>

        <div className="top-bar-pill">Select an area to explore insights</div>
      </div>

      {/* Map */}
      <MapContainer
        center={[53.3498, -6.2603]}
        zoom={7}

        className="map-frame"
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
      <div className={`left-panel ${panelOpen ? "open" : "closed"}`}>

        <div className="panel-header">
          <div className="panel-title">Selected Area</div>

          <button onClick={() => setPanelOpen(false)} className="close-btn">
            x
          </button>
        </div>

        <div className="panel-tabs">

         <button
            onClick={() => setActivePanelTab("selected")}
            className={`panel-tab-btn ${activePanelTab === "selected" ? "active" : ""}`}
          >
            Summary
          </button>

          <button
            onClick={() => setActivePanelTab("rankings")}
            className={`panel-tab-btn ${activePanelTab === "rankings" ? "active" : ""}`}
          >
            Rankings
          </button>

          <button
            onClick={() => setActivePanelTab("analysis")}
            className={`panel-tab-btn ${activePanelTab === "analysis" ? "active" : ""}`}
          >
            Analysis
          </button>
        </div>

        <div className="panel-body">

          {activePanelTab === "selected" && (
            <>
              <div className="selected-key-badge">{selectedKey || "—"}</div>

              <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "6px" }}>
                {selectedKey ? getAreaDescription(selectedKey) : "—"}
              </div>

              <div style={{ fontSize: "42px", letterSpacing: "-1px", fontWeight: 800, marginBottom: "4px", color: "#0b2a4a" }}>
                {(selectedResult.score * 100).toFixed(0)}%
              </div>

              <div style={{ fontSize: "14px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                {getStatusLabel(selectedResult.status)}
              </div>

              <div style={{ fontSize: "16px", color: "#64748b", marginTop: "18px", marginBottom: "18px" }}>
                Overall suitability score
              </div>

              <div style={{ fontSize: "17px", letterSpacing: "-0.2px", fontWeight: 700, marginTop: "18px", marginBottom: "8px" }}>
                Why this area matches
              </div>

              <div style={{ display: "grid", gap: "8px", fontSize: "14px", marginBottom: "20px" }}>
                {getAreaSummary(selectedArea, activeFilters).map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>

              <div style={{ fontSize: "17px", letterSpacing: "-0.2px", fontWeight: 700, marginTop: "18px", marginBottom: "14px" }}>
                Compared to other areas
              </div>

              <div style={{ display: "grid", gap: "6px", fontSize: "14px", marginBottom: "16px" }}>
                {activeFilters.schools && (
                  <ComparisonRow label="Schools" comparison={schoolComparison} />
                )}

                {activeFilters.parks && (
                  <ComparisonRow label="Parks" comparison={parkComparison} />
                )}

                {activeFilters.universities && (
                  <ComparisonRow label="Higher education" comparison={universityComparison} />
                )}

                {activeFilters.transport && (
                  <ComparisonRow label="Transport" comparison={transportComparison} />
                )}
              </div>

              <div style={{ fontSize: "12px", color: "#475569", marginTop: "10px", lineHeight: 1.5 }}>
                <div>
                  <strong>Selected criteria:</strong>{" "}
                  {[
                    activeFilters.budget && "Budget",
                    activeFilters.schools && "Schools",
                    activeFilters.parks && "Parks",
                    activeFilters.universities && "Higher education",
                    activeFilters.transport && "Transport",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>

                <div style={{ marginTop: "4px" }}>
                  <strong>Priority levels:</strong>{" "}
                  {[
                    activeFilters.schools && `Schools ${amenityWeights.schools === 1 ? "Low" : amenityWeights.schools === 2 ? "Medium" : "High"}`,
                    activeFilters.parks && `Parks ${amenityWeights.parks === 1 ? "Low" : amenityWeights.parks === 2 ? "Medium" : "High"}`,
                    activeFilters.universities && `Higher education ${amenityWeights.universities === 1 ? "Low" : amenityWeights.universities === 2 ? "Medium" : "High"}`,
                    activeFilters.transport && `Transport ${amenityWeights.transport === 1 ? "Low" : amenityWeights.transport === 2 ? "Medium" : "High"}`,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
          </>
          )}

          {activePanelTab === "rankings" && (
            <>
              <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "18px" }}>
                Best Matching Areas
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                {rankedAreas.map((item, index) => (
                  <div
                    key={item.key}
                    className="ranking-card"
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
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div 
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "flex-start",
                        marginBottom: "8px",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "18px", lineHeight: 1.2 }}>
                          #{index + 1}. {getAreaDescription(item.key)}
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                          {item.key}
                        </div>
                      </div>


                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          color:
                            item.status === "best-match"
                              ? "#16a34a"
                              : item.status === "close-match"
                                ? "#f59e0b"
                                : "#dc2626",
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

          {activePanelTab === "analysis" && (
            <>
              <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "18px" }}>
                Area Insights
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

              <div style={{
                background: "#fcfcfd",
                borderRadius: "12px",
                padding: "14px",
                border: "1px solid #eef2f7",
              }}>

                <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "14px" }}>
                  Price Trend
                </div>

                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>
                  Median price over time
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
              </div>

              <div style={{
                background: "#fcfcfd",
                borderRadius: "12px",
                padding: "14px",
                border: "1px solid #eef2f7",
              }}>

                <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "0px", marginBottom: "14px" }}>
                  Amenity Comparison
                </div>

                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "10px" }}>
                  Selected area compared with the average across all routing key areas
                </div>

                <div
                  style={{
                    height: "280px",
                    borderTop: "1px solid #e6e6e6",
                    paddingTop: "14px",
                  }}
                >
                  {selectedArea ? (
                    <Bar data={amenityComparisonData} options={amenityComparisonOptions} />
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                      Select an area to view amenity comparison
                    </div>
                  )}
                </div>
              </div>

            </>
          )}
        </div>
      </div>

      {/* Right filters sidebar */}
      <div className={`right-sidebar ${filtersOpen ? "open" : "closed"}`}>

        <div className="panel-header">
          {filtersOpen && <div className="panel-title">Filters</div>}

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="sidebar-toggle-btn"
          >
            ☰
          </button>
        </div>

        {filtersOpen && (
          <div className="sidebar-body">

            <div className="sidebar-section-title">Budget Range</div>

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

            <div className="range-values">
              <span>€{(minBudget / 1000).toFixed(0)}k</span>
              <span>€{(maxBudget / 1000).toFixed(0)}k</span>
            </div>

            <div className="sidebar-section-title">Preferences</div>

              <div className="sidebar-helper-text">
                Higher importance = stronger influence on results
              </div>

              <div className="filter-card">

                <label className="filter-label">
                  <input
                    type="checkbox"
                    checked={activeFilters.schools}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setActiveFilters((prev) => ({ ...prev, schools: checked }));
                      if (!checked) {
                        setAmenityWeights((prev) => ({ ...prev, schools: 2 }));
                      }
                    }}
                  />
                  Schools
                </label>

                {activeFilters.schools && renderWeightSelector("schools", "Schools")}
              </div>

              <div className="filter-card">

                <label className="filter-label">
                  <input
                    type="checkbox"
                    checked={activeFilters.parks}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setActiveFilters((prev) => ({ ...prev, parks: checked }));
                      if (!checked) {
                        setAmenityWeights((prev) => ({ ...prev, parks: 2 }));
                      }
                    }}
                  />
                  Parks
                </label>

                {activeFilters.parks && renderWeightSelector("parks", "Parks")}
              </div>

              <div className="filter-card">

                <label className="filter-label">
                  <input
                    type="checkbox"
                    checked={activeFilters.universities}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setActiveFilters((prev) => ({ ...prev, universities: checked }));
                      if (!checked) {
                        setAmenityWeights((prev) => ({ ...prev, universities: 2 }));
                      }
                    }}
                  />
                  Higher education
                </label>

                {activeFilters.universities && renderWeightSelector("universities", "Higher education")}
              </div>

              <div className="filter-card">

                <label className="filter-label">
                  <input
                    type="checkbox"
                    checked={activeFilters.transport}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setActiveFilters((prev) => ({ ...prev, transport: checked }));
                      if (!checked) {
                        setAmenityWeights((prev) => ({ ...prev, transport: 2 }));
                      }
                    }}
                  />
                  DART / Luas access
                </label>

                {activeFilters.transport && renderWeightSelector("transport", "DART / Luas access")}
              </div>

            <div className="sidebar-section-title">Score guide</div>

            <div className="score-guide">
              <div className="score-guide-item">
                <span className="score-dot best" />
                Best match (80-100%)
              </div>

              <div className="score-guide-item">
                <span className="score-dot close" />
                Close match (40-79%)
              </div>

              <div className="score-guide-item">
                <span className="score-dot bad" />
                Not suitable (0-39%)
              </div>
            </div>

            <button className="disabled-btn" disabled>
              Filters update automatically
            </button>
          </div>
        )}
      </div>
    </div>
  );
}