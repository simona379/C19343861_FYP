import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function FitToFilteredData() {
  const map = useMap();

  useEffect(() => {
    map.setView([53.36, -6.2], 9.9);
  }, [map]);

  return null;
}