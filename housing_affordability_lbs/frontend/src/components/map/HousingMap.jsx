import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import FitToFilteredData from "./FitToFilteredData";
import FlyToSelected from "./FlyToSelected";
import MapLegend from "./MapLegend";

export default function HousingMap({
  geoData,
  filteredGeoData,
  selectedKey,
  minBudget,
  maxBudget,
  activeFilters,
  style,
  onEachFeature,
}) {
  return (
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

      <MapLegend />
    </MapContainer>
  );
}