import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

export default function FlyToSelected({ geoData, selectedKey }) {
  const map = useMap();

  useEffect(() => {
    if (!geoData || !selectedKey) return;

    const feature = geoData.features.find(
      (f) =>
        String(f.properties.RoutingKey).trim().toUpperCase() === selectedKey
    );

    if (!feature || !feature.geometry) return;

    try {
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
      console.error("FlyToSelected failed:", error);
    }
  }, [geoData, selectedKey, map]);

  return null;
}