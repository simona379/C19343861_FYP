import { useEffect, useState } from "react";
import { fetchRoutingKeyTrend } from "../services/api";

export default function useTrendData(selectedKey) {
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    if (!selectedKey) {
      setTrendData([]);
      return;
    }

    fetchRoutingKeyTrend(selectedKey)
      .then((data) => setTrendData(data))
      .catch((error) => {
        console.error("Trend fetch error:", error);
        setTrendData([]);
      });
  }, [selectedKey]);

  return trendData;
}