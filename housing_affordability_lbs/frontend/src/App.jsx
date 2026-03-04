import { useEffect, useState } from "react";

export default function App() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/routing-keys/?year=2025&min_tx=30")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setRows)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Dublin Routing Keys (2025)</h1>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      <ol>
        {rows.slice(0, 15).map((r) => (
          <li key={r.routing_key}>
            <b>{r.routing_key}</b> — Median €{r.median_price} — {r.transactions} sales — YoY{" "}
            {r.yoy_percent ?? "n/a"}%
          </li>
        ))}
      </ol>
    </div>
  );
}