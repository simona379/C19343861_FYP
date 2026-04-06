import { useEffect, useState } from "react";
// import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
    transport: false,
  });

  // State for sidebars
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

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
    fetch("http://178.62.25.85:8000/api/routing-keys/?year=2025")
      .then(res => res.json())
      .then(data => {

        const lookup = {};

        data.forEach(row => {
          const key = String(row.routing_key).trim().toUpperCase();
          lookup[key] = row;
        });
        setStats(lookup);
        //console.log("API lookup:", lookup);
        console.log("stats loaded", lookup);

      });
  }, []);

// -------------------------------------------------------------------------
  // Classification Function
  function classifyArea(area, filters) {

      if (!area) return { status: "no-data", score: 0 };

      let score = 0;
      let checks = 0;

      if (filters.budget) {
        checks += 1;

        const price = area.median_price;
        const min = minBudget;
        const max = maxBudget;

        if (price >= min && price <= max) {
          score += 1;
        } else {

            const tolerance = 50000;
            if (
              (price >= min - tolerance && price < min) ||
              (price > max && price <= max + tolerance)
            ) {
              score += 0.5;
            }
        }
      }

      // future filters go here
      // if (filters.schools) { ... }
      // if (filters.parks) { ... }
      // if (filters.transport) { ... }

      if (checks === 0) return { status: "neutral", score: 0 };

      const ratio = score / checks;

      if (ratio >= 1) return { status: "best-match", score: ratio };
      if (ratio >= 0.5) return { status: "close-match", score: ratio };
      return { status: "outside-range", score: ratio };

  }

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

    return {
      color: "#333",
      weight: 1,
      fillColor: getSuitabilityColour(result.status),
      fillOpacity: 0.7,
    };
  };

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
          e.target.setStyle({
          weight: 1,
          color: "#333",
          fillOpacity: 0.7,
          });
        },

        click: () => {
          setSelectedKey(key);
          setPanelOpen(true);
        }

    });

    layer.bindPopup(`
      <b>${key}</b><br/>
      Median price: €${area?.median_price?.toLocaleString() || "No data"}<br/>
      Sales: ${area?.transactions || "0"}<br/>
      YoY change: ${area?.yoy_percent ?? "No data"}%
    `);

  };
};

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

        {filteredGeoData && (
          <GeoJSON
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
            ×
          </button>
        </div>

        <div style={{ padding: "20px" }}>
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

          <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "18px" }}>
            {selectedKey || "—"}
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
          </div>

          <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "14px" }}>
            Price Trend
          </div>

          <div
            style={{
              height: "160px",
              borderTop: "1px solid #e6e6e6",
              paddingTop: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "14px",
                color: "#667085",
                marginTop: "100px",
              }}
            >
              <span>2020</span>
              <span>2021</span>
              <span>2022</span>
              <span>2023</span>
              <span>2024</span>
            </div>
          </div>
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