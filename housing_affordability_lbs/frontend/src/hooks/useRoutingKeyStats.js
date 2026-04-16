import { useEffect, useState } from "react";
import { fetchRoutingKeyStats } from "../services/api";

export default function useRoutingKeyStats(year = 2025) {
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchRoutingKeyStats(year)
      .then((data) => {
        const lookup = {};

        data.forEach((row) => {
          const key = String(row.routing_key).trim().toUpperCase();
          lookup[key] = row;
        });

        setStats(lookup);
      })
      .catch((error) => {
        console.error("Stats fetch failed:", error);
      });
  }, [year]);

  return stats;
}