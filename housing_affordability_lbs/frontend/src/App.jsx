import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function App() {
  const [geoData, setGeoData] = useState(null);
  const [stats, setStats] = useState({});

  // Load routing key polygons
  useEffect(() => {
    fetch("/RoutingKeys_EIRE.geojson")
      .then(res => res.json())
      .then(data => setGeoData(data));
  }, []);

  // Load housing stats from Django
  useEffect(() => {
    fetch("/api/routing-keys/?year=2025")
      .then(res => res.json())
      .then(data => {

        const lookup = {};

        data.forEach(row => {
          const key = String(row.routing_key).trim().toUpperCase();
          lookup[key] = row;
        });
        setStats(lookup);
        console.log("API lookup:", lookup);
      });
  }, []);

  // Colour scale
  const getColor = (price) => {
    if (!price) return "#ccc";
    if (price > 700000) return "#800026";
    if (price > 600000) return "#BD0026";
    if (price > 500000) return "#E31A1C";
    if (price > 400000) return "#fc932a";
    if (price > 300000) return "#ddfd3c";
    if (price > 200000) return "#b4fe4c";
    return "#54f056";
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

    console.log("GeoJSON key:", key);
    console.log("Matched row:", area);

    layer.bindPopup(`
      <b>${key}</b><br/>
      Median price: €${area?.median_price?.toLocaleString() || "No data"}<br/>
      Sales: ${area?.transactions || "0"}
    `);
  };

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <MapContainer
        center={[53.3498, -6.2603]}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoData && Object.keys(stats).length > 0 && (
          <GeoJSON
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}