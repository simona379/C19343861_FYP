import { useEffect, useState } from "react";
// import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
/*
function FitToFilteredData({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data || !data.features || data.features.length === 0) return;

    const bounds = L.geoJSON(data).getBounds();

    map.fitBounds(bounds, {
      paddingTopLeft: [20, 20],
      paddingBottomRight: [340, 40],
      maxZoom: 10,
    });
  }, [data, map]);

  return null;
}
*/
function FitToFilteredData() {
  const map = useMap();

  useEffect(() => {
    map.setView([53.36, -6.20], 9.9);
  }, [map]);

  return null;
}

// App()
export default function App() {
  const [geoData, setGeoData] = useState(null);
  const [stats, setStats] = useState({});
  //const mapRef = useRef(null);
  // add state
  const [selectedKey, setSelectedKey] = useState(null);
  const selectedArea = selectedKey ? stats[selectedKey] : null;

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

  //console.log("All features:", geoData?.features?.length);
  //console.log("Filtered features:", filteredGeoData?.features?.length);

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

  /* Colour scale
  const getColor = (price) => {
    if (!price) return "#d3d3d3";
    if (price > 700000) return "#800026";
    if (price > 600000) return "#BD0026";
    if (price > 500000) return "#E31A1C";
    if (price > 400000) return "#fc932a";
    if (price > 300000) return "#ddfd3c";
    if (price > 200000) return "#b4fe4c";
    return "#54f056";
  };

  */
  const getColor = (price) => {
    if (!price) return "#e5e7eb";

    if (price > 650000) return "#7f1d1d";   // VERY dark red (strong)
    if (price > 550000) return "#dc2626";   // red
    if (price > 450000) return "#f97316";   // PROPER orange
    if (price > 350000) return "#fde047";   // yellow
    return "#22c55e";                       // green
  };

  const style = (feature) => {
    const key = String(feature.properties.RoutingKey).trim().toUpperCase();
    const area = stats[key];

    return {
      color: "#333",
      weight: 1,
      fillColor: getColor(area?.median_price),
      fillOpacity: 0.7,
    };
  };

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

        click: (e) => {
          setSelectedKey(key);
        }

     });



    //console.log("GeoJSON key:", key);
    //console.log("Matched row:", area);

    layer.bindPopup(`
      <b>${key}</b><br/>
      Median price: €${area?.median_price?.toLocaleString() || "No data"}<br/>
      Sales: ${area?.transactions || "0"}<br/>
      YoY change: ${area?.yoy_percent ?? "No data"}%
    `);
  };

  console.log("filtered count", filteredGeoData?.features?.length);


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

      <MapContainer

        center={[53.3498, -6.2603]}
        zoom={7}

        //whenCreated={(map) => (mapRef.current = map)}
        
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

      
      
      <div
        style={{
          position: "absolute",
          top: "120px",
          right: "20px",
          width: "270px",
          maxHeight: "calc(100vh - 130px)",
          overflowY: "auto",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          paddingRight: "4px",
          scrollbarWidth: "thin",
        }}
      >
        <div
          style={{
            width: "270px",
            background: "white",
            borderRadius: "18px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 18px",
              borderBottom: "1px solid #e6e6e6",
              fontSize: "15px",
              fontWeight: 700,
              color: "#1f2d3d",
            }}
          >
            <span>Filters</span>
            <span style={{ color: "#a0a7b4" }}>☰</span>
          </div>

          <div style={{ padding: "10px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px" }}>
              Budget Range
            </div>

            <div
              style={{
                height: "6px",
                background: "#d9dde5",
                borderRadius: "999px",
                position: "relative",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "18%",
                  right: "22%",
                  top: 0,
                  bottom: 0,
                  background: "#0b2a4a",
                  borderRadius: "999px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "18%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "20px",
                  height: "20px",
                  background: "#0b2a4a",
                  borderRadius: "50%",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "22%",
                  top: "50%",
                  transform: "translate(50%, -50%)",
                  width: "20px",
                  height: "20px",
                  background: "#0b2a4a",
                  borderRadius: "50%",
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
                marginBottom: "12px",
                padding: "0 2px",
              }}
            >
              <span>€500k</span>
              <span>€750k</span>
            </div>

            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px" }}>
              Area Suitability
            </div>

            <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Best match
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#f4e04d", display: "inline-block" }} />
                Close to budget
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                Outside range
              </div>
            </div>

            <button
              style={{
                width: "100%",
                background: "#0b2a4a",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "9px 12px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>

        <div
          style={{
            width: "270px",
            background: "white",
            borderRadius: "18px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 18px",
              borderBottom: "1px solid #e6e6e6",
            }}
          >


            <div style={{ fontSize: "15px", fontWeight: 700, color: "#1f2d3d" }}>
              {selectedKey ? `Area ${selectedKey}` : "Click an area"}
            </div>
            <div
              style={{
                background: "#f4dd45",
                borderRadius: "10px",
                padding: "6px 10px",
                fontWeight: 700,
                fontSize: "15px",
              }}
            >
              {selectedKey || "—"}
            </div>
          </div>

          <div style={{ padding: "18px" }}>
            {!selectedKey && (
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "10px" }}>
                Select a region on the map
              </div>
            )}

            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>
             {selectedKey || "—"}
            </div>

            <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px" }}>
                <span>Median Price</span>
                <strong>
                  {selectedArea?.median_price
                    ? `€${selectedArea.median_price.toLocaleString()}`
                    : "—"}
              </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px" }}>
                <span>Transactions</span>
                <strong>
                  {selectedArea?.transactions || "—"}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px" }}>
                <span>YoY Change</span>
                <strong style={{ 
                  color:     
                    selectedArea?.yoy_percent > 0
                    ? "#17a35b"
                    : selectedArea?.yoy_percent < 0
                    ? "#dc2626"
                    : "#374151" }}>
                  {selectedArea?.yoy_percent != null
                    ? `${selectedArea.yoy_percent}%`
                    : "—"}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>
              Price Trend
            </div>

            <div
              style={{
                height: "120px",
                borderTop: "1px solid #e6e6e6",
                position: "relative",
                paddingTop: "10px",
              }}
            >


              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  color: "#667085",
                  marginTop: "2px",
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
      </div>  

      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 16,
          background: "white",
          padding: "10px 12px",
          borderRadius: "10px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
          fontSize: "13px",
          zIndex: 1000,
          lineHeight: 1.7,
        }}
      >

       <b>Median Price (€)</b><br/>
        <div><span style={{ background:"#7f1d1d", width:15, height:15, display:"inline-block", marginRight:8, verticalAlign:"middle" }}></span> 650k+</div>
        <div><span style={{ background:"#dc2626", width:15, height:15, display:"inline-block", marginRight:8, verticalAlign:"middle" }}></span> 550k+</div>
        <div><span style={{ background:"#f97316", width:15, height:15, display:"inline-block", marginRight:8, verticalAlign:"middle" }}></span> 450k+</div>
        <div><span style={{ background:"#fde047", width:15, height:15, display:"inline-block", marginRight:8, verticalAlign:"middle" }}></span> 350k+</div>
        <div><span style={{ background:"#22c55e", width:15, height:15, display:"inline-block", marginRight:8, verticalAlign:"middle" }}></span> Under 350k</div>
      </div>
    </div>
  );
}
