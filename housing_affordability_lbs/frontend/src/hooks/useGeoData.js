import { useEffect, useState } from "react";
import { fetchGeoJson } from "../services/api";

export default function useGeoData() {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    fetchGeoJson()
      .then((data) => setGeoData(data))
      .catch((error) => {
        console.error("GeoJSON fetch failed:", error);
      });
  }, []);

  return geoData;
}