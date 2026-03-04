import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/api/routing-keys/?year=2025")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Dublin Routing Keys (2025)</h1>

      {data.map((item) => (
        <div key={item.routing_key}>
          <b>{item.routing_key}</b> — €{item.median_price} ({item.transactions} sales)
        </div>
      ))}
    </div>
  );
}

export default App;